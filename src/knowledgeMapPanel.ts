import * as vscode from 'vscode';
import { ContextNode, ParagraphNode, TermNode, LearningInstance } from './traceModels';

export class KnowledgeMapProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-debug-explainer.knowledgeMapView';

    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _currentContext: ContextNode | null = null;
    private _focusedTermId: string | null = null;
    private _architectureGraph: string = '';
    private _learningInstances: LearningInstance[] = [];
    private _onExplainTerm?: (term: string, context: string, type?: 'general' | 'analogy' | 'example' | 'math') => Promise<void>;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    public setCurrentContext(text: string) {
        this._currentContext = this._createContext(text);
        this._updateView();
    }

    public setContext(context: ContextNode) {
        this._currentContext = context;
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

    public async processInputTerm(term: string, type: 'general' | 'analogy' | 'example' | 'math' = 'general') {
        if (!this._onExplainTerm) {
            return;
        }

        if (!this._currentContext) {
            vscode.window.showWarningMessage('No context set! Please copy text and press Ctrl+Alt+S first.');
            return;
        }
        const contextText = this._currentContext.rawText;
        await this._onExplainTerm(term, contextText, type);
    }

    public setExplainHandler(handler: (term: string, context: string, type?: 'general' | 'analogy' | 'example' | 'math') => Promise<void>) {
        this._onExplainTerm = handler;
    }

    public setLearningInstances(instances: LearningInstance[]) {
        this._learningInstances = instances;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateInstances',
                instances: this._learningInstances
            });
        }
    }

    public getCurrentContext(): ContextNode | null {
        return this._currentContext;
    }

    public getFocusedTermId(): string | null {
        return this._focusedTermId;
    }

    public postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
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
                case 'deleteTerm':
                    if (message.termId) {
                        this.deleteTerm(message.termId);
                    }
                    break;
                case 'visualizeTerm':
                    if (message.termId) {
                        // Forward to extension to handle Python execution
                        vscode.commands.executeCommand('ai-debug-explainer.visualizeTerm', message.termId);
                    }
                    break;
                case 'visualizeTermByName':
                    if (message.term) {
                        // Forward to extension to handle Python execution by name (reads clipboard or selection)
                        vscode.commands.executeCommand('ai-debug-explainer.visualizeTerm', undefined);
                    }
                    break;
                case 'saveInstance':
                    if (this._currentContext) {
                        vscode.commands.executeCommand('ai-debug-explainer.saveLearningInstance', this._currentContext);
                    }
                    break;
                case 'focusTerm':
                    this._focusedTermId = message.termId;
                    break;
                case 'loadInstance':
                    if (message.instanceId) {
                        vscode.commands.executeCommand('ai-debug-explainer.loadLearningInstance', message.instanceId);
                    }
                    break;
                case 'deleteInstance':
                    if (message.instanceId) {
                        vscode.commands.executeCommand('ai-debug-explainer.deleteLearningInstance', message.instanceId);
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
        // Also ensure instances are updated if panel just loaded
        if (this._view && this._learningInstances.length > 0) {
            this._view.webview.postMessage({
                command: 'updateInstances',
                instances: this._learningInstances
            });
        }
    }

    public deleteTerm(termId: string) {
        if (this._currentContext) {
            this._recursiveDeleteTerm(this._currentContext, termId);
            this._updateView();
        }
    }

    private _recursiveDeleteTerm(context: ContextNode, termId: string): boolean {
        for (const para of context.paragraphs) {
            const index = para.terms.findIndex(t => t.id === termId);
            if (index >= 0) {
                para.terms.splice(index, 1);
                return true;
            }
            for (const t of para.terms) {
                if (t.childContext) {
                    if (this._recursiveDeleteTerm(t.childContext, termId)) {
                        return true;
                    }
                }
            }
        }
        return false;
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
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Knowledge Map</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
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
                    .action-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 4px 8px;
                        margin: 4px;
                        cursor: pointer;
                        border-radius: 2px;
                        font-size: 0.8em;
                    }
                    .action-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .term-chip-container {
                        display: flex;
                        align-items: center;
                        background: var(--vscode-button-secondaryBackground);
                        border-radius: 12px;
                        padding-right: 4px;
                    }
                    .delete-btn {
                        background: transparent;
                        color: var(--vscode-errorForeground);
                        border: none;
                        cursor: pointer;
                        font-weight: bold;
                        padding: 0 4px;
                        opacity: 0.6;
                    }
                    .delete-btn:hover {
                        opacity: 1;
                    }
                    .visualize-btn {
                        background: var(--vscode-textLink-foreground);
                        color: white;
                        border: none;
                        padding: 2px 6px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.85em;
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
                        /* Markdown handles wrapping, pre-wrap can cause issues with list indentation */
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

                    /* Jupyter Cell Styling */
                    .explanation-box {
                        border: 1px solid var(--vscode-widget-border);
                        border-left: 4px solid var(--vscode-textLink-foreground);
                        padding: 0;
                        overflow: hidden;
                    }
                    .cell-header {
                        font-family: var(--vscode-font-family);
                        font-size: 0.75em;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        padding: 4px 10px;
                        background: var(--vscode-editor-lineHighlightBackground);
                        border-bottom: 1px solid var(--vscode-widget-border);
                        opacity: 0.8;
                        display: flex;
                        justify-content: space-between;
                    }
                    .cell-content {
                        padding: 15px;
                    }
                    .cell-content blockquote {
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        margin: 0;
                        padding-left: 10px;
                        color: var(--vscode-textBlockQuote-background);
                    }
                    .cell-content code {
                        font-family: var(--vscode-editor-font-family);
                        background: var(--vscode-textCodeBlock-background);
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                    .cell-content pre {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 10px;
                        border-radius: 5px;
                        overflow-x: auto;
                    }
                    .cell-content pre code {
                        background: transparent;
                        padding: 0;
                    }

                    .nested-context {
                        margin-top: 10px;
                        padding-left: 15px;
                        border-left: 2px dashed var(--vscode-tree-indentGuidesStroke);
                    }
                    
                    /* If a paragraph is inside cell-content, remove background to avoid nesting overload */
                    .cell-content .paragraph-text {
                        background: transparent;
                        border-left: none;
                        padding: 0;
                    }
                    .cell-content .paragraph-block {
                        margin-bottom: 20px;
                    }

                    #architecture-view {
                        display: none;
                        width: 100%;
                        height: 500px;
                        overflow: auto;
                    }
                    #history-view {
                        display: none;
                    }
                    .instance-item {
                        padding: 10px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                    }
                    .instance-item:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .instance-info {
                        flex-grow: 1;
                    }
                    .instance-name {
                        font-weight: bold;
                        display: block;
                    }
                    .instance-date {
                        font-size: 0.8em;
                        opacity: 0.7;
                    }
                    .instance-actions button {
                        background: transparent;
                        border: none;
                        color: var(--vscode-foreground);
                        cursor: pointer;
                        padding: 4px;
                        opacity: 0.7;
                    }
                    .instance-actions button:hover {
                        opacity: 1;
                        color: var(--vscode-errorForeground);
                    }
                    
                    /* Notification Toast */
                    #notification-toast {
                        position: fixed;
                        bottom: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: var(--vscode-notifications-background);
                        color: var(--vscode-notifications-foreground);
                        padding: 8px 16px;
                        border-radius: 4px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                        display: none;
                        z-index: 1000;
                        font-size: 0.9em;
                        border: 1px solid var(--vscode-notifications-border);
                    }
                </style>
                <script nonce="${nonce}">
                    // Non-module script for libraries that might not support modules easily or to keep it simple
                </script>
                <script type="module" nonce="${nonce}">
                    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
                    import { marked } from 'https://cdn.jsdelivr.net/npm/marked@11.1.1/lib/marked.esm.js';
                    import renderMathInElement from 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.mjs';

                    mermaid.initialize({ startOnLoad: false, theme: 'dark' });
                    window.mermaid = mermaid;
                    window.marked = marked;
                    window.renderMathInElement = renderMathInElement;
                </script>
            </head>
            <body>
                <div class="tab-bar">
                    <div class="tab active" data-tab="knowledge-map">Map</div>
                    <div class="tab" data-tab="architecture-view">Arch</div>
                    <div class="tab" data-tab="history-view">Saved</div>
                    <div style="flex-grow: 1;"></div>
                    <button id="save-btn" class="action-btn" title="Save Learning Instance">Save</button>
                </div>

                <div class="container" id="doc-root">
                    <div style="text-align: center; color: var(--vscode-descriptionForeground); margin-top: 50px;">
                        <p>No Context Set.</p>
                        <p>1. Copy text -> <b>Ctrl+Alt+S</b> to set context.</p>
                        <p>2. Copy term -> <b>Ctrl+Alt+E</b> to explain it here.</p>
                        <p>3. Copy term -> <b>Ctrl+Alt+V</b> to visualize.</p>
                    </div>
                </div>
                <div id="architecture-view" class="mermaid"></div>
                <div id="history-view">
                    <div id="instance-list"></div>
                </div>
                <div id="notification-toast"></div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentContext = null;
                    let architectureGraph = '';
                    let learningInstances = [];

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateContext') {
                            currentContext = message.context;
                            renderDocument();
                            // Switch to Map tab when context is updated (e.g. from loading an instance)
                            // Use a small delay to ensure rendering is complete
                            setTimeout(() => {
                                switchTab('knowledge-map');
                            }, 100);
                        }
                        if (message.command === 'updateArchitecture') {
                             architectureGraph = message.graph;
                             if (isArchitectureTabActive()) renderArchitecture();
                        }
                        if (message.command === 'updateInstances') {
                            learningInstances = message.instances;
                            renderInstances();
                        }
                        if (message.command === 'showNotification') {
                            showToast(message.text);
                        }
                    });

                    // Tab switching
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.addEventListener('click', () => {
                            const tabId = tab.getAttribute('data-tab');
                            switchTab(tabId);
                        });
                    });

                    document.getElementById('save-btn').addEventListener('click', () => {
                        saveInstance();
                    });

                    function showToast(text) {
                        const toast = document.getElementById('notification-toast');
                        toast.textContent = text;
                        toast.style.display = 'block';
                        setTimeout(() => {
                            toast.style.display = 'none';
                        }, 3000);
                    }

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
                             container.textContent = architectureGraph ? 'Loading renderer...' : 'No graph available. Click Arch to refresh.';
                         }
                    }

                    function switchTab(tabId) {
                         document.querySelectorAll('.tab').forEach(t => {
                             t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
                         });
                         
                         document.getElementById('doc-root').style.display = (tabId === 'knowledge-map') ? 'block' : 'none';
                         document.getElementById('architecture-view').style.display = (tabId === 'architecture-view') ? 'block' : 'none';
                         document.getElementById('history-view').style.display = (tabId === 'history-view') ? 'block' : 'none';
                         
                         if (tabId === 'architecture-view') {
                             renderArchitecture();
                         } else if (tabId === 'history-view') {
                             renderInstances();
                         }
                    }

                    function renderInstances() {
                        const list = document.getElementById('instance-list');
                        list.innerHTML = '';
                        if (learningInstances.length === 0) {
                            list.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;">No saved instances found.</div>';
                            return;
                        }

                        learningInstances.forEach(inst => {
                            const item = document.createElement('div');
                            item.className = 'instance-item';
                            
                            const info = document.createElement('div');
                            info.className = 'instance-info';
                            info.onclick = () => loadInstance(inst.id);
                            
                            const name = document.createElement('span');
                            name.className = 'instance-name';
                            name.textContent = inst.name;
                            
                            const date = document.createElement('span');
                            date.className = 'instance-date';
                            date.textContent = new Date(inst.createdAt).toLocaleString();
                            
                            info.appendChild(name);
                            info.appendChild(date);
                            
                            const actions = document.createElement('div');
                            actions.className = 'instance-actions';
                            const delBtn = document.createElement('button');
                            delBtn.innerHTML = '&times;';
                            delBtn.title = 'Delete';
                            delBtn.onclick = (e) => {
                                e.stopPropagation();
                                deleteInstance(inst.id);
                            };
                            actions.appendChild(delBtn);
                            
                            item.appendChild(info);
                            item.appendChild(actions);
                            list.appendChild(item);
                        });
                    }

                    function loadInstance(id) {
                        vscode.postMessage({ command: 'loadInstance', instanceId: id });
                        showToast('Loading instance...');
                    }

                    function deleteInstance(id) {
                        vscode.postMessage({ command: 'deleteInstance', instanceId: id });
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
                            
                            // Use marked for paragraph text too
                            if (window.marked) {
                                textDiv.innerHTML = window.marked.parse(para.text);
                            } else {
                                textDiv.textContent = para.text;
                            }
                            
                            // Apply KaTeX to paragraph text
                            if (window.renderMathInElement) {
                                window.renderMathInElement(textDiv, {
                                    delimiters: [
                                        {left: '$$', right: '$$', display: true},
                                        {left: '$', right: '$', display: false},
                                        {left: '\\(', right: '\\)', display: false},
                                        {left: '\\[', right: '\\]', display: true}
                                    ],
                                    throwOnError : false
                                });
                            }

                            block.appendChild(textDiv);

                            if (para.terms && para.terms.length > 0) {
                                const termLine = document.createElement('div');
                                termLine.className = 'term-line';
                                
                                para.terms.forEach(term => {
                                    const chipContainer = document.createElement('div');
                                    chipContainer.className = 'term-chip-container';

                                    const chip = document.createElement('button');
                                    chip.className = 'term-chip';
                                    chip.style.border = 'none';
                                    chip.textContent = term.term;
                                    chip.onclick = () => toggleExplanation(term.id);
                                    
                                    const delBtn = document.createElement('button');
                                    delBtn.className = 'delete-btn';
                                    delBtn.innerHTML = '&times;';
                                    delBtn.onclick = (e) => {
                                        e.stopPropagation();
                                        deleteTerm(term.id);
                                    };

                                    chipContainer.appendChild(chip);
                                    chipContainer.appendChild(delBtn);
                                    termLine.appendChild(chipContainer);
                                });
                                block.appendChild(termLine);
                            }

                            if (para.terms && para.terms.length > 0) {
                                para.terms.forEach(term => {
                                    const expBox = document.createElement('div');
                                    expBox.id = 'exp-' + term.id;
                                    expBox.className = 'explanation-box';
                                    expBox.style.display = 'none'; 
                                    
                                    const header = document.createElement('div');
                                    header.className = 'cell-header';
                                    
                                    const titleSpan = document.createElement('span');
                                    titleSpan.textContent = 'In [' + term.term + ']';
                                    header.appendChild(titleSpan);

                                    const actionSpan = document.createElement('span');
                                    
                                    // Single button that changes based on whether visualization exists
                                    const vizBtn = document.createElement('button');
                                    vizBtn.className = 'visualize-btn';
                                    if (term.visualizationFile) {
                                        vizBtn.style.background = 'var(--vscode-charts-green)';
                                        vizBtn.textContent = 'Review Viz';
                                        vizBtn.title = 'Open existing visualization';
                                    } else {
                                        vizBtn.textContent = 'Visualize';
                                        vizBtn.title = 'Generate new visualization';
                                    }
                                    vizBtn.onclick = () => visualizeTerm(term.id);
                                    actionSpan.appendChild(vizBtn);
                                    header.appendChild(actionSpan);

                                    expBox.appendChild(header);

                                    const contentDiv = document.createElement('div');
                                    contentDiv.className = 'cell-content';
                                    
                                    if (term.childContext) {
                                        // If we have a child context, render it recursively
                                        // This handles the interactive version of the explanation
                                        const nestedRoot = document.createElement('div');
                                        nestedRoot.className = 'nested-context';
                                        renderContext(term.childContext, nestedRoot);
                                        contentDiv.appendChild(nestedRoot);
                                    } else {
                                        // Otherwise, render the static explanation as Markdown
                                        if (window.marked) {
                                            contentDiv.innerHTML = window.marked.parse(term.explanation);
                                        } else {
                                            contentDiv.innerHTML = term.explanation.replace(/\\n/g, '<br/>');
                                        }
                                        
                                        // Apply KaTeX to static content
                                        if (window.renderMathInElement) {
                                            window.renderMathInElement(contentDiv, {
                                                delimiters: [
                                                    {left: '$$', right: '$$', display: true},
                                                    {left: '$', right: '$', display: false},
                                                    {left: '\\(', right: '\\)', display: false},
                                                    {left: '\\[', right: '\\]', display: true}
                                                ],
                                                throwOnError : false
                                            });
                                        }
                                    }

                                    expBox.appendChild(contentDiv);
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
                                vscode.postMessage({ command: 'focusTerm', termId: null });
                            } else {
                                // Clear other focuses if any? Usually only one visible at a time in this logic
                                el.classList.add('visible');
                                el.style.display = 'block';
                                vscode.postMessage({ command: 'focusTerm', termId: termId });
                            }
                        }
                    }

                    function deleteTerm(termId) {
                        vscode.postMessage({ command: 'deleteTerm', termId: termId });
                    }

                    function visualizeTerm(termId) {
                        vscode.postMessage({ command: 'visualizeTerm', termId: termId });
                    }

                    function saveInstance() {
                        if (!currentContext) {
                            showToast('No context to save. Please set context first.');
                            return;
                        }
                        vscode.postMessage({ command: 'saveInstance' });
                    }

                    // Keydown listener for Shortcuts
                    window.addEventListener('keydown', event => {
                        const isCtrlAlt = (event.ctrlKey || event.metaKey) && event.altKey;
                        if (!isCtrlAlt) return;

                        const selection = window.getSelection().toString().trim();
                        
                        if (event.key === 'e' || event.key === 'E') {
                            if (selection) {
                                vscode.postMessage({ command: 'explainTerm', term: selection });
                                event.preventDefault();
                            }
                        } else if (event.key === 'v' || event.key === 'V') {
                            // Visualize term (uses selection if present, else fallback to global command)
                            if (selection) {
                                vscode.postMessage({ command: 'visualizeTermByName', term: selection });
                                event.preventDefault();
                                event.stopPropagation();
                            }
                        } else if (event.key === 's' || event.key === 'S') {
                            if (selection) {
                                // Set context
                                // This is usually done from editor, but we can allow it here too
                            }
                        }
                    });
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
