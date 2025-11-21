"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibrary = void 0;
class KnowledgeLibrary {
    constructor(context) {
        this.projectOverview = '';
        this.functionExplanations = new Map();
        this.context = context;
        this.loadFromStorage();
    }
    async saveProjectOverview(overview) {
        this.projectOverview = overview;
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
    async saveToStorage() {
        await this.context.globalState.update('projectOverview', this.projectOverview);
        await this.context.globalState.update('functionExplanations', Object.fromEntries(this.functionExplanations));
    }
    async loadFromStorage() {
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
exports.KnowledgeLibrary = KnowledgeLibrary;
//# sourceMappingURL=knowledgeLibrary.js.map