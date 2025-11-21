import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export class AIService {
    private apiKey: string;
    private apiUrl: string;
    private model: string;
    private client: AxiosInstance;

    constructor() {
        const config = vscode.workspace.getConfiguration('ai-debug-explainer');
        this.apiKey = config.get('apiKey', '');
        this.apiUrl = config.get('apiUrl', 'https://api.openai.com/v1/chat/completions');
        this.model = config.get('model', 'gpt-3.5-turbo');

        this.client = axios.create({
            baseURL: this.apiUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    async generateProjectOverview(fileStructure: any, dependencies: any): Promise<string> {
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

    async explainFunction(functionCode: string, functionName: string, projectOverview: string, traceContext: string): Promise<string> {
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

    private async callAI(prompt: string): Promise<string> {
        try {
            const response = await this.client.post('', {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('AI Service Error:', error);
            return `Error generating explanation: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
}