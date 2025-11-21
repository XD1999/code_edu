import * as vscode from 'vscode';
import { KnowledgeLibrary } from './knowledgeLibrary';

export class KnowledgePanel {
	private panel: vscode.WebviewPanel | undefined;
	private knowledgeLibrary: KnowledgeLibrary;

	constructor(knowledgeLibrary: KnowledgeLibrary) {
		this.knowledgeLibrary = knowledgeLibrary;
	}

	show() {
		if (this.panel) {
			this.panel.reveal(vscode.ViewColumn.One);
		} else {
			this.panel = vscode.window.createWebviewPanel(
				'knowledgeLibrary',
				'Knowledge Library',
				vscode.ViewColumn.One,
				{
					enableScripts: true,
					retainContextWhenHidden: true
				}
			);

			this.panel.onDidDispose(() => {
				this.panel = undefined;
			});

			this.updateContent();
		}
	}

	updateContent() {
		if (!this.panel) return;

		const projectOverview = this.knowledgeLibrary.getProjectOverview();
		const functionExplanations = this.knowledgeLibrary.getAllFunctionExplanations();

		this.panel.webview.html = this.getWebviewContent(projectOverview, functionExplanations);
	}

	private getWebviewContent(projectOverview: string, functionExplanations: { functionName: string, explanation: string }[]) {
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
				: '<p>No function explanations available.</p>'
			}
			</body>
			</html>
		`;
	}
}