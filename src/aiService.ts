import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import { PedagogicalType, KnowledgeGraphEdge, KnowledgeGraph, ArchBox } from './traceModels';
import { FrameworkDef, PARENT_CATEGORY_DEFS } from './pedagogy/frameworkRegistry';
import { findPedagogy } from './pedagogy/registry';

export class AIService {
    private apiKey: string;
    private apiUrl: string;
    private model: string;
    private client: AxiosInstance;
    // True when the configured apiUrl targets an Anthropic Messages-API endpoint
    // (e.g. api.anthropic.com or Bailian's /apps/anthropic). In that case the
    // main client speaks the Messages protocol (POST /v1/messages, response
    // .content[].text) instead of OpenAI chat-completions.
    private readonly isAnthropicProtocol: boolean;
    // Separate provider for the visualization command. Auto-detects protocol
    // from the URL (Anthropic Messages when the URL contains "anthropic",
    // OpenAI chat-completions otherwise) — same scheme as the main client.
    private vizApiKey: string;
    private vizApiUrl: string;
    private vizModel: string;
    private vizClient: AxiosInstance;
    private readonly vizIsAnthropic: boolean;
    private requestQueue: { prompt: string, resolve: (value: string) => void, reject: (reason: any) => void }[] = [];
    private isProcessingQueue: boolean = false;
    private lastRequestTime: number = 0;
    private readonly MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

