/**
 * Visualization commands: generate/open Python visualizations & diagrams, and
 * comparative-learning generation from the Arch-tab graph.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Services } from '../core/services';
import { ContextNode } from '../traceModels';
import { findTermById, findTermByName, sanitizeFilename } from '../core/util';

export function registerVisualizationCommands(services: Services): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    const { knowledgeMapProvider, context } = services;

    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.visualizeTerm', async (termId?: string) => {
        if (services.visualizing) return;

        services.visualizing = true;
        try {
            let currentCtx = knowledgeMapProvider.getCurrentContext();
            if (!currentCtx) {
                const clipboardText = await vscode.env.clipboard.readText();
                const termName = clipboardText?.trim() || 'Direct Visualization';
                knowledgeMapProvider.setCurrentContext(`Exploring: ${termName}`);
                currentCtx = knowledgeMapProvider.getCurrentContext();
            }
            if (!currentCtx) {
                vscode.window.showErrorMessage('Unable to initialize Knowledge Map context.');
                return;
            }

            let targetId = termId || knowledgeMapProvider.getFocusedTermId() || undefined;
            let expressionToVisualize: string | undefined;

            // Get expression from clipboard
            if (!termId) {
                const clipboardText = await vscode.env.clipboard.readText();
                if (clipboardText && clipboardText.trim()) {
                    expressionToVisualize = clipboardText.trim();
                    const term = findTermByName(currentCtx, expressionToVisualize);
                    if (term) targetId = term.id;
                }
            }

            if (!targetId) {
                vscode.window.showWarningMessage('Please focus a term or copy an expression to visualize.');
                return;
            }

            const termNode = findTermById(currentCtx, targetId);
            if (!termNode) {
                vscode.window.showWarningMessage('Term not found.');
                return;
            }

            // If user pressed button without new expression, show list to choose
            if (!expressionToVisualize && termNode.visualizations && termNode.visualizations.length > 0) {
                const items = termNode.visualizations.map(v => ({
                    label: v.expression,
                    description: new Date(v.createdAt).toLocaleString(),
                    filePath: v.filePath
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select visualization to open'
                });
                if (selected && fs.existsSync(selected.filePath)) {
                    const doc = await vscode.workspace.openTextDocument(selected.filePath);
                    await vscode.window.showTextDocument(doc);
                    return;
                }
                return;
            }

            // Generate new visualization
            const expression = expressionToVisualize || termNode.term;
            const storagePath = context.globalStorageUri.fsPath;
            if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });

            const filename = sanitizeFilename(expression);
            const timestamp = Date.now();
            const scriptPath = path.join(storagePath, `${filename}_${timestamp}.py`);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating visualization for "${expression}"`,
                cancellable: false
            }, async () => {
                const aiService = services.aiService;
                try {
                    // Collect sub-terms from all pedagogical branches
                    const subTerms = termNode.branches.flatMap(b =>
                        b.childContext ? b.childContext.paragraphs.flatMap(p => p.terms) : []
                    );
                    const allBranchContent = termNode.branches.map(b => b.content).join('\n\n');
                    let scriptContent = await aiService.generateVisualizationScript(
                        expression,
                        `Context: ${allBranchContent}\n\nExpression: ${expression}`,
                        subTerms,
                        false
                    );
                    scriptContent = scriptContent.replace(/^```python\n/, '').replace(/\n```$/, '').replace(/^```\n/, '');
                    fs.writeFileSync(scriptPath, scriptContent);

                    // Add to visualizations array
                    if (!termNode.visualizations) termNode.visualizations = [];
                    termNode.visualizations.push({
                        expression: expression,
                        filePath: scriptPath,
                        createdAt: timestamp
                    });
                    knowledgeMapProvider.setContext(currentCtx!, knowledgeMapProvider.getActiveInstanceName());

                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                    await vscode.window.showTextDocument(doc);
                    vscode.window.showInformationMessage(`Visualization generated for "${expression}".`);
                } catch (err) {
                    vscode.window.showErrorMessage(`Failed to generate visualization: ${err}`);
                    const fallback = `print("Visualization failed for: ${expression}")`;
                    fs.writeFileSync(scriptPath, fallback);
                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                    await vscode.window.showTextDocument(doc);
                }
            });
        } finally {
            services.visualizing = false;
        }
    }));

    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.diagramTerm', async () => {
        if (services.visualizing) return;
        services.visualizing = true;
        try {
            const clipboardText = await vscode.env.clipboard.readText();
            const expression = clipboardText?.trim() || 'Diagram';
            const storagePath = context.globalStorageUri.fsPath;
            if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
            const filename = sanitizeFilename(expression);
            const timestamp = Date.now();
            const scriptPath = path.join(storagePath, filename + '_' + timestamp + '.py');

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating diagram for "' + expression + '"',
                cancellable: false
            }, async () => {
                const aiService = services.aiService;
                try {
                    let scriptContent = await aiService.generateVisualizationScript(
                        expression,
                        '',
                        [],
                        true
                    );
                    scriptContent = scriptContent.replace(/^```python\n/, '').replace(/\n```$/, '').replace(/^```\n/, '');
                    fs.writeFileSync(scriptPath, scriptContent);
                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                    await vscode.window.showTextDocument(doc);
                    vscode.window.showInformationMessage('Diagram generated for "' + expression + '".');
                } catch (err) {
                    vscode.window.showErrorMessage('Failed to generate diagram: ' + err);
                    const fallback = 'print(\"Diagram failed for: ' + expression + '\")';
                    fs.writeFileSync(scriptPath, fallback);
                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                    await vscode.window.showTextDocument(doc);
                }
            });
        } finally {
            services.visualizing = false;
        }
    }));

    // Shared comparator for the two keybound compare commands. Reads the
    // Arch-tab graph node selection (1 or 2 nodes) synced from the webview.
    // `autoVisualize` (the Ctrl+Shift variant) bonds a generated visualization
    // to the comparison term after it is created.
    const runCompare = async (autoVisualize: boolean) => {
        const currentCtx: ContextNode | null = knowledgeMapProvider.getCurrentContext();
        if (!currentCtx) {
            vscode.window.showWarningMessage('No learning context set.');
            return;
        }
        const { termA, termB } = knowledgeMapProvider.getCompareSelection();
        if (!termA) {
            vscode.window.showWarningMessage('Select 1 or 2 nodes in the Arch graph first (click them), then press Ctrl+Alt+X (no viz) or Ctrl+Shift+X (auto-viz).');
            return;
        }
        const graph = knowledgeMapProvider.getKnowledgeGraph();
        const contextText = currentCtx.rawText;
        // Language (natural vs math) is resolved from the global mode, not the
        // keybinding — the modifier only controls auto-viz here.
        const dimension = services.languageMode.dimension;
        const branchType = dimension === 'model' ? 'comparative-learning-model' : 'comparative-learning-desc';
        const label = autoVisualize ? 'Comparison (auto-viz)' : 'Comparison';
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `${label}: ${termA}${termB ? ' vs ' + termB : ''}`,
            cancellable: false
        }, async () => {
            const aiService = services.aiService;
            try {
                const result = await aiService.generateComparativeLearning(termA, contextText, graph.edges, termB || undefined, dimension);
                knowledgeMapProvider.addTerm(result.comparativeTerm, result.content, branchType);

                // Bond an auto-generated visualization to the comparison term
                // (mirrors the explain auto-viz path). addTerm ran above so the
                // term exists to attach the script to. The Ctrl+Shift variant is
                // an explicit "generate a visualization" action, so open it too.
                if (autoVisualize) {
                    try {
                        const script = await aiService.generateVisualizationScript(
                            result.comparativeTerm,
                            `Context: ${contextText}\n\nExpression: ${result.comparativeTerm}`,
                            [],
                            false
                        );
                        if (script && script.trim()) {
                            const cleaned = script
                                .replace(/^```python\n/, '')
                                .replace(/\n```$/, '')
                                .replace(/^```\n/, '');
                            const scriptPath = await bondVisualizationScript(services, result.comparativeTerm, result.comparativeTerm, cleaned, branchType);
                            if (scriptPath) {
                                const doc = await vscode.workspace.openTextDocument(scriptPath);
                                await vscode.window.showTextDocument(doc, { preview: false });
                            }
                        } else if (script !== null && script !== undefined) {
                            vscode.window.showWarningMessage(`Visualization model returned an empty script for "${result.comparativeTerm}".`);
                        }
                    } catch (e) {
                        console.error('Bond visualization script error:', e);
                    }
                }
            } catch (error) {
                console.error('Comparative Learning Error:', error);
                vscode.window.showErrorMessage('Failed to generate comparative learning: ' + (error as Error).message);
            }
        });
    };

    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.compare', () => runCompare(false)));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.compareVisualize', () => runCompare(true)));

    return vscode.Disposable.from(...disposables);
}

/**
 * Bond a generated visualization script to a term: write it to the extension's
 * global storage and push a VisualizationEntry (with branchType) onto the term.
 * Does NOT open the editor — the user opens bonded scripts via "Show Script" or
 * "Review Viz". Used by the parallel auto-viz path in handleExplainTerm and
 * (optionally) the manual visualizeTerm command.
 */
export async function bondVisualizationScript(
    services: Services,
    termName: string,
    expression: string,
    scriptContent: string,
    branchType?: string
): Promise<string | undefined> {
    const { knowledgeMapProvider, context } = services;
    const ctx = knowledgeMapProvider.getCurrentContext();
    if (!ctx) {
        return undefined;
    }
    const termNode = findTermByName(ctx, termName);
    if (!termNode) {
        return undefined;
    }
    const storagePath = context.globalStorageUri.fsPath;
    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }
    const filename = sanitizeFilename(expression);
    const timestamp = Date.now();
    const scriptPath = path.join(storagePath, `${filename}_${timestamp}.py`);
    fs.writeFileSync(scriptPath, scriptContent);
    if (!termNode.visualizations) {
        termNode.visualizations = [];
    }
    termNode.visualizations.push({ expression, filePath: scriptPath, createdAt: timestamp, branchType });
    knowledgeMapProvider.setContext(ctx, knowledgeMapProvider.getActiveInstanceName());
    return scriptPath;
}
