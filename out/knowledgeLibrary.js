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
        this.fileExplanations = new Map();
        this.functionExplanations = new Map();
        this.context = context;
        this.knowledgeBasePath = path.join(context.globalStorageUri.fsPath, 'knowledge');
        this.ensureKnowledgeDirectory();
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
    // Directory management
    ensureKnowledgeDirectory() {
        if (!fs.existsSync(this.knowledgeBasePath)) {
            fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
        }
    }
    async saveToStorage() {
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
                if (knowledgeData.fileExplanations) {
                    this.fileExplanations = new Map(Object.entries(knowledgeData.fileExplanations));
                }
                if (knowledgeData.functionExplanations) {
                    this.functionExplanations = new Map(Object.entries(knowledgeData.functionExplanations));
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
exports.KnowledgeLibrary = KnowledgeLibrary;
//# sourceMappingURL=knowledgeLibrary.js.map