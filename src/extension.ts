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
            console.log('AI Debug Explainer: automatic onDidChangeActiveDebugSession triggered', session?.id);
            if (session) {
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
        })
    );

    // Register the start learning command
    const startLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.startLearning', () => {
        console.log('AI Debug Explainer: startLearning command executed');
        if (debugSessionTracker) {
            debugSessionTracker.startRecording();
            vscode.window.showInformationMessage('AI Learning Mode Started. Please run your code to teach the extension.');
        } else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    });

    // Register the stop learning command
    const stopLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.stopLearning', async () => {
        console.log('AI Debug Explainer: stopLearning command executed');
        if (debugSessionTracker) {
            vscode.window.showInformationMessage('Stopping learning mode...');
            const count = await debugSessionTracker.stopRecording();
            if (count > 0) {
                vscode.window.showInformationMessage(`Learning Complete! Learned ${count} functions based on your execution.`);
            }
        } else {
            vscode.window.showErrorMessage('No active debug session tracker.');
        }
    });

    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);

    console.log('AI Debug Explainer: activation completed');
}

export function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    if (debugSessionTracker) {
        debugSessionTracker.dispose();
    }
}