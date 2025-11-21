import * as vscode from 'vscode';

export class KnowledgeLibrary {
    private context: vscode.ExtensionContext;
    private projectOverview: string = '';
    private functionExplanations: Map<string, string> = new Map();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
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

    private async saveToStorage() {
        await this.context.globalState.update('projectOverview', this.projectOverview);
        await this.context.globalState.update('functionExplanations', Object.fromEntries(this.functionExplanations));
    }

    private async loadFromStorage() {
        const overview = this.context.globalState.get('projectOverview', '');
        if (overview) {
            this.projectOverview = overview;
        }

        const explanations = this.context.globalState.get('functionExplanations', {});
        if (explanations) {
            this.functionExplanations = new Map(Object.entries(explanations));
        }
    }
}