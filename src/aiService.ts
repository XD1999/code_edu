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

    async explainTerm(term: string, context: string, type: 'general' | 'analogy' | 'example' | 'math' = 'general'): Promise<string> {
        let promptTemplate = '';

        switch (type) {
            case 'analogy':
                promptTemplate = `
                    Explain the term "${term}" from above context by an analogy. 
                    Use Markdown for formatting.
                `;
                break;
            case 'example':
                promptTemplate = `
                    Explain the term "${term}" from above context by an example. 
                    Use Markdown for formatting and code blocks for any code examples.
                `;
                break;
            case 'math':
                promptTemplate = `
                    Explain the term "${term}" from above context.
                    Structure your answer using Markdown:
                    1. **Abstract math**: use the most general formula in LaTeX format (e.g., $E=mc^2$ or $$...$$);
                    2. **Concrete math**: show a simple calculation example using LaTeX math notation.
                `;
                break;
            case 'general':
            default:
                promptTemplate = `
                    Task: Explain the term "${term}" from above context.
                    Structure your answer using Markdown and keep it concise:
                    1. **Purpose**: explain why the idea or concept of noun arise in history in natural language.
                    2. **Content**: explain what it is in natural language.
                `;
                break;
        }

        const prompt = `
            Context:
            ${context}

            ${promptTemplate}
        `;

        return this.callAI(prompt);
    }

    async generateVisualizationScript(term: string, explanation: string, subTerms: any[] = []): Promise<string> {
        const prompt = `
            Task: Generate a SELF-CONTAINED Python visualization script for the concept: "${term}".
            
            Context Details:
            Term: ${term}
            Explanation: ${explanation}
            Related/Sub-terms: ${JSON.stringify(subTerms)}
            
            The script should:
            1. Be entirely self-contained. DO NOT try to read any external JSON or data files. Embed all necessary data (like the sub-terms above) directly as Python variables in the script.
            2. Use matplotlib (with a robust fallback to ASCII/text) to create an insightful visualization.
            3. The visualization should help the user visually grasp the concept of "${term}".
            4. The script must be complete, executable, and focused.
            
            Output ONLY the raw Python code. Do not include markdown blocks or any other text.
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