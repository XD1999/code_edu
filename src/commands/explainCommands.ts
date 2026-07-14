/**
 * Explanation commands and the shared explain-term handler.
 *
 * The keybinding layer is decoupled from language:
 *   - The modifier (Ctrl+Alt vs Ctrl+Shift) controls whether a visualization is
 *     auto-generated alongside the explanation (Ctrl+Shift = auto-viz).
 *   - Which language the prompt uses (natural description vs math model) is
 *     resolved at trigger time from the global LanguageMode (Ctrl+Alt+F).
 *
 * One explain command is registered per (approach, auto-viz) pair, looping the
 * three approaches below — adding a new approach requires no change to the
 * handler, only a new command + keybinding in package.json.
 */

import * as vscode from 'vscode';
import { Services } from '../core/services';
import { PedagogicalType, findPedagogyByApproach } from '../pedagogy/registry';
import { bondVisualizationScript } from './visualizationCommands';

const APPROACHES = ['encapsulation', 'reduction', 'concretization', 'deduction'] as const;
type Approach = typeof APPROACHES[number];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Build the shared `handleExplainTerm` handler wired into both webview providers.
 * Encapsulates the duplicate-request lock, progress UI, AI explanation, and the
 * background knowledge-graph update.
 *
 * `type` may be omitted (the webview "explain" button calls with just term +
 * context); in that case it is resolved from the global LanguageMode using the
 * encapsulation approach, so the UI button respects the current language.
 */
