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
    async explainTerm(term, context, type = 'desc-encapsulation') {
        let promptTemplate = '';
        switch (type) {
            case 'desc-encapsulation':
                promptTemplate = `
                    Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with ENCAPSULATION approach.
                    
                    ENCAPSULATION means: Treat the term as a fundamental concept and explain it by its purpose/role within a broader system.
                    - For dynamic terms (verbs, adverbs): Explain their purpose in the larger system, their niche, and comparison with similar concepts at the same level.
                    - For static terms (nouns, adjectives): They are already encapsulated, so explain their system role and relationships.
                    
                    Structure your answer using Markdown:
                    1. **System Context**: Where does this term fit in the larger framework?
                    2. **Purpose/Role**: What is its function or niche?
                    3. **Comparisons**: How does it relate to similar concepts?
                `;
                break;
            case 'desc-reduction':
                promptTemplate = `
                    Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with REDUCTION approach.
                    
                    REDUCTION means: Delve into deeper levels by analyzing the interaction of more fundamental elements.
                    - For static terms (nouns, adjectives): Break down into constituent parts and their interactions.
                    - For dynamic terms (verbs, adverbs): They are already reduced, so explain the underlying static structure that enables this dynamic.
                    
                    Structure your answer using Markdown:
                    1. **Elemental Breakdown**: What are the fundamental components?
                    2. **Interactions**: How do these elements interact?
                    3. **Emergence**: How does the term emerge from these interactions?
                `;
                break;
            case 'model-encapsulation':
                promptTemplate = `
                    Background knowledge:
                    observed quantity means the quantity that can be observed directly from phenomenon and measured, which is a special kind of initial quantity, for example M, m and r in Newton's second law;
                    initial quantity means the quantity that is defined by the phenomenon itself or a deduced quantity derived from more initial formula but serves as a basis for current formula, for example /rho from the rate of mass to volume serves as initial quantity in further formula;
                    constructed quantity means the quantity derived by constructing a new quantity from observed quantities, which is usually a capsulation event or system in more fundamental scope, for example F in Newton's second law;
                    deduced quantity means the quantity derived by deductive reasoning from observed and constructed quantities, for example g in Newton's second law, which is also usually a capsulation of more complex event or system in more micro scope.
            
                    Explain "${term}" using MATHEMATICAL MODELING with ENCAPSULATION approach.
                    
                    FIRST, provide a NATURAL LANGUAGE bridge:
                    1. **Intuitive Understanding**: Explain the concept in plain language first - what does it mean intuitively?
                    2. **System Context**: Where does this fit in the larger framework?
                    
                    THEN, provide the MATHEMATICAL FORMULATION:
                    3. **Formal Definition**: Present the mathematical expression using LaTeX.
                    4. **Variable Explanation**: Explain each symbol/variable in the formula.
                    5. **System Relationships**: How does this formula relate to other concepts in the system?
                    
                    ENCAPSULATION means: Treat the expression as a fundamental concept and explain its niche/role within the broader system.
                    - Use LaTeX for all mathematical expressions.
                    
                    Structure your answer using Markdown with LaTeX format $ and $$ to enclose math expressions (e.g., $E=mc^2$ or $$...$$).
                `;
                break;
            case 'model-reduction':
                promptTemplate = `
                    Background knowledge:
                    observed quantity means the quantity that can be observed directly from phenomenon and measured, which is a special kind of initial quantity, for example M, m and r in Newton's second law;
                    initial quantity means the quantity that is defined by the phenomenon itself or a deduced quantity derived from more initial formula but serves as a basis for current formula, for example /rho from the rate of mass to volume serves as initial quantity in further formula;
                    constructed quantity means the quantity derived by constructing a new quantity from observed quantities, which is usually a capsulation event or system in more fundamental scope, for example F in Newton's second law;
                    deduced quantity means the quantity derived by deductive reasoning from observed and constructed quantities, for example g in Newton's second law, which is also usually a capsulation of more complex event or system in more micro scope.

                    Explain "${term}" using MATHEMATICAL MODELING with REDUCTION approach.
                    
                    FIRST, provide a NATURAL LANGUAGE bridge:
                    1. **Intuitive Understanding**: Explain the concept in plain language first - what does it mean intuitively?
                    2. **Elemental Breakdown**: What are the fundamental components?
                    
                    THEN, provide the MATHEMATICAL FORMULATION:
                    3. **Formal Derivation**: Present the mathematical derivation using LaTeX.
                    4. **Variable Explanation**: Explain each symbol/variable in the formula.
                    5. **Fundamental Interactions**: How do the elements interact at the mathematical level?
                    
                    REDUCTION means: Delve into deeper levels by analyzing the interaction of fundamental elements.
                    - Use LaTeX for all mathematical expressions.
                    
                    Structure your answer using Markdown with LaTeX format $ and $$ to enclose math expressions (e.g., $E=mc^2$ or $$...$$).
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
    async generatePracticeProblem(term, abstractMathContent, targetDifficulty, lastDifficulties, lastContents, isFirstPractice = false) {
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
                4. Include: given values (use simple integers), the calculation steps, and the final answer with intact calculation.
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
            3. Include: problem statement, given values, what to solve for and the solution of intact calculation.
            4. Use LaTeX for all mathematical expressions.
            5. Make it different from previous problems if any exist.
            6. Format using Markdown.
            7. Try your best not to introduce new concepts or ideas that is beyond the abstract math concept.
        `;
        return this.callAI(prompt);
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map