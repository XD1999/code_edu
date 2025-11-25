import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class KnowledgeLibrary {
    private context: vscode.ExtensionContext;
    private knowledgeBasePath: string;
    private projectOverview: string = '';
    private fileExplanations: Map<string, string> = new Map();
    private functionExplanations: Map<string, string> = new Map();

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

        // Also save as JSON files locally
        const knowledgeData = {
            projectOverview: this.projectOverview,
            fileExplanations: Object.fromEntries(this.fileExplanations),
            functionExplanations: Object.fromEntries(this.functionExplanations)
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

        const fileExplanations = this.context.globalState.get('fileExplanations', {});
        if (fileExplanations) {
            this.fileExplanations = new Map(Object.entries(fileExplanations));
        }

        const functionExplanations = this.context.globalState.get('functionExplanations', {});
        if (functionExplanations) {
            this.functionExplanations = new Map(Object.entries(functionExplanations));
        }
    }
}