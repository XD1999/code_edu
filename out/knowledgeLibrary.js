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
exports.KnowledgeLibrary = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class KnowledgeLibrary {
    constructor(context) {
        this.projectOverview = '';
        this.architectureGraph = '';
        this.fileExplanations = new Map();
        this.functionExplanations = new Map();
        this.traces = [];
        this.learningInstances = [];
        this.context = context;
        this.knowledgeBasePath = path.join(context.globalStorageUri.fsPath, 'knowledge');
        this.ensureKnowledgeDirectory();
        this.loadFromStorage();
    }
    get extensionUri() {
        return this.context.extensionUri;
    }
    async saveProjectOverview(overview) {
        this.projectOverview = overview;
        await this.saveToStorage();
    }
    async saveArchitectureGraph(graph) {
        this.architectureGraph = graph;
        await this.saveToStorage();
    }
    async saveFunctionExplanations(explanations) {
        explanations.forEach(exp => {
            this.functionExplanations.set(exp.functionName, exp.explanation);
        });
        await this.saveToStorage();
    }
    getProjectOverview() {
        return this.projectOverview;
    }
    getArchitectureGraph() {
        return this.architectureGraph;
    }
    getFunctionExplanation(functionName) {
        return this.functionExplanations.get(functionName);
    }
    getAllFunctionExplanations() {
        const result = [];
        this.functionExplanations.forEach((explanation, functionName) => {
            result.push({ functionName, explanation });
        });
        return result;
    }
    // Trace management
    addTrace(steps, explanations) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.traces.push({ id, steps: steps.slice(), explanations, createdAt: Date.now() });
        // Persist immediately
        this.saveToStorage();
        return id;
    }
    findMatchingTrace(steps) {
        const functionNames = steps.map(s => s.functionName);
        const matchedTrace = this.traces.find(t => {
            // Safety check for legacy traces
            if (!t.steps)
                return false;
            const tNames = t.steps.map(s => s.functionName);
            return tNames.length === functionNames.length && tNames.every((fn, idx) => fn === functionNames[idx]);
        });
        return matchedTrace
            ? {
                id: matchedTrace.id,
                explanations: matchedTrace.explanations
            }
            : undefined;
    }
    listTraces() {
        return this.traces.map((t) => ({
            id: t.id,
            // Handle legacy 'functions' or new 'steps'
            functions: t.steps ? t.steps.map((s) => s.functionName) : (t.functions || []),
            createdAt: t.createdAt
        }));
    }
    getTraceById(id) {
        return this.traces.find(t => t.id === id);
    }
    async saveLearningInstance(instance) {
        const existingIndex = this.learningInstances.findIndex(i => i.id === instance.id);
        if (existingIndex >= 0) {
            this.learningInstances[existingIndex] = instance;
        }
        else {
            this.learningInstances.push(instance);
        }
        await this.saveToStorage();
    }
    getLearningInstance(id) {
        return this.learningInstances.find(i => i.id === id);
    }
    getAllLearningInstances() {
        return this.learningInstances;
    }
    async deleteLearningInstance(id) {
        this.learningInstances = this.learningInstances.filter(i => i.id !== id);
        await this.saveToStorage();
    }
    async clearAllLearningInstances() {
        this.learningInstances = [];
        await this.saveToStorage();
    }
    async deleteTermBranch(rootContext, termId) {
        let deleted = false;
        for (const para of rootContext.paragraphs) {
            const index = para.terms.findIndex(t => t.id === termId);
            if (index >= 0) {
                para.terms.splice(index, 1);
                deleted = true;
                break;
            }
            for (const t of para.terms) {
                if (t.childContext) {
                    if (await this.deleteTermBranch(t.childContext, termId)) {
                        deleted = true;
                        break;
                    }
                }
            }
            if (deleted)
                break;
        }
        if (deleted)
            await this.saveToStorage();
        return deleted;
    }
    async deleteFunctionExplanation(functionName) {
        this.functionExplanations.delete(functionName);
        await this.saveToStorage();
    }
    async clearAllFunctionExplanations() {
        this.functionExplanations.clear();
        await this.saveToStorage();
    }
    // File explanation methods
    async saveFileExplanations(explanations) {
        explanations.forEach(exp => {
            this.fileExplanations.set(exp.fileName, exp.explanation);
        });
        await this.saveToStorage();
    }
    getFileExplanation(fileName) {
        return this.fileExplanations.get(fileName);
    }
    getAllFileExplanations() {
        const result = [];
        this.fileExplanations.forEach((explanation, fileName) => {
            result.push({ fileName, explanation });
        });
        return result;
    }
    async deleteFileExplanation(fileName) {
        this.fileExplanations.delete(fileName);
        await this.saveToStorage();
    }
    async clearAllFileExplanations() {
        this.fileExplanations.clear();
        await this.saveToStorage();
    }
    async clearAllTraces() {
        this.traces = [];
        await this.saveToStorage();
    }
    async deleteTraceById(id) {
        this.traces = this.traces.filter(trace => trace.id !== id);
        await this.saveToStorage();
    }
    // Directory management
    ensureKnowledgeDirectory() {
        if (!fs.existsSync(this.knowledgeBasePath)) {
            fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
        }
    }
    async saveToStorage() {
        // Save to VS Code global state for backward compatibility
        await this.context.globalState.update('projectOverview', this.projectOverview);
        await this.context.globalState.update('architectureGraph', this.architectureGraph);
        await this.context.globalState.update('fileExplanations', Object.fromEntries(this.fileExplanations));
        await this.context.globalState.update('functionExplanations', Object.fromEntries(this.functionExplanations));
        await this.context.globalState.update('traces', this.traces);
        await this.context.globalState.update('learningInstances', this.learningInstances);
        // Also save as JSON files locally
        const knowledgeData = {
            projectOverview: this.projectOverview,
            architectureGraph: this.architectureGraph,
            fileExplanations: Object.fromEntries(this.fileExplanations),
            functionExplanations: Object.fromEntries(this.functionExplanations),
            traces: this.traces,
            learningInstances: this.learningInstances
        };
        const knowledgeFilePath = path.join(this.knowledgeBasePath, 'knowledge.json');
        fs.writeFileSync(knowledgeFilePath, JSON.stringify(knowledgeData, null, 2));
    }
    async loadFromStorage() {
        // Try to load from JSON file first
        const knowledgeFilePath = path.join(this.knowledgeBasePath, 'knowledge.json');
        if (fs.existsSync(knowledgeFilePath)) {
            try {
                const data = fs.readFileSync(knowledgeFilePath, 'utf8');
                const knowledgeData = JSON.parse(data);
                if (knowledgeData.projectOverview) {
                    this.projectOverview = knowledgeData.projectOverview;
                }
                if (knowledgeData.architectureGraph) {
                    this.architectureGraph = knowledgeData.architectureGraph;
                }
                if (knowledgeData.fileExplanations) {
                    this.fileExplanations = new Map(Object.entries(knowledgeData.fileExplanations));
                }
                if (knowledgeData.functionExplanations) {
                    this.functionExplanations = new Map(Object.entries(knowledgeData.functionExplanations));
                }
                if (knowledgeData.traces && Array.isArray(knowledgeData.traces)) {
                    // Filter out or migrate legacy traces if necessary
                    this.traces = knowledgeData.traces.map((t) => {
                        if (!t.steps && t.functions) {
                            // Migrate legacy trace
                            return {
                                ...t,
                                steps: t.functions.map((fn) => ({
                                    functionName: fn,
                                    filePath: '',
                                    line: 0,
                                    timestamp: t.createdAt
                                }))
                            };
                        }
                        return t;
                    });
                }
                if (knowledgeData.learningInstances && Array.isArray(knowledgeData.learningInstances)) {
                    this.learningInstances = knowledgeData.learningInstances;
                }
                return;
            }
            catch (error) {
                console.error('Error loading knowledge from JSON file:', error);
            }
        }
        // Fallback to VS Code global state
        const overview = this.context.globalState.get('projectOverview', '');
        if (overview) {
            this.projectOverview = overview;
        }
        const archGraph = this.context.globalState.get('architectureGraph', '');
        if (archGraph) {
            this.architectureGraph = archGraph;
        }
        const fileExplanations = this.context.globalState.get('fileExplanations', {});
        if (fileExplanations) {
            this.fileExplanations = new Map(Object.entries(fileExplanations));
        }
        const functionExplanations = this.context.globalState.get('functionExplanations', {});
        if (functionExplanations) {
            this.functionExplanations = new Map(Object.entries(functionExplanations));
        }
        const traces = this.context.globalState.get('traces', []);
        if (traces && Array.isArray(traces)) {
            this.traces = traces.map((t) => {
                if (!t.steps && t.functions) {
                    // Migrate legacy trace
                    return {
                        ...t,
                        steps: t.functions.map((fn) => ({
                            functionName: fn,
                            filePath: '',
                            line: 0,
                            timestamp: t.createdAt
                        }))
                    };
                }
                return t;
            });
        }
        const learningInstances = this.context.globalState.get('learningInstances', []);
        if (learningInstances && Array.isArray(learningInstances)) {
            this.learningInstances = learningInstances;
        }
    }
}
exports.KnowledgeLibrary = KnowledgeLibrary;
//# sourceMappingURL=knowledgeLibrary.js.map