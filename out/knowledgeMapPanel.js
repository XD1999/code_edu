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
const fs = __importStar(require("fs"));
class KnowledgeMapProvider {
    constructor(extensionUri) {
        this._currentContext = null;
        this._activeInstanceName = null;
        this._focusedTermId = null;
        this._focusedBranchType = null;
        this._architectureGraph = '';
        this._learningInstances = [];
        this._extensionUri = extensionUri;
    }
    setCurrentContext(text) {
        this._currentContext = this._createContext(text);
        this._activeInstanceName = null;
        this._updateView();
    }
    setContext(context, instanceName = null) {
        this._currentContext = context;
        this._activeInstanceName = instanceName;
        this._updateView();
    }
    getActiveInstanceName() {
        return this._activeInstanceName;
    }
    _createContext(text) {
        // Split text by double newlines to find paragraphs
        const paragraphsRaw = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        const paragraphs = paragraphsRaw.map((p, index) => ({
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
    addTerm(term, explanation, type = 'general') {
        if (!this._currentContext) {
            this.setCurrentContext(term);
        }
        if (this._currentContext) {
            // 1. Try adding to root context (Layer 1 -> Layer 2)
            let added = this._addTermToContext(this._currentContext, term, explanation, type);
            // 2. If not added and focus is set, try adding to focused term's specific branch context (Layer 2 -> Layer 3)
            if (!added && this._focusedTermId) {
                const focusedTerm = this._findTermById(this._currentContext, this._focusedTermId);
                if (focusedTerm) {
                    // Find the specific branch based on focusedBranchType or use matching type
                    let targetBranch = focusedTerm.branches.find(b => b.type === (this._focusedBranchType || type));
                    // If no matching branch, create one with the current type
                    if (!targetBranch) {
                        targetBranch = {
                            type: this._focusedBranchType || type,
                            content: focusedTerm.term,
                            createdAt: Date.now()
                        };
                        focusedTerm.branches.push(targetBranch);
                    }
                    if (!targetBranch.childContext) {
                        targetBranch.childContext = this._createContext(targetBranch.content);
                    }
                    added = this._addTermToContext(targetBranch.childContext, term, explanation, type);
                    if (!added) {
                        // Force add to focused branch's context
                        this._forceAddTermToContext(targetBranch.childContext, term, explanation, type);
                        added = true;
                    }
                }
            }
            // 3. Fallback to root context loose ends
            if (!added) {
                this._forceAddTermToContext(this._currentContext, term, explanation, type, true);
            }
            this._updateView();
        }
    }
    _addTermToContext(context, term, explanation, type) {
        const targetPara = context.paragraphs.find(p => p.text.toLowerCase().includes(term.toLowerCase()));
        if (targetPara) {
            const existingTerm = targetPara.terms.find(t => t.term.toLowerCase() === term.toLowerCase());
            if (existingTerm) {
                const existingBranch = existingTerm.branches.find(b => b.type === type);
                if (existingBranch) {
                    existingBranch.content = explanation;
                    existingBranch.createdAt = Date.now();
                }
                else {
                    existingTerm.branches.push({
                        type,
                        content: explanation,
                        createdAt: Date.now()
                    });
                }
            }
            else {
                targetPara.terms.push({
                    id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    term,
                    branches: [{
                            type,
                            content: explanation,
                            createdAt: Date.now()
                        }]
                });
            }
            return true;
        }
        return false;
    }
    _forceAddTermToContext(context, term, explanation, type, useLooseEnds = false) {
        let targetPara = useLooseEnds ? context.paragraphs.find(p => p.id === 'loose-ends') : context.paragraphs[0];
        if (!targetPara) {
            targetPara = {
                id: useLooseEnds ? 'loose-ends' : `p-${Date.now()}`,
                text: useLooseEnds ? 'External Terms' : (context.rawText || 'Child Context'),
                terms: []
            };
            context.paragraphs.push(targetPara);
        }
        const existingTerm = targetPara.terms.find(t => t.term.toLowerCase() === term.toLowerCase());
        if (existingTerm) {
            const existingBranch = existingTerm.branches.find(b => b.type === type);
            if (existingBranch) {
                existingBranch.content = explanation;
                existingBranch.createdAt = Date.now();
            }
            else {
                existingTerm.branches.push({ type, content: explanation, createdAt: Date.now() });
            }
        }
        else {
            targetPara.terms.push({
                id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                term,
                branches: [{ type, content: explanation, createdAt: Date.now() }]
            });
        }
    }
    async processInputTerm(term, type = 'general') {
        if (!this._onExplainTerm) {
            return;
        }
        if (!this._currentContext) {
            vscode.window.showWarningMessage('No context set! Please copy text and press Ctrl+Alt+S first.');
            return;
        }
        let contextText = this._currentContext.rawText;
        if (this._focusedTermId) {
            const focusedTerm = this._findTermById(this._currentContext, this._focusedTermId);
            if (focusedTerm && focusedTerm.branches.length > 0) {
                // Use the content of the first branch as context for deeper layers
                contextText = focusedTerm.branches[0].content;
            }
        }
        await this._onExplainTerm(term, contextText, type);
    }
    setExplainHandler(handler) {
        this._onExplainTerm = handler;
    }
    setLearningInstances(instances) {
        this._learningInstances = instances;
        this._updateInstancesView();
    }
    getCurrentContext() {
        return this._currentContext;
    }
    getFocusedTermId() {
        return this._focusedTermId;
    }
    postMessage(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'resources')]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Send all state on every view resolution/visibility
        this._syncAllState();
        // Listen for visibility changes and resync state
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._syncAllState();
            }
        });
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
                        vscode.commands.executeCommand('ai-debug-explainer.saveLearningInstance', this._currentContext, this._activeInstanceName);
                    }
                    break;
                case 'focusTerm':
                    this._focusedTermId = message.termId;
                    this._focusedBranchType = message.branchType || null;
                    // Don't call _updateView here to avoid disrupting selections
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
    _updateView() {
        if (this._view && this._currentContext) {
            this._view.webview.postMessage({
                command: 'updateContext',
                context: this._currentContext,
                focusedTermId: this._focusedTermId
            });
        }
        this._updateInstancesView();
    }
    _updateInstancesView() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateInstances',
                instances: this._learningInstances
            });
        }
    }
    _syncAllState() {
        this._updateInstancesView();
        if (this._currentContext) {
            this._view?.webview.postMessage({
                command: 'updateContext',
                context: this._currentContext,
                focusedTermId: this._focusedTermId
            });
        }
        if (this._architectureGraph) {
            this._view?.webview.postMessage({
                command: 'updateArchitecture',
                graph: this._architectureGraph
            });
        }
    }
    deleteTerm(termId) {
        if (this._currentContext) {
            // Collect all files to delete before removing terms from data structure
            const filesToDelete = [];
            const termToDelete = this._findTermById(this._currentContext, termId);
            if (termToDelete) {
                this._collectVisualizationFiles(termToDelete, filesToDelete);
                filesToDelete.forEach(filePath => {
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        }
                        catch (e) {
                            console.error(`Failed to delete visualization file: ${filePath}`, e);
                        }
                    }
                });
            }
            this._recursiveDeleteTerm(this._currentContext, termId);
            this._updateView();
        }
    }
    _findTermById(context, id) {
        for (const para of context.paragraphs) {
            const t = para.terms.find(term => term.id === id);
            if (t)
                return t;
            for (const term of para.terms) {
                for (const branch of term.branches) {
                    if (branch.childContext) {
                        const found = this._findTermById(branch.childContext, id);
                        if (found)
                            return found;
                    }
                }
            }
        }
        return undefined;
    }
    _collectVisualizationFiles(term, files) {
        if (term.visualizations) {
            term.visualizations.forEach(v => files.push(v.filePath));
        }
        term.branches.forEach(branch => {
            if (branch.childContext) {
                branch.childContext.paragraphs.forEach(para => {
                    para.terms.forEach(childTerm => {
                        this._collectVisualizationFiles(childTerm, files);
                    });
                });
            }
        });
    }
    _recursiveDeleteTerm(context, termId) {
        for (const para of context.paragraphs) {
            const index = para.terms.findIndex(t => t.id === termId);
            if (index >= 0) {
                para.terms.splice(index, 1);
                return true;
            }
            for (const t of para.terms) {
                for (const branch of t.branches) {
                    if (branch.childContext) {
                        if (this._recursiveDeleteTerm(branch.childContext, termId)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
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
                        box-shadow: 0 0 5px var(--vscode-focusBorder);
                        border: 1px solid var(--vscode-focusBorder);
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
                    .explanation-box.focused {
                        border: 2px solid var(--vscode-focusBorder);
                        box-shadow: 0 0 8px var(--vscode-focusBorder);
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
                    
                    /* Branch tabs for pedagogical methods */
                    .branch-tabs {
                        display: flex;
                        gap: 4px;
                        margin-bottom: 10px;
                        border-bottom: 1px solid var(--vscode-widget-border);
                    }
                    .branch-tab {
                        background: transparent;
                        border: none;
                        border-bottom: 2px solid transparent;
                        padding: 6px 12px;
                        cursor: pointer;
                        color: var(--vscode-foreground);
                        opacity: 0.7;
                        font-size: 0.85em;
                        text-transform: capitalize;
                    }
                    .branch-tab:hover {
                        opacity: 0.9;
                    }
                    .branch-tab.active {
                        border-bottom-color: var(--vscode-textLink-activeForeground);
                        opacity: 1;
                        font-weight: 600;
                    }
                    .branch-content {
                        min-height: 50px;
                    }
                    .branch-panel {
                        display: none;
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
                    let focusedTermId = null;
                    let architectureGraph = '';
                    let learningInstances = [];

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateContext') {
                            currentContext = message.context;
                            focusedTermId = message.focusedTermId;
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
                        if (message.command === 'updateFocus') {
                            focusedTermId = message.focusedTermId;
                            updateFocusUI();
                        }
                    });

                    function updateFocusUI() {
                        document.querySelectorAll('.explanation-box').forEach(box => {
                            const termId = box.id.replace('exp-', '');
                            box.classList.toggle('focused', termId === focusedTermId);
                        });
                    }

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
                        
                        // Save visible box states before render
                        const visibleBoxes = new Set();
                        document.querySelectorAll('.explanation-box.visible').forEach(box => {
                            visibleBoxes.add(box.id);
                        });
                        
                        root.innerHTML = '';
                        if (!currentContext || !currentContext.paragraphs) return;
                        renderContext(currentContext, root);
                        
                        // Restore visible box states after render
                        visibleBoxes.forEach(boxId => {
                            const box = document.getElementById(boxId);
                            if (box) {
                                box.classList.add('visible');
                                box.style.display = 'block';
                            }
                        });
                    }

                    function renderContext(contextData, container, isNested = false) {
                         if (!contextData || !contextData.paragraphs) return;

                         contextData.paragraphs.forEach(para => {
                            const block = document.createElement('div');
                            block.className = 'paragraph-block';

                            if (!isNested) {
                                const textDiv = document.createElement('div');
                                textDiv.className = 'paragraph-text';
                                
                                // Use marked for paragraph text too
                                if (window.marked) {
                                    textDiv.innerHTML = window.marked.parse(para.text);
                                } else {
                                    textDiv.innerHTML = para.text.replace(/\\n/g, '<br/>');
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
                            }

                            if (para.terms && para.terms.length > 0) {
                                const termLine = document.createElement('div');
                                termLine.className = 'term-line';
                                
                                para.terms.forEach(term => {
                                    const chipContainer = document.createElement('div');
                                    chipContainer.className = 'term-chip-container';

                                    const chip = document.createElement('button');
                                    chip.className = 'term-chip';
                                    if (term.id === focusedTermId) chip.classList.add('active');
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
                                    if (term.id === focusedTermId) expBox.classList.add('focused');
                                    expBox.style.display = 'none'; 
                                    const setFocus = (e) => {
                                        e.stopPropagation();
                                        if (focusedTermId !== term.id) {
                                            focusedTermId = term.id;
                                            updateFocusUI();
                                            vscode.postMessage({ command: 'focusTerm', termId: term.id });
                                        }
                                    };
                                    expBox.onclick = setFocus;
                                    expBox.onmousedown = setFocus;
                                    
                                    const header = document.createElement('div');
                                    header.className = 'cell-header';
                                    header.style.cursor = 'pointer';
                                    
                                    const titleSpan = document.createElement('span');
                                    titleSpan.textContent = 'In [' + term.term + ']';
                                    header.appendChild(titleSpan);

                                    const actionSpan = document.createElement('span');
                                    
                                    // Single button that changes based on whether visualizations exist
                                    const vizBtn = document.createElement('button');
                                    vizBtn.className = 'visualize-btn';
                                    if (term.visualizations && term.visualizations.length > 0) {
                                        vizBtn.style.background = 'var(--vscode-charts-green)';
                                        vizBtn.textContent = 'Review Viz';
                                        vizBtn.title = 'Choose visualization to open';
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
                                    
                                    // Branch tabs for different pedagogical methods
                                    if (term.branches && term.branches.length > 0) {
                                        const branchTabs = document.createElement('div');
                                        branchTabs.className = 'branch-tabs';
                                        
                                        const branchContent = document.createElement('div');
                                        branchContent.className = 'branch-content';
                                        
                                        term.branches.forEach((branch, idx) => {
                                            const tab = document.createElement('button');
                                            tab.className = 'branch-tab';
                                            tab.textContent = branch.type;
                                            if (idx === 0) tab.classList.add('active');
                                            tab.onclick = (e) => {
                                                e.stopPropagation();
                                                switchBranch(term.id, idx);
                                                // Set focus with branch type when clicking tab
                                                if (focusedTermId !== term.id) {
                                                    focusedTermId = term.id;
                                                }
                                                vscode.postMessage({ command: 'focusTerm', termId: term.id, branchType: branch.type });
                                            };
                                            branchTabs.appendChild(tab);
                                            
                                            const panel = document.createElement('div');
                                            panel.className = 'branch-panel';
                                            panel.id = 'branch-' + term.id + '-' + idx;
                                            panel.style.display = idx === 0 ? 'block' : 'none';
                                            
                                            // Click on panel content sets focus with branch type
                                            panel.onclick = (e) => {
                                                e.stopPropagation();
                                                if (focusedTermId !== term.id) {
                                                    focusedTermId = term.id;
                                                    updateFocusUI();
                                                }
                                                vscode.postMessage({ command: 'focusTerm', termId: term.id, branchType: branch.type });
                                            };
                                            
                                            if (window.marked) {
                                                panel.innerHTML = window.marked.parse(branch.content);
                                            } else {
                                                panel.innerHTML = branch.content.replace(/\\n/g, '<br/>');
                                            }
                                            
                                            if (window.renderMathInElement) {
                                                window.renderMathInElement(panel, {
                                                    delimiters: [
                                                        {left: '$$', right: '$$', display: true},
                                                        {left: '$', right: '$', display: false},
                                                        {left: '\\(', right: '\\)', display: false},
                                                        {left: '\\[', right: '\\]', display: true}
                                                    ],
                                                    throwOnError: false
                                                });
                                            }
                                            
                                            branchContent.appendChild(panel);

                                            // Render branch-specific child layers (nested context)
                                            if (branch.childContext) {
                                                const nestedRoot = document.createElement('div');
                                                nestedRoot.className = 'nested-context';
                                                renderContext(branch.childContext, nestedRoot, true); // true = skip text duplication
                                                panel.appendChild(nestedRoot);
                                            }
                                        });
                                        
                                        contentDiv.appendChild(branchTabs);
                                        contentDiv.appendChild(branchContent);
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
                                if (focusedTermId === termId) {
                                    focusedTermId = null;
                                    updateFocusUI();
                                    vscode.postMessage({ command: 'focusTerm', termId: null });
                                }
                            } else {
                                el.classList.add('visible');
                                el.style.display = 'block';
                                // No focus setting here! Only on box click.
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
                    
                    function switchBranch(termId, branchIdx) {
                        const tabs = document.querySelectorAll('[onclick*="switchBranch(' + "'" + termId + "'" + '"]');
                        tabs.forEach((tab, idx) => {
                            tab.classList.toggle('active', idx === branchIdx);
                        });
                        
                        let i = 0;
                        while (true) {
                            const panelId = 'branch-' + termId + '-' + i;
                            const panel = document.getElementById(panelId);
                            if (!panel) break;
                            panel.style.display = i === branchIdx ? 'block' : 'none';
                            i++;
                        }
                    }

                    // Keydown listener for Shortcuts
                    window.addEventListener('keydown', event => {
                        const isCtrlAlt = (event.ctrlKey || event.metaKey) && event.altKey;
                        if (!isCtrlAlt) return;

                        const selection = window.getSelection().toString().trim();
                        
                        if (event.key === 'e' || event.key === 'E') {
                            // Handled by global keybinding to avoid duplicate triggers
                        } else if (event.key === 'v' || event.key === 'V') {
                            // Handled by global keybinding to avoid duplicate triggers
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