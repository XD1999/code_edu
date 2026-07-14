"use strict";
/** Learning-instance lifecycle commands: save, load, delete. */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLearningInstanceCommands = void 0;
const vscode = __importStar(require("vscode"));
function registerLearningInstanceCommands(services) {
    const disposables = [];
    const { knowledgeLibrary, knowledgeMapProvider } = services;
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.saveLearningInstance', async (contextNode, existingName, graph) => {
        let name = existingName;
        if (!name) {
            name = await vscode.window.showInputBox({
                prompt: 'Enter a name for this learning instance',
                placeHolder: 'e.g., Understanding Maxwell Equations'
            });
        }
        if (!name)
            return;
        // Check if an instance with this name already exists
        const existingInstance = knowledgeLibrary.findLearningInstanceByName(name);
        const instance = {
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
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.loadLearningInstance', async (instanceId) => {
        const instance = knowledgeLibrary.getLearningInstance(instanceId);
        if (instance) {
            knowledgeMapProvider.setContext(instance.rootContext, instance.name);
            // Restore the saved knowledge graph for this instance
            if (instance.knowledgeGraph) {
                knowledgeMapProvider.updateKnowledgeGraph(instance.knowledgeGraph);
            }
            else {
                knowledgeMapProvider.updateKnowledgeGraph({ edges: [] });
            }
            vscode.window.showInformationMessage(`Loaded instance: ${instance.name}`);
        }
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.deleteLearningInstance', async (instanceId) => {
        await knowledgeLibrary.deleteLearningInstance(instanceId);
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        vscode.window.showInformationMessage(`Deleted learning instance.`);
    }));
    return vscode.Disposable.from(...disposables);
}
exports.registerLearningInstanceCommands = registerLearningInstanceCommands;
//# sourceMappingURL=learningInstanceCommands.js.map