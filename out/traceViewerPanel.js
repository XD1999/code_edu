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
exports.TraceViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("./core/util");
class TraceViewProvider {
    constructor(extensionUri) {
        this._currentStepIndex = 0;
        this._architectureGraph = '';
        this._extensionUri = extensionUri;
    }
    setExplainHandler(handler) {
        this._onExplainTerm = handler;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'resources')]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'jumpToLocation':
                    if (message.filePath && message.line) {
                        await this._jumpToLocation(message.filePath, message.line);
                    }
                    break;
                case 'nextStep':
                    this._nextStep();
                    break;
                case 'prevStep':
                    this._prevStep();
                    break;
                case 'jumpTo':
                    if (typeof message.stepIndex === 'number') {
                        this._jumpToStep(message.stepIndex);
                    }
                    break;
                case 'explainTerm':
                    if (this._onExplainTerm && message.term) {
                        // Use the term as context if no context provided, or just the whole trace? 
                        // For now let's just use the term or some default context.
                        // Ideally we grab surrounding text from the webview but that's hard to get in extension host.
                        // The webview sends 'context' if possible.
                        this._onExplainTerm(message.term, message.context || 'Context from Trace View');
                    }
                    break;
            }
        });
        // If we have pending data, update the view now
        if (this._currentTrace) {
            this.updateTrace(this._currentTrace, this._currentExplanations || new Map());
        }
    }
    updateTrace(trace, explanations) {
        this._currentTrace = trace;
        this._currentExplanations = explanations;
        this._currentStepIndex = 0; // Reset to first step when a new trace is loaded
        if (this._view) {
            this._view.description = `Trace ID: ${trace.id.slice(0, 8)}`;
            this._postUpdateMessage();
        }
    }
    _postUpdateMessage() {
        if (this._view && this._currentTrace && this._currentExplanations) {
            const currentStep = this._currentTrace.steps[this._currentStepIndex];
            const explanation = this._currentExplanations.get(currentStep.functionName) || '(No explanation available)';
            this._view.webview.postMessage({
                command: 'updateContent',
                trace: {
                    id: this._currentTrace.id,
                    steps: this._currentTrace.steps,
                    createdAt: this._currentTrace.createdAt
                },
                currentStepIndex: this._currentStepIndex,
                explanation: explanation
            });
        }
    }
    async _jumpToLocation(filePath, line) {
        try {
            // Handle remote URIs
            const document = filePath.includes('://')
                ? await vscode.workspace.openTextDocument(vscode.Uri.parse(filePath))
                : await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(document, {
                viewColumn: vscode.ViewColumn.One,
                preserveFocus: true,
                selection: new vscode.Range(line - 1, 0, line - 1, 0)
            });
        }
        catch (error) {
            console.error('Failed to jump to location:', error);
            vscode.window.showErrorMessage(`Failed to jump to ${filePath}:${line}`);
        }
    }
    _nextStep() {
        if (this._currentTrace && this._currentStepIndex < this._currentTrace.steps.length - 1) {
            this._currentStepIndex++;
            this._postUpdateMessage();
            const step = this._currentTrace.steps[this._currentStepIndex];
            this._jumpToLocation(step.filePath, step.line);
        }
    }
    _prevStep() {
        if (this._currentTrace && this._currentStepIndex > 0) {
            this._currentStepIndex--;
            this._postUpdateMessage();
            const step = this._currentTrace.steps[this._currentStepIndex];
            this._jumpToLocation(step.filePath, step.line);
        }
    }
    _jumpToStep(index) {
        if (this._currentTrace && index >= 0 && index < this._currentTrace.steps.length) {
            this._currentStepIndex = index;
            this._postUpdateMessage();
            const step = this._currentTrace.steps[this._currentStepIndex];
            this._jumpToLocation(step.filePath, step.line);
        }
    }
    updateArchitecture(graph) {
        this._architectureGraph = graph;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateArchitecture',
                graph: graph
            });
        }
    }
    _getHtmlForWebview(webview) {
        const nonce = (0, util_1.getNonce)();
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net;">
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Trace Chat</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        padding: 10px;
                        color: var(--vscode-foreground);
                    }
                    .chat-message {
                        background-color: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 5px;
                        padding: 10px;
                        margin-bottom: 10px;
                    }
                    .explanation-header {
                        font-weight: bold;
                        margin-bottom: 5px;
                    }
                    .controls {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
                    button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 5px 10px;
                        cursor: pointer;
                        border-radius: 3px;
                    }
                    button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    button:disabled {
                        opacity: 0.5;
                        cursor: default;
                    }
                    .step-list {
                        margin-top: 20px;
                        max-height: 200px;
                        overflow-y: auto;
                        border-top: 1px solid var(--vscode-widget-border);
                    }
                    .step-item {
                        padding: 5px;
                        cursor: pointer;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    .step-item:hover {
                        background-color: var(--vscode-list-hoverBackground);
                    }
                    .step-item.active {
                        background-color: var(--vscode-list-activeSelectionBackground);
                        color: var(--vscode-list-activeSelectionForeground);
                    }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
                <script nonce="${nonce}">
                    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
                    window.mermaid = mermaid;
                </script>
            </head>
            <body>
                <div class="tab-bar" style="display:flex;border-bottom:1px solid var(--vscode-panel-border);margin-bottom:10px;position:sticky;top:0;background:var(--vscode-editor-background);z-index:100;">
                    <div class="tab active" data-tab="trace" style="padding:8px 15px;cursor:pointer;border-bottom:2px solid var(--vscode-textLink-activeForeground);font-weight:500;color:var(--vscode-textLink-activeForeground);">Trace</div>
                    <div class="tab" data-tab="architecture" style="padding:8px 15px;cursor:pointer;border-bottom:2px solid transparent;font-weight:500;">Arch</div>
                </div>
                <div id="trace-view">
                <div class="controls">
                    <button id="prevBtn" onclick="prevStep()">Previous</button>
                    <span id="stepCounter">Step 0/0</span>
                    <button id="nextBtn" onclick="nextStep()">Next</button>
                </div>

                <div class="chat-message">
                    <div class="explanation-header">AI Explanation</div>
                    <div id="explanationContent">Waiting for trace...</div>
                </div>

                <div class="step-list" id="stepList">
                    <!-- Steps will be populated here -->
                </div>

                </div>
                <div id="architecture-view" class="mermaid" style="display:none;padding:10px;background:var(--vscode-editor-background);border-radius:5px;border:1px solid var(--vscode-widget-border);min-height:200px;"></div>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentTrace = null;
                    let currentIndex = 0;
                    let architectureGraph = '';


                    // Tab switching
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.addEventListener('click', () => {
                            const tabId = tab.getAttribute('data-tab');
                            document.querySelectorAll('.tab').forEach(t => {
                                t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
                            });
                            document.getElementById('trace-view').style.display = tabId === 'trace' ? 'block' : 'none';
                            document.getElementById('architecture-view').style.display = tabId === 'architecture' ? 'block' : 'none';
                            if (tabId === 'architecture') {
                                const container = document.getElementById('architecture-view');
                                const archGraph = architectureGraph;
                                if (archGraph && window.mermaid) {
                                    container.removeAttribute('data-processed');
                                    container.textContent = archGraph;
                                    window.mermaid.run({ nodes: [container] }).catch(e => console.error(e));
                                } else {
                                    container.textContent = archGraph ? 'Loading renderer...' : 'No graph available.';
                                }
                            }
                        });
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.command) {
                            case 'updateContent':
                                updateUI(message.trace, message.currentStepIndex, message.explanation);
                                break;
                            case 'updateArchitecture':
                                architectureGraph = message.graph;
                                break;
                        }
                    });

                    function updateUI(trace, index, explanation) {
                        currentTrace = trace;
                        currentIndex = index;

                        // Update explanation
                        document.getElementById('explanationContent').textContent = explanation;
                        
                        // Update counter
                        document.getElementById('stepCounter').textContent = 'Step ' + (index + 1) + '/' + trace.steps.length;

                        // Update Step List
                        const list = document.getElementById('stepList');
                        list.innerHTML = '';
                        trace.steps.forEach((step, i) => {
                            const div = document.createElement('div');
                            div.className = 'step-item' + (i === index ? ' active' : '');
                            div.textContent = (i + 1) + '. ' + step.functionName;
                            div.onclick = () => {
                                vscode.postMessage({ command: 'jumpTo', stepIndex: i });
                            };
                            list.appendChild(div);
                        });

                        // Scroll active item into view
                        const activeItem = list.children[index];
                        if (activeItem) {
                            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        }
                    }

                    function nextStep() {
                        vscode.postMessage({ command: 'nextStep' });
                    }

                    function prevStep() {
                        vscode.postMessage({ command: 'prevStep' });
                    }

                    window.addEventListener('keydown', event => {
                        // Handled by global keybinding to avoid duplicate triggers
                    });
                </script>
            </body>
            </html>`;
    }
}
exports.TraceViewProvider = TraceViewProvider;
TraceViewProvider.viewType = 'ai-debug-explainer.traceView';
//# sourceMappingURL=traceViewerPanel.js.map