/**
 * Pedagogy registry — the single source of truth for explanation prompts.
 *
 * Each entry describes one pedagogical "lens" used to explain a term:
 *   dimension  : description (natural language) | model (mathematical formulation)
 *   approach   : encapsulation | reduction | concretization
 *
 * The keybinding layer is decoupled from language: a single explain command is
 * bound per (approach, auto-viz) pair, and which language (desc vs model) the
 * prompt uses is resolved at trigger time from the global LanguageMode via
 * `findPedagogyByApproach(approach, dimension)`. Keybindings themselves live
 * only in package.json.
 *
 * Adding a new explanation type:
 *   1. Append an entry to PEDAGOGICAL_TYPES below (type, dimension, approach,
 *      buildPrompt). The `PedagogicalType` union is derived automatically.
 *   2. If it introduces a new approach, also add the corresponding
 *      (approach, auto-viz) commands + keybindings in package.json and
 *      registerExplainCommands.
 *
 * The prompt bodies here were moved verbatim from the former
 * `AIService.explainTerm` switch statement.
 */

export interface PedagogicalTypeDefinition {
    /** Stable id, also stored on ExplanationBranch.type and persisted to storage. */
    readonly type: string;
    readonly dimension: 'description' | 'model';
    readonly approach: 'encapsulation' | 'reduction' | 'concretization' | 'deduction';
    /** Builds the full prompt (context + template) sent to the AI. */
    readonly buildPrompt: (term: string, context: string) => string;
}

const MODEL_BACKGROUND = `Background knowledge:
observed quantity means the quantity that can be observed directly from phenomenon and measured, which is a special kind of initial quantity, for example M, m and r in Newton's second law;
initial quantity means the quantity that is defined by the phenomenon itself or a deduced quantity derived from more initial formula but serves as a basis for current formula, for example /rho from the rate of mass to volume serves as initial quantity in further formula;
constructed quantity means the quantity derived by constructing a new quantity from observed quantities, which is usually a capsulation event or system in more fundamental scope, for example F in Newton's second law;
deduced quantity means the quantity derived by deductive reasoning from observed and constructed quantities, for example g in Newton's second law, which is also usually a capsulation of more complex event or system in more micro scope.`;

