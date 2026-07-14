export interface TraceStep {
    functionName: string;
    filePath: string;
    line: number;
    timestamp: number;
}

export interface Trace {
    id: string;
    steps: TraceStep[];
    explanations: { [fn: string]: string };
    createdAt: number;
}

export interface LearningInstance {
    id: string;
    name: string;
    rootContext: ContextNode;
    createdAt: number;
    visualizationFile?: string;
    knowledgeGraph?: KnowledgeGraph;
}

export interface ContextNode {
    id: string;
    rawText: string;
    paragraphs: ParagraphNode[];
}

export interface ParagraphNode {
    id: string;
    text: string;
    terms: TermNode[];
}

export interface VisualizationEntry {
    expression: string;
    filePath: string;
    createdAt: number;
    /** The pedagogical branch type that triggered this script, for per-branch "Show Script". */
    branchType?: string;
}

// PedagogicalType is the canonical source of truth in src/pedagogy/registry.ts;
// imported for local use and re-exported so existing
// `import { PedagogicalType } from './traceModels'` calls keep working.
// BranchType extends it with the non-explain 'comparative-learning' box marker.
import type { PedagogicalType, BranchType } from './pedagogy/registry';
export type { PedagogicalType, BranchType };

export interface PracticeProblem {
    id: string;
    difficulty: number;
    content: string;
    createdAt: number;
}

export interface ExplanationBranch {
    type: BranchType;
    content: string;
    createdAt: number;
    childContext?: ContextNode;
    practices?: PracticeProblem[];
    currentPracticeIndex?: number;
    practiceVisible?: boolean;
}

export interface KnowledgeGraphEdge {
    source: string;
    target: string;
    relation: string;
    description: string;
    lineStyle?: 'solid' | 'dashed';  // solid = classification (is-a), dashed = encapsulation/reduction
}

export interface KnowledgeGraph {
    edges: KnowledgeGraphEdge[];
    rawJson?: string;  // serialized edges from last AI call, for incremental upgrades
    /** Coarse logic category of the context, set at arch generation. 自然型 | 全貌型. */
    category?: 'natural' | 'panoramic';
    /** Specific framework name (e.g. "syllogism", "classified-discussion", "panoramic-coarse", or a new name). */
    framework?: string;
    /** True when the AI proposed a framework not present in the registry (prompts the user to save). */
    isNewFramework?: boolean;
    /** One-line pattern description for a new framework; used when saving it to the registry. */
    frameworkDescription?: string;
    /** Encapsulation boxes — each box is a block of the arch: a deduction sequence
     * grouped inside a bordered subgraph, titled by the result statement. */
    boxes?: ArchBox[];
}

export interface ArchBox {
    /** Framework name for this block, e.g. "statement-proof" | "syllogism". */
    framework: string;
    category: 'natural' | 'panoramic';
    /** The encapsulated result statement — used as the subgraph title. */
    label: string;
    /** Node labels inside the box (the deduction sequence; the result is the last member). */
    members: string[];
    isNewFramework?: boolean;
    frameworkDescription?: string;
}

export interface TermNode {
    id: string;
    term: string;
    branches: ExplanationBranch[];
    visualizations?: VisualizationEntry[];
}
