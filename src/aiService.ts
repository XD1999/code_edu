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
                    Background knowledge:
                    observed quantity means the quantity that can be observed directly from phenomenon and measured, for example M, m and r in Newton's second law;
                    constructed quantity means the quantity derived by constructing a new quantity from observed quantities, which is usually a capsulation event or system in more micro-scope, for example F in Newton's second law;
                    deduced quantity means the quantity derived by deductive reasoning from observed and constructed quantities, for example g in Newton's second law, which is also usually a capsulation of more complex event or system in more micro scope.

                    Based on above knowledge, explain the term "${term}" from above context.
                    Structure your answer using Markdown:
                    use the most general formula in LaTeX format (e.g., $E=mc^2$ or $$...$$) and explain in terms of the observed quantity, constructed quantity and deduced quantity;
                `;
                break;
            case 'general':
            default:
                promptTemplate = `
                    Task: Explain the term "${term}" from above context.
                    Structure your answer using Markdown and keep it concise:
                    1. **Purpose**: explain in natural language what phenomenon makes the concept or idea of the term arise if it is a physical phenomenon.
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
            
            CRITICAL REQUIREMENTS:
            1. Be entirely self-contained. DO NOT read external files. Embed all data as Python variables.
            2. Use ONLY matplotlib for graphical visualization. Import it at the top: "import matplotlib.pyplot as plt"
            3. For dynamic concepts (dynamics, calculus, change over time, limits, derivatives, integration), use "matplotlib.animation.FuncAnimation" to create an animation.
            4. DO NOT use LaTeX parsing or sympy.parsing. If the term contains LaTeX/math, extract the concept and visualize it with simple plots, diagrams, or charts.
            5. For mathematical concepts, create:
               - Animations for dynamic/calculus concepts (e.g., a moving tangent line for derivatives, filling areas for integration)
               - Conceptual diagrams (arrows, boxes, labels)
               - Example plots showing relationships
            6. End with plt.show() to display the visualization.
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

    async generatePracticeProblem(
        term: string,
        abstractMathContent: string,
        targetDifficulty: number,
        lastDifficulties: number[],
        lastContents: string[],
        isFirstPractice: boolean = false
    ): Promise<string> {
        let difficultyContext = '';
        if (lastDifficulties.length > 0) {
            const trend = lastDifficulties.length >= 2
                ? (lastDifficulties[lastDifficulties.length - 1] - lastDifficulties[lastDifficulties.length - 2])
                : 0;
            const direction = trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
            difficultyContext = `
                Previous difficulty trend: ${direction} (last two: ${lastDifficulties.join(', ')}).
                User requested: ${targetDifficulty > lastDifficulties[lastDifficulties.length - 1] ? 'harder' : targetDifficulty < lastDifficulties[lastDifficulties.length - 1] ? 'easier' : 'similar'} problem.
            `;
        }

        const lastProblemsContext = lastContents.length > 0
            ? `\nPrevious problems for reference:\n${lastContents.map((c, i) => `Problem ${i + 1}:\n${c.substring(0, 200)}...`).join('\n\n')}`
            : '';

        // Special prompt for first practice - simplest possible problem
        if (isFirstPractice) {
            const firstPracticePrompt = `
                Show a simple but intact calculation example of a practice problem using LaTeX math notation to embody the abstract math.
                
                Concept: "${term}"
                
                Abstract math context:
                ${abstractMathContent}
                
                Requirements:
                1. This is the FIRST practice - make it the SIMPLEST possible problem.
                2. Use the most basic, straightforward numbers and scenario.
                3. Show a complete calculation example, not just a problem statement.
                4. Include: given values (use simple integers), the calculation steps, and the final answer.
                5. Use LaTeX for all mathematical expressions.
                6. Format using Markdown.
                
                Make this extremely easy to understand - this is the user's first exposure to practicing this concept.
            `;
            return this.callAI(firstPracticePrompt);
        }

        const prompt = `
            Generate a practice problem for the concept: "${term}".
            
            Abstract math context:
            ${abstractMathContent}
            
            Target difficulty level: ${targetDifficulty}/10
            ${difficultyContext}
            ${lastProblemsContext}
            
            Requirements:
            1. Create a self-contained practice problem that tests understanding of the abstract math concept.
            2. Difficulty should be ${targetDifficulty}/10 where 1 is very basic and 10 is very challenging.
            3. Include: problem statement, given values, what to solve for and answer of intact calculation at last.
            4. Use LaTeX for all mathematical expressions.
            5. Make it different from previous problems if any exist.
            6. Format using Markdown.
            
            Output only the problem statement, no solution.
        `;

        return this.callAI(prompt);
    }
}