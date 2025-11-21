import * as vscode from 'vscode';
import { DebugSessionTracker } from './debugSessionTracker';
import { KnowledgeLibrary } from './knowledgeLibrary';
import { AIService } from './aiService';
import { KnowledgePanel } from './knowledgePanel';

let isActive = false;
let debugSessionTracker: DebugSessionTracker | null = null;
let knowledgeLibrary: KnowledgeLibrary | null = null;
let knowledgePanel: KnowledgePanel | null = null;

export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Explainer: activate called');

    // Initialize knowledge library
    knowledgeLibrary = new KnowledgeLibrary(context);
    knowledgePanel = new KnowledgePanel(knowledgeLibrary);

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

    // Register command to show knowledge panel
    const showKnowledgeCommand = vscode.commands.registerCommand('ai-debug-explainer.showKnowledge', () => {
        console.log('AI Debug Explainer: showKnowledge command executed');
        knowledgePanel?.show();
    });

    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(showKnowledgeCommand);

    console.log('AI Debug Explainer: activation completed');
}

export function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    if (debugSessionTracker) {
        debugSessionTracker.dispose();
    }
}