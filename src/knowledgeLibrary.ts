import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { Trace, TraceStep, LearningInstance, ContextNode, TermNode } from './traceModels';

export class KnowledgeLibrary {
    private context: vscode.ExtensionContext;
    private knowledgeBasePath: string;
    private projectOverview: string = '';
    private architectureGraph: string = '';
    private fileExplanations: Map<string, string> = new Map();
    private functionExplanations: Map<string, string> = new Map();
    private traces: Trace[] = [];
    private learningInstances: LearningInstance[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.knowledgeBasePath = path.join(context.globalStorageUri.fsPath, 'knowledge');
        this.ensureKnowledgeDirectory();
        this.loadFromStorage();
    }

    get extensionUri(): vscode.Uri {
        return this.context.extensionUri;
    }

    async saveProjectOverview(overview: string) {
        this.projectOverview = overview;
        await this.saveToStorage();
    }

    async saveArchitectureGraph(graph: string) {
        this.architectureGraph = graph;
        await this.saveToStorage();
    }

    async saveFunctionExplanations(explanations: { functionName: string, explanation: string }[]) {
        explanations.forEach(exp => {
            this.functionExplanations.set(exp.functionName, exp.explanation);
        });
        await this.saveToStorage();
    }

    getProjectOverview(): string {
        return this.projectOverview;
    }

    getArchitectureGraph(): string {
        return this.architectureGraph;
    }

    getFunctionExplanation(functionName: string): string | undefined {
        return this.functionExplanations.get(functionName);
    }

    getAllFunctionExplanations(): { functionName: string, explanation: string }[] {
        const result: { functionName: string, explanation: string }[] = [];
        this.functionExplanations.forEach((explanation, functionName) => {
            result.push({ functionName, explanation });
        });
        return result;
    }

    // Trace management
    addTrace(steps: TraceStep[], explanations: { [fn: string]: string }): string {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.traces.push({ id, steps: steps.slice(), explanations, createdAt: Date.now() });
        // Persist immediately
        this.saveToStorage();
        return id;
    }

    findMatchingTrace(steps: TraceStep[]): { id: string, explanations: { [fn: string]: string } } | undefined {
        const functionNames = steps.map(s => s.functionName);

        const matchedTrace = this.traces.find(t => {
            // Safety check for legacy traces
            if (!t.steps) return false;

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

    listTraces(): { id: string, functions: string[], createdAt: number }[] {
        return this.traces.map((t: any) => ({
            id: t.id,
            // Handle legacy 'functions' or new 'steps'
            functions: t.steps ? t.steps.map((s: TraceStep) => s.functionName) : (t.functions || []),
            createdAt: t.createdAt
        }));
    }

    getTraceById(id: string): Trace | undefined {
        return this.traces.find(t => t.id === id);
    }

    async saveLearningInstance(instance: LearningInstance) {
        const existingIndex = this.learningInstances.findIndex(i => i.id === instance.id);
        if (existingIndex >= 0) {
            this.learningInstances[existingIndex] = instance;
        } else {
            this.learningInstances.push(instance);
        }
        await this.saveToStorage();
    }

    getLearningInstance(id: string): LearningInstance | undefined {
        return this.learningInstances.find(i => i.id === id);
    }

    getAllLearningInstances(): LearningInstance[] {
        return this.learningInstances;
    }

    async deleteLearningInstance(id: string) {
        this.learningInstances = this.learningInstances.filter(i => i.id !== id);
        await this.saveToStorage();
    }

    async clearAllLearningInstances() {
        this.learningInstances = [];
        await this.saveToStorage();
    }

    async deleteTermBranch(rootContext: ContextNode, termId: string): Promise<boolean> {
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
            if (deleted) break;
        }
        if (deleted) await this.saveToStorage();
        return deleted;
    }

    async deleteFunctionExplanation(functionName: string) {
        this.functionExplanations.delete(functionName);
        await this.saveToStorage();
    }

    async clearAllFunctionExplanations() {
        this.functionExplanations.clear();
        await this.saveToStorage();
    }

    // File explanation methods
    async saveFileExplanations(explanations: { fileName: string, explanation: string }[]) {
        explanations.forEach(exp => {
            this.fileExplanations.set(exp.fileName, exp.explanation);
        });
        await this.saveToStorage();
    }

    getFileExplanation(fileName: string): string | undefined {
        return this.fileExplanations.get(fileName);
    }

    getAllFileExplanations(): { fileName: string, explanation: string }[] {
        const result: { fileName: string, explanation: string }[] = [];
        this.fileExplanations.forEach((explanation, fileName) => {
            result.push({ fileName, explanation });
        });
        return result;
    }

    async deleteFileExplanation(fileName: string) {
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

    async deleteTraceById(id: string) {
        this.traces = this.traces.filter(trace => trace.id !== id);
        await this.saveToStorage();
    }

    // Directory management
    private ensureKnowledgeDirectory() {
        if (!fs.existsSync(this.knowledgeBasePath)) {
            fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
        }
    }

    private async saveToStorage() {
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

    private async loadFromStorage() {
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
                    this.traces = knowledgeData.traces.map((t: any) => {
                        if (!t.steps && t.functions) {
                            // Migrate legacy trace
                            return {
                                ...t,
                                steps: t.functions.map((fn: string) => ({
                                    functionName: fn,
                                    filePath: '',
                                    line: 0,
                                    timestamp: t.createdAt
                                } as TraceStep))
                            };
                        }
                        return t;
                    });
                }

                if (knowledgeData.learningInstances && Array.isArray(knowledgeData.learningInstances)) {
                    this.learningInstances = knowledgeData.learningInstances;
                }
                return;
            } catch (error) {
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
            this.architectureGraph = archGraph as string;
        }

        const fileExplanations = this.context.globalState.get('fileExplanations', {} as any);
        if (fileExplanations) {
            this.fileExplanations = new Map(Object.entries(fileExplanations));
        }

        const functionExplanations = this.context.globalState.get('functionExplanations', {} as any);
        if (functionExplanations) {
            this.functionExplanations = new Map(Object.entries(functionExplanations));
        }

        const traces = this.context.globalState.get('traces', [] as any);
        if (traces && Array.isArray(traces)) {
            this.traces = traces.map((t: any) => {
                if (!t.steps && t.functions) {
                    // Migrate legacy trace
                    return {
                        ...t,
                        steps: t.functions.map((fn: string) => ({
                            functionName: fn,
                            filePath: '',
                            line: 0,
                            timestamp: t.createdAt
                        } as TraceStep))
                    };
                }
                return t;
            });
        }

        const learningInstances = this.context.globalState.get('learningInstances', [] as any);
        if (learningInstances && Array.isArray(learningInstances)) {
            this.learningInstances = learningInstances;
        }
    }
}