import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

export class AIService {
    private apiKey: string;
    private apiUrl: string;
    private model: string;
    private client: AxiosInstance;
    private requestQueue: { prompt: string, resolve: (value: string) => void, reject: (reason: any) => void }[] = [];
    private isProcessingQueue: boolean = false;
    private lastRequestTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

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
			You are helping a newcomer understand a complex project.
			
			Project Panorama (Dynamic Context):
			${projectOverview}
			
			Function to explain:
			Name: ${functionName}
			Code:
			\`\`\`
			${functionCode}
			\`\`\`
			
			Please provide a concise explanation focusing ONLY on these two aspects:
			1. **Purpose**: What role does this function play under the project panorama? How does it fit into the execution flow?
			2. **Function**: What are its inputs, what does it do to them, and what is the resulting output?
		`;

        return this.callAI(prompt);
    }

    private async callAI(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ prompt, resolve, reject });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue[0]; // Peek

            // Rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
                await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
            }

            try {
                const result = await this.executeRequestWithRetry(request.prompt);
                request.resolve(result);
                this.requestQueue.shift(); // Remove from queue only on success or fatal error (handled in catch)
            } catch (error) {
                console.error('AI Service Error:', error);
                request.reject(error);
                this.requestQueue.shift(); // Remove failed request
            } finally {
                this.lastRequestTime = Date.now();
            }
        }

        this.isProcessingQueue = false;
    }

    private async executeRequestWithRetry(prompt: string, retries = 5, backoff = 2000): Promise<string> {
        try {
            const response = await this.client.post('', {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });

            return response.data.choices[0].message.content.trim();
        } catch (error: any) {
            if (retries > 0 && error.response && error.response.status === 429) {
                console.log(`Rate limited. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this.executeRequestWithRetry(prompt, retries - 1, backoff * 2);
            }
            throw error;
        }
    }
}