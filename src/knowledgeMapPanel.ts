import * as vscode from 'vscode';

interface TermNode {
    id: string;
    term: string;
    explanation: string;
    childContext?: ContextNode; // For nested context
}

interface ParagraphNode {
    id: string;
    text: string;
    terms: TermNode[];
}

interface ContextNode {
    id: string;
    rawText: string;
    paragraphs: ParagraphNode[];
}

export class KnowledgeMapProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-debug-explainer.knowledgeMapView';

    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _currentContext: ContextNode | null = null;
    private _architectureGraph: string = '';
    private _onExplainTerm?: (term: string, context: string) => Promise<void>;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    public setCurrentContext(text: string) {
        this._currentContext = this._createContext(text);
        this._updateView();
    }

    private _createContext(text: string): ContextNode {
        // Split text by double newlines to find paragraphs
        const paragraphsRaw = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

        const paragraphs: ParagraphNode[] = paragraphsRaw.map((p, index) => ({
            id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: p.trim(),
            terms: []
        }));

        return {
            id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            rawText: text,
            paragraphs: paragraphs
        };
    }

    public addTerm(term: string, explanation: string) {
        if (!this._currentContext) {
            this.setCurrentContext(term);
        }

        if (this._currentContext) {
            const added = this._recursiveAddTerm(this._currentContext, term, explanation);

            if (!added) {
                // Return to fallback behavior: add to global "loose ends" if strictly needed,
                // but let's try to add it to the first paragraph of the main context as a fallback
                // if it wasn't found anywhere.
                // Or create a loose end in the main context.
                let loosePara = this._currentContext.paragraphs.find(p => p.id === 'loose-ends');
                if (!loosePara) {
                    loosePara = { id: 'loose-ends', text: 'External / Unmatched Terms', terms: [] };
                    this._currentContext.paragraphs.push(loosePara);
                }
                loosePara.terms.push({
                    id: `term-${Date.now()}`,
                    term,
                    explanation
                });
            }
            this._updateView();
        }
    }

    private _recursiveAddTerm(context: ContextNode, term: string, explanation: string): boolean {
        // 1. Try to find term in current context's paragraphs
        // Matching text (case-insensitive check but preserve term formatting?)
        // Let's use includes.
        const targetPara = context.paragraphs.find(p => p.text.toLowerCase().includes(term.toLowerCase()));

        if (targetPara) {
            targetPara.terms.push({
                id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                term,
                explanation
            });
            return true;
        }

        // 2. If not found in paragraphs, search in existing terms' explanations (nested)
        for (const para of context.paragraphs) {
            for (const t of para.terms) {
                // If the term is found in this existing term's explanation
                if (t.explanation.toLowerCase().includes(term.toLowerCase())) {
                    // Ensure the term has a child context
                    if (!t.childContext) {
                        t.childContext = this._createContext(t.explanation);
                    }
                    // Add to this child context
                    return this._recursiveAddTerm(t.childContext, term, explanation);
                }

                if (t.childContext) {
                    if (this._recursiveAddTerm(t.childContext, term, explanation)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    public async processInputTerm(term: string) {
        if (!this._onExplainTerm) {
            return;
        }

        if (!this._currentContext) {
            vscode.window.showWarningMessage('No context set! Please copy text and press Ctrl+Alt+S first.');
            return;
        }
        const contextText = this._currentContext.rawText;
        await this._onExplainTerm(term, contextText);
    }

    public setExplainHandler(handler: (term: string, context: string) => Promise<void>) {
        this._onExplainTerm = handler;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'resources')]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        if (this._currentContext) {
            this._updateView();
        }
        if (this._architectureGraph) {
            this.updateArchitecture(this._architectureGraph);
        }

        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'explainTerm':
                    if (this._onExplainTerm && message.term) {
                        const contextData = message.context || (this._currentContext ? this._currentContext.rawText : '');
                        this._onExplainTerm(message.term, contextData);
                    }
                    break;
            }
        });
    }

    private _updateView() {
        if (this._view && this._currentContext) {
            this._view.webview.postMessage({
                command: 'updateContext',
                context: this._currentContext
            });
        }
    }

    public updateArchitecture(graph: string) {
        this._architectureGraph = graph;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateArchitecture',
                graph: graph
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Knowledge Map</title>
                <style>
                    body {
                        font-family: var(--vscode-editor-font-family);
                        color: var(--vscode-editor-foreground);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    .tab-bar {
                        display: flex;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        margin-bottom: 20px;
                        position: sticky;
                        top: 0;
                        background: var(--vscode-editor-background);
                        z-index: 100;
                    }
                    .tab {
                        padding: 8px 15px;
                        cursor: pointer;
                        border-bottom: 2px solid transparent;
                        font-weight: 500;
                    }
                    .tab.active {
                        border-bottom-color: var(--vscode-textLink-activeForeground);
                        color: var(--vscode-textLink-activeForeground);
                    }
                    
                    /* Document Layout */
                    .paragraph-block {
                        margin-bottom: 15px;
                        position: relative;
                    }
                    .paragraph-text {
                        padding: 10px;
                        border-left: 3px solid var(--vscode-editor-lineHighlightBorder);
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 2px;
                        white-space: pre-wrap;
                    }
                    
                    /* Term Line */
                    .term-line {
                        display: flex;
                        flex-direction: row;
                        flex-wrap: wrap;
                        gap: 10px;
                        margin-top: 10px;
                        padding-left: 10px;
                        align-items: center;
                    }
                    .term-line::before {
                        content: 'Terms:';
                        font-size: 0.8em;
                        opacity: 0.7;
                        margin-right: 5px;
                    }
                    .term-chip {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        padding: 4px 12px;
                        border: 1px solid var(--vscode-button-border);
                        border-radius: 12px;
                        font-family: var(--vscode-font-family);
                        font-size: 0.9em;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .term-chip:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                        transform: translateY(-1px);
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    }
                    .term-chip:active {
                        transform: translateY(0);
                    }
                    .term-chip.active {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    
                    /* Inline Explanations */
                    .explanation-box {
                        margin-top: 10px;
                        margin-left: 10px;
                        padding: 15px;
                        border: 1px solid var(--vscode-focusBorder);
                        border-radius: 5px;
                        background: var(--vscode-editor-background);
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        display: none;
                        animation: slideDown 0.2s ease-out;
                    }
                    .explanation-box.visible {
                        display: block;
                    }
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }

                    .nested-context {
                        margin-top: 15px;
                        margin-left: 20px; /* Indentation for nested items */
                        border-left: 2px dashed var(--vscode-tree-indentGuidesStroke);
                        padding-left: 10px;
                    }

                    #architecture-view {
                        display: none;
                        width: 100%;
                        height: 500px;
                        overflow: auto;
                    }
                </style>
                <script type="module" nonce="${nonce}">
                    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
                    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
                    window.mermaid = mermaid;
                </script>
            </head>
            <body>
                <div class="tab-bar">
                    <div class="tab active" onclick="switchTab('knowledge-map')">Knowledge Map</div>
                    <div class="tab" onclick="switchTab('architecture-view')">Architecture</div>
                </div>

                <div class="container" id="doc-root">
                    <div style="text-align: center; color: var(--vscode-descriptionForeground); margin-top: 50px;">
                        <p>No Context Set.</p>
                        <p>1. Copy text -> <b>Ctrl+Alt+S</b> to set context.</p>
                        <p>2. Copy term -> <b>Ctrl+Alt+E</b> to explain it here.</p>
                    </div>
                </div>
                <div id="architecture-view" class="mermaid"></div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentContext = null;
                    let architectureGraph = '';

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateContext') {
                            currentContext = message.context;
                            renderDocument();
                        }
                        if (message.command === 'updateArchitecture') {
                             architectureGraph = message.graph;
                             if (isArchitectureTabActive()) renderArchitecture();
                        }
                    });

                    function isArchitectureTabActive() {
                        return document.getElementById('architecture-view').style.display === 'block';
                    }

                    function renderArchitecture() {
                         const container = document.getElementById('architecture-view');
                         if (architectureGraph && window.mermaid) {
                             container.removeAttribute('data-processed');
                             container.textContent = architectureGraph;
                             window.mermaid.run({ nodes: [container] }).catch(e => console.error(e));
                         } else {
                             container.textContent = architectureGraph ? 'Loading renderer...' : 'No graph available.';
                         }
                    }

                    function switchTab(tabId) {
                         document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                         if (tabId === 'knowledge-map') {
                             document.querySelector('.tab:nth-child(1)').classList.add('active');
                             document.getElementById('doc-root').style.display = 'block';
                             document.getElementById('architecture-view').style.display = 'none';
                         } else {
                             document.querySelector('.tab:nth-child(2)').classList.add('active');
                             document.getElementById('doc-root').style.display = 'none';
                             document.getElementById('architecture-view').style.display = 'block';
                             renderArchitecture();
                         }
                    }

                    function renderDocument() {
                        const root = document.getElementById('doc-root');
                        root.innerHTML = '';
                        if (!currentContext || !currentContext.paragraphs) return;
                        renderContext(currentContext, root);
                    }

                    function renderContext(contextData, container) {
                         if (!contextData || !contextData.paragraphs) return;

                         contextData.paragraphs.forEach(para => {
                            const block = document.createElement('div');
                            block.className = 'paragraph-block';

                            const textDiv = document.createElement('div');
                            textDiv.className = 'paragraph-text';
                            textDiv.textContent = para.text;
                            block.appendChild(textDiv);

                            if (para.terms && para.terms.length > 0) {
                                const termLine = document.createElement('div');
                                termLine.className = 'term-line';
                                
                                para.terms.forEach(term => {
                                    const chip = document.createElement('button');
                                    chip.className = 'term-chip';
                                    chip.textContent = term.term;
                                    chip.onclick = () => toggleExplanation(term.id);
                                    termLine.appendChild(chip);
                                });
                                block.appendChild(termLine);
                            }

                            if (para.terms && para.terms.length > 0) {
                                para.terms.forEach(term => {
                                    const expBox = document.createElement('div');
                                    expBox.id = 'exp-' + term.id;
                                    expBox.className = 'explanation-box';
                                    expBox.style.display = 'none'; 
                                    
                                    const contentDiv = document.createElement('div');
                                    contentDiv.innerHTML = '<strong>' + term.term + '</strong>: <br/>' + term.explanation.replace(/\\n/g, '<br/>');
                                    expBox.appendChild(contentDiv);
                                    
                                    if (term.childContext) {
                                        const nestedRoot = document.createElement('div');
                                        nestedRoot.className = 'nested-context';
                                        renderContext(term.childContext, nestedRoot);
                                        expBox.appendChild(nestedRoot);
                                    }
                                    
                                    block.appendChild(expBox);
                                });
                            }

                            container.appendChild(block);
                        });
                    }

                    function toggleExplanation(termId) {
                        const el = document.getElementById('exp-' + termId);
                        if (el) {
                            const isVisible = el.classList.contains('visible');
                            if (isVisible) {
                                el.classList.remove('visible');
                                el.style.display = 'none';
                            } else {
                                el.classList.add('visible');
                                el.style.display = 'block';
                            }
                        }
                    }
                </script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
