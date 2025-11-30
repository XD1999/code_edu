import * as vscode from 'vscode';
import * as net from 'net';
import { DebugSessionTracker } from './debugSessionTracker';
import { KnowledgeLibrary } from './knowledgeLibrary';
import { AIService } from './aiService';

let isActive = false;
let debugSessionTracker: DebugSessionTracker | null = null;
let knowledgeLibrary: KnowledgeLibrary | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Explainer: activate called');

    // Set default auto-select family attempt timeout to 1000ms to improve connectivity
    if ((net as any).setDefaultAutoSelectFamilyAttemptTimeout) {
        (net as any).setDefaultAutoSelectFamilyAttemptTimeout(1000);
    }

    // Initialize knowledge library
    knowledgeLibrary = new KnowledgeLibrary(context);

    // Register the toggle command
    const toggleCommand = vscode.commands.registerCommand('ai-debug-explainer.toggle', () => {
        console.log('AI Debug Explainer: toggle command executed, current state:', isActive);
        isActive = !isActive;
        vscode.window.showInformationMessage(`AI Debug Explainer is now ${isActive ? 'active' : 'inactive'}`);

        if (isActive && !debugSessionTracker) {
            console.log('AI Debug Explainer: creating new DebugSessionTracker');
            const aiService = new AIService();
            debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!);

            // Subscribe to debug session events
            context.subscriptions.push(
                vscode.debug.onDidChangeActiveDebugSession(session => {
                    console.log('AI Debug Explainer: onDidChangeActiveDebugSession triggered', session?.id);
                    if (session) {
                        debugSessionTracker?.setActiveSession(session);
                    }
                }),
                vscode.debug.onDidTerminateDebugSession(() => {
                    console.log('AI Debug Explainer: onDidTerminateDebugSession triggered');
                    debugSessionTracker?.clearActiveSession();
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
        vscode.debug.onDidChangeActiveDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Active session changed', {
                sessionId: session?.id,
                sessionType: session?.type,
                sessionName: session?.name,
                timestamp: new Date().toISOString(),
                hasDebugSessionTracker: !!debugSessionTracker,
                sessionConfiguration: session?.configuration
            });

            if (session) {
                console.log('AI Debug Explainer: [SESSION DETAILS] New active session details', {
                    sessionId: session.id,
                    type: session.type,
                    name: session.name,
                    workspaceFolder: session.workspaceFolder?.uri.toString(),
                    configuration: session.configuration
                });

                // Log configuration details
                if (session.configuration) {
                    console.log('AI Debug Explainer: [SESSION CONFIG] Configuration details', {
                        program: session.configuration.program,
                        args: session.configuration.args,
                        env: session.configuration.env,
                        justMyCode: session.configuration.justMyCode
                    });
                }

                if (!debugSessionTracker) {
                    console.log('AI Debug Explainer: automatically creating DebugSessionTracker');
                    const aiService = new AIService();
                    debugSessionTracker = new DebugSessionTracker(aiService, knowledgeLibrary!);
                }
                debugSessionTracker.setActiveSession(session);
            } else if (!session && debugSessionTracker) {
                console.log('AI Debug Explainer: automatically clearing DebugSessionTracker');
                debugSessionTracker.clearActiveSession();
            }
        }),
        vscode.debug.onDidStartDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session STARTED', {
                sessionId: session.id,
                type: session.type,
                name: session.name,
                timestamp: new Date().toISOString()
            });
        }),
        vscode.debug.onDidTerminateDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session TERMINATED', {
                sessionId: session.id,
                type: session.type,
                name: session.name,
                timestamp: new Date().toISOString()
            });
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

    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);
    context.subscriptions.push(viewTraceCommand);
    context.subscriptions.push(manualCaptureCommand);

    console.log('AI Debug Explainer: activation completed');
}

export function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    if (debugSessionTracker) {
        debugSessionTracker.dispose();
    }
}