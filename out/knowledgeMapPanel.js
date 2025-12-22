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
exports.KnowledgeMapProvider = void 0;
const vscode = __importStar(require("vscode"));
class KnowledgeMapProvider {
    constructor(extensionUri) {
        this._nodes = [];
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
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'updateStructure':
                    this._nodes = message.nodes;
                    break;
                case 'explainTerm':
                    if (this._onExplainTerm && message.term) {
                        this._onExplainTerm(message.term, message.context || 'Context from Knowledge Map');
                    }
                    break;
            }
        });
    }
    addNode(term, explanation) {
        const newNode = {
            id: Date.now().toString(),
            term,
            explanation,
            children: []
        };
        this._nodes.push(newNode);
        this._updateView();
    }
    _updateView() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateNodes',
                nodes: this._nodes
            });
        }
    }
    _getHtmlForWebview(webview) {
        const nonce = getNonce();
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Knowledge Map</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        padding: 10px;
                    }
                    .explanation-panel {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 150px;
                        background: var(--vscode-editor-background);
                        border-top: 1px solid var(--vscode-widget-border);
                        padding: 10px;
                        overflow-y: auto;
                        box-shadow: 0 -2px 5px rgba(0,0,0,0.1);
                        z-index: 100;
                    }
                    .explanation-title {
                        font-weight: bold;
                        margin-bottom: 5px;
                        color: var(--vscode-textLink-foreground);
                    }
                    .container {
                        margin-bottom: 160px; /* Space for panel */
                    }
                    ul {
                        list-style-type: none;
                        padding-left: 20px;
                    }
                    li {
                        margin: 5px 0;
                        border: 1px solid transparent;
                    }
                    .node {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        padding: 5px 10px;
                        border-radius: 4px;
                        display: inline-block;
                        cursor: grab;
                        user-select: none;
                    }
                    .node:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .drop-zone {
                        height: 5px;
                        background: transparent;
                        margin: 2px 0;
                        transition: height 0.2s;
                    }
                    .drop-zone.drag-over {
                        height: 20px;
                        background: var(--vscode-focusBorder);
                        opacity: 0.3;
                    }
                    .node.drag-over-child {
                        outline: 2px dashed var(--vscode-focusBorder);
                    }
                </style>
            </head>
            <body>
                <div class="container" id="tree-root"></div>
                
                <div class="explanation-panel">
                    <div class="explanation-title" id="exp-title">Hover over a word</div>
                    <div id="exp-content">Explanation will appear here...</div>
                </div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let nodes = [];
                    let draggedNodeId = null;

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateNodes') {
                            nodes = message.nodes;
                            render();
                        }
                    });

                    function render() {
                        const root = document.getElementById('tree-root');
                        root.innerHTML = '';
                        root.appendChild(createList(nodes));
                    }

                    function createList(items) {
                        const ul = document.createElement('ul');
                        items.forEach(item => {
                            const li = document.createElement('li');
                            
                            const nodeDiv = document.createElement('div');
                            nodeDiv.className = 'node';
                            nodeDiv.textContent = item.term;
                            nodeDiv.draggable = true;
                            nodeDiv.dataset.id = item.id;
                            
                            // Events
                            nodeDiv.addEventListener('mouseover', () => showExplanation(item));
                            nodeDiv.addEventListener('dragstart', e => handleDragStart(e, item));
                            nodeDiv.addEventListener('dragover', e => handleDragOverNode(e));
                            nodeDiv.addEventListener('dragleave', e => handleDragLeaveNode(e));
                            nodeDiv.addEventListener('drop', e => handleDropOnNode(e, item));

                            li.appendChild(nodeDiv);

                            if (item.children && item.children.length > 0) {
                                li.appendChild(createList(item.children));
                            }
                            
                            ul.appendChild(li);
                        });
                        return ul;
                    }

                    function showExplanation(item) {
                        document.getElementById('exp-title').textContent = item.term;
                        document.getElementById('exp-content').textContent = item.explanation;
                    }

                    function handleDragStart(e, item) {
                        draggedNodeId = item.id;
                        e.dataTransfer.effectAllowed = 'move';
                    }

                    function handleDragOverNode(e) {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over-child');
                    }

                    function handleDragLeaveNode(e) {
                        e.currentTarget.classList.remove('drag-over-child');
                    }

                    function handleDropOnNode(e, targetItem) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.currentTarget.classList.remove('drag-over-child');
                        
                        if (draggedNodeId === targetItem.id) return;

                        // Send new structure request to extension (or handle locally then sync)
                        // For simplicity, let's implement a movement logic:
                        // Move draggedNodeId to be a child of targetItem.id
                        moveNode(draggedNodeId, targetItem.id);
                    }

                    // Keydown listener for Explain Term shortcut
                    window.addEventListener('keydown', event => {
                        // Check for Ctrl+Alt+E (or Cmd+Alt+E)
                        if ((event.ctrlKey || event.metaKey) && event.altKey && (event.key === 'e' || event.key === 'E')) {
                            const selection = window.getSelection().toString();
                            if (selection && selection.trim().length > 0) {
                                vscode.postMessage({ 
                                    command: 'explainTerm', 
                                    term: selection, 
                                    context: document.body.innerText.substring(0, 1000) 
                                });
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        }
                    });

                    function moveNode(sourceId, targetId) {
                        // Find and remove source
                        const { node, parent } = findNodeAndParent(nodes, sourceId);
                        if (!node) return;
                        
                        // Remove from old location
                        if (parent) {
                            parent.children = parent.children.filter(n => n.id !== sourceId);
                        } else {
                            nodes = nodes.filter(n => n.id !== sourceId);
                        }

                        // Add to target
                        const targetNode = findNode(nodes, targetId);
                        if (targetNode) {
                            targetNode.children.push(node);
                        } else {
                            // Should not happen if targetId is valid
                            nodes.push(node); 
                        }
                        
                        render();
                        // Sync back to extension
                        vscode.postMessage({ command: 'updateStructure', nodes: nodes });
                    }

                    function findNode(list, id) {
                        for (let n of list) {
                            if (n.id === id) return n;
                            if (n.children) {
                                const found = findNode(n.children, id);
                                if (found) return found;
                            }
                        }
                        return null;
                    }

                    function findNodeAndParent(list, id, parent = null) {
                        for (let n of list) {
                            if (n.id === id) return { node: n, parent };
                            if (n.children) {
                                const res = findNodeAndParent(n.children, id, n);
                                if (res) return res;
                            }
                        }
                        return null;
                    }

                    // Initial state
                    if (nodes.length === 0) {
                        document.getElementById('tree-root').innerHTML = '<p>Select text and use "AI Explain Selection" command.</p>';
                    }
                </script>
            </body>
            </html>`;
    }
}
exports.KnowledgeMapProvider = KnowledgeMapProvider;
KnowledgeMapProvider.viewType = 'ai-debug-explainer.knowledgeMapView';
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=knowledgeMapPanel.js.map