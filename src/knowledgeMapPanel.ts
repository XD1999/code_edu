import * as vscode from 'vscode';
import * as fs from 'fs';
import { ContextNode, ParagraphNode, TermNode, LearningInstance, PedagogicalType, BranchType, ExplanationBranch, KnowledgeGraph, KnowledgeGraphEdge } from './traceModels';
import { getNonce, findTermById as findTermByIdUtil, recursiveDeleteTerm, collectTermNames, collectVisualizationFiles } from './core/util';
import type { AIService } from './aiService';

export class KnowledgeMapProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-debug-explainer.knowledgeMapView';

    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;
    private _currentContext: ContextNode | null = null;
    private _activeInstanceName: string | null = null;
    private _focusedTermId: string | null = null;
    private _focusedBranchType: BranchType | null = null;
    // Arch-tab graph node selection for the compare commands (Ctrl+Alt+X / Ctrl+Shift+X).
    // Synced from the webview on each node click.
    private _compareNodeA: string | null = null;
    private _compareNodeB: string | null = null;
    private _knowledgeGraph: KnowledgeGraph = { edges: [] };
    private _learningInstances: LearningInstance[] = [];
    private _onExplainTerm?: (term: string, context: string, type?: PedagogicalType, autoVisualize?: boolean) => Promise<void>;
    private _onAutoSave?: (context: ContextNode, name: string, graph: KnowledgeGraph) => Promise<void>;
    private _onContextArch?: (contextText: string) => Promise<KnowledgeGraph>;
    /** Bumped on every context switch; in-flight arch results check it to avoid clobbering a newer context. */
    private _contextEpoch: number = 0;
    /** Resolves when the current context's arch has been generated (or skipped). Term placement awaits this. */
    private _archPromise: Promise<void> | null = null;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    public setAutoSaveHandler(handler: (context: ContextNode, name: string, graph: KnowledgeGraph) => Promise<void>) {
        this._onAutoSave = handler;
    }

    public setContextArchHandler(handler: (contextText: string) => Promise<KnowledgeGraph>) {
        this._onContextArch = handler;
    }

    /** Resolves when the current context's writing-logic arch is ready (generated or skipped). */
    public whenArchReady(): Promise<void> {
        return this._archPromise ?? Promise.resolve();
    }

    private _autoSave() {
        if (this._activeInstanceName && this._currentContext && this._onAutoSave) {
            this._onAutoSave(this._currentContext, this._activeInstanceName, this._knowledgeGraph)
                .catch(e => console.error('Auto-save error:', e));
        }
    }

    public setCurrentContext(text: string) {
        this._currentContext = this._createContext(text);
        this._activeInstanceName = null;
        // Renew the arch graph: a new context starts fresh, then the writing-logic
        // framework is generated from the raw text. Terms explained later elaborate it.
        this._knowledgeGraph = { edges: [] };
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateKnowledgeGraph',
                graph: this._knowledgeGraph
            });
        }
        this._generateContextArch();
        this._updateView(true);
    }

    public setContext(context: ContextNode, instanceName: string | null = null) {
        this._currentContext = context;
        this._activeInstanceName = instanceName;
        // A loaded instance brings its own graph; the arch is effectively ready,
        // and any in-flight arch from a previous context is cancelled.
        this._contextEpoch++;
        this._archPromise = Promise.resolve();
        this._updateView(true);
    }

    /**
     * Generate the writing-logic framework for the current context. Epoch-guarded
     * so a stale result never overwrites a newer context's graph. Skipped for
     * very short / single-term contexts (no writing logic to frame).
     *
     * Outcomes are surfaced to the user (not just the console): an empty result
     * or an AI/parse failure would otherwise leave the Arch tab blank and term
     * explanations unwired into any framework, with no clue why.
     */
    private _generateContextArch() {
        const ctx = this._currentContext;
        if (!ctx || !this._onContextArch) {
            this._archPromise = Promise.resolve();
            return;
        }
        const text = ctx.rawText || '';
        if (text.trim().length < 100) {
            // Logged, not surfaced: addTerm auto-creates a short context from a
            // bare term when none is set, which would otherwise spam the user.
            console.log('Context arch skipped: context shorter than 100 chars.');
            this._archPromise = Promise.resolve();
            return;
        }
        const epoch = ++this._contextEpoch;
        this._archPromise = this._onContextArch(text)
            .then(graph => {
                if (epoch !== this._contextEpoch) {
                    // A newer context superseded this one — discard the stale result.
                    return;
                }
                const hasEdges = !!(graph && graph.edges && graph.edges.length > 0);
                const hasBoxes = !!(graph && graph.boxes && graph.boxes.length > 0);
                if (hasEdges || hasBoxes) {
                    // updateKnowledgeGraph sets the graph and posts to the webview.
                    this.updateKnowledgeGraph(graph);
                } else {
                    vscode.window.showWarningMessage(
                        'No logic framework could be generated for this context. Term explanations will appear without an arch framework.'
                    );
                }
            })
            .catch(e => {
                console.error('Context arch generation error:', e);
                vscode.window.showErrorMessage(
                    'Failed to generate the logic framework (arch): ' + ((e as Error)?.message || e)
                );
            });
    }

    public getActiveInstanceName(): string | null {
        return this._activeInstanceName;
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

    /**
     * Add (or update) a term+branch. `focusSnapshot` should be the focus
     * location captured at the time the explain command was TRIGGERED (see
     * getFocusSnapshot); when supplied it overrides the live focus so the
     * explanation lands where the user was focused when they fired the
     * command, not where focus drifted to during the AI call.
     */
    public addTerm(
        term: string,
        explanation: string,
        type: BranchType = 'desc-encapsulation',
        focusSnapshot?: { focusedTermId: string | null; focusedBranchType: BranchType | null }
    ) {
        // Defensive: never create/update a branch with empty content — an empty
        // branch renders as a blank panel (see renderMarkdownAndMath's falsy
        // branch). Callers (e.g. handleExplainTerm) already surface this, but
        // guard here too so no path can store a blank explanation.
        if (!explanation || !explanation.trim()) {
            return;
        }
        if (!this._currentContext) {
            this.setCurrentContext(term);
        }

        // Use the captured trigger-time focus if supplied; else the live focus.
        const focusTermId = focusSnapshot?.focusedTermId ?? this._focusedTermId;
        const focusBranchType = focusSnapshot?.focusedBranchType ?? this._focusedBranchType;

        if (this._currentContext) {
            let added = false;

            // 1. If a term is focused, place the new term BELOW it — nested in the
            //    focused term's branch child context (the "location feature"). This
            //    must take priority over text-matching: otherwise a new term whose
            //    text appears in the first paragraph lands under the first term
            //    instead of under the focused box.
            if (focusTermId) {
                const focusedTerm = this._findTermById(this._currentContext, focusTermId);
                if (focusedTerm) {
                    // Find the specific branch based on focusedBranchType or use matching type
                    let targetBranch = focusedTerm.branches.find(b => b.type === (focusBranchType || type));

                    // If no matching branch, create one with the current type
                    if (!targetBranch) {
                        targetBranch = {
                            type: focusBranchType || type,
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

            // 2. No focus (or focus term not found): text-match the term into the
            //    paragraph that contains it.
            if (!added) {
                added = this._addTermToContext(this._currentContext, term, explanation, type);
            }

            // 3. Fallback to root context loose ends.
            if (!added) {
                this._forceAddTermToContext(this._currentContext, term, explanation, type, true);
            }
            this._updateView();
            this._autoSave();
        }
    }

    private _addTermToContext(context: ContextNode, term: string, explanation: string, type: BranchType): boolean {
        const targetPara = context.paragraphs.find(p => p.text.toLowerCase().includes(term.toLowerCase()));

        if (targetPara) {
            const existingTerm = targetPara.terms.find(t => t.term.toLowerCase() === term.toLowerCase());
            if (existingTerm) {
                const existingBranch = existingTerm.branches.find(b => b.type === type);
                if (existingBranch) {
                    existingBranch.content = explanation;
                    existingBranch.createdAt = Date.now();
                } else {
                    existingTerm.branches.push({
                        type,
                        content: explanation,
                        createdAt: Date.now()
                    });
                }
            } else {
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

    private _forceAddTermToContext(context: ContextNode, term: string, explanation: string, type: BranchType, useLooseEnds: boolean = false) {
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
            } else {
                existingTerm.branches.push({ type, content: explanation, createdAt: Date.now() });
            }
        } else {
            targetPara.terms.push({
                id: `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                term,
                branches: [{ type, content: explanation, createdAt: Date.now() }]
            });
        }
    }

    public async processInputTerm(term: string, type: PedagogicalType = 'desc-encapsulation', autoVisualize: boolean = false) {
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

        await this._onExplainTerm(term, contextText, type, autoVisualize);
    }

    public setExplainHandler(handler: (term: string, context: string, type?: PedagogicalType, autoVisualize?: boolean) => Promise<void>) {
        this._onExplainTerm = handler;
    }

    public setLearningInstances(instances: LearningInstance[]) {
        this._learningInstances = instances;
        this._updateInstancesView();
        if (this._knowledgeGraph.edges.length > 0) {
            this._view?.webview.postMessage({
                command: 'updateKnowledgeGraph',
                graph: this._knowledgeGraph
            });
        }
    }

    public getCurrentContext(): ContextNode | null {
        return this._currentContext;
    }

    public getFocusedTermId(): string | null {
        return this._focusedTermId;
    }

    /**
     * Snapshot the focused location (term id + branch type) at the moment an
     * explain command is triggered. The AI call takes time; the user may click
     * elsewhere before it returns, which would otherwise move the placement
     * target. Callers capture this at trigger time and pass it to addTerm so
     * the explanation lands where focus WAS, not where it drifted to.
     */
    public getFocusSnapshot(): { focusedTermId: string | null; focusedBranchType: BranchType | null } {
        return { focusedTermId: this._focusedTermId, focusedBranchType: this._focusedBranchType };
    }

    /** The two graph nodes selected in the Arch tab for comparison (1 or 2 may be null). */
    public getCompareSelection(): { termA: string | null; termB: string | null } {
        return { termA: this._compareNodeA, termB: this._compareNodeB };
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

        const html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.html = html;

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
                case 'setContext':
                    if (message.text) {
                        this.setCurrentContext(message.text);
                    }
                    break;
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
                        vscode.commands.executeCommand('ai-debug-explainer.saveLearningInstance', this._currentContext, this._activeInstanceName, this.getKnowledgeGraph());
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
                case 'generatePractice':
                    if (message.termId && message.branchType) {
                        vscode.commands.executeCommand('ai-debug-explainer.generatePractice', message.termId, message.branchType, message.difficulty || 0);
                    }
                    break;
                case 'showPracticeSet':
                    if (message.termId && message.branchType) {
                        vscode.commands.executeCommand('ai-debug-explainer.showPracticeSet', message.termId, message.branchType);
                    }
                    break;
                case 'togglePracticeVisibility':
                    if (message.termId && message.branchType && this._currentContext) {
                        const term = this._findTermById(this._currentContext, message.termId);
                        if (term) {
                            const branch = term.branches.find(b => b.type === message.branchType);
                            if (branch) {
                                branch.practiceVisible = message.visible;
                            }
                        }
                    }
                    break;
                case 'setCompareSelection':
                    // Sync the Arch-tab graph node selection (1 or 2 nodes) from the
                    // webview so the keybound compare commands (Ctrl+Alt+X / Ctrl+Shift+X)
                    // can read it.
                    this._compareNodeA = typeof message.termA === 'string' ? message.termA : null;
                    this._compareNodeB = typeof message.termB === 'string' ? message.termB : null;
                    break;
                case 'requestState':
                    // The webview finished loading its message listener and is asking
                    // for all current state. Messages posted right after html is set can
                    // arrive before this listener exists and be silently lost; replying
                    // here guarantees delivery. Includes the knowledge graph, which
                    // _syncAllState didn't previously replay (so an arch generated while
                    // the view was hidden/just-reopened never reappeared).
                    this._syncAllState();
                    break;
            }
        });
    }

    private _updateView(switchToMap: boolean = false) {
        if (this._view && this._currentContext) {
            this._view.webview.postMessage({
                command: 'updateContext',
                context: this._currentContext,
                focusedTermId: this._focusedTermId,
                switchToMap: switchToMap
            });
        }
        this._updateInstancesView();
    }

    private _updateInstancesView() {
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateInstances',
                instances: this._learningInstances
            });
        }
    }

    private _syncAllState() {
        this._updateInstancesView();
        if (this._currentContext) {
            this._view?.webview.postMessage({
                command: 'updateContext',
                context: this._currentContext,
                focusedTermId: this._focusedTermId
            });
        }
        // Replay the knowledge graph so an arch generated while the view was
        // hidden (or before this resolve) reappears on (re)open. Without this,
        // the Arch tab shows "No knowledge graph yet" even though _knowledgeGraph
        // holds a generated framework.
        this._view?.webview.postMessage({
            command: 'updateKnowledgeGraph',
            graph: this._knowledgeGraph
        });
    }

    public deleteTerm(termId: string) {
        if (this._currentContext) {
            // Collect all files to delete before removing terms from data structure
            const filesToDelete: string[] = [];
            const termToDelete = this._findTermById(this._currentContext, termId);
            let subtreeNames: string[] = [];
            if (termToDelete) {
                this._collectVisualizationFiles(termToDelete, filesToDelete);
                filesToDelete.forEach(filePath => {
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (e) {
                            console.error(`Failed to delete visualization file: ${filePath}`, e);
                        }
                    }
                });

                // Collect the term's own name + every term in its nested branch
                // contexts BEFORE deletion, so the arch graph can drop the matching
                // nodes. Framework nodes (encapsulated statements, not term names)
                // are not in this list, so they stay.
                subtreeNames = [termToDelete.term];
                for (const branch of termToDelete.branches || []) {
                    if (branch.childContext) {
                        collectTermNames(branch.childContext, subtreeNames);
                    }
                }
            }

            this._recursiveDeleteTerm(this._currentContext, termId);
            // Drop the deleted term's node(s) from the arch graph.
            this._pruneTermsFromGraph(subtreeNames);
            this._updateView();
            this._autoSave();
        }
    }

    /**
     * Remove arch-graph edges whose source or target matches any of the given
     * term names (case/whitespace-insensitive). A term node vanishes from the
     * rendered graph once every edge touching it is removed. Framework nodes —
     * encapsulated statements that are not term names — are left intact. Posts
     * the pruned graph to the webview but does NOT auto-save; callers persist
     * via their own _autoSave() so the tree + graph stay consistent.
     */
    private _pruneTermsFromGraph(termNames: string[]) {
        if (!this._knowledgeGraph || this._knowledgeGraph.edges.length === 0) return;
        const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const toRemove = new Set(termNames.map(norm).filter(Boolean));
        if (toRemove.size === 0) return;
        const edges = this._knowledgeGraph.edges.filter(e =>
            !toRemove.has(norm(e.source)) && !toRemove.has(norm(e.target)));
        if (edges.length !== this._knowledgeGraph.edges.length) {
            this._knowledgeGraph = { edges };
            if (this._view) {
                this._view.webview.postMessage({
                    command: 'updateKnowledgeGraph',
                    graph: this._knowledgeGraph
                });
            }
        }
    }

    private _findTermById(context: ContextNode, id: string): TermNode | undefined {
        return findTermByIdUtil(context, id);
    }

    private _collectVisualizationFiles(term: TermNode, files: string[]) {
        collectVisualizationFiles(term, files);
    }

    private _recursiveDeleteTerm(context: ContextNode, termId: string): boolean {
        return recursiveDeleteTerm(context, termId);
    }


    public getKnowledgeGraph(): KnowledgeGraph {
        return this._knowledgeGraph;
    }

    public updateKnowledgeGraph(graph: KnowledgeGraph) {
        // Term-elaboration updates (from aiService.updateKnowledgeGraph) return
        // edges-only and would otherwise wipe the category/framework/boxes set
        // at arch generation. Preserve them when the incoming graph lacks them.
        // (isNewFramework/frameworkDescription are NOT preserved — they're a
        // one-time signal from generation, consumed by the save prompt.)
        if (graph && !graph.category && this._knowledgeGraph?.category) {
            graph.category = this._knowledgeGraph.category;
            graph.framework = this._knowledgeGraph.framework;
        }
        if (graph && !graph.boxes && this._knowledgeGraph?.boxes) {
            graph.boxes = this._knowledgeGraph.boxes;
        }
        this._knowledgeGraph = graph;
        if (this._view) {
            this._view.webview.postMessage({
                command: 'updateKnowledgeGraph',
                graph: graph
            });
        }
        this._autoSave();
    }

    public getAllTermNames(): string[] {
        const names: string[] = [];
        if (this._currentContext) {
            this._collectTermNames(this._currentContext, names);
        }
        return names;
    }

    /**
     * Elaborate the knowledge graph for a newly-explained term: place the term
     * into its niche within the (already-generated) arch framework.
     *
     * This consolidates the explain-time graph update into the provider — the
     * component that owns `_knowledgeGraph` — so the pipeline is robust:
     *
     *   1. It snapshots the framework edges AFTER `whenArchReady()` resolves.
     *      The old inline version snapshotted BEFORE arch landed, so when a
     *      term was explained while arch was still generating (the common case
     *      — arch is a slow AI call), the elaboration saw an empty framework and
     *      the AI's response (just the new term's edge) then REPLACED the
     *      graph, wiping the arch edges that had arrived in the meantime.
     *   2. It never applies an empty result — an empty elaboration would wipe
     *      the existing framework instead of leaving it untouched.
     *   3. It defensively merges back any existing arch edges the model drops
     *      (the prompt asks it to preserve them, but a buggy response can't be
     *      allowed to erase a framework that cost an AI call to build).
     *
     * Intended to run fire-and-forget in the background alongside the
     * explanation AI call; it only needs the term name, not the explanation.
     */
    public async elaborateGraphForTerm(
        term: string,
        contextText: string,
        aiService: AIService
    ): Promise<void> {
        try {
            await this.whenArchReady();

            const existingEdges = this._knowledgeGraph.edges.length > 0 ? this._knowledgeGraph.edges : undefined;
            const existingTerms = this.getAllTermNames();

            const result = await aiService.updateKnowledgeGraph(term, contextText, existingTerms, existingEdges);
            if (!result || !result.edges || result.edges.length === 0) {
                console.warn(`updateKnowledgeGraph returned no edges for "${term}"; leaving the graph untouched.`);
                return;
            }

            // Defensive: the model is instructed to PRESERVE all existing
            // edges, but if it dropped any, merge them back so a bad response
            // can never erase the arch framework.
            const prev = this._knowledgeGraph.edges;
            if (prev.length > 0) {
                const key = (e: KnowledgeGraphEdge) => `${e.source}${e.target}${e.relation}`;
                const kept = new Set(result.edges.map(key));
                const lost = prev.filter(e => !kept.has(key(e)));
                if (lost.length > 0) {
                    result.edges = [...lost, ...result.edges];
                }
            }

            this.updateKnowledgeGraph(result);
        } catch (e) {
            console.error('Knowledge graph elaboration error:', e);
        }
    }

    private _collectTermNames(context: ContextNode, names: string[]) {
        collectTermNames(context, names);
    }

    private _buildMermaidGraph(graph: KnowledgeGraph): string {
        if (!graph || graph.edges.length === 0) return '';
        let mermaid = 'graph TD\n';
        const nodeIds = new Map<string, string>();
        let counter = 0;
        for (const edge of graph.edges) {
            if (!nodeIds.has(edge.source)) {
                nodeIds.set(edge.source, `N${counter++}`);
                mermaid += `    N${counter - 1}["${edge.source}"]\n`;
            }
            if (!nodeIds.has(edge.target)) {
                nodeIds.set(edge.target, `N${counter++}`);
                mermaid += `    N${counter - 1}["${edge.target}"]\n`;
            }
            mermaid += `    ${nodeIds.get(edge.source)} -->|${edge.relation}| ${nodeIds.get(edge.target)}\n`;
        }
        return mermaid;
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; font-src https://cdn.jsdelivr.net;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Knowledge Map</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                <style>
                    html, body {
                        height: 100%;
                        margin: 0;
                    }
                    body {
                        font-family: var(--vscode-editor-font-family);
                        color: var(--vscode-editor-foreground);
                        padding: 20px;
                        line-height: 1.6;
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                    }
                    /* Each tab fills the viewport below the tab bar. */
                    #doc-root, #architecture-view, #history-view {
                        flex: 1 1 auto;
                        min-height: 0;
                    }
                    #architecture-view {
                        flex-direction: column;
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
                    .practice-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: 1px solid var(--vscode-button-border);
                        padding: 4px 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.85em;
                        transition: background 0.2s;
                    }
                    .practice-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .practice-display {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        padding: 10px;
                        border-radius: 4px;
                        margin-bottom: 10px;
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

                    /* Graph node selection */
                    .mermaid .node.selected rect,
                    .mermaid .node.selected polygon,
                    .mermaid .node.selected circle {
                        stroke: var(--vscode-focusBorder) !important;
                        stroke-width: 3px !important;
                        filter: drop-shadow(0 0 4px var(--vscode-focusBorder));
                    }
                    .mermaid .node {
                        cursor: pointer;
                    }
                    /* Mediate sizing: render at mermaid's natural size (useMaxWidth:false
                       so it never STRETCHES to fill the panel — that was the "too big"
                       case), but cap the SVG WIDTH to the panel so wide graphs shrink
                       to fit instead of overflowing. Height is controlled by the
                       Windows-style drag handle below the graph. */
                    .mermaid .nodeLabel,
                    .mermaid .node .label,
                    .mermaid foreignObject div,
                    .mermaid .edgeLabel {
                        font-size: 18px !important;
                        line-height: 1.35 !important;
                    }
                    /* KaTeX math (esp. with sub/superscripts) is taller than the
                       placeholder text mermaid sized the node for. Let it overflow
                       the node box instead of clipping the last line. */
                    .mermaid foreignObject { overflow: visible !important; }
                    .mermaid foreignObject div {
                        padding: 6px 10px !important;
                        overflow: visible !important;
                    }
                    .mermaid .cluster-label,
                    .mermaid .cluster-label text {
                        font-size: 19px !important;
                        font-weight: 600;
                    }
                    /* The first member node starts near the top of the cluster and
                       overlaps the title. Lift the title content above the node area
                       (translate the inner element, NOT the <g> — that would override
                       mermaid's positioning transform). Give it a backdrop so it stays
                       readable even if a node is behind it. */
                    .mermaid .cluster-label foreignObject { overflow: visible !important; }
                    .mermaid .cluster-label foreignObject > div,
                    .mermaid .cluster-label foreignObject > span,
                    .mermaid .cluster-label > text {
                        transform: translateY(-14px);
                        background: var(--vscode-editor-background);
                        padding: 0 4px;
                    }
                    #mermaid-container {
                        overflow: auto;
                        flex: 1 1 auto;
                        min-height: 0;
                        text-align: center;
                    }
                    /* Graph wrapper: the 'zoom' CSS property (layout-affecting in
                       Chromium) scales the whole graph — boxes, words, math — and
                       grows the scroll area to match, so zoomed-in content stays
                       scrollable. */
                    #mermaid-graph-wrap {
                        display: inline-block;
                    }
                    #mermaid-container svg {
                        max-width: none !important;
                        width: auto !important;
                        height: auto !important;
                        display: inline-block;
                    }

                    /* Compare bar */
                    #compare-bar {
                        display: none;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 10px;
                        background: var(--vscode-editorWidget-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 4px;
                        margin-bottom: 8px;
                        font-size: 0.85em;
                    }
                    #compare-bar .selected-label {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        padding: 2px 8px;
                        border-radius: 3px;
                    }
                    #compare-bar .compare-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 3px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.9em;
                    }
                    #compare-bar .compare-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    #compare-bar .clear-btn {
                        background: transparent;
                        border: 1px solid var(--vscode-widget-border);
                        color: var(--vscode-foreground);
                        padding: 3px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.85em;
                    }
                </style>
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
                <div id="architecture-view" style="display:none;padding:10px;background:var(--vscode-editor-background);border-radius:5px;border:1px solid var(--vscode-widget-border);min-height:200px;">
                    <div id="arch-controls" style="display:flex;align-items:center;gap:8px;padding:4px 0 8px 0;font-size:12px;">
                        <button class="clear-btn" id="arch-zoom-out" title="Zoom out" style="padding:2px 8px;">−</button>
                        <span id="arch-zoom-value" style="min-width:42px;text-align:center;">100%</span>
                        <button class="clear-btn" id="arch-zoom-in" title="Zoom in" style="padding:2px 8px;">+</button>
                        <span id="arch-framework-name" style="margin-left:auto;font-weight:bold;opacity:0.85;"></span>
                    </div>
                    <div id="compare-bar">
                        <span id="compare-selection"></span>
                        <span id="compare-hint" style="opacity:0.6;">Ctrl+Alt+X = no viz · Ctrl+Shift+X = auto-viz</span>
                        <button class="clear-btn" id="compare-clear-btn">Clear</button>
                    </div>
                    <div id="mermaid-container">
                        <div id="mermaid-graph-wrap" class="mermaid"></div>
                    </div>
                </div>
                <div id="history-view">
                    <div id="instance-list"></div>
                </div>
                <div id="notification-toast"></div>

                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    let currentContext = null;
                    let focusedTermId = null;
                    let learningInstances = [];
                    let knowledgeGraphData = { edges: [] };
                    let archLineMaxLen = 80;
                    // Ask the provider for all current state once our message listener
                    // is registered. Messages posted right after the webview HTML is set
                    // can arrive before this listener exists and be silently lost; this
                    // handshake guarantees the knowledge graph (and context) are delivered.
                    vscode.postMessage({ command: 'requestState' });
                    // Graph zoom: a uniform scale on the whole graph (boxes, words, math
                    // together) instead of tweaking font/padding. The 'zoom' CSS property is
                    // layout-affecting in Chromium, so the scroll area grows with the graph.
                    let archZoom = 1.0;
                    function applyArchZoom() {
                        var wrap = document.getElementById('mermaid-graph-wrap');
                        if (wrap) { wrap.style.zoom = String(archZoom); }
                        var v = document.getElementById('arch-zoom-value');
                        if (v) { v.textContent = Math.round(archZoom * 100) + '%'; }
                    }
                    (function () {
                        var inc = document.getElementById('arch-zoom-in');
                        var dec = document.getElementById('arch-zoom-out');
                        if (inc) inc.addEventListener('click', function () {
                            archZoom = Math.min(3.0, archZoom * 1.15);
                            applyArchZoom();
                        });
                        if (dec) dec.addEventListener('click', function () {
                            archZoom = Math.max(0.3, archZoom / 1.15);
                            applyArchZoom();
                        });
                    })();
                    let selectedGraphNode = null;
                    let selectedGraphNode2 = null;
                    let nodeNameToLabel = {};  // maps Mermaid node ID (N0, N1...) to concept name

                    // Tab switching
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.addEventListener('click', () => {
                            const tabId = tab.getAttribute('data-tab');
                            document.querySelectorAll('.tab').forEach(t => {
                                t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
                            });
                            document.getElementById('doc-root').style.display = tabId === 'knowledge-map' ? 'block' : 'none';
                            document.getElementById('architecture-view').style.display = tabId === 'architecture-view' ? 'flex' : 'none';
                            document.getElementById('history-view').style.display = tabId === 'history-view' ? 'block' : 'none';
                            if (tabId === 'architecture-view') {
                                renderKnowledgeGraph();
                            } else if (tabId === 'history-view') {
                                renderInstances();
                            }
                        });
                    });

                    var saveBtn = document.getElementById('save-btn');
                    if (saveBtn) saveBtn.addEventListener('click', () => { saveInstance(); });

                    // Compare is triggered by keybound commands (Ctrl+Alt+X / Ctrl+Shift+X),
                    // not a button. Sync the graph-node selection to the extension so those
                    // commands can read it.
                    function syncCompareSelection() {
                        vscode.postMessage({
                            command: 'setCompareSelection',
                            termA: selectedGraphNode || undefined,
                            termB: selectedGraphNode2 || undefined
                        });
                    }
                    var compareClearBtn = document.getElementById('compare-clear-btn');
                    if (compareClearBtn) compareClearBtn.addEventListener('click', () => {
                        selectedGraphNode = null;
                        selectedGraphNode2 = null;
                        renderKnowledgeGraph();
                        updateCompareBar();
                        syncCompareSelection();
                    });

                    function showToast(text) {
                        const toast = document.getElementById('notification-toast');
                        toast.textContent = text;
                        toast.style.display = 'block';
                        setTimeout(() => {
                            toast.style.display = 'none';
                        }, 3000);
                    }

                    function switchTab(tabId) {
                         document.querySelectorAll('.tab').forEach(t => {
                             t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
                         });
                         document.getElementById('doc-root').style.display = (tabId === 'knowledge-map') ? 'block' : 'none';
                         document.getElementById('architecture-view').style.display = (tabId === 'architecture-view') ? 'block' : 'none';
                         document.getElementById('history-view').style.display = (tabId === 'history-view') ? 'block' : 'none';
                         if (tabId === 'architecture-view') {
                             renderKnowledgeGraph();
                         } else if (tabId === 'history-view') {
                             renderInstances();
                         }
                    }

                    function isArchitectureTabActive() {
                        return document.getElementById('architecture-view').style.display === 'block';
                    }

                    // Serialized mermaid re-render. The box-width slider fires
                    // renderKnowledgeGraph on every 'input' during a drag; calling
                    // mermaid.run() again before the previous render settles throws
                    // ("...different type..." / parse error) — which surfaced as
                    // "Failed to render knowledge graph" when enlarging. This runs one
                    // render at a time and replays only the latest pending graph, so
                    // drags can't collide.
                    let mermaidRenderInFlight = false;
                    let mermaidRenderPending = null;
                    function runMermaid(container, graphStr, mathBlocks) {
                        runMermaidWith(container, graphStr, mathBlocks || []);
                    }
                    function runMermaidWith(container, graphStr, mathBlocks) {
                        if (mermaidRenderInFlight) {
                            mermaidRenderPending = { container: container, graphStr: graphStr, mathBlocks: mathBlocks };
                            return;
                        }
                        mermaidRenderInFlight = true;
                        container.removeAttribute('data-processed');
                        container.textContent = graphStr;
                        // Click binding + highlight are emitted as mermaid directives
                        // (click <id> onNodeClick / class <id> selectedNode) in buildMermaidString,
                        // so no DOM-id parsing is needed after render.
                        window.mermaid.run({ nodes: [container] }).then(function () {
                            // Math was kept out of the mermaid source (placeholders) so
                            // the parser never chokes on \, {}, ^, _, () in labels at any
                            // wrap width. Now swap placeholders back to $$...$$ and
                            // KaTeX-render them.
                            try { restoreMathPlaceholders(container, mathBlocks); } catch (e) { console.error('restoreMathPlaceholders failed:', e); }
                            // Re-apply the graph zoom (the SVG was just re-created).
                            try { applyArchZoom(); } catch (e) { console.error('applyArchZoom failed:', e); }
                            mermaidRenderInFlight = false;
                            if (mermaidRenderPending) {
                                var next = mermaidRenderPending;
                                mermaidRenderPending = null;
                                runMermaidWith(next.container, next.graphStr, next.mathBlocks);
                            }
                        }).catch(function (e) {
                            mermaidRenderInFlight = false;
                            mermaidRenderPending = null;
                            console.error('Mermaid render failed. Generated graph string:', graphStr, e);
                            container.textContent = 'Failed to render knowledge graph. See console (Developer Tools) for the generated mermaid source and parse error.';
                        });
                    }
                    function renderKnowledgeGraph() {
                         // Caption: show the detected logic frameworks. When the
                         // arch has blocks (boxes), list their distinct frameworks;
                         // otherwise fall back to category · framework.
                         const cap = document.getElementById('arch-framework-name');
                         const g = knowledgeGraphData || {};
                         if (cap) {
                             let text = '';
                             if (Array.isArray(g.boxes) && g.boxes.length) {
                                 const fws = [];
                                 for (const b of g.boxes) {
                                     if (b.framework) {
                                         fws.push(b.framework + (b.isNewFramework ? ' (new)' : ''));
                                     }
                                 }
                                 // also count inter-block relations as frameworks
                                 if (Array.isArray(g.edges)) {
                                     for (const e of g.edges) {
                                         const r = e && e.relation;
                                         if (r && r !== 'leads-to' && r !== 'needed-for' && r !== 'is-a' && r !== 'example-of' && r !== 'specializes') {
                                             if (!fws.includes(r)) { fws.push(r); }
                                         }
                                     }
                                 }
                                 // dedupe preserving order
                                 const uniq = [];
                                 for (const f of fws) { if (!uniq.includes(f)) { uniq.push(f); } }
                                 text = uniq.length ? 'Frameworks: ' + uniq.join(', ') : '';
                             } else {
                                 const parts = [];
                                 if (g.category) parts.push(g.category);
                                 if (g.framework) parts.push(g.framework + (g.isNewFramework ? ' (new)' : ''));
                                 text = parts.length ? 'Framework: ' + parts.join(' · ') : '';
                             }
                             cap.textContent = text;
                         }
                         const container = document.getElementById('mermaid-graph-wrap');
                         // Ground-truth log: if the Arch tab ever shows the wrong thing,
                         // this is the authoritative view of what the provider sent.
                         console.log('[arch] knowledgeGraphData', JSON.stringify(knowledgeGraphData));
                         // buildMermaidString runs AFTER the caption is set above. If it
                         // throws (e.g. on a malformed label), the caption stays populated
                         // ("Frameworks: …") while the graph area keeps its previous text —
                         // which looked exactly like "arch generated but not shown". Catch it.
                         let graphStr = '';
                         let mathBlocks = [];
                         let buildError = null;
                         try {
                             graphStr = buildMermaidString(knowledgeGraphData);
                             mathBlocks = archMathBlocks.slice();
                         } catch (e) {
                             buildError = e;
                             console.error('buildMermaidString threw while rendering the arch graph:', e, 'graph data:', knowledgeGraphData);
                         }
                         if (buildError) {
                             container.textContent = 'Failed to build knowledge graph: ' + ((buildError && buildError.message) ? buildError.message : String(buildError)) + '. See console (Developer Tools) for the graph data and error.';
                         } else if (graphStr && window.mermaid) {
                             runMermaid(container, graphStr, mathBlocks);
                         } else {
                             // Distinguish "nothing generated yet" from "generated but not
                             // renderable" (e.g. framework blocks with empty members), so the
                             // Arch tab never silently shows an empty box over real data.
                             const boxes = (knowledgeGraphData && Array.isArray(knowledgeGraphData.boxes)) ? knowledgeGraphData.boxes : [];
                             if (boxes.length > 0) {
                                 container.textContent = 'Arch generated ' + boxes.length + ' framework block(s) but the graph has no renderable edges/members. See console (Developer Tools).';
                             } else if (graphStr) {
                                 container.textContent = 'Loading renderer...';
                             } else {
                                 container.textContent = 'No knowledge graph yet. Explain terms to build one.';
                             }
                         }
                    }

                    // Mermaid invokes this (via click <id> onNodeClick directives) with the node id.
                    window.onNodeClick = function(nodeId) {
                        const conceptName = nodeNameToLabel[nodeId];
                        if (conceptName) handleNodeClick(conceptName);
                    };

                    function handleNodeClick(conceptName) {
                        if (selectedGraphNode === conceptName) {
                            // Deselect first
                            selectedGraphNode = null;
                        } else if (selectedGraphNode2 === conceptName) {
                            // Deselect second
                            selectedGraphNode2 = null;
                        } else if (!selectedGraphNode) {
                            selectedGraphNode = conceptName;
                        } else if (!selectedGraphNode2) {
                            selectedGraphNode2 = conceptName;
                        } else {
                            // Both already selected, replace second
                            selectedGraphNode2 = conceptName;
                        }
                        // Re-render so class <id> selectedNode directives re-apply the highlight
                        renderKnowledgeGraph();
                        updateCompareBar();
                        syncCompareSelection();
                    }

                    function updateCompareBar() {
                        const bar = document.getElementById('compare-bar');
                        const selection = document.getElementById('compare-selection');
                        if (!selectedGraphNode && !selectedGraphNode2) {
                            bar.style.display = 'none';
                            return;
                        }
                        bar.style.display = 'flex';
                        let html = '';
                        if (selectedGraphNode) {
                            html += '<span class="selected-label">' + selectedGraphNode + '</span>';
                        }
                        if (selectedGraphNode && selectedGraphNode2) {
                            html += ' vs ';
                        }
                        if (selectedGraphNode2) {
                            html += '<span class="selected-label">' + selectedGraphNode2 + '</span>';
                        }
                        selection.innerHTML = html;
                    }

                    // Render math in the arch graph with KaTeX — the SAME library
                    // the Map tab uses. Mermaid 10 renders $$...$$ blocks in node
                    // labels / subgraph titles with KaTeX automatically (katex is
                    // loaded globally, securityLevel is 'loose'). So we keep the
                    // $$...$$ blocks intact in labels and let Mermaid render them.
                    // These helpers protect $$...$$ from sanitize/wrap so they are
                    // not split or stripped.
                    //
                    // ESCAPING NOTE: this JS is inside a TS template literal, so a
                    // backslash in the webview source is written as two backslashes
                    // here. To match a literal '$' we write \\$ here (-> \$ in the
                    // webview regex). No backslashes are used in string literals.
                    function withMathProtected(text, fn) {
                        const blocks = [];
                        // extract $$...$$ (non-greedy, across newlines) -> placeholder
                        let s = String(text == null ? '' : text).replace(/\\$\\$[\\s\\S]*?\\$\\$/g, function (m) {
                            blocks.push(m);
                            return ' QMATHB' + (blocks.length - 1) + 'QMATHE ';
                        });
                        s = fn(s);
                        s = s.replace(/QMATHB(\\d+)QMATHE/g, function (m, idx) {
                            return blocks[parseInt(idx, 10)];
                        });
                        return s;
                    }
                    // Label helpers shared by processMermaidLabel / processMermaidBoxTitle
                    // AND buildMermaidString. MUST live at this (top) scope: they were
                    // previously nested inside buildMermaidString, which put them out of
                    // reach of the sibling label processors and threw "truncateLabel is
                    // not defined" the moment the arch had any boxes/edges to render —
                    // leaving the caption populated but the graph area stuck on
                    // "No knowledge graph yet".
                    // NOTE: regex escapes in this template literal MUST be double-backslashed
                    // (\\s, \\d, \\r\\n). A single \s collapses to 's' when the template is
                    // evaluated, turning /\\s+/ into /s+/ and splitting words on the letter 's'.
                    const LABEL_MAX_LEN = 160;
                    function truncateLabel(label) {
                        const s = String(label || '');
                        return s.length > LABEL_MAX_LEN ? s.slice(0, LABEL_MAX_LEN) + '…' : s;
                    }
                    function wrapLabel(label) {
                        const words = String(label || '').split(/\\s+/).filter(Boolean);
                        let line = '', out = '';
                        for (const w of words) {
                            if (line && (line.length + 1 + w.length) > archLineMaxLen) {
                                out += line + '<br/>';
                                line = w;
                            } else {
                                line = line ? line + ' ' + w : w;
                            }
                        }
                        return out + line;
                    }
                    // Math placeholders: $$...$$ is replaced in the mermaid SOURCE by a
                    // unique, length-padded alphanumeric token (no \, {}, ^, _, (, )),
                    // so mermaid's parser never chokes on math at any wrap width. After
                    // mermaid renders, restoreMathPlaceholders swaps the tokens back to
                    // $$...$$ and KaTeX-renders them. The token is padded to ~the math
                    // length so mermaid sizes the node wide enough for the restored KaTeX
                    // output (prevents the math re-wrapping per-token inside a narrow node).
                    let archMathBlocks = [];
                    function protectMath(text) {
                        return String(text == null ? '' : text).replace(/\\$\\$[\\s\\S]*?\\$\\$/g, function (m) {
                            var idx = archMathBlocks.length;
                            var pad = Math.max(0, m.length - 4);
                            var ph = 'XM' + idx + 'M' + 'X'.repeat(pad);
                            archMathBlocks.push({ ph: ph, math: m });
                            return ' ' + ph + ' ';
                        });
                    }
                    function restoreMathPlaceholders(container, mathBlocks) {
                        if (!mathBlocks || !mathBlocks.length) return;
                        // Walk text nodes (preserves mermaid's click bindings on parent
                        // elements) and swap each placeholder token back to its $$...$$.
                        var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
                        var node;
                        while ((node = walker.nextNode())) {
                            var v = node.nodeValue;
                            if (v && v.indexOf('XM') !== -1) {
                                var changed = v;
                                for (var i = 0; i < mathBlocks.length; i++) {
                                    var b = mathBlocks[i];
                                    if (b && b.ph && changed.indexOf(b.ph) !== -1) {
                                        changed = changed.split(b.ph).join(b.math);
                                    }
                                }
                                if (changed !== v) { node.nodeValue = changed; }
                            }
                        }
                        if (window.renderMathInElement) {
                            window.renderMathInElement(container, {
                                delimiters: [
                                    {left: '$$', right: '$$', display: false},
                                    {left: '$', right: '$', display: false}
                                ],
                                throwOnError: false
                            });
                        }
                    }
                    function processMermaidLabel(text) {
                        // Replace $$...$$ with mermaid-safe placeholders (KaTeX-rendered
                        // after mermaid via restoreMathPlaceholders), then sanitize/wrap.
                        let s = protectMath(truncateLabel(text));
                        s = s.replace(/[\\r\\n]+/g, ' ')
                             .replace(/[|\\x60<>\\[\\]]/g, '')
                             .trim();
                        s = wrapLabel(s);
                        // KaTeX math (esp. with sub/superscripts) is taller than the
                        // placeholder text mermaid sized this node for, so it spilled
                        // upward and covered the cluster (grey box) title. Add a blank
                        // line of height per math-bearing label so mermaid measures the
                        // node tall enough to contain the restored KaTeX — no spill.
                        if (s.indexOf('XM') !== -1) { s += '<br/>&nbsp;'; }
                        return s.replace(/"/g, "'");
                    }
                    function processMermaidBoxTitle(text) {
                        let s = protectMath(truncateLabel(text));
                        s = s.replace(/[\\r\\n]+/g, ' ')
                             .replace(/[|\\x60<>\\[\\]"]/g, '')
                             .trim();
                        return s.replace(/"/g, "'");
                    }

                    function buildMermaidString(graph) {
                        archMathBlocks = [];  // reset per render; protectMath populates
                        const hasEdges = graph && graph.edges && graph.edges.length > 0;
                        const hasBoxes = graph && Array.isArray(graph.boxes) && graph.boxes.some(b => b && Array.isArray(b.members) && b.members.length > 0);
                        if (!hasEdges && !hasBoxes) return '';
                        nodeNameToLabel = {};  // reset reverse mapping
                        // truncateLabel / wrapLabel / LABEL_MAX_LEN are shared top-level
                        // helpers above (processMermaidLabel uses them too).
                        // Mermaid breaks on |, ", ], <, >, backticks, and newlines inside labels/arrow text.
                        // Node names and relations come from the LLM as free-form text, so sanitize aggressively.
                        // (Math $$...$$ blocks in node labels are protected separately by
                        // processMermaidLabel; this sanitizer is used for edge relation text,
                        // which is plain framework names like "leads-to".)
                        function sanitizeMermaidText(text) {
                            return String(text || '')
                                .replace(/[\\r\\n]+/g, ' ')
                                .replace(/[|\x60<>]/g, '')
                                .replace(/"\]/g, '')
                                .trim();
                        }

                        // Assign stable IDs to all node names
                        const nodeIds = {};
                        let counter = 0;
                        function getId(name) {
                            if (!nodeIds[name]) {
                                const id = 'N' + (counter++);
                                nodeIds[name] = id;
                                nodeNameToLabel[id] = name;  // reverse mapping for click handler
                            }
                            return nodeIds[name];
                        }

                        // Collect all nodes
                        const allNodes = new Set();
                        const realEdges = [];
                        const loneNodes = [];
                        for (const edge of (graph.edges || [])) {
                            allNodes.add(edge.source);
                            if (edge.source === edge.target) {
                                loneNodes.push(edge.source);
                            } else {
                                allNodes.add(edge.target);
                                realEdges.push(edge);
                            }
                        }

                        // Real nodes = nodes appearing in a non-self edge.
                        const realNodeSet = new Set(realEdges.flatMap(e => [e.source, e.target]));

                        // Determine arrow style
                        const SOLID_RELATIONS = new Set(['is-a', 'example-of', 'specializes']);
                        function arrowStr(edge) {
                            const isSolid = edge.lineStyle === 'solid' || SOLID_RELATIONS.has(edge.relation);
                            const rel = sanitizeMermaidText(edge.relation || '');
                            return isSolid
                                ? (rel ? ' -->|' + rel + '| ' : ' --> ')
                                : (rel ? ' -.->|' + rel + '| ' : ' -.-> ');
                        }

                        // Encapsulation boxes (blocks). Each box is a Mermaid subgraph
                        // titled by the result statement, containing the deduction members.
                        const boxes = (Array.isArray(graph.boxes) ? graph.boxes : [])
                            .filter(b => b && typeof b.label === 'string' && Array.isArray(b.members) && b.members.length > 0);
                        const boxMembers = new Set();
                        for (const b of boxes) {
                            for (const m of b.members) { boxMembers.add(m); }
                        }

                        // Build output
                        let result = 'graph TD\\n    classDef selectedNode stroke-width:3px,stroke:#0f0;\\n';
                        const declared = new Set();
                        function emitNodeDecl(name) {
                            if (declared.has(name)) return;
                            declared.add(name);
                            const label = processMermaidLabel(name);
                            result += '    ' + getId(name) + '["' + label + '"]\\n';
                        }

                        if (boxes.length > 0) {
                            // Emit each box as a bordered subgraph titled by the result statement.
                            for (let i = 0; i < boxes.length; i++) {
                                const b = boxes[i];
                                const title = processMermaidBoxTitle(b.label);
                                result += '    subgraph B' + i + ' ["' + title + '"]\\n';
                                for (const m of b.members) {
                                    emitNodeDecl(m);
                                }
                                result += '    end\\n';
                            }
                            // Non-box nodes (appear in edges but belong to no box).
                            for (const node of realNodeSet) {
                                if (!boxMembers.has(node)) { emitNodeDecl(node); }
                            }
                            for (const node of loneNodes) {
                                if (!boxMembers.has(node) && !realNodeSet.has(node)) { emitNodeDecl(node); }
                            }
                        } else {
                            // Flat rendering (no boxes): emit all nodes directly.
                            for (const node of realNodeSet) { emitNodeDecl(node); }
                            for (const node of loneNodes) {
                                if (!realNodeSet.has(node)) { emitNodeDecl(node); }
                            }
                        }

                        // Edges
                        for (const edge of realEdges) {
                            result += '    ' + getId(edge.source) + arrowStr(edge) + getId(edge.target) + '\\n';
                        }

                        // Native click callbacks + selected highlight.
                        // click <id> onNodeClick is bound by mermaid itself (securityLevel: 'loose'),
                        // so this does not depend on mermaid's internal DOM id format.
                        for (const name of Object.keys(nodeIds)) {
                            const id = nodeIds[name];
                            result += '    click ' + id + ' onNodeClick\\n';
                            if (name === selectedGraphNode || name === selectedGraphNode2) {
                                result += '    class ' + id + ' selectedNode\\n';
                            }
                        }

                        return result;
                    }

                    function renderInstances() {
                        const list = document.getElementById('instance-list');
                        if (learningInstances.length === 0) {
                            list.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">No saved instances found.</div>';
                            return;
                        }
                        list.innerHTML = learningInstances.map(inst =>
                            '<div class="instance-item" data-id="' + inst.id + '">' +
                            '<div class="instance-info">' +
                            '<span class="instance-name"></span>' +
                            '<span class="instance-date"></span>' +
                            '</div>' +
                            '<div class="instance-actions"><button title="Delete">&times;</button></div>' +
                            '</div>'
                        ).join('');
                        list.querySelectorAll('.instance-item').forEach((item, idx) => {
                            const inst = learningInstances[idx];
                            item.querySelector('.instance-name').textContent = inst.name;
                            item.querySelector('.instance-date').textContent = new Date(inst.createdAt).toLocaleString();
                            item.querySelector('.instance-info').addEventListener('click', () => loadInstance(inst.id));
                            item.querySelector('.instance-actions button').addEventListener('click', e => {
                                e.stopPropagation();
                                deleteInstance(inst.id);
                            });
                        });
                    }

                    function loadInstance(id) {
                        vscode.postMessage({ command: 'loadInstance', instanceId: id });
                        showToast('Loading instance...');
                    }

                    function deleteInstance(id) {
                        vscode.postMessage({ command: 'deleteInstance', instanceId: id });
                    }

                    // Render markdown + KaTeX in a way that prevents marked from
                    // consuming LaTeX delimiter backslashes (\\(, \\), \\[, \\]).
                    // Strategy: extract math regions first, replace with plain
                    // alphanumeric placeholders, run marked, then restore math
                    // and let KaTeX render the original delimiters.
                    // Human-readable label for a branch type. Pedagogical types are title-cased
                    // from their hyphenated id; 'comparative-learning' is shown as 'Comparative Learning'.
                    function branchTypeLabel(type) {
                        if (type === 'comparative-learning') {
                            return 'Comparative Learning';
                        }
                        if (type === 'comparative-learning-desc') {
                            return 'Comparative Learning (Description)';
                        }
                        if (type === 'comparative-learning-model') {
                            return 'Comparative Learning (Model)';
                        }
                        return String(type || '')
                            .split('-')
                            .map(function (w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; })
                            .join('-');
                    }

                    function renderMarkdownAndMath(rawText, container) {
                        if (!rawText || !rawText.trim()) {
                            // Empty content (e.g. a past explanation that returned
                            // nothing). Show a placeholder instead of a blank box so
                            // the user knows to re-run this branch.
                            container.innerHTML = '<p style="opacity:0.55;font-style:italic;">No explanation content for this branch yet. Re-run this explanation type to generate it.</p>';
                            return;
                        }
                        const mathBlocks = [];
                        let i = 0;
                        let processed = '';
                        function tryDelim(open, close, allowNewline) {
                            if (rawText.substr(i, open.length) !== open) return false;
                            const start = i + open.length;
                            let end = -1;
                            for (let j = start; j <= rawText.length - close.length; j++) {
                                if (!allowNewline && rawText[j] === '\\n') return false;
                                if (rawText.substr(j, close.length) === close) {
                                    end = j;
                                    break;
                                }
                            }
                            if (end === -1) return false;
                            mathBlocks.push(rawText.substring(i, end + close.length));
                            processed += 'qMATHB' + (mathBlocks.length - 1) + 'qENDB';
                            i = end + close.length;
                            return true;
                        }
                        while (i < rawText.length) {
                            if (tryDelim('$$', '$$', true)) continue;
                            if (tryDelim('\\\\[', '\\\\]', true)) continue;
                            if (tryDelim('\\\\(', '\\\\)', false)) continue;
                            if (rawText[i] === '$' && rawText[i+1] !== '$' && tryDelim('$', '$', false)) continue;
                            processed += rawText[i];
                            i++;
                        }
                        let html = window.marked ? window.marked.parse(processed) : processed.replace(/\\n/g, '<br/>');
                        html = html.replace(/qMATHB(\\d+)qENDB/g, function(m, idx) { return mathBlocks[parseInt(idx)]; });
                        container.innerHTML = html;
                        if (window.renderMathInElement) {
                            window.renderMathInElement(container, {
                                delimiters: [
                                    {left: '$$', right: '$$', display: true},
                                    {left: '$', right: '$', display: false},
                                    {left: '\\\\(', right: '\\\\)', display: false},
                                    {left: '\\\\[', right: '\\\\]', display: true}
                                ],
                                throwOnError: false
                            });
                        }
                    }

                    function updateFocusUI() {
                        // Toggle focus classes directly. DO NOT call renderDocument() here — a full
                        // re-render destroys the DOM mid-event (e.g. during a branch-tab mousedown,
                        // which fires before click) and eats the following click, forcing a second
                        // click to take effect. Class toggling is enough: focus only ever changes
                        // the .active chip and the .focused box.
                        document.querySelectorAll('.term-chip.active').forEach(c => c.classList.remove('active'));
                        document.querySelectorAll('.explanation-box.focused').forEach(b => b.classList.remove('focused'));
                        if (focusedTermId) {
                            const chip = document.getElementById('chip-' + focusedTermId);
                            if (chip) chip.classList.add('active');
                            const box = document.getElementById('exp-' + focusedTermId);
                            if (box) box.classList.add('focused');
                        }
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
                                renderMarkdownAndMath(para.text, textDiv);
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
                                    chip.id = 'chip-' + term.id;
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
                                            tab.textContent = branchTypeLabel(branch.type);
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
                                            
                                            renderMarkdownAndMath(branch.content, panel);

                                            // Practice section for model branches (both encapsulation and reduction)
                                            if (branch.type === 'model-encapsulation' || branch.type === 'model-reduction') {
                                                const practiceSection = document.createElement('div');
                                                practiceSection.className = 'practice-section';
                                                practiceSection.style.marginTop = '15px';
                                                practiceSection.style.padding = '10px';
                                                practiceSection.style.borderTop = '1px solid var(--vscode-widget-border)';
                                                
                                                const hasPractices = branch.practices && branch.practices.length > 0;
                                                const isPracticeVisible = branch.practiceVisible !== false; // Default visible if has practices
                                                
                                                // Practice header with toggle
                                                const practiceHeader = document.createElement('div');
                                                practiceHeader.style.display = 'flex';
                                                practiceHeader.style.justifyContent = 'space-between';
                                                practiceHeader.style.alignItems = 'center';
                                                practiceHeader.style.marginBottom = '10px';
                                                practiceHeader.style.cursor = 'pointer';
                                                
                                                const practiceLabel = document.createElement('span');
                                                practiceLabel.textContent = 'Practice Problems';
                                                practiceLabel.style.fontWeight = 'bold';
                                                practiceLabel.style.fontSize = '0.9em';
                                                
                                                const toggleBtn = document.createElement('button');
                                                toggleBtn.className = 'practice-btn';
                                                toggleBtn.textContent = isPracticeVisible ? 'Hide' : 'Show';
                                                toggleBtn.style.fontSize = '0.75em';
                                                toggleBtn.style.padding = '2px 8px';
                                                
                                                practiceHeader.appendChild(practiceLabel);
                                                practiceHeader.appendChild(toggleBtn);
                                                practiceSection.appendChild(practiceHeader);
                                                
                                                const practiceContent = document.createElement('div');
                                                practiceContent.className = 'practice-content';
                                                practiceContent.style.display = isPracticeVisible ? 'block' : 'none';
                                                
                                                const currentIdx = branch.currentPracticeIndex || 0;
                                                
                                                if (hasPractices && branch.practices[currentIdx]) {
                                                    const currentPractice = branch.practices[currentIdx];
                                                    const practiceDisplay = document.createElement('div');
                                                    practiceDisplay.className = 'practice-display';
                                                    practiceContent.appendChild(practiceDisplay);
                                                    renderMarkdownAndMath(currentPractice.content, practiceDisplay);
                                                }
                                                
                                                const btnContainer = document.createElement('div');
                                                btnContainer.style.marginTop = '10px';
                                                btnContainer.style.display = 'flex';
                                                btnContainer.style.gap = '8px';
                                                
                                                if (!hasPractices) {
                                                    const practiceBtn = document.createElement('button');
                                                    practiceBtn.className = 'practice-btn';
                                                    practiceBtn.textContent = 'Practice';
                                                    practiceBtn.onclick = (e) => {
                                                        e.stopPropagation();
                                                        vscode.postMessage({ command: 'generatePractice', termId: term.id, branchType: branch.type });
                                                    };
                                                    btnContainer.appendChild(practiceBtn);
                                                } else {
                                                    const easierBtn = document.createElement('button');
                                                    easierBtn.className = 'practice-btn';
                                                    easierBtn.textContent = 'Easier';
                                                    easierBtn.onclick = (e) => {
                                                        e.stopPropagation();
                                                        vscode.postMessage({ command: 'generatePractice', termId: term.id, branchType: branch.type, difficulty: -1 });
                                                    };
                                                    
                                                    const sameBtn = document.createElement('button');
                                                    sameBtn.className = 'practice-btn';
                                                    sameBtn.textContent = 'Same';
                                                    sameBtn.onclick = (e) => {
                                                        e.stopPropagation();
                                                        vscode.postMessage({ command: 'generatePractice', termId: term.id, branchType: branch.type, difficulty: 0 });
                                                    };
                                                    
                                                    const harderBtn = document.createElement('button');
                                                    harderBtn.className = 'practice-btn';
                                                    harderBtn.textContent = 'Harder';
                                                    harderBtn.onclick = (e) => {
                                                        e.stopPropagation();
                                                        vscode.postMessage({ command: 'generatePractice', termId: term.id, branchType: branch.type, difficulty: 1 });
                                                    };
                                                    
                                                    const setBtn = document.createElement('button');
                                                    setBtn.className = 'practice-btn';
                                                    setBtn.textContent = 'Practice Set';
                                                    setBtn.onclick = (e) => {
                                                        e.stopPropagation();
                                                        vscode.postMessage({ command: 'showPracticeSet', termId: term.id, branchType: branch.type });
                                                    };
                                                    
                                                    btnContainer.appendChild(easierBtn);
                                                    btnContainer.appendChild(sameBtn);
                                                    btnContainer.appendChild(harderBtn);
                                                    btnContainer.appendChild(setBtn);
                                                }
                                                
                                                practiceContent.appendChild(btnContainer);
                                                practiceSection.appendChild(practiceContent);
                                                
                                                // Toggle functionality
                                                toggleBtn.onclick = (e) => {
                                                    e.stopPropagation();
                                                    const isVisible = practiceContent.style.display !== 'none';
                                                    practiceContent.style.display = isVisible ? 'none' : 'block';
                                                    toggleBtn.textContent = isVisible ? 'Show' : 'Hide';
                                                    vscode.postMessage({ command: 'togglePracticeVisibility', termId: term.id, branchType: branch.type, visible: !isVisible });
                                                };
                                                
                                                panel.appendChild(practiceSection);
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
                        // Find the explanation box for this term, then find tabs and panels within it
                        const expBox = document.getElementById('exp-' + termId);
                        if (!expBox) return;
                        
                        const tabs = expBox.querySelectorAll('.branch-tab');
                        tabs.forEach((tab, idx) => {
                            tab.classList.toggle('active', idx === branchIdx);
                        });
                        
                        expBox.querySelectorAll('.branch-panel').forEach((panel, idx) => {
                            panel.style.display = idx === branchIdx ? 'block' : 'none';
                        });
                    }

                    // Keydown listener for Shortcuts
                    window.addEventListener('keydown', event => {
                        const isCtrlAlt = (event.ctrlKey || event.metaKey) && event.altKey;
                        if (!isCtrlAlt) return;

                        const selection = window.getSelection().toString().trim();
                        
                        if ((event.key === 's' || event.key === 'S') && selection) {
                            vscode.postMessage({ command: 'setContext', text: selection });
                        }
                    });
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.command === 'updateContext') {
                            const isFirstContext = !currentContext;
                            currentContext = message.context;
                            focusedTermId = message.focusedTermId;
                            renderDocument();
                            if (isFirstContext || message.switchToMap) {
                                setTimeout(() => { switchTab('knowledge-map'); }, 100);
                            }
                        }
                        if (message.command === 'updateKnowledgeGraph') {
                             knowledgeGraphData = message.graph;
                             if (document.getElementById('architecture-view').style.display === 'block') renderKnowledgeGraph();
                             return;
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
                </script>
                <script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
                <script nonce="${nonce}">
                    if (typeof marked !== 'undefined') window.marked = marked;
                    if (typeof renderMathInElement !== 'undefined') window.renderMathInElement = renderMathInElement;
                    if (typeof mermaid !== 'undefined') { mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose', flowchart: { htmlLabels: true, useMaxWidth: false, nodeSpacing: 44, rankSpacing: 44, curve: 'basis' } }); window.mermaid = mermaid; }
                </script>
            </body>
            </html>`;
    }
}
