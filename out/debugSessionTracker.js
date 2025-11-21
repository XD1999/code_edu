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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugSessionTracker = void 0;
const vscode = __importStar(require("vscode"));
class DebugSessionTracker {
    constructor(aiService, knowledgeLibrary) {
        this.activeSession = null;
        this.projectOverview = '';
        this.isProcessing = false;
        this.disposables = [];
        this.aiService = aiService;
        this.knowledgeLibrary = knowledgeLibrary;
        // Listen for step into events
        // TODO: VS Code doesn't have a direct "onStep" event, so we'll use a workaround
        // Listen for stack frame changes which occur during stepping
        const subscription = vscode.debug.onDidChangeActiveStackItem(() => {
            console.log('DebugSessionTracker: onDidChangeActiveStackItem triggered');
            // Debounce to avoid multiple calls
            if (!this.isProcessing) {
                console.log('DebugSessionTracker: Calling handleStepInto');
                this.handleStepInto();
            }
            else {
                console.log('DebugSessionTracker: Skipping handleStepInto - already processing');
            }
        });
        this.disposables.push(subscription);
    }
    setActiveSession(session) {
        this.activeSession = session;
        console.log('DebugSessionTracker: setActiveSession called');
        // Generate project overview when session starts
        this.generateProjectOverview();
    }
    clearActiveSession() {
        this.activeSession = null;
        this.projectOverview = '';
        console.log('DebugSessionTracker: clearActiveSession called');
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        console.log('DebugSessionTracker: dispose called');
    }
    async generateProjectOverview() {
        try {
            console.log('DebugSessionTracker: generateProjectOverview started');
            // Get workspace file structure
            const fileStructure = await this.getWorkspaceFileStructure();
            console.log('DebugSessionTracker: fileStructure retrieved', fileStructure);
            // Get project dependencies (simplified)
            const dependencies = await this.getProjectDependencies();
            console.log('DebugSessionTracker: dependencies retrieved', dependencies);
            // Generate overview using AI
            console.log('DebugSessionTracker: Calling aiService.generateProjectOverview');
            this.projectOverview = await this.aiService.generateProjectOverview(fileStructure, dependencies);
            console.log('DebugSessionTracker: projectOverview generated, length:', this.projectOverview.length);
            // Save to knowledge library
            await this.knowledgeLibrary.saveProjectOverview(this.projectOverview);
            console.log('DebugSessionTracker: projectOverview saved to knowledge library');
            vscode.window.showInformationMessage('Project overview generated and saved to knowledge library');
        }
        catch (error) {
            console.error('Error generating project overview:', error);
            vscode.window.showErrorMessage('Failed to generate project overview');
        }
    }
    async handleStepInto() {
        console.log('DebugSessionTracker: handleStepInto started');
        if (!this.activeSession || this.isProcessing) {
            console.log('DebugSessionTracker: handleStepInto early return - activeSession:', !!this.activeSession, 'isProcessing:', this.isProcessing);
            return;
        }
        this.isProcessing = true;
        console.log('DebugSessionTracker: isProcessing set to true');
        try {
            // Get current stack trace
            console.log('DebugSessionTracker: Calling getStackTrace');
            const trace = await this.getStackTrace();
            console.log('DebugSessionTracker: trace retrieved', trace);
            if (trace && trace.length > 0) {
                console.log('DebugSessionTracker: trace has items, calling extractFunctionsFromTrace');
                // Get functions in the trace
                const functions = await this.extractFunctionsFromTrace(trace);
                console.log('DebugSessionTracker: functions extracted', functions);
                // Explain all functions
                console.log('DebugSessionTracker: calling explainFunctions');
                const explanations = await this.explainFunctions(functions, trace);
                console.log('DebugSessionTracker: explanations generated', explanations);
                // Save to knowledge library
                console.log('DebugSessionTracker: saving function explanations');
                await this.knowledgeLibrary.saveFunctionExplanations(explanations);
                console.log('DebugSessionTracker: function explanations saved');
                vscode.window.showInformationMessage(`Explained ${explanations.length} functions and saved to knowledge library`);
            }
            else {
                console.log('DebugSessionTracker: trace is empty or null, skipping function explanation');
            }
        }
        catch (error) {
            console.error('Error handling step into:', error);
            vscode.window.showErrorMessage('Failed to explain functions in trace');
        }
        finally {
            this.isProcessing = false;
            console.log('DebugSessionTracker: isProcessing set to false');
        }
    }
    async getStackTrace() {
        // Get the actual stack trace from the debug session
        console.log('DebugSessionTracker: getStackTrace called');
        if (!this.activeSession) {
            console.log('DebugSessionTracker: No active session');
            return [];
        }
        try {
            // Request stack trace from the debug session
            // This uses the Debug Adapter Protocol to get stack frames
            const response = await this.activeSession.customRequest('stackTrace', {
                threadId: 1,
                startFrame: 0,
                levels: 20 // Get up to 20 stack frames
            });
            console.log('DebugSessionTracker: stackTrace response received', response);
            if (response && response.stackFrames) {
                // Return the stack frames
                return response.stackFrames;
            }
            else {
                console.log('DebugSessionTracker: No stack frames in response');
                return [];
            }
        }
        catch (error) {
            console.error('DebugSessionTracker: Error getting stack trace', error);
            // Fallback to empty array
            return [];
        }
    }
    async getWorkspaceFileStructure() {
        // Get all files in the workspace
        const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,c,cpp,cs}', '**/node_modules/**');
        const fileStructure = {};
        files.forEach(file => {
            const relativePath = vscode.workspace.asRelativePath(file);
            fileStructure[relativePath] = 'file';
        });
        return fileStructure;
    }
    async getProjectDependencies() {
        // Simplified dependency detection
        // In a real implementation, you would parse package.json, requirements.txt, etc.
        return {
            'package.json': 'detected',
            'requirements.txt': 'not found'
        };
    }
    async extractFunctionsFromTrace(trace) {
        // Extract function names and code from the trace
        console.log('DebugSessionTracker: extractFunctionsFromTrace called with trace:', trace.length);
        const functions = [];
        // Process each stack frame to extract function information
        for (const frame of trace) {
            // Filter for user code only (not Node.js internals)
            if (frame.name && frame.source && frame.source.path) {
                // Check if this is user code (not Node.js internals)
                const sourcePath = frame.source.path;
                console.log('DebugSessionTracker: examining frame', frame.name, 'at', sourcePath);
                // Only include functions from user files, not Node.js internals
                if (!sourcePath.includes('node:internal') &&
                    !sourcePath.includes('node_modules') &&
                    (sourcePath.endsWith('.js') || sourcePath.endsWith('.ts'))) {
                    console.log('DebugSessionTracker: found user code frame', frame.name);
                    // Try to get the actual source code from the debug session
                    try {
                        // Request source code from the debug session
                        const sourceResponse = await this.activeSession?.customRequest('source', {
                            source: frame.source,
                            startLine: Math.max(0, frame.line - 5),
                            endLine: frame.line + 10 // Get 10 lines after
                        });
                        if (sourceResponse && sourceResponse.content) {
                            const functionName = frame.name;
                            const location = `${sourcePath}:${frame.line}`;
                            functions.push({
                                name: functionName,
                                code: sourceResponse.content
                            });
                            console.log('DebugSessionTracker: extracted source code for', functionName);
                        }
                        else {
                            // Fallback to basic information
                            functions.push({
                                name: frame.name,
                                code: `// Function: ${frame.name}\n// Location: ${sourcePath}:${frame.line}\n// Note: Could not retrieve source code`
                            });
                        }
                    }
                    catch (error) {
                        console.log('DebugSessionTracker: Could not read source code for', frame.name, error);
                        // Fallback to basic information
                        functions.push({
                            name: frame.name,
                            code: `// Function: ${frame.name}\n// Location: ${sourcePath}:${frame.line}\n// Note: Source code extraction failed`
                        });
                    }
                }
            }
        }
        console.log('DebugSessionTracker: extracted user functions:', functions.length);
        return functions;
    }
    async explainFunctions(functions, trace) {
        console.log('DebugSessionTracker: explainFunctions called with functions:', functions.length, 'trace:', trace.length);
        const explanations = [];
        // Create trace context
        const traceContext = trace.map(frame => `${frame.name} (${frame.file}:${frame.line})`).join(' -> ');
        console.log('DebugSessionTracker: traceContext created', traceContext);
        for (const func of functions) {
            console.log('DebugSessionTracker: explaining function', func.name);
            const explanation = await this.aiService.explainFunction(func.code, func.name, this.projectOverview, traceContext);
            console.log('DebugSessionTracker: explanation generated for', func.name, 'length:', explanation.length);
            explanations.push({
                functionName: func.name,
                explanation: explanation
            });
        }
        console.log('DebugSessionTracker: explainFunctions returning', explanations.length, 'explanations');
        return explanations;
    }
}
exports.DebugSessionTracker = DebugSessionTracker;
//# sourceMappingURL=debugSessionTracker.js.map