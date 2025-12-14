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
