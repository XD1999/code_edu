/** Context-extraction command: pulls context text from the clipboard. */

import * as vscode from 'vscode';
import { Services } from '../core/services';

export function registerContextCommands(services: Services): vscode.Disposable {
    return vscode.commands.registerCommand('ai-debug-explainer.extractContext', async () => {
        console.log('AI Debug Explainer: extractContext command triggered');
        const clipboardText = await vscode.env.clipboard.readText();

        if (clipboardText && clipboardText.trim().length > 0) {
            services.knowledgeMapProvider.setCurrentContext(clipboardText);

            // Focus the view
            await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
            vscode.window.showInformationMessage('Context extracted from clipboard.');
        } else {
            vscode.window.showWarningMessage('Clipboard is empty. Please copy some text first.');
        }
    });
}
