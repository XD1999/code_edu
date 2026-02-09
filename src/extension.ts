import * as vscode from 'vscode';
import * as net from 'net';
import { DebugSessionTracker } from './debugSessionTracker';
import { KnowledgeLibrary } from './knowledgeLibrary';
import { AIService } from './aiService';
import { TraceViewProvider } from './traceViewerPanel';
import { KnowledgeMapProvider } from './knowledgeMapPanel';
import { LearningInstance, ContextNode, TermNode } from './traceModels';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

let isActive = false;
let isVisualizing = false;
let debugSessionTracker: DebugSessionTracker | null = null;
let knowledgeLibrary: KnowledgeLibrary | null = null;

// Helper to find term by ID recursively
const findTermById = (ctx: ContextNode, id: string): TermNode | undefined => {
    for (const p of ctx.paragraphs) {
        const t = p.terms.find(term => term.id === id);
        if (t) return t;
        for (const term of p.terms) {
            for (const branch of term.branches) {
                if (branch.childContext) {
                    const found = findTermById(branch.childContext, id);
                    if (found) return found;
                }
            }
        }
    }
    return undefined;
};

// This is the entry point for the extension activation
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Explainer: activate called');

    // Set default auto-select family attempt timeout to 1000ms to improve connectivity
    if ((net as any).setDefaultAutoSelectFamilyAttemptTimeout) {
        (net as any).setDefaultAutoSelectFamilyAttemptTimeout(1000);
    }

    // Initialize knowledge library
    knowledgeLibrary = new KnowledgeLibrary(context);

    // Register the sidebar Trace View Provider
    const traceViewProvider = new TraceViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TraceViewProvider.viewType, traceViewProvider)
    );

    // Register the sidebar Knowledge Map Provider
    const knowledgeMapProvider = new KnowledgeMapProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(KnowledgeMapProvider.viewType, knowledgeMapProvider)
    );

    // Provide initial instances and architecture to the provider
    if (knowledgeLibrary) {
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        const archGraph = knowledgeLibrary.getArchitectureGraph();
        if (archGraph) {
            knowledgeMapProvider.updateArchitecture(archGraph);
        }
    }

    // Register the toggle command
    const toggleCommand = vscode.commands.registerCommand('ai-debug-explainer.toggle', () => {
        console.log('AI Debug Explainer: toggle command executed, current state:', isActive);
        isActive = !isActive;
        vscode.window.showInformationMessage(`AI Debug Explainer is now ${isActive ? 'active' : 'inactive'}`);

        if (isActive && !debugSessionTracker) {
            console.log('AI Debug Explainer: creating new DebugSessionTracker');
            const aiService = new AIService();
            debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!, traceViewProvider, knowledgeMapProvider);

            // Subscribe to debug session events
            context.subscriptions.push(
                vscode.debug.onDidChangeActiveDebugSession(session => {
                    console.log('AI Debug Explainer: onDidChangeActiveDebugSession triggered', session?.id);
                    // We no longer strictly need to track "active" session changes for functionality, 
                    // but we ensure any newly focused session is added to our list.
                    if (session) {
                        debugSessionTracker?.addSession(session);
                    }
                }),
                vscode.debug.onDidStartDebugSession(session => {
                    console.log('AI Debug Explainer: onDidStartDebugSession triggered', session.id);
                    debugSessionTracker?.addSession(session);
                }),
                vscode.debug.onDidTerminateDebugSession(session => {
                    console.log('AI Debug Explainer: onDidTerminateDebugSession triggered', session.id);
                    debugSessionTracker?.removeSession(session.id);
                })
            );
        } else if (!isActive && debugSessionTracker) {
            // Dispose of the debug session tracker when toggling off
            console.log('AI Debug Explainer: disposing DebugSessionTracker');
            debugSessionTracker.dispose();
            debugSessionTracker = null;
        }
    });

    // Automatically create debug session tracker when a debug session starts
    // This ensures the functionality works without requiring manual toggle
    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session STARTED', {
                sessionId: session.id,
                type: session.type,
                name: session.name,
                timestamp: new Date().toISOString()
            });

            // Ensure tracker exists
            if (!debugSessionTracker) {
                console.log('AI Debug Explainer: automatically creating DebugSessionTracker');
                const aiService = new AIService();
                debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!, traceViewProvider, knowledgeMapProvider);
            }

            // Add the new session
            debugSessionTracker.addSession(session);
        }),

        vscode.debug.onDidChangeActiveDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Active session changed', {
                sessionId: session?.id,
                timestamp: new Date().toISOString()
            });

            if (session) {
                if (!debugSessionTracker) {
                    console.log('AI Debug Explainer: automatically creating DebugSessionTracker');
                    const aiService = new AIService();
                    debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!, traceViewProvider, knowledgeMapProvider);
                }
                debugSessionTracker.addSession(session);
            }
        }),

        vscode.debug.onDidTerminateDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session TERMINATED', {
                sessionId: session.id,
                timestamp: new Date().toISOString()
            });
            if (debugSessionTracker) {
                debugSessionTracker.removeSession(session.id);
            }
        }),
        vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
            console.log('AI Debug Explainer: Received debug session custom event', {
                sessionId: event.session.id,
                sessionType: event.session.type,
                sessionName: event.session.name,
                eventType: event.event,
                eventBodyKeys: event.body ? Object.keys(event.body) : [],
                hasOutput: !!(event.body && event.body.output),
                timestamp: new Date().toISOString()
            });
        }),
        // Listen for all debug adapter events
        vscode.debug.onDidChangeBreakpoints(e => {
            console.log('AI Debug Explainer: Breakpoints changed', e);
        })
    );

    // Register the start learning command
    const startLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.startLearning', () => {
        console.log('AI Debug Explainer: startLearning command executed');
        if (debugSessionTracker) {
            debugSessionTracker.startRecording();
            vscode.window.showInformationMessage('Supervision started. Interact with code to record an execution trace.');
        } else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    });

    // Register the stop learning command
    const stopLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.stopLearning', async () => {
        console.log('AI Debug Explainer: stopLearning command executed');
        if (debugSessionTracker) {
            vscode.window.showInformationMessage('Marking current supervision as an intact trace and processing...');
            const count = await debugSessionTracker.stopRecording();
            if (count > 0) {
                vscode.window.showInformationMessage(`Trace complete! Recorded ${count} functions and saved explanations.`);
            }
        } else {
            vscode.window.showErrorMessage('No active debug session tracker.');
        }
    });

    // Register the view trace command
    const viewTraceCommand = vscode.commands.registerCommand('ai-debug-explainer.viewTrace', async () => {
        console.log('AI Debug Explainer: viewTrace command executed');
        if (debugSessionTracker) {
            await debugSessionTracker.openTraceViewer();
        } else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    });

    // Register a manual capture command for debugging
    const manualCaptureCommand = vscode.commands.registerCommand('ai-debug-explainer.manualCapture', async () => {
        console.log('=== [MANUAL CAPTURE] EXECUTION START ===');
        console.log('[MANUAL] Timestamp:', new Date().toISOString());
        console.log('[MANUAL] Has debugSessionTracker:', !!debugSessionTracker);

        if (debugSessionTracker) {
            // Cast to any to access private methods for debugging
            const tracker: any = debugSessionTracker;
            console.log('[MANUAL] Tracker state:', {
                hasActiveSession: !!tracker.activeSession,
                isRecording: tracker.isRecording,
                traceFunctionCount: tracker.currentTraceFunctions?.length || 0
            });

            if (tracker.activeSession) {
                console.log('[MANUAL] Active session details:', {
                    id: tracker.activeSession.id,
                    type: tracker.activeSession.type,
                    name: tracker.activeSession.name
                });

                console.log('[MANUAL] Attempting stack capture...');
                try {
                    await tracker.captureStackFunctions(tracker.activeSession);
                    console.log('[MANUAL] Stack capture completed successfully');

                    console.log('[MANUAL] Current trace functions:', tracker.currentTraceFunctions);
                } catch (error) {
                    console.error('[MANUAL] Stack capture failed:', error);
                }
            } else {
                console.log('[MANUAL] No active session - cannot capture stack');
            }
        } else {
            console.log('[MANUAL] No debug session tracker available');
        }

        console.log('=== [MANUAL CAPTURE] EXECUTION COMPLETE ===');
    });

    // Register command to clear all traces
    const clearTracesCommand = vscode.commands.registerCommand('ai-debug-explainer.clearTraces', async () => {
        console.log('AI Debug Explainer: clearTraces command executed');
        if (knowledgeLibrary) {
            try {
                await knowledgeLibrary.clearAllTraces();
                vscode.window.showInformationMessage('All saved traces have been cleared.');
                console.log('AI Debug Explainer: All traces cleared successfully');
            } catch (error) {
                console.error('AI Debug Explainer: Failed to clear traces:', error);
                vscode.window.showErrorMessage('Failed to clear traces: ' + (error as Error).message);
            }
        } else {
            vscode.window.showErrorMessage('Knowledge library not initialized.');
        }
    });

    // Register command to clear all function explanations
    const clearFunctionExplanationsCommand = vscode.commands.registerCommand('ai-debug-explainer.clearFunctionExplanations', async () => {
        console.log('AI Debug Explainer: clearFunctionExplanations command executed');
        if (knowledgeLibrary) {
            try {
                await knowledgeLibrary.clearAllFunctionExplanations();
                vscode.window.showInformationMessage('All function explanations have been cleared.');
                console.log('AI Debug Explainer: All function explanations cleared successfully');
            } catch (error) {
                console.error('AI Debug Explainer: Failed to clear function explanations:', error);
                vscode.window.showErrorMessage('Failed to clear function explanations: ' + (error as Error).message);
            }
        } else {
            vscode.window.showErrorMessage('Knowledge library not initialized.');
        }
    });


    // Explanation lock to prevent duplicates
    let currentExplanationTerm: string | null = null;

    // Clean, direct explanation handler
    async function handleExplainTerm(text: string, contextText: string, type: 'general' | 'analogy' | 'example' | 'math' = 'general') {
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
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Explaining "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
                cancellable: false
            }, async () => {
                const aiService = new AIService();
                try {
                    // Focus the view first
                    await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');

                    const explanation = await aiService.explainTerm(text, contextText, type);
                    knowledgeMapProvider.addTerm(text, explanation, type);
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

    // Connect the handler to the providers
    // Trace view usually implies general explanation
    traceViewProvider.setExplainHandler((term, ctx) => handleExplainTerm(term, ctx, 'general'));
    knowledgeMapProvider.setExplainHandler(handleExplainTerm);

    // Register command to extract context
    const extractContextCommand = vscode.commands.registerCommand('ai-debug-explainer.extractContext', async () => {
        console.log('AI Debug Explainer: extractContext command triggered');
        const clipboardText = await vscode.env.clipboard.readText();

        if (clipboardText && clipboardText.trim().length > 0) {
            knowledgeMapProvider.setCurrentContext(clipboardText);

            // Focus the view
            await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
            vscode.window.showInformationMessage('Context extracted from clipboard.');
        } else {
            vscode.window.showWarningMessage('Clipboard is empty. Please copy some text first.');
        }
    });

    const createExplainCommand = (commandId: string, type: 'general' | 'analogy' | 'example' | 'math') => {
        return vscode.commands.registerCommand(commandId, async () => {
            console.log(`AI Debug Explainer: ${commandId} triggered`);
            const clipboardText = await vscode.env.clipboard.readText();

            if (clipboardText && clipboardText.trim().length > 0) {
                const term = clipboardText;
                try {
                    await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
                    await knowledgeMapProvider.processInputTerm(term, type);
                } catch (error) {
                    console.error('AI Explain Error:', error);
                    vscode.window.showErrorMessage('Failed to explain term: ' + (error as Error).message);
                }
                return;
            }
            vscode.window.showWarningMessage('Clipboard is empty. Please Select Text -> Ctrl+C -> Shortcut');
        });
    };

    const explainTermCommand = createExplainCommand('ai-debug-explainer.explainTerm', 'general');
    const explainTermAnalogyCommand = createExplainCommand('ai-debug-explainer.explainTermAnalogy', 'analogy');
    const explainTermExampleCommand = createExplainCommand('ai-debug-explainer.explainTermExample', 'example');
    const explainTermMathCommand = createExplainCommand('ai-debug-explainer.explainTermMath', 'math');

    // Register Save Learning Instance command
    const saveLearningInstanceCommand = vscode.commands.registerCommand('ai-debug-explainer.saveLearningInstance', async (contextNode: ContextNode, existingName?: string) => {
        if (!knowledgeLibrary) return;

        let name = existingName;
        if (!name) {
            name = await vscode.window.showInputBox({
                prompt: 'Enter a name for this learning instance',
                placeHolder: 'e.g., Understanding Maxwell Equations'
            });
        }

        if (!name) return;

        // Check if an instance with this name already exists
        const existingInstance = knowledgeLibrary.findLearningInstanceByName(name);

        const instance: LearningInstance = {
            id: existingInstance ? existingInstance.id : `instance-${Date.now()}`,
            name: name,
            rootContext: contextNode,
            createdAt: existingInstance ? existingInstance.createdAt : Date.now()
        };

        await knowledgeLibrary.saveLearningInstance(instance);
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());

        // Provide feedback to webview
        const action = existingInstance ? 'Updated' : 'Saved';
        knowledgeMapProvider.postMessage({
            command: 'showNotification',
            text: `${action}: ${name}`
        });

        vscode.window.showInformationMessage(`Learning instance "${name}" ${action.toLowerCase()}.`);
    });

    // Register Load Learning Instance command
    const loadLearningInstanceCommand = vscode.commands.registerCommand('ai-debug-explainer.loadLearningInstance', async (instanceId: string) => {
        if (!knowledgeLibrary || !knowledgeMapProvider) return;
        const instance = knowledgeLibrary.getLearningInstance(instanceId);
        if (instance) {
            knowledgeMapProvider.setContext(instance.rootContext, instance.name);
            vscode.window.showInformationMessage(`Loaded instance: ${instance.name}`);
        }
    });

    // Register Delete Learning Instance command
    const deleteLearningInstanceCommand = vscode.commands.registerCommand('ai-debug-explainer.deleteLearningInstance', async (instanceId: string) => {
        if (!knowledgeLibrary || !knowledgeMapProvider) return;
        await knowledgeLibrary.deleteLearningInstance(instanceId);
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        vscode.window.showInformationMessage(`Deleted learning instance.`);
    });

    // Register Visualize Term command
    const visualizeTermCommand = vscode.commands.registerCommand('ai-debug-explainer.visualizeTerm', async (termId?: string) => {
        if (!knowledgeLibrary || !knowledgeMapProvider) return;
        if (isVisualizing) return;

        isVisualizing = true;
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

            const findTermByName = (ctx: ContextNode | null, name: string): TermNode | undefined => {
                if (!ctx) return undefined;
                const normalize = (s: string) => s.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toLowerCase();
                const normalizedName = normalize(name);
                for (const p of ctx.paragraphs) {
                    const t = p.terms.find(term => normalize(term.term) === normalizedName);
                    if (t) return t;
                    for (const term of p.terms) {
                        for (const branch of term.branches) {
                            if (branch.childContext) {
                                const found = findTermByName(branch.childContext, name);
                                if (found) return found;
                            }
                        }
                    }
                }
                return undefined;
            };

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

            // Auto-generate filename from expression: remove newlines, sanitize
            const sanitizeFilename = (text: string): string => {
                return text
                    .replace(/\r?\n|\r/g, ' ')  // Replace newlines with space
                    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_\- ]/g, '_')  // Keep alphanumeric, Chinese, underscore, hyphen, space
                    .replace(/\s+/g, '_')  // Replace spaces with underscore
                    .substring(0, 100);  // Limit length
            };
            const filename = sanitizeFilename(expression);
            const timestamp = Date.now();
            const scriptPath = path.join(storagePath, `${filename}_${timestamp}.py`);

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating visualization for "${expression}"`,
                cancellable: false
            }, async () => {
                const aiService = new AIService();
                try {
                    // Collect sub-terms from all pedagogical branches
                    const subTerms = termNode.branches.flatMap(b =>
                        b.childContext ? b.childContext.paragraphs.flatMap(p => p.terms) : []
                    );
                    const allBranchContent = termNode.branches.map(b => b.content).join('\n\n');
                    let scriptContent = await aiService.generateVisualizationScript(
                        expression,
                        `Context: ${allBranchContent}\n\nExpression: ${expression}`,
                        subTerms
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
            isVisualizing = false;
        }
    });


    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);
    context.subscriptions.push(viewTraceCommand);
    context.subscriptions.push(manualCaptureCommand);
    context.subscriptions.push(clearTracesCommand);
    context.subscriptions.push(clearFunctionExplanationsCommand);
    context.subscriptions.push(explainTermCommand);
    context.subscriptions.push(explainTermAnalogyCommand);
    context.subscriptions.push(explainTermExampleCommand);
    context.subscriptions.push(explainTermMathCommand);
    context.subscriptions.push(extractContextCommand);
    context.subscriptions.push(saveLearningInstanceCommand);
    context.subscriptions.push(loadLearningInstanceCommand);
    context.subscriptions.push(deleteLearningInstanceCommand);
    context.subscriptions.push(visualizeTermCommand);

    console.log('AI Debug Explainer: activation completed');
}

export function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    if (debugSessionTracker) {
        debugSessionTracker.dispose();
    }
}
