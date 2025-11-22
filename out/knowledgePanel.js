"use strict";
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
exports.KnowledgePanel = void 0;
const vscode = __importStar(require("vscode"));
class KnowledgePanel {
    constructor(knowledgeLibrary) {
        this.knowledgeLibrary = knowledgeLibrary;
    }
    show() {
        console.log('KnowledgePanel: show() called');
        if (this.panel) {
            console.log('KnowledgePanel: revealing existing panel');
            this.panel.reveal(vscode.ViewColumn.One);
        }
        else {
            console.log('KnowledgePanel: creating new panel');
            this.panel = vscode.window.createWebviewPanel('knowledgeLibrary', 'Knowledge Library', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            this.panel.onDidDispose(() => {
                console.log('KnowledgePanel: panel disposed');
                this.panel = undefined;
            });
            // Handle messages from the webview
            this.panel.webview.onDidReceiveMessage(async (message) => {
                switch (message.command) {
                    case 'deleteExplanation':
                        await this.knowledgeLibrary.deleteFunctionExplanation(message.functionName);
                        this.updateContent();
                        return;
                    case 'clearAll':
                        await this.knowledgeLibrary.clearAllFunctionExplanations();
                        this.updateContent();
                        return;
                }
            }, undefined, []);
            this.updateContent();
            console.log('KnowledgePanel: panel created and content updated');
        }
    }
    updateContent() {
        if (!this.panel)
            return;
        const projectOverview = this.knowledgeLibrary.getProjectOverview();
        const functionExplanations = this.knowledgeLibrary.getAllFunctionExplanations();
        this.panel.webview.html = this.getWebviewContent(projectOverview, functionExplanations);
    }
    getWebviewContent(projectOverview, functionExplanations) {
        return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Knowledge Library</title>
				<style>
					body {
						font-family: var(--vscode-font-family);
						color: var(--vscode-foreground);
						background-color: var(--vscode-editor-background);
						padding: 10px;
					}
					h1, h2, h3 {
						color: var(--vscode-foreground);
					}
					pre {
						background-color: var(--vscode-textBlockQuote-background);
						padding: 10px;
						border-radius: 4px;
						overflow-x: auto;
					}
					.explanation {
						margin-bottom: 20px;
						padding: 10px;
						border: 1px solid var(--vscode-widget-border);
						border-radius: 4px;
						position: relative;
					}
					.delete-btn {
						position: absolute;
						top: 10px;
						right: 10px;
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 3px;
						padding: 5px 10px;
						cursor: pointer;
					}
					.delete-btn:hover {
						background: var(--vscode-button-hoverBackground);
					}
					.clear-all-btn {
						background: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						border-radius: 3px;
						padding: 8px 15px;
						cursor: pointer;
						margin-bottom: 20px;
					}
					.clear-all-btn:hover {
						background: var(--vscode-button-hoverBackground);
					}
				</style>
			</head>
			<body>
				<h1>Knowledge Library</h1>
				
				<h2>Project Overview</h2>
				<pre>${projectOverview || 'No project overview available.'}</pre>
				
				<h2>Function Explanations</h2>
				<button class="clear-all-btn" onclick="clearAll()">Clear All Explanations</button>
				${functionExplanations.length > 0
            ? functionExplanations.map(exp => `
						<div class="explanation">
							<h3>${exp.functionName}</h3>
							<button class="delete-btn" onclick="deleteExplanation('${exp.functionName}')">Delete</button>
							<pre>${exp.explanation}</pre>
						</div>
					`).join('')
            : '<p>No function explanations available.</p>'}
			<script>
				const vscode = acquireVsCodeApi();
				
				function deleteExplanation(functionName) {
					vscode.postMessage({
						command: 'deleteExplanation',
						functionName: functionName
					});
				}
				
				function clearAll() {
					if (confirm('Are you sure you want to clear all explanations?')) {
						vscode.postMessage({
							command: 'clearAll'
						});
					}
				}
			</script>
			</body>
			</html>
		`;
    }
}
exports.KnowledgePanel = KnowledgePanel;
//# sourceMappingURL=knowledgePanel.js.map