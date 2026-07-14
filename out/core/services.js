"use strict";
/**
 * Services container.
 *
 * Replaces the module-level mutable singletons (`isActive`, `debugSessionTracker`,
 * `knowledgeLibrary`) and the scattered `new AIService()` call sites that used
 * to live in extension.ts. Command handlers receive a `Services` instance and
 * read collaborators off it, so wiring is explicit and testable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Services = void 0;
const knowledgeLibrary_1 = require("../knowledgeLibrary");
const aiService_1 = require("../aiService");
const traceViewerPanel_1 = require("../traceViewerPanel");
const knowledgeMapPanel_1 = require("../knowledgeMapPanel");
const debugSessionTracker_1 = require("../debugSessionTracker");
const frameworkRegistry_1 = require("../pedagogy/frameworkRegistry");
const languageMode_1 = require("./languageMode");
class Services {
    constructor(context) {
        this.context = context;
        this._debugTracker = null;
        /** Whether the explainer is currently active (toggled on). */
        this.active = false;
        /** Reentrancy guard for the visualize/diagram commands. */
        this.visualizing = false;
        this.knowledgeLibrary = new knowledgeLibrary_1.KnowledgeLibrary(context);
        this.traceViewProvider = new traceViewerPanel_1.TraceViewProvider(context.extensionUri);
        this.knowledgeMapProvider = new knowledgeMapPanel_1.KnowledgeMapProvider(context.extensionUri);
        this.frameworkRegistry = new frameworkRegistry_1.FrameworkRegistry(context.globalStorageUri.fsPath, context.asAbsolutePath('resources/frameworks.default.json'));
        this.languageMode = new languageMode_1.LanguageMode(context);
    }
    /** Lazily-created, shared AI service instance. */
    get aiService() {
        if (!this._aiService) {
            this._aiService = new aiService_1.AIService();
        }
        return this._aiService;
    }
    get debugTracker() {
        return this._debugTracker;
    }
    /** True iff a tracker exists and is currently recording. */
    get isRecording() {
        return this._debugTracker?.isRecording ?? false;
    }
    /** Lazily create the debug session tracker if one does not exist. */
    ensureDebugTracker() {
        if (!this._debugTracker) {
            this._debugTracker = new debugSessionTracker_1.DebugSessionTracker(this.aiService, this.knowledgeLibrary, this.traceViewProvider, this.knowledgeMapProvider);
        }
        return this._debugTracker;
    }
    /** Dispose and drop the current tracker (used when toggling off). */
    disposeDebugTracker() {
        if (this._debugTracker) {
            this._debugTracker.dispose();
            this._debugTracker = null;
        }
    }
}
exports.Services = Services;
//# sourceMappingURL=services.js.map