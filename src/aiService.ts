import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { PedagogicalType } from './traceModels';

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
        this.apiUrl = this.normalizeChatCompletionsUrl(
            config.get('apiUrl', 'https://api.openai.com/v1/chat/completions')
        );
        this.model = config.get('model', 'gpt-3.5-turbo');

        this.client = axios.create({
            baseURL: this.apiUrl,
            timeout: 300000,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
        });
    }

    private normalizeChatCompletionsUrl(apiUrl: string): string {
        const trimmed = apiUrl.trim().replace(/\/+$/, '');
        if (trimmed.endsWith('/chat/completions')) {
            return trimmed;
        }
        return `${trimmed}/chat/completions`;
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

    async explainTerm(term: string, context: string, type: PedagogicalType = 'desc-encapsulation'): Promise<string> {
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
                    
                    THEN, based on that larger framework (context above), provide the MATHEMATICAL FORMULATION:
                    3. **Interface Register**: Present the mathematical expressions that serves as the encapsulated interface of the lower knowledge layer for that larger framework, so user can grasp it as building block by remembering instead of understanding by reasoning from bottom to up, just like saved in register.
                    If, aiming at that larger framework (context above), a formula is enough (simple interface) then just present it, if classified discussion is needed (complex interface), then show the full picture to connect intactly.
                    4. **Variable Explanation**: Explain each symbol/variable in the formula.
                    5. **System Relationships**: How does this formula relate to other concepts in the system?
                    
                    ENCAPSULATION means: Treat the expression as a fundamental concept and explain its niche/role within the broader system (context above).
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

                    Explain "${term}" using MATHEMATICAL MODELING with REDUCTIONIST approach.
                    
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
            case 'desc-concretization':
                promptTemplate = `
                    Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with CONCRETIZATION approach.
                    
                    CONCRETIZATION means: Using a specific, concrete example to embody and exemplify the abstract concept.
                    
                    Structure your answer using Markdown:
                    1. **Intuitive Understanding**: What does this concept mean in plain language?
                    2. **Example**: Provide a concrete, relatable example illustrating the concept.
                    3. **Generalization**: How does the example connect to the broader understanding of the term?
                `;
                break;
            case 'model-concretization':
                promptTemplate = `
                    Background knowledge:
                    observed quantity means the quantity that can be observed directly from phenomenon and measured, which is a special kind of initial quantity, for example M, m and r in Newton's second law;
                    initial quantity means the quantity that is defined by the phenomenon itself or a deduced quantity derived from more initial formula but serves as a basis for current formula, for example /rho from the rate of mass to volume serves as initial quantity in further formula;
                    constructed quantity means the quantity derived by constructing a new quantity from observed quantities, which is usually a capsulation event or system in more fundamental scope, for example F in Newton's second law;
                    deduced quantity means the quantity derived by deductive reasoning from observed and constructed quantities, for example g in Newton's second law, which is also usually a capsulation of more complex event or system in more micro scope.

                    Explain "${term}" using MATHEMATICAL MODELING with CONCRETIZATION approach.
                    
                    CONCRETIZATION means: Using an intact calculation to exemplify the abstract concept.
                    
                    FIRST, provide a NATURAL LANGUAGE bridge:
                    1. **Intuitive Understanding**: What does this concept mean in plain language?
                    2. **Example Description**: Describe a concrete scenario where this concept applies.
                    
                    THEN, provide a CONCRETE CALCULATION:
                    3. **Step-by-Step Calculation**: Present a complete, step-by-step calculation with actual numbers using LaTeX.
                    4. **Variable Explanation**: Explain what each symbol and number in the calculation means.
                    5. **Insight**: What does this calculation reveal about the concept?
                    
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

    async generateVisualizationScript(term: string, explanation: string, subTerms: any[] = [], staticOnly: boolean = false): Promise<string> {
        const staticGuidance = staticOnly ?
            `You MUST produce a static diagram — NO animations. Focus on elaborated geometry and detailed structural visualization. Choose the library that produces the best static diagram for this concept.`
            : `You are free to choose any Python visualization library — matplotlib, Manim, Pillow, Plotly, vispy, pycairo, p5 (via processing.py), turtle, or any other library that will produce the best result for this specific concept. The goal is portfolio-quality output.`;
        const staticFinalReq = staticOnly ?
            `This MUST be a static diagram. Do NOT generate an animation under any circumstances. Focus on detailed geometric precision, structural accuracy, and visual clarity — this is for elaborated geometry.`
            : `Choose the visual form that genuinely fits the concept. Let the nature of the idea drive the choice — not the presence of formulas, not the existence of sub-terms, nor a preference for movement. If the concept is clearer as a static diagram, make it static. If movement or process is the core idea, animate.`;
        const libraryGuidance = staticOnly ?
            `matplotlib, Pillow, pycairo, or any other library that produces high-quality static diagrams. Avoid libraries primarily designed for animations (e.g. Manim). Pick the one that can produce the most beautiful, precise static diagram for this concept.`
            : `matplotlib, Manim, Pillow, Plotly, vispy, pycairo, turtle, p5, or any other Python visualization library is acceptable. Pick the one that can produce the most beautiful and effective visualization for this specific concept.`;
        const visualFormSection = staticOnly ? '' : `
            VISUAL FORM GUIDELINES:

            - **Static polished diagram** (preferred for most concepts): A clean, richly styled illustration or chart. Use the library best suited for the visual language of the concept. Works well for: abstract structures, relational diagrams, geometric objects, step-by-step processes, classification trees, system models, molecular layouts, and any concept where the essential information is static.

            - **Animation** (use only when movement itself is the point): An animated sequence where time evolution, motion, or iterative change carries meaning — wave propagation, orbital dynamics, limit processes, iterative algorithms, phase transitions. Choose the library that achieves the clearest, most polished animation for the concept.
        `;
        const prompt = `
            Task: Generate a SELF-CONTAINED Python visualization script for the concept: "${term}". This is a ${staticOnly ? 'STATIC DIAGRAM ONLY' : 'visualization'} task.
            ${staticGuidance}${visualFormSection}

            Context Details:
            Term: ${term}
            Explanation: ${explanation}
            Related/Sub-terms: ${JSON.stringify(subTerms)}

            --- VISUAL QUALITY STANDARDS (apply regardless of library) ---

            You MUST achieve a portfolio-ready / presentation-quality aesthetic. These are outcome requirements, not code templates:

            1. **Resolution & canvas**: Use a generous canvas size and high resolution. Background should be a clean neutral unless the subject calls for a dark theme.

            2. **Color**: Use thoughtfully chosen, vibrant color palettes. Avoid any default library color cycles. Prefer distinct, saturated hues for different elements. Use alpha for layering. If the concept benefits from anime-style cel-shading, use bold outlines and bright flat fills.

            3. **Lines and strokes**: Bold, readable line widths. Markers or points should be prominent. Anti-aliasing must be enabled. Avoid anything thin or default-weight.

            4. **Typography**: Use legible sans-serif fonts. Titles should be bold and descriptive. All text must be large enough to read at rendered size. Use background boxes when labels overlap with content.

            5. **Composition**: Generous margins. Clean layout with no elements clipped or overlapping. Add subtle background grid lines for charts, or no grid for diagrammatic/anime-style visuals.

            6. **Annotations**: Use arrows and callout boxes to point to important features. Label backgrounds should have subtle rounded-rect boxes with light fill and soft border.

            7. **Library quality defaults**: Set the library’s quality parameters to their best — high resolution, anti-aliasing enabled, custom color scheme applied, fonts configured. Do not rely on default settings.

            CRITICAL REQUIREMENTS:
            1. Be entirely self-contained. DO NOT read external files. Embed all data as Python variables.
            2. Choose the library that best fits the concept and desired quality. You have complete freedom — ${libraryGuidance}
            3. DO NOT use LaTeX parsing or sympy.parsing. If the term contains LaTeX/math, extract the core concept and visualize it with plain Python: styled annotations, custom shapes, labels, and diagrams instead.
            4. End with the appropriate display call for the library you chose (plt.show(), scene.render(), image.show(), or equivalent).
            5. ${staticFinalReq}
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

    async updateKnowledgeGraph(
        newTerm: string,
        contextText: string,
        existingTerms: string[]
    ): Promise<{ edges: { source: string; target: string; relation: string; description: string }[] }> {
        const prompt = `
            You are building a knowledge graph that shows logical relationships between explained terms in a specific learning context.

            New term just explained: "${newTerm}"
            Learning context: ${contextText}
            All terms already explained in this context: ${existingTerms.join(', ')}

            Determine how "${newTerm}" relates to each of the existing terms. Consider the logical structure of knowledge in this domain.

            For each meaningful relationship, create an edge with:
            - source: the more fundamental / prerequisite / broader term
            - target: the dependent / derived / more specific term
            - relation: one of: is-a, part-of, depends-on, related-to, generalizes, specializes, used-by, opposite-of, example-of, causes, produces
            - description: brief explanation of the relationship (one sentence)

            If there are relationships between existing terms that you discover only now through the new term, also include those edges.

            If no meaningful relationships exist between the new term and existing terms, return an empty edges array.

            Return ONLY a valid JSON object with an "edges" array. No explanation, no markdown formatting:
            {"edges": [{"source": "...", "target": "...", "relation": "...", "description": "..."}]}
        `;

        try {
            const response = await this.callAI(prompt);
            // Try to extract JSON from the response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(response);
        } catch {
            return { edges: [] };
        }
    }
}

