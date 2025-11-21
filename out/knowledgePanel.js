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
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
        }
        else {
            this.panel = vscode.window.createWebviewPanel('knowledgeLibrary', 'Knowledge Library', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true
            });
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
            this.updateContent();
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
					}
				</style>
			</head>
			<body>
				<h1>Knowledge Library</h1>
				
				<h2>Project Overview</h2>
				<pre>${projectOverview || 'No project overview available.'}</pre>
				
				<h2>Function Explanations</h2>
				${functionExplanations.length > 0
            ? functionExplanations.map(exp => `
						<div class="explanation">
							<h3>${exp.functionName}</h3>
							<pre>${exp.explanation}</pre>
						</div>
					`).join('')
            : '<p>No function explanations available.</p>'}
			</body>
			</html>
		`;
    }
}
exports.KnowledgePanel = KnowledgePanel;
//# sourceMappingURL=knowledgePanel.js.map