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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
class AIService {
    constructor() {
        const config = vscode.workspace.getConfiguration('ai-debug-explainer');
        this.apiKey = config.get('apiKey', '');
        this.apiUrl = config.get('apiUrl', 'https://api.openai.com/v1/chat/completions');
        this.model = config.get('model', 'gpt-3.5-turbo');
        this.client = axios_1.default.create({
            baseURL: this.apiUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }
    async generateProjectOverview(fileStructure, dependencies) {
        const prompt = `
			Generate a comprehensive overview and panorama of the target project. 
			Include all file and function names and dependency relationships.
			
			File structure: ${JSON.stringify(fileStructure, null, 2)}
			Dependencies: ${JSON.stringify(dependencies, null, 2)}
			
			Response format:
			# Project Overview
			
			## File Structure
			[List all files and their purposes]
			
			## Key Functions
			[List key functions and their roles]
			
			## Dependency Relationships
			[Describe how modules/files depend on each other]
		`;
        return this.callAI(prompt);
    }
    async explainFunction(functionCode, functionName, projectOverview, traceContext) {
        const prompt = `
			You are helping a newcomer understand a complex project during debugging.
			Use the following project overview for context:
			
			${projectOverview}
			
			Trace context:
			${traceContext}
			
			Function to explain:
			Name: ${functionName}
			Code:
			\`\`\`
			${functionCode}
			\`\`\`
			
			Please provide:
			1. Purpose: Explain the function's role in the overall project context
			2. Inputs: Describe what parameters it takes and what they represent
			3. Outputs: Describe what it returns and what it represents
			4. Process: Briefly explain key steps in the function's logic
		`;
        return this.callAI(prompt);
    }
    async callAI(prompt) {
        try {
            const response = await this.client.post('', {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });
            return response.data.choices[0].message.content.trim();
        }
        catch (error) {
            console.error('AI Service Error:', error);
            return `Error generating explanation: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map