export function makeExplainHandler(services: Services) {
    // Explanation lock to prevent duplicate rapid re-triggers for the same term.
    let currentExplanationTerm: string | null = null;

    async function handleExplainTerm(
        text: string,
        contextText: string,
        type?: PedagogicalType,
        autoVisualize: boolean = false
    ): Promise<void> {
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('Please select a word or phrase to explain.');
            return;
        }

        const normalizedTerm = text.trim().toLowerCase();

        // Prevent duplicate explanations for the same term
        if (currentExplanationTerm === normalizedTerm) {
            console.log(`Skipping duplicate explanation request for: ${text}`);
            return;
        }

        currentExplanationTerm = normalizedTerm;
        // Snapshot the focused location NOW (trigger time). The AI call below
        // takes time; the user may click elsewhere before it returns, which
        // would otherwise move the placement target. addTerm uses this snapshot
        // so the explanation lands in the layer/box that was focused when the
        // command was fired.
        const focusAtTrigger = services.knowledgeMapProvider.getFocusSnapshot();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Explaining "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
                cancellable: false
            }, async () => {
                const aiService = services.aiService;
                const knowledgeMapProvider = services.knowledgeMapProvider;
                try {
                    // Focus the view first
                    await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');

                    // Resolve the pedagogical type from the global language mode
                    // when the caller didn't pin one (e.g. the webview explain
                    // button). Encapsulation is the default approach for that path.
                    const resolvedType: PedagogicalType = type ??
                        findPedagogyByApproach('encapsulation', services.languageMode.dimension).type as PedagogicalType;

                    // Place the term into the knowledge graph once the arch
                    // framework is ready. Consolidated in the provider so the
                    // framework-edge snapshot is taken AFTER arch lands (the old
                    // inline snapshot was taken too early and could wipe the
                    // arch) and failures surface to the user. Runs in the
                    // background so it overlaps with the explanation AI call.
                    knowledgeMapProvider.elaborateGraphForTerm(text, contextText, aiService)
                        .catch(e => console.error('Knowledge graph update error:', e));

                    // Auto-visualization: when the Ctrl+Shift variant was invoked,
                    // fire the visualization AI call IN PARALLEL with the explanation
                    // (both go out at once so the user doesn't wait sequentially). The
                    // viz uses term+context (the explanation isn't ready yet). Bonding
                    // happens after addTerm so the term exists to attach the script to.
                    let vizScriptPromise: Promise<string | null> = Promise.resolve(null);
                    if (autoVisualize) {
                        vizScriptPromise = aiService.generateVisualizationScript(
                            text,
                            `Context: ${contextText}\n\nExpression: ${text}`,
                            [],
                            false
                        ).catch(err => {
                            vscode.window.showErrorMessage('Failed to generate visualization: ' + ((err as Error)?.message || err));
                            return null;
                        });
                    }

                    const explanation = await aiService.explainTerm(text, contextText, resolvedType);
                    // Never store an empty/whitespace response — it would create a
                    // branch whose panel renders as a blank box. Surface it instead.
                    if (!explanation || !explanation.trim()) {
                        vscode.window.showErrorMessage(
                            `AI returned an empty explanation for "${text}" (${resolvedType}). Please retry.`
                        );
                        return;
                    }
                    knowledgeMapProvider.addTerm(text, explanation, resolvedType, focusAtTrigger);
                    // The arch update started above continues in the background and, having
                    // run alongside the explanation, typically lands right around now.

                    // Bond the (parallel) visualization script now that the term
                    // exists. If the viz finished first this returns immediately;
                    // if still in flight, we wait for it (not a second API call).
                    // The Ctrl+Shift variant is an explicit "generate a
                    // visualization" action, so open the generated script in
                    // the editor (mirrors the manual visualizeTerm command).
                    if (autoVisualize) {
                        const script = await vizScriptPromise;
                        if (script && script.trim()) {
                            const cleaned = script
                                .replace(/^```python\n/, '')
                                .replace(/\n```$/, '')
                                .replace(/^```\n/, '');
                            try {
                                const scriptPath = await bondVisualizationScript(services, text, text, cleaned, resolvedType);
                                if (scriptPath) {
                                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                                    await vscode.window.showTextDocument(doc, { preview: false });
                                }
                            } catch (e) {
                                console.error('Bond visualization script error:', e);
                            }
                        } else if (script !== null) {
                            // null means the API call already surfaced its own error;
                            // an empty string here is a distinct, otherwise-silent failure.
                            vscode.window.showWarningMessage(`Visualization model returned an empty script for "${text}".`);
                        }
                    }
                } catch (error) {
                    console.error('AI Explain Error:', error);
                    vscode.window.showErrorMessage('Failed to explain term: ' + (error as Error).message);
                }
            });
        } finally {
            // Release the lock after a short delay to prevent rapid re-triggers
            setTimeout(() => {
                if (currentExplanationTerm === normalizedTerm) {
                    currentExplanationTerm = null;
                }
            }, 1000);
        }
    }

    return handleExplainTerm;
}

/**
 * Register one explain command per (approach, auto-viz) pair:
 *   Ctrl+Alt+{E,R,C}  — no auto-viz
 *   Ctrl+Shift+{E,R,C} — auto-generate a visualization alongside the explanation
 * Each reads the term from the clipboard, resolves the language from the global
 * LanguageMode, and forwards it to the knowledge map.
 */
export function registerExplainCommands(services: Services): vscode.Disposable {
    const createExplainCommand = (approach: Approach, autoVisualize: boolean) => {
        const commandId = `ai-debug-explainer.explain${cap(approach)}${autoVisualize ? 'Visualize' : ''}`;
        return vscode.commands.registerCommand(commandId, async () => {
            console.log(`AI Debug Explainer: ${commandId} triggered`);
            const clipboardText = await vscode.env.clipboard.readText();

            if (clipboardText && clipboardText.trim().length > 0) {
                const term = clipboardText;
                try {
                    await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
                    const type = findPedagogyByApproach(approach, services.languageMode.dimension).type as PedagogicalType;
                    await services.knowledgeMapProvider.processInputTerm(term, type, autoVisualize);
                } catch (error) {
                    console.error('AI Explain Error:', error);
                    vscode.window.showErrorMessage('Failed to explain term: ' + (error as Error).message);
                }
                return;
            }
            vscode.window.showWarningMessage('Clipboard is empty. Please Select Text -> Ctrl+C -> Shortcut');
        });
    };

    const disposables: vscode.Disposable[] = [];
    for (const approach of APPROACHES) {
        disposables.push(createExplainCommand(approach, false));
        disposables.push(createExplainCommand(approach, true));
    }

    return vscode.Disposable.from(...disposables);
}