    constructor() {
        const config = vscode.workspace.getConfiguration('ai-debug-explainer');

        this.apiKey = config.get('apiKey', '');
        const rawApiUrl = config.get('apiUrl', 'https://api.openai.com/v1/chat/completions');
        // An apiUrl containing "anthropic" (api.anthropic.com, Bailian's
        // /apps/anthropic, ...) targets the Anthropic Messages API, not OpenAI
        // chat-completions. Don't append /chat/completions to such URLs.
        this.isAnthropicProtocol = /\banthropic\b/i.test(rawApiUrl);
        this.apiUrl = this.isAnthropicProtocol
            ? rawApiUrl.trim().replace(/\/+$/, '')
            : this.normalizeChatCompletionsUrl(rawApiUrl);
        this.model = config.get('model', 'gpt-3.5-turbo');

        const clientHeaders: Record<string, string> = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
        if (this.isAnthropicProtocol) {
            clientHeaders['x-api-key'] = this.apiKey;
            clientHeaders['anthropic-version'] = '2023-06-01';
        }
        this.client = axios.create({
            baseURL: this.apiUrl,
            timeout: 600000,
            headers: clientHeaders,
        });

        // Visualization provider. Auto-detects protocol from the URL — Anthropic
        // Messages when the URL contains "anthropic" (e.g. /apps/anthropic),
        // OpenAI chat-completions otherwise (e.g. /compatible-mode/v1). This
        // mirrors the main client so the viz command works on either endpoint.
        this.vizApiKey = config.get('visualizationApiKey', '') || this.apiKey;
        const rawVizUrl = config.get('visualizationApiUrl', '') || 'https://dashscope.aliyuncs.com/apps/anthropic';
        // Tolerate a common typo: a leading extra 'h' on the scheme
        // (e.g. "hhttps://..." -> "https://..."); otherwise axios throws
        // "Unsupported protocol hhttps:".
        const fixedVizUrl = rawVizUrl.trim().replace(/^h(https?:\/\/)/i, '$1').replace(/\/+$/, '');
        this.vizIsAnthropic = /\banthropic\b/i.test(fixedVizUrl);
        this.vizApiUrl = this.vizIsAnthropic
            ? fixedVizUrl
            : this.normalizeChatCompletionsUrl(fixedVizUrl);
        // If visualizationModel is unset, fall back to the main model so the viz
        // command works on the same endpoint as the rest of the extension.
        this.vizModel = config.get('visualizationModel', '') || this.model;

        const vizHeaders: Record<string, string> = {
            'Authorization': `Bearer ${this.vizApiKey}`,
            'Content-Type': 'application/json'
        };
        if (this.vizIsAnthropic) {
            vizHeaders['x-api-key'] = this.vizApiKey;
            vizHeaders['anthropic-version'] = '2023-06-01';
        }
        this.vizClient = axios.create({
            baseURL: this.vizApiUrl,
            timeout: 600000,
            headers: vizHeaders,
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
        // Prompt construction is data-driven from the pedagogy registry — see
        // src/pedagogy/registry.ts. Adding a new explanation type no longer
        // requires touching this method.
        const definition = findPedagogy(type) ?? findPedagogy('desc-encapsulation');
        const prompt = definition
            ? definition.buildPrompt(term, context)
            : `Context:\n${context}\n\nExplain the term "${term}".`;
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
            6. Keep any preliminary reasoning BRIEF. Output the script promptly — do not exhaust your output budget on planning.
        `;
        return this.callVisualizationAI(prompt);
    }

    /**
     * Call the visualization provider. Auto-detects the protocol from the
     * configured vizApiUrl: Anthropic Messages API (POST /v1/messages, response
     * .content[].text) when the URL contains "anthropic"; OpenAI chat-completions
     * (POST '', response .choices[0].message.content) otherwise. Distinct from
     * callAI/executeRequestWithRetry, which serve every other command via the
     * main `client`.
     */
    private async callVisualizationAI(prompt: string, retries = 5, backoff = 2000): Promise<string> {
        if (!this.vizApiKey) {
            throw new Error("Visualization API key not set. Configure 'ai-debug-explainer.visualizationApiKey' (or 'apiKey') in Settings.");
        }
        try {
            if (this.vizIsAnthropic) {
                const resp = await this.vizClient.post('/v1/messages', {
                    model: this.vizModel,
                    max_tokens: 16384,
                    temperature: 0.3,
                    messages: [{ role: 'user', content: prompt }],
                    // Bound the reasoning budget. Reasoning models (glm-5.2)
                    // otherwise reason past the output limit and emit NO script
                    // (only a thinking block). 2048 thinking tokens leaves ~14k
                    // for the script.
                    thinking: { type: 'enabled', budget_tokens: 2048 }
                });
                return this.extractAnthropicText(resp.data);
            }
            // OpenAI chat-completions protocol.
            const resp = await this.vizClient.post('', {
                model: this.vizModel,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                // qwen3 reasoning models emit a huge `reasoning_content` by
                // default, which makes the large viz prompt exceed the request
                // timeout. Disable thinking so the model emits the script
                // directly. (Ignored by non-reasoning models.)
                enable_thinking: false
            });
            const content = resp.data?.choices?.[0]?.message?.content;
            if (typeof content === 'string' && content.trim()) {
                return content.trim();
            }
            throw new Error('Unexpected OpenAI response shape: ' + JSON.stringify(resp.data).slice(0, 300));
        } catch (error: any) {
            // Retry on rate-limit OR on the Anthropic thinking-only-no-text case
            // (intermittent reasoning overflow, thrown by extractAnthropicText).
            const isThinkingOnly = error && typeof error.message === 'string' && error.message.includes('only reasoning');
            if (retries > 0 && (isThinkingOnly || (error.response && error.response.status === 429))) {
                console.log(`Visualization retrying (${isThinkingOnly ? 'thinking-only' : '429'}) in ${backoff}ms...`);
                await new Promise(r => setTimeout(r, backoff));
                return this.callVisualizationAI(prompt, retries - 1, backoff * 2);
            }
            throw error;
        }
    }

    /** Extract the first {...} JSON object from an AI response; undefined on failure. */
    private parseJsonObject(response: string): any | undefined {
        let text = (response || '').trim();
        // Strip a ```json ... ``` (or bare ``` ... ```) code fence if the model
        // wrapped its output despite being asked for raw JSON.
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) {
            text = fence[1].trim();
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const candidate = jsonMatch ? jsonMatch[0] : text;
        // First try as-is — correct for models that properly escape LaTeX
        // backslashes (\\Lambda). Models often DON'T, emitting raw \Lambda, \sum,
        // \{, \, inside string values, which are invalid JSON escape sequences
        // and make JSON.parse throw (surfacing as "non-JSON response"). Retry
        // after escaping any raw backslash that isn't already a valid JSON
        // escape (\", \\, \/) so the LaTeX survives parsing.
        try {
            return JSON.parse(candidate);
        } catch {
            try {
                return JSON.parse(candidate.replace(/\\([^"\\/])/g, '\\\\$1'));
            } catch {
                return undefined;
            }
        }
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

    /**
     * Send a single prompt through the main client, branching on protocol:
     * - Anthropic Messages API (POST /v1/messages, response .content[].text)
     *   when isAnthropicProtocol is true.
     * - OpenAI chat-completions (POST '', response .choices[0].message.content)
     *   otherwise.
     */
    private async postPrompt(prompt: string): Promise<string> {
        if (this.isAnthropicProtocol) {
            const resp = await this.client.post('/v1/messages', {
                model: this.model,
                max_tokens: 16384,
                temperature: 0.3,
                messages: [{ role: 'user', content: prompt }],
            });
            return this.extractAnthropicText(resp.data);
        }
        const response = await this.client.post('', {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
        });
        return response.data.choices[0].message.content.trim();
    }

    /**
     * Pull the assistant's text out of an Anthropic Messages-API response.
     * The content array may contain a leading `thinking` block (glm-5.2 and
     * other reasoning models emit it), so we scan for the first block with a
     * `.text` string rather than insisting on `content[0].text`. Throws an
     * error carrying a snippet of the raw body if the shape is unrecognized,
     * so a future shape change is diagnosable instead of a silent mystery.
     */
    private extractAnthropicText(data: any): string {
        const blocks = data?.content;
        if (Array.isArray(blocks)) {
            for (const b of blocks) {
                if (b && typeof b.text === 'string' && b.text.trim()) {
                    return b.text.trim();
                }
            }
        }
        // Some providers return the text directly at the top level.
        if (typeof data?.text === 'string' && data.text.trim()) {
            return data.text.trim();
        }
        // A provider may return an error envelope with HTTP 200.
        if (data?.error) {
            const msg = (typeof data.error === 'string' ? data.error : data.error.message) || JSON.stringify(data.error);
            throw new Error('AI provider error: ' + String(msg).slice(0, 300));
        }
        // Reasoning models (glm-5.2) may return ONLY a `thinking` block when the
        // run hit max_tokens before producing a final text block — i.e. the
        // model reasoned but never answered. Detect this and give a clear hint
        // instead of dumping an opaque content snippet.
        const hasThinking = Array.isArray(blocks) && blocks.some((b: any) => b && (typeof b.thinking === 'string' || b.type === 'thinking'));
        if (hasThinking) {
            const stopReason = typeof data?.stop_reason === 'string' ? data.stop_reason : 'unknown';
            throw new Error(
                `The model returned only reasoning (thinking) with no final answer (stop_reason: ${stopReason}). `
                + 'It likely hit the output token limit before producing the script — please retry.'
            );
        }
        throw new Error(
            'Unexpected Anthropic response shape: '
            + JSON.stringify(data).slice(0, 500)
        );
    }

    private async executeRequestWithRetry(prompt: string, retries = 5, backoff = 2000): Promise<string> {
        try {
            return await this.postPrompt(prompt);
        } catch (error: any) {
            if (retries > 0 && error.response && error.response.status === 429) {
                console.log(`Rate limited. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this.executeRequestWithRetry(prompt, retries - 1, backoff * 2);
            }
            throw error;
        }
    }

