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
}

export type PedagogicalType = 'desc-encapsulation' | 'desc-reduction' | 'model-encapsulation' | 'model-reduction' | 'practice';

export interface PracticeProblem {
    id: string;
    difficulty: number;
    content: string;
    createdAt: number;
}

export interface ExplanationBranch {
    type: PedagogicalType;
    content: string;
    createdAt: number;
    childContext?: ContextNode;
    practices?: PracticeProblem[];
    currentPracticeIndex?: number;
    practiceVisible?: boolean;
}

export interface TermNode {
    id: string;
    term: string;
    branches: ExplanationBranch[];
    visualizations?: VisualizationEntry[];
}