/** Canonical, ordered list of all pedagogical explanation types. */
export const PEDAGOGICAL_TYPES = [
    {
        type: 'desc-encapsulation',
        dimension: 'description',
        approach: 'encapsulation',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with ENCAPSULATION approach.

            ENCAPSULATION means: Treat the term as a fundamental concept and explain it by its purpose/role within a broader system.
            - For dynamic terms (verbs, adverbs): Explain their purpose in the larger system, their niche, and comparison with similar concepts at the same level.
            - For static terms (nouns, adjectives): They are already encapsulated, so explain their system role and relationships.

            Structure your answer using Markdown:
            1. **System Context**: Where does this term fit in the larger framework?
            2. **Purpose/Role**: What is its function or niche?
        `,
    },
    {
        type: 'desc-reduction',
        dimension: 'description',
        approach: 'reduction',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with REDUCTION approach.

            REDUCTION means: Delve into deeper levels by analyzing the interaction of more fundamental elements.
            - For static terms (nouns, adjectives): Break down into constituent parts and their interactions.
            - For dynamic terms (verbs, adverbs): They are already reduced, so explain the underlying static structure that enables this dynamic.

            Structure your answer using Markdown:
            1. **Elemental Breakdown**: What are the fundamental components?
            2. **Interactions**: How do these elements interact?
            3. **Emergence**: How does the term emerge from these interactions?
        `,
    },
    {
        type: 'model-encapsulation',
        dimension: 'model',
        approach: 'encapsulation',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            ${MODEL_BACKGROUND}

            Explain "${term}" using MATHEMATICAL MODELING with ENCAPSULATION approach.

            ENCAPSULATION means: Treat the term as a fundamental building block — an encapsulated interface of the lower knowledge layer that the user grasps by REMEMBERING, not by reasoning from bottom to up, just like saved in a register. This is layer induction: the term is a node you induce upward from, a saved register the larger framework reuses.

            Provide a NATURAL LANGUAGE bridge first:
            1. **Intuitive Understanding**: Explain the concept in plain language - what does it mean intuitively?
            2. **System Context**: Where does this fit in the larger framework?

            THEN, provide the MATHEMATICAL FORMULATION:
            3. **Interface Register**: Present the conclusion of the mathematical theorem or definition that serves as the encapsulated interface of the lower knowledge layer for that larger framework. If a single formula is enough (simple interface), just present it; if classified discussion is needed (complex interface), show the full picture to connect it intactly.
            4. **Variable Explanation**: Explain each symbol/variable in the formula.
            5. **Concretization**: Using a specific, concrete example to embody and exemplify the encapsulated theorem or definition.

            - Use LaTeX for all mathematical expressions.

            Structure your answer using Markdown with LaTeX format $ and $$ to enclose math expressions (e.g., $E=mc^2$ or $$...$$).
        `,
    },
    {
        type: 'model-reduction',
        dimension: 'model',
        approach: 'reduction',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            ${MODEL_BACKGROUND}

            Explain "${term}" using MATHEMATICAL MODELING with REDUCTIONIST approach.

            FIRST, provide a NATURAL LANGUAGE bridge:
            1. **Intuitive Understanding**: Explain the concept in plain language first - what does it mean intuitively?

            THEN, provide the MATHEMATICAL FORMULATION:
            2. **Formal Derivation**: Present the mathematical derivation using LaTeX.
            3. **Variable Explanation**: Explain each symbol/variable in the formula.

            REDUCTION means: Delve into deeper levels by analyzing the interaction of fundamental elements so that human can understand strange concepts in a context preparing to understand the context.
            - Use LaTeX for all mathematical expressions.

            Structure your answer using Markdown with LaTeX format $ and $$ to enclose math expressions (e.g., $E=mc^2$ or $$...$$).
        `,
    },
    {
        type: 'desc-concretization',
        dimension: 'description',
        approach: 'concretization',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with CONCRETIZATION approach.

            CONCRETIZATION means: Using a specific, concrete example to embody and exemplify the abstract concept.

            Structure your answer using Markdown:
            1. **Intuitive Understanding**: What does this concept mean in plain language?
            2. **Example**: Provide a concrete, relatable example illustrating the concept.
            3. **Generalization**: How does the example connect to the broader understanding of the term?
        `,
    },
    {
        type: 'model-concretization',
        dimension: 'model',
        approach: 'concretization',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            Explain "${term}" using MATHEMATICAL MODELING with CONCRETIZATION approach.

            CONCRETIZATION means: Using an intact calculation to exemplify the abstract concept.

            FIRST, provide a NATURAL LANGUAGE bridge:
            1. **Intuitive Understanding**: What does this concept mean in plain language?

            THEN, provide a CONCRETE CALCULATION:
            2. **Step-by-Step Calculation**: Present a complete, step-by-step calculation with actual numbers using LaTeX.
            3. **Variable Explanation**: Explain what each symbol and number in the calculation means.

            Structure your answer using Markdown with LaTeX format $ and $$ to enclose math expressions (e.g., $E=mc^2$ or $$...$$).
        `,
    },
    {
        type: 'desc-deduction',
        dimension: 'description',
        approach: 'deduction',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            Explain the term "${term}" using NATURAL LANGUAGE DESCRIPTION with DEDUCTION approach.

            DEDUCTION means: Treat the term as a step in a reasoning procedure. Emphasize its NICHE and PURPOSE within the overall chain of reasoning — where it sits, what it acts upon, and what it produces or leads to downstream.

            Structure your answer using Markdown:
            1. **Intuitive Understanding**: What does this step mean in plain language?
            2. **Validity**: Why can we do this step? What makes it justified?
            3. **Purpose in the Chain**: Why is this step necessary for the overall reasoning? What would the reasoning lose without it?
            4. **Downstream Impact**: What does this step produce or lead to?
        `,
    },
    {
        type: 'model-deduction',
        dimension: 'model',
        approach: 'deduction',
        buildPrompt: (term, context) => `
            Context:
            ${context}

            ${MODEL_BACKGROUND}

            Explain "${term}" using MATHEMATICAL MODELING with DEDUCTION approach.

            DEDUCTION means: Treat the term as a step in a reasoning procedure. This is linear deduction: emphasize the term's NICHE and PURPOSE for the whole reasoning procedure — where it sits in the chain of deduction, what it acts upon, and what it produces or leads to downstream.

            FIRST, provide a NATURAL LANGUAGE bridge:
            1. **Intuitive Understanding**: Explain the concept in plain language first - what does it mean intuitively?
            2. **System Context**: Where does this fit in the larger framework?

            THEN, provide the MATHEMATICAL FORMULATION:
            3. **Validity of the Step**: Why we can do this procedure? What reason makes this procedure standable? This part focus on why this step is standable.
            4. **Purpose for the Whole Procedure**: Why is this step necessary for the overall deduction? What would the reasoning lose without it?
            5. **Mathematical Embodiment**: Give the formula (if any) that embodies this step and explain its symbols/variables; if the term is purely operational with no single formula, state the operation it performs on the preceding quantities.

            - Use LaTeX for all mathematical expressions.

            Structure your answer using Markdown with LaTeX format $ and $$ to enclose math expressions (e.g., $E=mc^2$ or $$...$$).
        `,
    },
] as const satisfies readonly PedagogicalTypeDefinition[];

/** Union of every pedagogical type id. Derived from the registry — do not hand-maintain. */
export type PedagogicalType = typeof PEDAGOGICAL_TYPES[number]['type'];

/**
 * Branch type — the value stored on `ExplanationBranch.type`.
 *
 * Every pedagogical explanation type is a valid branch type, PLUS the
 * comparative-learning markers generated from the Arch-tab graph:
 * - `'comparative-learning'`      — legacy/ungrouped (kept for saved state)
 * - `'comparative-learning-desc'` — natural-language comparison
 * - `'comparative-learning-model'`— math comparison with concrete example +
 *   calculation
 */
export type BranchType = PedagogicalType
    | 'comparative-learning'
    | 'comparative-learning-desc'
    | 'comparative-learning-model';

/** Look up a pedagogy definition by its type id. */
export function findPedagogy(type: string): PedagogicalTypeDefinition | undefined {
    return PEDAGOGICAL_TYPES.find(p => p.type === type);
}

/**
 * Resolve a pedagogy definition by (approach, dimension). Used by the explain/
 * compare commands to pick the desc-* (natural) or model-* (math) prompt for a
 * given approach based on the current global LanguageMode.
 */
export function findPedagogyByApproach(
    approach: 'encapsulation' | 'reduction' | 'concretization' | 'deduction',
    dimension: 'description' | 'model'
): PedagogicalTypeDefinition {
    const def = PEDAGOGICAL_TYPES.find(p => p.approach === approach && p.dimension === dimension);
    if (!def) {
        throw new Error(`No pedagogy registered for approach="${approach}" dimension="${dimension}"`);
    }
    return def;
}
