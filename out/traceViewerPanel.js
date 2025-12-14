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
exports.TraceViewerPanel = void 0;
const vscode = __importStar(require("vscode"));
class TraceViewerPanel {
    constructor(panel, extensionUri, trace, explanations) {
        this._currentStepIndex = 0;
        this._functionExplanations = new Map();
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._trace = trace;
        this._functionExplanations = explanations;
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, []);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'jumpToLocation':
                    await this._jumpToLocation(message.filePath, message.line);
                    return;
                case 'nextStep':
                    this._nextStep();
                    return;
                case 'prevStep':
                    this._prevStep();
                    return;
            }
        }, null, []);
    }
    static createOrShow(extensionUri, trace, explanations) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it.
        if (TraceViewerPanel.currentPanel) {
            TraceViewerPanel.currentPanel._panel.reveal(column);
            TraceViewerPanel.currentPanel._trace = trace;
            TraceViewerPanel.currentPanel._functionExplanations = explanations;
            TraceViewerPanel.currentPanel._currentStepIndex = 0;
            TraceViewerPanel.currentPanel._update();
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel('traceViewer', 'Trace Viewer', column || vscode.ViewColumn.One, {
            // Enable scripts in the webview
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'resources')]
        });
        TraceViewerPanel.currentPanel = new TraceViewerPanel(panel, extensionUri, trace, explanations);
    }
    dispose() {
        TraceViewerPanel.currentPanel = undefined;
        this._panel.dispose();
    }
    async _jumpToLocation(filePath, line) {
        try {
            // Handle remote URIs
            const document = filePath.includes('://')
                ? await vscode.workspace.openTextDocument(vscode.Uri.parse(filePath))
                : await vscode.workspace.openTextDocument(filePath);
            const editor = await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: true
            });
            // Highlight the line
            const range = new vscode.Range(new vscode.Position(line - 1, 0), new vscode.Position(line - 1, 0));
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            // Add decoration
            const decorationType = vscode.window.createTextEditorDecorationType({
                backgroundColor: 'rgba(255, 255, 0, 0.3)',
                isWholeLine: true
            });
            editor.setDecorations(decorationType, [range]);
            // Remove decoration after 2 seconds
            setTimeout(() => {
                decorationType.dispose();
            }, 2000);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Could not jump to file: ${filePath}`);
        }
    }
    _nextStep() {
        if (this._trace && this._currentStepIndex < this._trace.steps.length - 1) {
            this._currentStepIndex++;
            this._update();
            const step = this._trace.steps[this._currentStepIndex];
            this._jumpToLocation(step.filePath, step.line);
        }
    }
    _prevStep() {
        if (this._trace && this._currentStepIndex > 0) {
            this._currentStepIndex--;
            this._update();
            const step = this._trace.steps[this._currentStepIndex];
            this._jumpToLocation(step.filePath, step.line);
        }
    }
    _update() {
        const webview = this._panel.webview;
        this._panel.title = `Trace: ${this._trace?.id}`;
        webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        if (!this._trace) {
            return `<!DOCTYPE html><html><body>No trace loaded</body></html>`;
        }
        const currentStep = this._trace.steps[this._currentStepIndex];
        const explanation = this._functionExplanations.get(currentStep.functionName) || '(No explanation available)';
        // Generate nodes for the graph
        // Simple visualization: List of bubbles
        const stepsHtml = this._trace.steps.map((step, index) => {
            const isCurrent = index === this._currentStepIndex;
            return `
                <div class="step ${isCurrent ? 'active' : ''}" onclick="jumpTo(${index})">
                    <div class="step-header">
                        <span class="step-index">#${index + 1}</span>
                        <span class="step-function">${step.functionName}</span>
                    </div>
                </div>
            `;
        }).join('');
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: sans-serif; padding: 10px; color: var(--vscode-editor-foreground); }
                    .container { display: flex; flex-direction: column; height: 100vh; }
                    .controls { margin-bottom: 20px; display: flex; gap: 10px; }
                    .panorama { flex: 1; overflow-y: auto; border: 1px solid var(--vscode-widget-border); padding: 10px; margin-bottom: 20px; }
                    .explanation-panel { height: 200px; padding: 10px; background: var(--vscode-editor-inactiveSelectionBackground); overflow-y: auto; }
                    
                    button { 
                        padding: 8px 16px; 
                        background: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground); 
                        border: none; 
                        cursor: pointer;
                    }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    
                    .step { margin: 5px 0; padding: 8px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); cursor: pointer; }
                    .step.active { border-left: 5px solid var(--vscode-progressBar-background); background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
                    .step-index { font-weight: bold; margin-right: 10px; }
                    .code-block { font-family: monospace; white-space: pre-wrap; }
                </style>
                <script>
                    const vscode = acquireVsCodeApi();
                    function next() { vscode.postMessage({ command: 'nextStep' }); }
                    function prev() { vscode.postMessage({ command: 'prevStep' }); }
                </script>
            </head>
            <body>
                <div class="container">
                    <div class="controls">
                        <button onclick="prev()">Previous</button>
                        <button onclick="next()">Next</button>
                        <span>Step ${this._currentStepIndex + 1} of ${this._trace.steps.length}</span>
                    </div>
                    
                    <div class="panorama">
                        <h3>Execution Sequence</h3>
                        ${stepsHtml}
                    </div>
                    
                    <div class="explanation-panel">
                        <h3>AI Explanation: ${currentStep.functionName}</h3>
                        <div class="code-block">${explanation.replace(/\n/g, '<br/>')}</div>
                    </div>
                </div>
            </body>
            </html>`;
    }
}
exports.TraceViewerPanel = TraceViewerPanel;
//# sourceMappingURL=traceViewerPanel.js.map