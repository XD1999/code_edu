/**
 * Services container.
 *
 * Replaces the module-level mutable singletons (`isActive`, `debugSessionTracker`,
 * `knowledgeLibrary`) and the scattered `new AIService()` call sites that used
 * to live in extension.ts. Command handlers receive a `Services` instance and
 * read collaborators off it, so wiring is explicit and testable.
 */

import * as vscode from 'vscode';
import { KnowledgeLibrary } from '../knowledgeLibrary';
import { AIService } from '../aiService';
import { TraceViewProvider } from '../traceViewerPanel';
import { KnowledgeMapProvider } from '../knowledgeMapPanel';
import { DebugSessionTracker } from '../debugSessionTracker';
import { FrameworkRegistry } from '../pedagogy/frameworkRegistry';
import { LanguageMode } from './languageMode';

export class Services {
    readonly knowledgeLibrary: KnowledgeLibrary;
    readonly traceViewProvider: TraceViewProvider;
    readonly knowledgeMapProvider: KnowledgeMapProvider;
    readonly frameworkRegistry: FrameworkRegistry;
    /** Global natural-language/math language choice (Ctrl+Alt+F to toggle). */
    readonly languageMode: LanguageMode;

    private _aiService?: AIService;
    private _debugTracker: DebugSessionTracker | null = null;
    /** Whether the explainer is currently active (toggled on). */
    active: boolean = false;
    /** Reentrancy guard for the visualize/diagram commands. */
    visualizing: boolean = false;

    constructor(readonly context: vscode.ExtensionContext) {
        this.knowledgeLibrary = new KnowledgeLibrary(context);
        this.traceViewProvider = new TraceViewProvider(context.extensionUri);
        this.knowledgeMapProvider = new KnowledgeMapProvider(context.extensionUri);
        this.frameworkRegistry = new FrameworkRegistry(
            context.globalStorageUri.fsPath,
            context.asAbsolutePath('resources/frameworks.default.json')
        );
        this.languageMode = new LanguageMode(context);
    }

    /** Lazily-created, shared AI service instance. */
    get aiService(): AIService {
        if (!this._aiService) {
            this._aiService = new AIService();
        }
        return this._aiService;
    }

    get debugTracker(): DebugSessionTracker | null {
        return this._debugTracker;
    }

    /** True iff a tracker exists and is currently recording. */
    get isRecording(): boolean {
        return this._debugTracker?.isRecording ?? false;
    }

    /** Lazily create the debug session tracker if one does not exist. */
    ensureDebugTracker(): DebugSessionTracker {
        if (!this._debugTracker) {
            this._debugTracker = new DebugSessionTracker(
                this.aiService,
                this.knowledgeLibrary,
                this.traceViewProvider,
                this.knowledgeMapProvider
            );
        }
        return this._debugTracker;
    }

    /** Dispose and drop the current tracker (used when toggling off). */
    disposeDebugTracker(): void {
        if (this._debugTracker) {
            this._debugTracker.dispose();
            this._debugTracker = null;
        }
    }
}