    /**
     * Non-queued call to the main AI client (with 429 retry). Use for calls that
     * must run CONCURRENTLY with queued callAI requests — e.g. the knowledge-
     * graph update fired alongside an explanation — instead of waiting their
     * turn in the rate-limit queue. Same endpoint/model as callAI, just no
     * serialization or 1s spacing between requests.
     */
    private async callAIConcurrent(prompt: string, retries = 5, backoff = 2000): Promise<string> {
        try {
            return await this.postPrompt(prompt);
        } catch (error: any) {
            if (retries > 0 && error.response && error.response.status === 429) {
                console.log(`Concurrent call rate limited. Retrying in ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return this.callAIConcurrent(prompt, retries - 1, backoff * 2);
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

    /**
     * Generate the "context arch" — the shallowest logic framework of the raw
     * context, before any terms are explained. The context is DIVIDED INTO
     * BLOCKS, each a framework instance chosen from `knownFrameworks` (the
     * registry: built-ins + user-saved). A block whose framework has a natural
     * deduction capped by a result (e.g. statement-proof) is an ENCAPSULATION
     * BOX: a bordered group titled by the result statement, containing the
     * deduction nodes (conditions -> proof -> result). Blocks connect via
     * inter-block edges whose `relation` is the inter-block framework (e.g.
     * "syllogism"). 全貌型 blocks add a back-arrow (relation "needed-for")
     * from a later node back to an existing earlier node. If a block fits a
     * parent category but no known framework, the AI PROPOSES a new framework
     * (isNewFramework=true, frameworkDescription=…) so the caller can offer to
     * save it. Each node is the ACTUAL encapsulated statement excerpted /
     * paraphrased from the text (not an abstract role label). Terms get placed
     * into this framework later, when they are explained (updateKnowledgeGraph).
     */
    async generateContextArch(contextText: string, knownFrameworks: FrameworkDef[] = []): Promise<KnowledgeGraph> {
        const naturalList = knownFrameworks.filter(f => f.parent === 'natural');
        const panoramicList = knownFrameworks.filter(f => f.parent === 'panoramic');
        // Per-framework guidance now lives in the registry (frameworkRegistry.ts),
        // so all logic frameworks are visible/editable in one place. Fall back to
        // the one-line description for user-saved frameworks that predate `guidance`.
        const fmt = (arr: FrameworkDef[]) => arr.length
            ? arr.map(f => `  - ${f.name}: ${f.guidance || f.description}`).join('\n')
            : '  (none yet)';

        const prompt = `
        You are analyzing the LOGIC of a math text and encapsulating it into a shallow framework (the "arch").

        STEP 1 — DIVIDE the context into BLOCKS. Each block is a contiguous span of the text with ONE parent category and ONE framework:
        - parent "natural": ${PARENT_CATEGORY_DEFS.natural}
        - parent "panoramic": ${PARENT_CATEGORY_DEFS.panoramic}
        A single context often contains SEVERAL blocks (e.g. a lemma block, then a corollary block). The connection between two blocks is itself a framework (e.g. the jump from a lemma's result to a corollary's new conditions often follows syllogism).

        Known frameworks (PREFER one of these per block; use its exact \`framework\` name and set \`isNewFramework\`: false on that block). Each entry's text IS the build guidance — follow it for how to emit the block (encapsulation box vs flat nodes, members, edges, back-arrows):
        natural:
        ${fmt(naturalList)}
        panoramic:
        ${fmt(panoramicList)}
        If a block fits a parent category but NONE of the known frameworks fit, PROPOSE A NEW FRAMEWORK for that block: invent a short kebab-case \`framework\` name, a one-sentence \`frameworkDescription\`, and set \`isNewFramework\`: true on that block.

        STEP 2 — BUILD each block per its framework's guidance above. When a framework calls for an ENCAPSULATION BOX: \`label\` = the result/conclusion statement; \`members\` = the deduction node labels in order with the result/conclusion LAST; emit ALL deduction edges (front -> later, relation "leads-to", lineStyle "dashed") in the \`edges\` array, including edges among members of a box. For panoramic blocks, also add the needed-for back-arrow the guidance describes.

        STEP 3 — CONNECT blocks. Add INTER-BLOCK edges to \`edges\`: source = the result/last node of the earlier block, target = the first node of the next block, relation = the inter-block framework name (e.g. "syllogism"), lineStyle "dashed". Put the inter-block logic in "description". (E.g. lemma result --syllogism--> corollary first condition.)

        Nodes: each node label MUST be the ACTUAL encapsulated statement or concept EXCERPTED OR PARAPHRASED FROM THE CONTEXT TEXT — concise, ideally <= 15 words. NOT abstract role labels. Do NOT use "Conclusion"/"Setup"/"Premise"/"Standard". Use the real content.

        MATH: Wrap EVERY mathematical expression (symbols, formulas, variables, sub/superscripts, Greek letters) in node labels, box labels, and edge descriptions with $$...$$ so the graph renders it as real math (KaTeX) — e.g. write "$$\\Lambda$$", "$$x_i^2$$", "$$\\ker(T)=\\{0\\}$$", NOT bare "\\Lambda" or "x_i^2". Use $$...$$ (double dollar), not single $. Keep non-math words outside the $$...$$.

        Edge rules:
        - source/target must match node labels (or box member labels) exactly.
        - lineStyle "dashed" for "leads-to", "needed-for", and inter-block framework relations. Use "solid" only for genuine classification (is-a / example-of / specializes) — rare.

        If the text is too short or has no discernible logic, return an empty boxes array and empty edges array.

        Text:
        ${contextText}

        Return ONLY a valid JSON object, no markdown, no explanation:
        {"boxes":[{"framework":"statement-proof","category":"natural","label":"<result statement>","members":["<condition>","<proof>","<result>"],"isNewFramework":false,"frameworkDescription":""}],
         "edges":[{"source":"<condition>","target":"<proof>","relation":"leads-to","lineStyle":"dashed","description":""},{"source":"<box1 last member>","target":"<box2 first member>","relation":"syllogism","lineStyle":"dashed","description":"<inter-block logic>"}]}
        `;
        try {
            const response = await this.callAI(prompt);
            const parsed = this.parseJsonObject(response);
            if (!parsed) {
                // Distinguish "model didn't return JSON" from "API failed" — both
                // used to collapse into a silent empty graph. Surface the cause.
                throw new Error('Arch model returned a non-JSON response (could not parse). First 300 chars: ' + (response || '').slice(0, 300));
            }
            const edges = Array.isArray(parsed.edges) ? parsed.edges : [];
            const knownNames = new Set(knownFrameworks.map(f => f.name));
            const boxes: ArchBox[] = Array.isArray(parsed.boxes)
                ? parsed.boxes.map((b: any) => {
                    const cat: 'natural' | 'panoramic' = b && b.category === 'panoramic' ? 'panoramic' : 'natural';
                    const fw = typeof b?.framework === 'string' && b.framework.trim() ? b.framework.trim() : (cat === 'panoramic' ? 'panoramic-coarse' : 'syllogism');
                    const isNew = b?.isNewFramework === true || !knownNames.has(fw);
                    const members = Array.isArray(b?.members) ? b.members.filter((m: any) => typeof m === 'string') : [];
                    const label = typeof b?.label === 'string' && b.label.trim() ? b.label.trim() : (members.length ? members[members.length - 1] : fw);
                    const desc = typeof b?.frameworkDescription === 'string' ? b.frameworkDescription : '';
                    const box: ArchBox = { framework: fw, category: cat, label, members, isNewFramework: isNew };
                    if (desc) { box.frameworkDescription = desc; }
                    return box;
                }).filter((b: ArchBox) => b.members.length > 0)
                : [];
            // Valid JSON but no renderable content — log it so this isn't silent.
            if (edges.length === 0 && boxes.length === 0) {
                console.warn('[arch] generateContextArch: model returned valid JSON but no boxes/edges. Parsed:', JSON.stringify(parsed).slice(0, 500));
            }
            // Summary (legacy top-level) from the first box, if any.
            const first = boxes[0];
            const category: 'natural' | 'panoramic' = first ? first.category : (parsed.category === 'panoramic' ? 'panoramic' : 'natural');
            const framework = first ? first.framework : (typeof parsed.framework === 'string' && parsed.framework.trim() ? parsed.framework.trim() : (category === 'panoramic' ? 'panoramic-coarse' : 'syllogism'));
            const isNewFramework = first ? (first.isNewFramework ?? false) : (parsed.isNewFramework === true || !knownNames.has(framework));
            return {
                edges,
                boxes,
                category,
                framework,
                isNewFramework
            };
        } catch (e) {
            // Re-throw so the panel's arch handler can surface the REAL reason
            // (API/auth/network error, or non-JSON) instead of a silent empty graph.
            console.error('[arch] generateContextArch error:', e);
            throw e;
        }
    }

    async updateKnowledgeGraph(
        newTerm: string,
        contextText: string,
        existingTerms: string[],
        existingEdges?: KnowledgeGraphEdge[]
    ): Promise<{ edges: KnowledgeGraphEdge[] }> {
        // The framework always comes from generateContextArch (run when the
        // context is set). There is no longer a "first term" branch that builds
        // the graph from scratch — explaining a term only ELABORATES the
        // existing framework by placing the term into its niche.
        const edges = existingEdges && existingEdges.length > 0 ? existingEdges : [];

        const prompt = `
        You are elaborating an existing knowledge graph by placing a newly explained term into its niche.

        The graph below is the SHALLOWEST framework of the context's writing logic (the coarse logical blocks). The new term is a CONCRETE concept that belongs somewhere within this framework.

        New term just explained: "${newTerm}"
        Learning context: ${contextText}
        All terms explained so far: ${existingTerms.join(', ')}

        Existing graph edges — PRESERVE ALL of them in your response (framework blocks + any previously placed terms):
        ${JSON.stringify(edges, null, 2)}

        IMPORTANT — BACK-ARROWS: The existing edges may include BACK-ARROWS from a 全貌型 (panoramic) arch — edges with relation "needed-for" where source is a LATER block and target is an EARLIER block. PRESERVE them VERBATIM: do not reverse, reflow, relabel, or remove them. The LAYOUT RULE below applies ONLY to any NEW edges you add for the new term — never alter existing arch edges.

        DEDUPLICATION: Before adding "${newTerm}", check whether it already exists in the edges above (exact match or clearly equivalent concept). If it does, reuse that exact node name. Do NOT create a duplicate.

        PLACEMENT: Add "${newTerm}" as a node and connect it to its niche:
        - Preferably as a child (target) of the framework block it belongs under (source = the framework block, target = the new term).
        - Or, if it is more directly related to another already-placed term, connect it to that term (source = the more abstract one, target = the more concrete one).
        - If the framework is empty (no edges above), place "${newTerm}" as a top-level node with no parent.

        LAYOUT RULE (for NEW term-placement edges only): source is the more abstract/broader/higher concept; target is the more concrete/specific/lower concept.

        RELATION TYPES and LINE STYLES:
        - lineStyle "solid" for CLASSIFICATION (B is a type/instance of A): relations is-a, example-of, specializes.
        - lineStyle "dashed" for ENCAPSULATION / REDUCTION / part-of / belongs-to / used-by / depends-on / produces / leads-to / needed-for.

        Nodes at the same level of abstraction that share no direct relationship should NOT be connected.

        Return ONLY a valid JSON object with the FULL updated "edges" array (all preserved edges + the new one(s)). No explanation, no markdown:
        {"edges": [{"source": "...", "target": "...", "relation": "...", "lineStyle": "solid|dashed", "description": "..."}]}
        `;

        try {
            const response = await this.callAIConcurrent(prompt);
            return this.parseJsonObject(response) ?? { edges };
        } catch {
            return { edges };
        }
    }

    /** A classification edge: solid line, or relation is-a / example-of / specializes. */
    private isClassificationEdge(e: KnowledgeGraphEdge): boolean {
        return e.lineStyle === 'solid' ||
            e.relation === 'is-a' ||
            e.relation === 'example-of' ||
            e.relation === 'specializes';
    }

    /**
     * If A and B are in a parent/child classification relationship, return
     * { parent, child } oriented so that parent is the more abstract concept
     * (edge source) and child is the more concrete one (edge target). Per the
     * graph layout rule, source = parent, target = child. Returns null when
     * they are not directly connected by a classification edge.
     */
    private resolveParentChild(edges: KnowledgeGraphEdge[], a: string, b: string): { parent: string; child: string } | null {
        const norm = (s: string) => String(s || '').trim().toLowerCase();
        const aN = norm(a);
        const bN = norm(b);
        if (!aN || !bN || aN === bN) {
            return null;
        }
        for (const e of edges) {
            if (!this.isClassificationEdge(e)) {
                continue;
            }
            const sN = norm(e.source);
            const tN = norm(e.target);
            if (sN === aN && tN === bN) {
                return { parent: a, child: b };
            }
            if (sN === bN && tN === aN) {
                return { parent: b, child: a };
            }
        }
        return null;
    }

    /** All concepts that are direct children (classification targets) of `parent`. */
    private childrenOf(edges: KnowledgeGraphEdge[], parent: string): string[] {
        const norm = (s: string) => String(s || '').trim().toLowerCase();
        const pN = norm(parent);
        const out: string[] = [];
        for (const e of edges) {
            if (this.isClassificationEdge(e) && norm(e.source) === pN) {
                out.push(e.target);
            }
        }
        return out;
    }

    async generateComparativeLearning(
        termA: string,
        contextText: string,
        graphEdges: KnowledgeGraphEdge[],
        termB?: string,
        dimension: 'description' | 'model' = 'description'
    ): Promise<{ comparativeTerm: string; content: string }> {
        // Two KINDS of comparative learning, chosen by the relation in the graph
        // (not by the model). Each kind gets its own dedicated prompt.
        let prompt: string;
        let defaultTerm: string;
        const edgesJson = JSON.stringify(graphEdges, null, 2);

        // Dimension directive: `model` comparisons must use concrete examples
        // with intact calculations (actual numbers) and LaTeX, per the user's
        // spec for the math compare command (Ctrl+Shift+X).
        const dimensionDirective = dimension === 'model'
            ? `DIMENSION — MATHEMATICAL MODELING: Compare using CONCRETE EXAMPLES with INTACT CALCULATIONS (actual numbers). For each concept, present a complete step-by-step calculation that embodies it, then contrast the two calculations to make the difference vivid. Use LaTeX (format $...$ for inline and $$...$$ for display) for ALL mathematical expressions. Structure the answer in Markdown with LaTeX.`
            : `DIMENSION — NATURAL LANGUAGE: Write the comparison in natural language (Markdown), using plain explanations, analogies, and concrete examples. No math notation unless the concept itself is a formula.`;

        if (termB) {
            const pc = this.resolveParentChild(graphEdges, termA, termB);
            if (pc) {
                // KIND 1 — parent/child. Concept A is the parent of concept B.
                // To better understand the child B, the model finds a SIBLING C
                // (another concept that also belongs to parent A) which is
                // distinct or opposite to B, and compares C vs B.
                const siblingCandidates = this.childrenOf(graphEdges, pc.parent)
                    .filter(n => n.trim().toLowerCase() !== pc.child.trim().toLowerCase());
                const siblingsLine = siblingCandidates.length > 0
                    ? siblingCandidates.map(s => `"${s}"`).join(', ')
                    : '(none currently in the graph — infer a real one)';
                defaultTerm = `${pc.child} (comparative)`;
                prompt = `
                You are a comparative learning assistant. The learner selected two concepts in a PARENT/CHILD relationship:
                - Parent concept (more abstract): "${pc.parent}"
                - Child concept (more concrete): "${pc.child}"

                Goal: help the learner better understand the CHILD "${pc.child}".

                Find another concept or example (call it C) that ALSO belongs to the parent "${pc.parent}" but is DISTINCT or OPPOSITE to "${pc.child}".
                - Other known children of "${pc.parent}" in the graph: ${siblingsLine}.
                - If one of them is a good contrast to "${pc.child}", use it as C.
                - Otherwise infer or suggest a REAL concept from this domain that would be a child of "${pc.parent}" and a useful contrast to "${pc.child}".

                Then generate a SIBLING COMPARISON of concept or example C vs "${pc.child}":
                - Identify the shared parent "${pc.parent}" and how C and "${pc.child}" each specialize it differently.
                - Highlight their distinct or opposite qualities.
                - Show how contrasting them sharpens understanding of "${pc.child}".
                - Use concrete examples or analogies.

                Learning context: ${contextText}

                Knowledge graph edges:
                ${edgesJson}

                ${dimensionDirective}

                Write the comparison as Markdown with clear sections.

                Return ONLY a valid JSON object — no markdown code fences, no text outside the JSON:
                {"comparativeTerm": "concept C vs ${pc.child}", "content": "...the markdown comparison..."}
                `;
            } else {
                // KIND 2 — distinguishing similar (not classification-related) concepts
                defaultTerm = `${termA} vs ${termB}`;
                prompt = `
                You are a comparative learning assistant. The learner selected two concepts that are NOT directly related by classification: "${termA}" and "${termB}".
                They may sit at different places in the knowledge graph and are similar or easily confused, but they are not in a parent/child relationship.

                Learning context: ${contextText}

                Knowledge graph edges:
                ${edgesJson}

                Generate a DISTINGUISHING comparison:
                - Clarify the core meaning of each concept and why they are often confused.
                - Draw a sharp distinction: what each one IS versus what it is NOT.
                - Provide side-by-side examples that make the difference obvious.

                ${dimensionDirective}

                Write the comparison as Markdown with clear sections.

                Return ONLY a valid JSON object — no markdown code fences, no text outside the JSON:
                {"comparativeTerm": "${termA} vs ${termB}", "content": "...the markdown comparison..."}
                `;
            }
        } else {
            // Single concept selected — find a useful comparative sibling (always KIND 1)
            defaultTerm = `${termA} (comparative)`;
            prompt = `
            You are a comparative learning assistant. The learner selected one concept from their knowledge graph: "${termA}".
            Find a concept that serves as a useful comparative counterpart and generate learning material.

            Selected concept: "${termA}"
            Learning context: ${contextText}

            Knowledge graph edges:
            ${edgesJson}

            Steps:
            1. Identify the parent/broader concept of "${termA}" by examining the graph edges.
            2. Find another concept (termC) that also belongs to that parent but is DISTINCT or OPPOSITE to "${termA}".
               - If the graph already contains such a sibling, use it.
               - If not, infer or suggest a real concept from this domain that would serve as a useful contrast.
            3. Generate a sibling comparison (termC vs "${termA}"):
               - Identify the shared parent and how each specializes it differently.
               - Highlight their distinct or opposite qualities.
               - Use concrete examples or analogies.

            ${dimensionDirective}

                Write the comparison as Markdown with clear sections.

            Return ONLY a valid JSON object — no markdown code fences, no text outside the JSON:
            {"comparativeTerm": "name of the comparative concept", "content": "...the markdown comparison..."}
            `;
        }

        const fallback = {
            comparativeTerm: defaultTerm,
            content: 'Failed to generate comparative learning material.'
        };

        try {
            const response = await this.callAI(prompt);
            const parsed = this.parseJsonObject(response);
            if (parsed && typeof parsed.content === 'string' && parsed.content.trim()) {
                const ct = (typeof parsed.comparativeTerm === 'string' && parsed.comparativeTerm.trim())
                    ? parsed.comparativeTerm.trim()
                    : defaultTerm;
                return { comparativeTerm: ct, content: parsed.content };
            }
            // The model returned content but not valid JSON (e.g. plain markdown).
            // Surface the raw text instead of a hard failure so the learner still
            // gets the material.
            if (response && response.trim()) {
                return { comparativeTerm: defaultTerm, content: response.trim() };
            }
            return fallback;
        } catch {
            return fallback;
        }
    }
}

