import * as vscode from 'vscode';
import * as net from 'net';
import { DebugSessionTracker } from './debugSessionTracker';
import { KnowledgeLibrary } from './knowledgeLibrary';
import { AIService } from './aiService';
import { TraceViewProvider } from './traceViewerPanel';
import { KnowledgeMapProvider } from './knowledgeMapPanel';

let isActive = false;
let debugSessionTracker: DebugSessionTracker | null = null;
let knowledgeLibrary: KnowledgeLibrary | null = null;

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

    // Register the toggle command
    const toggleCommand = vscode.commands.registerCommand('ai-debug-explainer.toggle', () => {
        console.log('AI Debug Explainer: toggle command executed, current state:', isActive);
        isActive = !isActive;
        vscode.window.showInformationMessage(`AI Debug Explainer is now ${isActive ? 'active' : 'inactive'}`);

        if (isActive && !debugSessionTracker) {
            console.log('AI Debug Explainer: creating new DebugSessionTracker');
            const aiService = new AIService();
            debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!, traceViewProvider);

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
                debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!, traceViewProvider);
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
                    debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!, traceViewProvider);
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

    // Helper function to handle the explanation logic
    async function handleExplainTerm(text: string, contextText: string) {
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('Please select a word or phrase to explain.');
            return;
        }

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Explaining "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
            cancellable: false
        }, async () => {
            const aiService = new AIService();
            try {
                // Focus the view first so the user sees it appearing
                await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');

                const explanation = await aiService.explainTerm(text, contextText);
                knowledgeMapProvider.addNode(text, explanation);
            } catch (error) {
                console.error('AI Explain Error:', error);
                vscode.window.showErrorMessage('Failed to explain term: ' + (error as Error).message);
            }
        });
    }

    // Connect the handler to the providers
    traceViewProvider.setExplainHandler(handleExplainTerm);
    knowledgeMapProvider.setExplainHandler(handleExplainTerm);

    // Register command to explain selected term
    const explainTermCommand = vscode.commands.registerCommand('ai-debug-explainer.explainTerm', async () => {
        console.log('AI Debug Explainer: explainTerm command triggered');
        const editor = vscode.window.activeTextEditor;

        console.log('AI Debug Explainer: Active Text Editor:', editor ? 'Present' : 'None');
        if (editor) {
            console.log('AI Debug Explainer: Document Language:', editor.document.languageId);
            console.log('AI Debug Explainer: Scheme:', editor.document.uri.scheme);
        }

        // Check if we have a valid selection in the editor
        if (editor && !editor.selection.isEmpty) {
            const selection = editor.selection;
            console.log('AI Debug Explainer: Valid editor selection found:', {
                start: selection.start,
                end: selection.end
            });

            const text = editor.document.getText(selection);
            console.log('AI Debug Explainer: Captured Text:', text ? `"${text.substring(0, 20)}..."` : '<empty>');

            // Get context: Paragraph around the selection (approx 5 lines up/down)
            const startLine = Math.max(0, selection.start.line - 5);
            const endLine = Math.min(editor.document.lineCount - 1, selection.end.line + 5);
            const range = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
            const contextText = editor.document.getText(range);

            await handleExplainTerm(text, contextText);
            return;
        }

        console.log('AI Debug Explainer: No active editor or empty selection. Checking clipboard (Manual Copy Workflow).');

        // Manual Copy Workflow: We assume the user has already pressed Ctrl+C
        // We do NOT attempt to trigger copy automatically as it is unreliable in this context.

        const clipboardText = await vscode.env.clipboard.readText();
        console.log('AI Debug Explainer: Clipboard text:', clipboardText ? clipboardText.substring(0, 20) + '...' : 'empty');

        if (clipboardText && clipboardText.trim().length > 0) {
            // We explain the term found in the clipboard
            await handleExplainTerm(clipboardText, `Context: ${clipboardText}`);
            return;
        }

        vscode.window.showWarningMessage('No text selected or copied. Please Select Text -> Press Ctrl+C -> Press Ctrl+Alt+E.');
    });


    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);
    context.subscriptions.push(viewTraceCommand);
    context.subscriptions.push(manualCaptureCommand);
    context.subscriptions.push(clearTracesCommand);
    context.subscriptions.push(clearFunctionExplanationsCommand);
    context.subscriptions.push(explainTermCommand);

    console.log('AI Debug Explainer: activation completed');
}

export function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    if (debugSessionTracker) {
        debugSessionTracker.dispose();
    }
}