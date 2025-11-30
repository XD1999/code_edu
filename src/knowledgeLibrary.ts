import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class KnowledgeLibrary {
    private context: vscode.ExtensionContext;
    private knowledgeBasePath: string;
    private projectOverview: string = '';
    private fileExplanations: Map<string, string> = new Map();
    private functionExplanations: Map<string, string> = new Map();
    private traces: { id: string; functions: string[]; explanations: { [fn: string]: string }; createdAt: number }[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.knowledgeBasePath = path.join(context.globalStorageUri.fsPath, 'knowledge');
        this.ensureKnowledgeDirectory();
        this.loadFromStorage();
    }

    async saveProjectOverview(overview: string) {
        this.projectOverview = overview;
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
    addTrace(functions: string[], explanations: { [fn: string]: string }): string {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.traces.push({ id, functions: functions.slice(), explanations, createdAt: Date.now() });
        // Persist immediately
        this.saveToStorage();
        return id;
    }

    findMatchingTrace(functions: string[]): { id: string, explanations: { [fn: string]: string } } | undefined {
        return this.traces.find(t => t.functions.length === functions.length && t.functions.every((fn, idx) => fn === functions[idx]))
            ? {
                id: this.traces.find(t => t.functions.length === functions.length && t.functions.every((fn, idx) => fn === functions[idx]))!.id,
                explanations: this.traces.find(t => t.functions.length === functions.length && t.functions.every((fn, idx) => fn === functions[idx]))!.explanations
            }
            : undefined;
    }

    listTraces(): { id: string, functions: string[], createdAt: number }[] {
        return this.traces.map(t => ({ id: t.id, functions: t.functions, createdAt: t.createdAt }));
    }

    getTraceById(id: string): { id: string, functions: string[], explanations: { [fn: string]: string }, createdAt: number } | undefined {
        return this.traces.find(t => t.id === id);
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

    // Directory management
    private ensureKnowledgeDirectory() {
        if (!fs.existsSync(this.knowledgeBasePath)) {
            fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
        }
    }

    private async saveToStorage() {
        // Save to VS Code global state for backward compatibility
        await this.context.globalState.update('projectOverview', this.projectOverview);
        await this.context.globalState.update('fileExplanations', Object.fromEntries(this.fileExplanations));
        await this.context.globalState.update('functionExplanations', Object.fromEntries(this.functionExplanations));
        await this.context.globalState.update('traces', this.traces);

        // Also save as JSON files locally
        const knowledgeData = {
            projectOverview: this.projectOverview,
            fileExplanations: Object.fromEntries(this.fileExplanations),
            functionExplanations: Object.fromEntries(this.functionExplanations),
            traces: this.traces
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

                if (knowledgeData.fileExplanations) {
                    this.fileExplanations = new Map(Object.entries(knowledgeData.fileExplanations));
                }

                if (knowledgeData.functionExplanations) {
                    this.functionExplanations = new Map(Object.entries(knowledgeData.functionExplanations));
                }

                if (knowledgeData.traces && Array.isArray(knowledgeData.traces)) {
                    this.traces = knowledgeData.traces;
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
            this.traces = traces;
        }
    }
}