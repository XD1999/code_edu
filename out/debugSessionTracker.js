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
        this.isRecording = false;
        this.currentTraceFunctions = [];
        this.debugEventDisposable = null;
        this.allEventsDisposable = null;
        this.terminateEventsDisposable = null;
        this.healthCheckInterval = null;
        this.aiService = aiService;
        this.knowledgeLibrary = knowledgeLibrary;
    }
    setActiveSession(session) {
        console.log(`[DebugSessionTracker] Setting active session: id=${session.id}, type=${session.type}, name=${session.name}`);
        this.activeSession = session;
        console.log(`[DebugSessionTracker] Active session set`);
    }
    clearActiveSession() {
        console.log(`[DebugSessionTracker] Clearing active session: id=${this.activeSession?.id}`);
        this.activeSession = null;
        console.log(`[DebugSessionTracker] Active session cleared`);
    }
    startRecording() {
        console.log('[DebugSessionTracker] Starting recording');
        if (this.isRecording) {
            console.log('[DebugSessionTracker] Already recording, returning');
            return;
        }
        this.isRecording = true;
        this.currentTraceFunctions = [];
        console.log('[DebugSessionTracker] Recording state set to true, trace functions array cleared');
        // Log the active session info when starting recording
        if (this.activeSession) {
            console.log(`[DebugSessionTracker] Active session at start: id=${this.activeSession.id}, type=${this.activeSession.type}, name=${this.activeSession.name}`);
        }
        else {
            console.log('[DebugSessionTracker] No active session at start');
        }
        this.debugEventDisposable = vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e) => {
            console.log(`[DebugSessionTracker] Custom event received: session.id=${e.session.id}, event=${e.event}`);
            // Log comprehensive event details for Python debugging analysis
            console.log(`[DebugSessionTracker] Detailed event information:`, {
                sessionId: e.session.id,
                sessionType: e.session.type,
                sessionName: e.session.name,
                eventType: e.event,
                eventBody: e.body,
                eventBodyType: typeof e.body,
                hasOutput: !!(e.body && e.body.output),
                hasThreads: !!(e.body && e.body.threads),
                hasFrames: !!(e.body && e.body.frames)
            });
            if (!this.isRecording) {
                console.log('[DebugSessionTracker] Not recording, ignoring event');
                return;
            }
            if (!this.activeSession || e.session.id !== this.activeSession.id) {
                console.log(`[DebugSessionTracker] Event not from active session. Active: ${this.activeSession?.id}, Event: ${e.session.id}, ignoring`);
                return;
            }
            // Log all events for debugging
            console.log(`[DebugSessionTracker] Processing event: ${e.event}`, e.body);
            // Log all events for debugging purposes
            console.log(`[DebugSessionTracker] Event received: ${e.event}`, e.body);
            // Capture stack functions for all events to ensure automatic recording of activated functions
            // This provides comprehensive trace of all function activations during code execution
            console.log(`[DebugSessionTracker] Capturing stack functions for event: ${e.event}`);
            await this.captureStackFunctions(e.session);
        });
        // Also listen for all debug session events to see what's happening
        this.allEventsDisposable = vscode.debug.onDidChangeActiveDebugSession((session) => {
            console.log(`[DebugSessionTracker] Active debug session changed: ${session?.id}`);
        });
        this.terminateEventsDisposable = vscode.debug.onDidTerminateDebugSession((session) => {
            console.log(`[DebugSessionTracker] Debug session terminated: ${session.id}`);
        });
        // Store these disposables so we can clean them up later
        console.log('[DebugSessionTracker] Registered additional event listeners for comprehensive debugging');
        // Add periodic stack capture to catch function activations during HTTP requests
        this.healthCheckInterval = setInterval(async () => {
            if (this.isRecording && this.activeSession) {
                console.log('[DebugSessionTracker] Periodic stack capture for HTTP request detection');
                await this.captureStackFunctions(this.activeSession);
            }
        }, 2000); // Capture every 2 seconds for better responsiveness
        console.log('[DebugSessionTracker] Registered periodic stack capture for HTTP request detection');
    }
    async stopRecording() {
        console.log('[DebugSessionTracker] Stopping recording');
        if (!this.isRecording) {
            console.log('[DebugSessionTracker] Not currently recording, returning 0');
            return 0;
        }
        this.isRecording = false;
        console.log('[DebugSessionTracker] Recording state set to false');
        // Clear the health check interval
        if (this.healthCheckInterval) {
            console.log('[DebugSessionTracker] Clearing health check interval');
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        if (this.debugEventDisposable) {
            console.log('[DebugSessionTracker] Disposing debug event listener');
            this.debugEventDisposable.dispose();
            this.debugEventDisposable = null;
        }
        const functions = this.currentTraceFunctions.slice();
        console.log(`[DebugSessionTracker] Copied ${functions.length} functions from current trace`);
        if (functions.length === 0) {
            console.log('[DebugSessionTracker] No functions to process, returning 0');
            return 0;
        }
        console.log('[DebugSessionTracker] Processing trace with functions:', functions);
        await this.processTrace(functions);
        console.log(`[DebugSessionTracker] Finished processing, returning count: ${functions.length}`);
        return functions.length;
    }
    dispose() {
        if (this.debugEventDisposable) {
            this.debugEventDisposable.dispose();
            this.debugEventDisposable = null;
        }
        if (this.allEventsDisposable) {
            this.allEventsDisposable.dispose();
            this.allEventsDisposable = null;
        }
        if (this.terminateEventsDisposable) {
            this.terminateEventsDisposable.dispose();
            this.terminateEventsDisposable = null;
        }
        // Clear the health check interval
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    async openTraceViewer() {
        console.log('[DebugSessionTracker] Opening trace viewer');
        const traces = this.knowledgeLibrary.listTraces();
        console.log(`[DebugSessionTracker] Found ${traces.length} traces in knowledge library`);
        if (traces.length === 0) {
            vscode.window.showInformationMessage('No saved traces found.');
            console.log('[DebugSessionTracker] No traces found, showing message');
            return;
        }
        const items = traces
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(t => ({
            label: `${new Date(t.createdAt).toLocaleString()} (${t.functions.length} functions)`,
            description: t.functions.join(' -> '),
            id: t.id
        }));
        console.log('[DebugSessionTracker] Showing quick pick with trace items:', items);
        const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a trace to review' });
        console.log('[DebugSessionTracker] User picked trace:', picked);
        if (!picked) {
            console.log('[DebugSessionTracker] No trace selected, returning');
            return;
        }
        const trace = this.knowledgeLibrary.getTraceById(picked.id);
        console.log('[DebugSessionTracker] Retrieved trace from knowledge library:', trace);
        if (!trace) {
            vscode.window.showErrorMessage('Selected trace not found.');
            console.log('[DebugSessionTracker] Selected trace not found in knowledge library');
            return;
        }
        for (const fn of trace.functions) {
            const explanation = trace.explanations[fn] || this.knowledgeLibrary.getFunctionExplanation(fn) || '(No explanation available)';
            console.log(`[DebugSessionTracker] Showing function: ${fn}`);
            const choice = await vscode.window.showInformationMessage(`${fn}`, 'View Explanation', 'Next', 'Stop');
            console.log(`[DebugSessionTracker] User choice for function ${fn}:`, choice);
            if (choice === 'View Explanation') {
                await vscode.window.showInformationMessage(explanation, 'Next');
            }
            if (choice === 'Stop') {
                console.log('[DebugSessionTracker] User stopped trace viewing');
                break;
            }
        }
        console.log('[DebugSessionTracker] Finished trace viewing');
    }
    async captureStackFunctions(session) {
        console.log('=== [STACK CAPTURE] ATTEMPT START ===');
        console.log('[CAPTURE] Session ID:', session.id);
        console.log('[CAPTURE] Timestamp:', new Date().toISOString());
        try {
            console.log('[THREADS] Requesting threads...');
            const threadsResp = await session.customRequest('threads');
            console.log('[THREADS] Response received:', threadsResp);
            if (!threadsResp || !Array.isArray(threadsResp.threads)) {
                console.log('[THREADS] Invalid threads response');
                console.log('=== [STACK CAPTURE] ATTEMPT COMPLETE ===');
                return;
            }
            const threads = threadsResp.threads;
            console.log('[THREADS] Found threads:', threads.length);
            threads.forEach((thread, index) => {
                console.log(`[THREAD ${index}] ID: ${thread.id}, Name: "${thread.name}"`);
            });
            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            const workspacePaths = workspaceFolders.map(f => f.uri.fsPath);
            console.log('[WORKSPACE] Paths:', workspacePaths);
            // Process all threads to capture all function activations
            // This provides a more comprehensive trace of all code execution
            const threadsToProcess = threads;
            console.log(`[THREAD FILTER] Processing all ${threadsToProcess.length} threads`);
            for (const th of threadsToProcess) {
                console.log(`[STACK TRACE] Processing thread ${th.id} "${th.name}"`);
                try {
                    const stackResp = await session.customRequest('stackTrace', {
                        threadId: th.id,
                        startFrame: 0,
                        levels: 20
                    });
                    console.log(`[STACK TRACE] Response for thread ${th.id}:`, stackResp);
                    if (!stackResp || !Array.isArray(stackResp.stackFrames)) {
                        console.log(`[STACK TRACE] Invalid stack trace response for thread ${th.id}`);
                        continue;
                    }
                    const frames = stackResp.stackFrames;
                    console.log(`[STACK TRACE] Found frames in thread ${th.id}:`, frames.length);
                    for (const frame of frames) {
                        console.log(`[FRAME] Name: "${frame.name}", Source: "${frame.source?.path || frame.source?.name || 'unknown'}"`);
                        // Filter and add to trace
                        const name = frame.name;
                        const src = (frame.source && (frame.source.path || frame.source.name)) || '';
                        // Check if it's application code and filter out less useful functions
                        // Handle both local and remote paths (WSL, SSH, etc.)
                        const isAppCode = (src.includes('/website/') || src.includes('website/') || src.includes('code_edu/website/')) &&
                            !src.includes('/site-packages/') &&
                            !src.includes('/node_modules/') &&
                            !src.includes('<frozen ') &&
                            name !== '<module>'; // Filter out top-level module which is not very useful
                        console.log(`[FRAME FILTER] Name: "${name}", IsAppCode: ${isAppCode}, Source: "${src}"`);
                        if (isAppCode) {
                            const last = this.currentTraceFunctions[this.currentTraceFunctions.length - 1];
                            const shouldAdd = last !== name;
                            console.log(`[FUNCTION ADD] Last: "${last}", Current: "${name}", ShouldAdd: ${shouldAdd}`);
                            if (shouldAdd) {
                                this.currentTraceFunctions.push(name);
                                console.log(`[FUNCTION ADDED] "${name}". Total functions: ${this.currentTraceFunctions.length}`);
                            }
                        }
                    }
                }
                catch (frameError) {
                    console.log(`[STACK TRACE ERROR] Failed to get stack trace for thread ${th.id}:`, frameError);
                }
            }
            console.log('[CAPTURE RESULT] Final trace functions:', this.currentTraceFunctions);
        }
        catch (error) {
            console.log('[CAPTURE ERROR] Failed to capture stack functions:', error);
        }
        console.log('=== [STACK CAPTURE] ATTEMPT COMPLETE ===');
    }
    async processTrace(functions) {
        console.log('[DebugSessionTracker] processTrace called with functions:', functions);
        // Try to match with saved trace first
        const matched = this.knowledgeLibrary.findMatchingTrace(functions);
        console.log('[DebugSessionTracker] Matched existing trace:', matched);
        if (matched) {
            vscode.window.showInformationMessage('Matched a previously saved trace. Using local explanations.');
            return;
        }
        // Build project panorama (overview)
        let overview = this.knowledgeLibrary.getProjectOverview();
        console.log('[DebugSessionTracker] Existing project overview:', overview);
        if (!overview) {
            console.log('[DebugSessionTracker] Generating new project overview');
            const fileStructure = await this.collectWorkspaceStructure();
            const dependencies = await this.collectDependencies();
            try {
                overview = await this.aiService.generateProjectOverview(fileStructure, dependencies);
                console.log('[DebugSessionTracker] Generated project overview:', overview);
                await this.knowledgeLibrary.saveProjectOverview(overview);
                console.log('[DebugSessionTracker] Saved project overview to knowledge library');
            }
            catch (err) {
                console.error('Failed to generate project overview:', err);
                overview = '';
            }
        }
        const explanations = {};
        console.log(`[DebugSessionTracker] Generating explanations for ${functions.length} functions`);
        for (const fn of functions) {
            console.log(`[DebugSessionTracker] Finding code for function: ${fn}`);
            const code = await this.findFunctionCode(fn);
            console.log(`[DebugSessionTracker] Found code for function ${fn}: ${!!code}`);
            try {
                console.log(`[DebugSessionTracker] Calling AI to explain function: ${fn}`);
                const exp = await this.aiService.explainFunction(code || '', fn, overview, '');
                explanations[fn] = exp;
                console.log(`[DebugSessionTracker] AI explanation for ${fn}:`, exp.substring(0, 100) + '...');
            }
            catch (err) {
                console.error(`Failed to explain function ${fn}:`, err);
                explanations[fn] = '(Failed to retrieve AI explanation)';
            }
        }
        // Persist trace and explanations
        console.log('[DebugSessionTracker] Adding trace to knowledge library');
        const traceId = this.knowledgeLibrary.addTrace(functions, explanations);
        console.log(`[DebugSessionTracker] Trace added with ID: ${traceId}`);
        console.log('[DebugSessionTracker] Saving function explanations to knowledge library');
        await this.knowledgeLibrary.saveFunctionExplanations(Object.entries(explanations).map(([functionName, explanation]) => ({ functionName, explanation })));
        console.log('[DebugSessionTracker] Function explanations saved');
        vscode.window.showInformationMessage(`Trace saved (${traceId}). Explanations generated for ${functions.length} functions.`);
        console.log(`[DebugSessionTracker] Process trace completed. Trace ID: ${traceId}, Functions: ${functions.length}`);
    }
    async collectWorkspaceStructure() {
        const folders = vscode.workspace.workspaceFolders;
        const result = {};
        if (!folders || folders.length === 0) {
            return result;
        }
        for (const folder of folders) {
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'), '**/node_modules/**', 200);
            result[folder.name] = files.map(f => vscode.workspace.asRelativePath(f));
        }
        return result;
    }
    async collectDependencies() {
        const deps = {};
        const packageFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 2);
        if (packageFiles.length > 0) {
            try {
                const doc = await vscode.workspace.openTextDocument(packageFiles[0]);
                const json = JSON.parse(doc.getText());
                deps.node = { dependencies: json.dependencies || {}, devDependencies: json.devDependencies || {} };
            }
            catch { }
        }
        const reqFiles = await vscode.workspace.findFiles('**/requirements.txt', '**/node_modules/**', 2);
        if (reqFiles.length > 0) {
            try {
                const doc = await vscode.workspace.openTextDocument(reqFiles[0]);
                deps.python = doc.getText().split(/\r?\n/).filter(Boolean);
            }
            catch { }
        }
        return deps;
    }
    extractFunctionName(doc, pos) {
        const lang = doc.languageId;
        const maxLookBack = Math.max(0, pos.line - 50);
        for (let line = pos.line; line >= maxLookBack; line--) {
            const text = doc.lineAt(line).text;
            // Common patterns
            // JS/TS
            let m = text.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
            if (m)
                return m[1];
            m = text.match(/const\s+([A-Za-z0-9_]+)\s*=\s*\([^)]*\)\s*=>/);
            if (m)
                return m[1];
            m = text.match(/([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/); // methods
            if (m)
                return m[1];
            // Python
            m = text.match(/def\s+([A-Za-z0-9_]+)\s*\(/);
            if (m)
                return m[1];
            // Java/C#/C++
            m = text.match(/(?:public|private|protected|static|virtual|inline|\s)*[A-Za-z0-9_<>\[\]]+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);
            if (m)
                return m[1];
        }
        return null;
    }
    async findFunctionCode(functionName) {
        const patterns = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx', '**/*.py', '**/*.java', '**/*.cs', '**/*.cpp', '**/*.c', '**/*.h', '**/*.hpp'];
        const files = [];
        for (const p of patterns) {
            const found = await vscode.workspace.findFiles(p, '**/node_modules/**', 100);
            files.push(...found);
        }
        for (const file of files.slice(0, 200)) {
            try {
                const doc = await vscode.workspace.openTextDocument(file);
                const lines = doc.getText().split(/\r?\n/);
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.includes(functionName)) {
                        // Grab a snippet around the line
                        const start = Math.max(0, i - 2);
                        const end = Math.min(lines.length, i + 40);
                        return lines.slice(start, end).join('\n');
                    }
                }
            }
            catch { }
        }
        return null;
    }
}
exports.DebugSessionTracker = DebugSessionTracker;
//# sourceMappingURL=debugSessionTracker.js.map