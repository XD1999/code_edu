/** Learning-instance lifecycle commands: save, load, delete. */

import * as vscode from 'vscode';
import { Services } from '../core/services';
import { ContextNode, KnowledgeGraph, LearningInstance } from '../traceModels';

export function registerLearningInstanceCommands(services: Services): vscode.Disposable {
    const disposables: vscode.Disposable[] = [];
    const { knowledgeLibrary, knowledgeMapProvider } = services;

    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.saveLearningInstance', async (contextNode: ContextNode, existingName?: string, graph?: KnowledgeGraph) => {
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
            knowledgeGraph: graph,
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
    }));

    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.loadLearningInstance', async (instanceId: string) => {
        const instance = knowledgeLibrary.getLearningInstance(instanceId);
        if (instance) {
            knowledgeMapProvider.setContext(instance.rootContext, instance.name);
            // Restore the saved knowledge graph for this instance
            if (instance.knowledgeGraph) {
                knowledgeMapProvider.updateKnowledgeGraph(instance.knowledgeGraph);
            } else {
                knowledgeMapProvider.updateKnowledgeGraph({ edges: [] });
            }
            vscode.window.showInformationMessage(`Loaded instance: ${instance.name}`);
        }
    }));

    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.deleteLearningInstance', async (instanceId: string) => {
        await knowledgeLibrary.deleteLearningInstance(instanceId);
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        vscode.window.showInformationMessage(`Deleted learning instance.`);
    }));

    return vscode.Disposable.from(...disposables);
}
