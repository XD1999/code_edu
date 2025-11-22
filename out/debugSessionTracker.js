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
const path = __importStar(require("path"));
class DebugSessionTracker {
    constructor(aiService, knowledgeLibrary) {
        this.activeSession = null;
        this.isProcessing = false;
        this.disposables = [];
        this.DEBOUNCE_DELAY = 500;
        // Dynamic Knowledge State
        this.mode = 'playback';
        this.recordedFunctions = new Map(); // name -> code
        this.callGraph = [];
        this.lastFunction = null;
        this.autoBreakpoints = [];
        this.aiService = aiService;
        this.knowledgeLibrary = knowledgeLibrary;
        const stackItemSubscription = vscode.debug.onDidChangeActiveStackItem((item) => {
            console.log('DebugSessionTracker: onDidChangeActiveStackItem triggered');
            this.triggerDebouncedStepInto(item);
        });
        const breakpointSubscription = vscode.debug.onDidChangeBreakpoints(() => {
            console.log('DebugSessionTracker: onDidChangeBreakpoints triggered');
            // For breakpoints, we try to get the active item immediately
            this.triggerDebouncedStepInto(vscode.debug.activeStackItem);
        });
        this.disposables.push(stackItemSubscription);
        this.disposables.push(breakpointSubscription);
    }
    async startRecording() {
        this.mode = 'recording';
        this.recordedFunctions.clear();
        this.callGraph = [];
        this.lastFunction = null;
        console.log('DebugSessionTracker: Started recording');
        // Log workspace folders for debugging
        if (vscode.workspace.workspaceFolders) {
            vscode.workspace.workspaceFolders.forEach((wf, index) => {
                console.log(`DebugSessionTracker: Workspace Folder [${index}]: Name=${wf.name}, URI=${wf.uri.toString()}`);
            });
        }
        else {
            console.log('DebugSessionTracker: No workspace folders found');
        }
        await this.setAllBreakpoints();
        vscode.window.showInformationMessage('Auto-Trace Active: Breakpoints set on all functions. Run your code (F5) to record.');
    }
    async stopRecording() {
        this.mode = 'playback';
        console.log('DebugSessionTracker: Stopped recording');
        await this.clearAutoBreakpoints();
        return await this.processRecordedSession();
    }
    async setAllBreakpoints() {
        const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx}', '**/node_modules/**');
        const newBreakpoints = [];
        for (const file of files) {
            // Skip node_modules
            if (file.fsPath.includes('node_modules'))
                continue;
            try {
                const document = await vscode.workspace.openTextDocument(file);
                const locations = this.extractFunctionLocations(document.getText());
                for (const line of locations) {
                    const bp = new vscode.SourceBreakpoint(new vscode.Location(file, new vscode.Position(line, 0)));
                    newBreakpoints.push(bp);
                }
            }
            catch (e) {
                console.error(`Failed to set breakpoints in ${file.fsPath}`, e);
            }
        }
        if (newBreakpoints.length > 0) {
            vscode.debug.addBreakpoints(newBreakpoints);
            this.autoBreakpoints = newBreakpoints;
            console.log(`Set ${newBreakpoints.length} auto-breakpoints`);
        }
    }
    async clearAutoBreakpoints() {
        if (this.autoBreakpoints.length > 0) {
            vscode.debug.removeBreakpoints(this.autoBreakpoints);
            this.autoBreakpoints = [];
            console.log('Cleared auto-breakpoints');
        }
    }
    extractFunctionLocations(content) {
        const lines = content.split('\n');
        const locations = [];
        // Regex to match function declarations
        const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\(|([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/;
        const classMethodRegex = /^[ \t]*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('//') || line.trim().startsWith('*'))
                continue;
            if (functionRegex.test(line) || classMethodRegex.test(line)) {
                // Basic check to avoid false positives
                if (!line.includes('return') && !line.includes('console.log')) {
                    locations.push(i);
                }
            }
        }
        return locations;
    }
    triggerDebouncedStepInto(stackItem) {
        console.log('DebugSessionTracker: triggerDebouncedStepInto called');
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        // Shorter debounce for auto-trace to be faster
        const delay = this.mode === 'recording' ? 50 : this.DEBOUNCE_DELAY;
        this.debounceTimer = setTimeout(() => {
            console.log('DebugSessionTracker: Debounce timer fired');
            if (!this.isProcessing) {
                this.handleStepInto(stackItem);
            }
            else {
                console.log('DebugSessionTracker: Skipping handleStepInto - already processing');
            }
        }, delay);
    }
    setActiveSession(session) {
        this.activeSession = session;
    }
    clearActiveSession() {
        this.activeSession = null;
    }
    dispose() {
        this.disposables.forEach(d => d.dispose());
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.clearAutoBreakpoints(); // Ensure cleanup
    }
    async handleStepInto(passedStackItem) {
        console.log('DebugSessionTracker: handleStepInto started');
        if (!this.activeSession) {
            // Try to recover session if missing
            if (vscode.debug.activeDebugSession) {
                this.activeSession = vscode.debug.activeDebugSession;
            }
            else {
                console.log('DebugSessionTracker: No active session');
                return;
            }
        }
        if (this.isProcessing) {
            console.log('DebugSessionTracker: Already processing');
            return;
        }
        this.isProcessing = true;
        try {
            let trace = [];
            // 1. Try using the passed stack item (Most Reliable for Race Conditions)
            if (passedStackItem && typeof passedStackItem === 'object' && 'source' in passedStackItem) {
                console.log('DebugSessionTracker: Using passed stack item');
                const frame = passedStackItem;
                trace = [{
                        name: frame.name,
                        source: { path: frame.source.path },
                        line: frame.line,
                        column: frame.column
                    }];
            }
            // 2. Fallback to current active stack item
            else if (vscode.debug.activeStackItem && 'source' in vscode.debug.activeStackItem) {
                console.log('DebugSessionTracker: Using vscode.debug.activeStackItem');
                const frame = vscode.debug.activeStackItem;
                trace = [{
                        name: frame.name,
                        source: { path: frame.source.path },
                        line: frame.line,
                        column: frame.column
                    }];
            }
            // 3. Fallback to DAP request (Least Reliable)
            else {
                console.log('DebugSessionTracker: Fallback to getStackTrace');
                trace = await this.getStackTrace();
            }
            if (!trace || trace.length === 0) {
                console.log('DebugSessionTracker: Trace is empty');
                return;
            }
            // Get the top frame (current function)
            const topFrame = trace[0];
            if (!topFrame.source || !topFrame.source.path)
                return;
            const sourcePath = topFrame.source.path;
            const functionName = topFrame.name;
            console.log(`DebugSessionTracker: Processing ${functionName} in ${path.basename(sourcePath)}`);
            // Check if external file
            if (!this.isInWorkspace(sourcePath)) {
                if (this.mode === 'playback') {
                    vscode.window.showWarningMessage(`You are in an external file (${path.basename(sourcePath)}). Step Out recommended.`);
                }
                // If recording, we might want to auto-continue out of it? 
                // For now, let's just continue if recording.
                if (this.mode === 'recording') {
                    await vscode.commands.executeCommand('workbench.action.debug.continue');
                }
                return;
            }
            // Avoid processing the same function repeatedly if we are just stepping within it
            if (this.lastFunction === functionName) {
                if (this.mode === 'recording') {
                    // We are still in the same function, continue
                    await vscode.commands.executeCommand('workbench.action.debug.continue');
                }
                return;
            }
            // Update call graph if we moved from one function to another
            if (this.lastFunction && this.lastFunction !== functionName) {
                if (this.mode === 'recording') {
                    this.callGraph.push({ caller: this.lastFunction, callee: functionName });
                }
            }
            this.lastFunction = functionName;
            // Get source code
            const sourceCode = await this.getSourceCode(topFrame);
            if (this.mode === 'recording') {
                // Record function
                if (!this.recordedFunctions.has(functionName)) {
                    this.recordedFunctions.set(functionName, sourceCode);
                    console.log(`Recorded function: ${functionName}`);
                }
                // Auto-continue
                // Wait a tiny bit to ensure the UI doesn't freeze completely
                setTimeout(() => {
                    vscode.commands.executeCommand('workbench.action.debug.continue');
                }, 50);
            }
            else {
                // Playback
                const explanation = this.knowledgeLibrary.getFunctionExplanation(functionName);
                if (explanation) {
                    if (vscode.debug.activeDebugConsole) {
                        vscode.debug.activeDebugConsole.appendLine(`\n[AI Knowledge] ${functionName}:\n${explanation}\n`);
                    }
                }
                else {
                    // Optional: Fallback to real-time explanation or just silence
                    console.log(`No explanation found for ${functionName}`);
                }
            }
        }
        catch (error) {
            console.error('Error handling step into:', error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async processRecordedSession() {
        if (this.recordedFunctions.size === 0) {
            console.log('DebugSessionTracker: No functions recorded');
            vscode.window.showWarningMessage('No functions were recorded. Did you step through the code? The extension learns from your debugging steps.');
            return 0;
        }
        vscode.window.showInformationMessage(`Processing ${this.recordedFunctions.size} recorded functions...`);
        // Generate Panorama
        const panorama = this.generateDynamicPanorama();
        await this.knowledgeLibrary.saveProjectOverview(panorama);
        // Explain functions
        for (const [name, code] of this.recordedFunctions) {
            try {
                const explanation = await this.aiService.explainFunction(code, name, panorama, 'Dynamic Trace Context' // We could enhance this with specific call paths
                );
                await this.knowledgeLibrary.saveFunctionExplanations([{ functionName: name, explanation }]);
            }
            catch (error) {
                console.error(`Failed to explain ${name}:`, error);
            }
        }
        return this.recordedFunctions.size;
    }
    generateDynamicPanorama() {
        let panorama = "# Dynamic Project Panorama\n\n";
        panorama += "## Execution Flow\n";
        if (this.callGraph.length === 0) {
            panorama += "No calls recorded.\n";
        }
        else {
            this.callGraph.forEach(call => {
                panorama += `- ${call.caller} called ${call.callee}\n`;
            });
        }
        panorama += "\n## Recorded Functions\n";
        this.recordedFunctions.forEach((_, name) => {
            panorama += `- ${name}\n`;
        });
        return panorama;
    }
    isInWorkspace(filePath) {
        try {
            // Helper to check a specific URI string
            const checkPath = (pathStr) => {
                let uri;
                if (pathStr.includes('://')) {
                    uri = vscode.Uri.parse(pathStr);
                }
                else {
                    uri = vscode.Uri.file(pathStr);
                }
                // FIX: Normalize vscode-remote to file scheme for workspace check
                // The debugger sends vscode-remote://authority/path but the extension host sees file:///path
                // We must strip the authority (machine name) to match the local workspace view
                if (uri.scheme === 'vscode-remote') {
                    // console.log(`DebugSessionTracker: Normalizing remote URI ${uri.toString()} to file scheme (stripping authority)`);
                    uri = uri.with({ scheme: 'file', authority: '' });
                }
                // 1. Try native API
                const folder = vscode.workspace.getWorkspaceFolder(uri);
                if (folder) {
                    // console.log(`DebugSessionTracker: Matched ${pathStr} to workspace ${folder.name}`);
                    return true;
                }
                // 2. Fallback: String comparison
                if (vscode.workspace.workspaceFolders) {
                    const normalizedPath = uri.toString().toLowerCase();
                    const normalizedUriPath = uri.path.toLowerCase(); // Just the path component
                    for (const wf of vscode.workspace.workspaceFolders) {
                        const normalizedWf = wf.uri.toString().toLowerCase();
                        if (normalizedPath.startsWith(normalizedWf)) {
                            console.log(`DebugSessionTracker: Matched via string fallback: ${pathStr}`);
                            return true;
                        }
                        // 3. Nuclear Fallback: Path-only comparison (ignoring scheme/authority entirely)
                        // This handles cases where one is file:///c:/... and other is file:///C:/... or similar
                        const normalizedWfPath = wf.uri.path.toLowerCase();
                        if (normalizedUriPath.startsWith(normalizedWfPath)) {
                            console.log(`DebugSessionTracker: Matched via path-only fallback: ${pathStr}`);
                            return true;
                        }
                    }
                }
                return false;
            };
            // Try 1: Original path
            if (checkPath(filePath))
                return true;
            // Try 2: Decoded path (handles %2B -> + issues in WSL)
            const decodedPath = decodeURIComponent(filePath);
            if (decodedPath !== filePath) {
                console.log(`DebugSessionTracker: Retrying with decoded path: ${decodedPath}`);
                if (checkPath(decodedPath))
                    return true;
            }
            // If we get here, it failed. Log EVERYTHING to diagnose.
            console.log(`DebugSessionTracker: FAILED to match ${filePath}`);
            if (vscode.workspace.workspaceFolders) {
                vscode.workspace.workspaceFolders.forEach((wf, index) => {
                    console.log(`  Workspace Folder [${index}]: Name=${wf.name}, URI=${wf.uri.toString()}`);
                });
            }
            else {
                console.log('  No workspace folders found.');
            }
            return false;
        }
        catch (e) {
            console.error(`DebugSessionTracker: Error checking workspace for ${filePath}`, e);
            return false;
        }
    }
    async getStackTrace() {
        // Prioritize VS Code API for reliability
        const item = vscode.debug.activeStackItem;
        if (item && 'source' in item) {
            console.log('DebugSessionTracker: Using vscode.debug.activeStackItem');
            // Cast to any to access properties safely since we checked 'source'
            const frame = item;
            return [{
                    name: frame.name,
                    source: { path: frame.source.path },
                    line: frame.line,
                    column: frame.column
                }];
        }
        // Always refresh active session to ensure we have the latest valid session
        if (vscode.debug.activeDebugSession) {
            this.activeSession = vscode.debug.activeDebugSession;
        }
        if (!this.activeSession) {
            return [];
        }
        try {
            // Fallback to DAP
            const threadsResponse = await this.activeSession.customRequest('threads');
            let threadId = 1;
            if (threadsResponse && threadsResponse.threads && threadsResponse.threads.length > 0) {
                threadId = threadsResponse.threads[0].id;
            }
            const response = await this.activeSession.customRequest('stackTrace', {
                threadId: threadId,
                startFrame: 0,
                levels: 1
            });
            return response?.stackFrames || [];
        }
        catch (e) {
            console.error('DebugSessionTracker: Error getting stack trace', e);
            return [];
        }
    }
    async getSourceCode(frame) {
        // Try reading from disk/workspace first if it's a local file
        if (frame.source && frame.source.path) {
            try {
                let uri;
                if (frame.source.path.includes('://')) {
                    uri = vscode.Uri.parse(frame.source.path);
                }
                else {
                    uri = vscode.Uri.file(frame.source.path);
                }
                const document = await vscode.workspace.openTextDocument(uri);
                const content = document.getText();
                // Extract the function body based on the line number
                // frame.line is 1-based
                return this.extractFunctionAtLine(content, frame.line - 1);
            }
            catch (e) {
                console.log('DebugSessionTracker: Failed to read local file, falling back to DAP', e);
            }
        }
        try {
            const response = await this.activeSession?.customRequest('source', {
                source: frame.source,
                startLine: Math.max(0, frame.line - 5),
                endLine: frame.line + 10
            });
            return response?.content || '';
        }
        catch (e) {
            return '';
        }
    }
    extractFunctionAtLine(content, lineIndex) {
        const lines = content.split('\n');
        if (lineIndex < 0 || lineIndex >= lines.length)
            return '';
        // Search backwards for the function declaration
        let startIndex = lineIndex;
        let found = false;
        // Limit search to 50 lines up
        for (let i = lineIndex; i >= Math.max(0, lineIndex - 50); i--) {
            const line = lines[i];
            if (/function\s+|=>|\)\s*\{|class\s+/.test(line)) {
                startIndex = i;
                found = true;
                // If we found a closing brace '}', we might have gone too far up into previous function?
                // But we are looking for declaration.
                // Let's assume the breakpoint is at the start of the function or inside it.
                // If it's inside, we look up for the declaration.
                // Refined check: look for line ending with { or containing =>
                if (line.includes('{') || line.includes('=>')) {
                    break;
                }
            }
        }
        // Now extract block from startIndex
        // Simple brace counting
        let braceCount = 0;
        let endIndex = startIndex;
        let startedCounting = false;
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    startedCounting = true;
                }
                else if (char === '}') {
                    braceCount--;
                }
            }
            endIndex = i;
            if (startedCounting && braceCount === 0) {
                break;
            }
        }
        // Return the lines
        return lines.slice(startIndex, endIndex + 1).join('\n');
    }
}
exports.DebugSessionTracker = DebugSessionTracker;
//# sourceMappingURL=debugSessionTracker.js.map