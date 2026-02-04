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
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.lastRequestTime = 0;
        this.MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
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
    async explainFunction(functionCode, functionName, projectOverview, traceContext) {
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
    async explainTerm(term, context, type = 'general') {
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
    async generateVisualizationScript(term, explanation, subTerms = []) {
        const prompt = `
            Task: Generate a SELF-CONTAINED Python visualization script for the concept: "${term}".
            
            Context Details:
            Term: ${term}
            Explanation: ${explanation}
            Related/Sub-terms: ${JSON.stringify(subTerms)}
            
            CRITICAL REQUIREMENTS:
            1. Be entirely self-contained. DO NOT read external files. Embed all data as Python variables.
            2. Use ONLY matplotlib for graphical visualization. Import it at the top: "import matplotlib.pyplot as plt"
            3. DO NOT use LaTeX parsing or sympy.parsing. If the term contains LaTeX/math, extract the concept and visualize it with simple plots, diagrams, or charts.
            4. For mathematical concepts, create:
               - Conceptual diagrams (arrows, boxes, labels)
               - Example plots showing relationships
               - Step-by-step visual representations
            5. Always include ASCII fallback if matplotlib import fails.
            6. End with plt.show() to display the visualization.
            7. The script must run successfully with: python script.py
            
            Example structure:
            try:
                import matplotlib.pyplot as plt
                HAS_MATPLOTLIB = True
            except ImportError:
                HAS_MATPLOTLIB = False
            
            if HAS_MATPLOTLIB:
                # Create figure with plt.figure()
                # Use plt.plot(), plt.arrow(), plt.text(), etc.
                # Add title, labels
                plt.show()
            else:
                # ASCII art visualization
                print("Concept visualization...")
            
            Output ONLY the raw Python code. Do not include markdown blocks or any other text.
        `;
        return this.callAI(prompt);
    }
    async callAI(prompt) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ prompt, resolve, reject });
            this.processQueue();
        });
    }
    async processQueue() {
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
            }
            catch (error) {
                console.error('AI Service Error:', error);
                request.reject(error);
                this.requestQueue.shift(); // Remove failed request
            }
            finally {
                this.lastRequestTime = Date.now();
            }
        }
        this.isProcessingQueue = false;
    }
    async executeRequestWithRetry(prompt, retries = 5, backoff = 2000) {
        try {
            const response = await this.client.post('', {
                model: this.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3
            });
            return response.data.choices[0].message.content.trim();
        }
        catch (error) {
            if (retries > 0 && error.response && error.response.status === 429) {
                console.log(`Rate limited. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this.executeRequestWithRetry(prompt, retries - 1, backoff * 2);
            }
            throw error;
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map