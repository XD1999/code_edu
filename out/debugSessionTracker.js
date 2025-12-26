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
const dependencyAnalyzer_1 = require("./dependencyAnalyzer");
// Helper function to escape special regex characters
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
class DebugSessionTracker {
    constructor(aiService, knowledgeLibrary, traceViewProvider, knowledgeMapProvider) {
        // Managed sessions map: sessionId -> DebugSession
        this.managedSessions = new Map();
        this.isRecording = false;
        this.currentTraceFunctions = [];
        this.functionSourceMap = new Map(); // Maps function names to source file paths
        this.debugEventDisposable = null;
        this.allEventsDisposable = null;
        this.terminateEventsDisposable = null;
        this.healthCheckInterval = null;
        // Diagnostic tracking for 100ms frequency issue
        this.captureInProgress = false; // Prevent overlapping calls
        this.captureAttempts = 0; // Total capture attempts
        this.captureSkippedOverlap = 0; // Skipped due to overlap
        this.captureWithEmptyStacks = 0; // Had threads but all empty stacks
        this.captureWithOnlyModule = 0; // Only <module> frames seen
        this.captureWithAppCode = 0; // Successfully found app code frames
        this.captureStartTime = 0; // When recording started
        // Thread caching for performance optimization
        // Map sessionId -> cached threads
        this.cachedThreads = new Map();
        this.lastThreadCacheTime = new Map();
        this.THREAD_CACHE_DURATION_MS = 2000; // Cache threads for 2 seconds
        this.previousThreadIds = new Map(); // Track previously seen thread IDs per session
        this.threadLastStacks = new Map(); // Track last stack state per thread (SessionID+ThreadID key)
        this.aiService = aiService;
        this.knowledgeLibrary = knowledgeLibrary;
        this.traceViewProvider = traceViewProvider;
        this.knowledgeMapProvider = knowledgeMapProvider;
    }
    addSession(session) {
        if (!this.managedSessions.has(session.id)) {
            console.log(`[DebugSessionTracker] Adding session: id=${session.id}, type=${session.type}, name=${session.name}`);
            this.managedSessions.set(session.id, session);
        }
    }
    removeSession(sessionId) {
        if (this.managedSessions.has(sessionId)) {
            console.log(`[DebugSessionTracker] Removing session: id=${sessionId}`);
            this.managedSessions.delete(sessionId);
            this.cachedThreads.delete(sessionId);
            this.lastThreadCacheTime.delete(sessionId);
            this.previousThreadIds.delete(sessionId);
        }
    }
    // For backward compatibility / legacy logic, though we now track all sessions.
    // We can expose the "first" or "primary" session if needed, but core logic iterates all.
    get sessionCount() {
        return this.managedSessions.size;
    }
    startRecording() {
        console.log('[DebugSessionTracker] Starting recording');
        if (this.isRecording) {
            console.log('[DebugSessionTracker] Already recording, returning');
            return;
        }
        this.isRecording = true;
        this.isRecording = true;
        this.currentTraceFunctions = [];
        this.functionSourceMap.clear(); // Clear the function source map when starting new recording
        // Reset diagnostic counters
        this.captureInProgress = false;
        this.captureAttempts = 0;
        this.captureSkippedOverlap = 0;
        this.captureWithEmptyStacks = 0;
        this.captureWithOnlyModule = 0;
        this.captureWithAppCode = 0;
        this.captureStartTime = Date.now();
        // Clear thread cache when starting recording
        this.cachedThreads.clear();
        this.lastThreadCacheTime.clear();
        this.previousThreadIds.clear();
        console.log('[DebugSessionTracker] Recording started. Cleared function trace array and source map.');
        console.log('[DebugSessionTracker] Recording state set to true, trace functions array cleared');
        console.log('[DIAGNOSTIC] Reset all capture statistics. Start time:', new Date(this.captureStartTime).toISOString());
        console.log('[THREAD CACHE] Cleared thread cache on start recording');
        console.log(`[DebugSessionTracker] Tracking ${this.managedSessions.size} initial sessions.`);
        this.debugEventDisposable = vscode.debug.onDidReceiveDebugSessionCustomEvent(async (e) => {
            console.log(`[DebugSessionTracker] Custom event received: session.id=${e.session.id}, event=${e.event}`);
            if (!this.isRecording) {
                console.log('[DebugSessionTracker] Not recording, ignoring event');
                return;
            }
            // We now accept events from any managed session
            if (!this.managedSessions.has(e.session.id)) {
                // If we get an event from a session we don't know yet, perform late-binding addition
                // This handles edge cases where session might start recording mid-flight
                console.log(`[DebugSessionTracker] Event from unknown session ${e.session.id}, adding to managed list.`);
                this.addSession(e.session);
            }
            // Log all events for debugging
            console.log(`[DebugSessionTracker] Processing event: ${e.event}`, e.body);
            // Capture stack functions for all events to ensure automatic recording of activated functions
            console.log(`[DebugSessionTracker] Capturing stack functions for event: ${e.event}`);
            try {
                await this.captureStackFunctions(e.session);
            }
            catch (error) {
                console.log(`[DebugSessionTracker] Error capturing stack functions for event: ${e.event}`, error);
            }
        });
        // Also listen for all debug session events to see what's happening
        this.allEventsDisposable = vscode.debug.onDidChangeActiveDebugSession((session) => {
            // We don't change 'activeSession' anymore, but we can log focus changes
            console.log(`[DebugSessionTracker] Active focus changed to session: ${session?.id}`);
        });
        this.terminateEventsDisposable = vscode.debug.onDidTerminateDebugSession((session) => {
            console.log(`[DebugSessionTracker] Debug session terminated: ${session.id}`);
            this.removeSession(session.id);
        });
        // Store these disposables so we can clean them up later
        console.log('[DebugSessionTracker] Registered additional event listeners for comprehensive debugging');
        // Add periodic stack capture to catch function activations during HTTP requests
        this.healthCheckInterval = setInterval(async () => {
            const tickTime = Date.now();
            const elapsedSec = ((tickTime - this.captureStartTime) / 1000).toFixed(2);
            // REASON 3: Check for overlapping calls
            if (this.captureInProgress) {
                this.captureSkippedOverlap++;
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] SKIPPED: Capture already in progress (overlap #${this.captureSkippedOverlap})`);
                return;
            }
            // REASON 4: Check if recording/session state is valid
            if (!this.isRecording) {
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] SKIPPED: isRecording=false`);
                return;
            }
            if (this.managedSessions.size === 0) {
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] SKIPPED: No managed sessions`);
                return;
            }
            this.captureAttempts++;
            console.log(`[DIAGNOSTIC] [${elapsedSec}s] === Capture attempt #${this.captureAttempts} START ===`);
            console.log(`[DebugSessionTracker] Periodic stack capture for ${this.managedSessions.size} sessions`);
            this.captureInProgress = true;
            const captureStart = Date.now();
            try {
                // Capture from ALL sessions in parallel
                const promises = Array.from(this.managedSessions.values()).map(session => this.captureStackFunctions(session));
                await Promise.all(promises);
                const captureDuration = Date.now() - captureStart;
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] Capture completed in ${captureDuration}ms`);
                // REASON 2: Warn if capture took longer than interval
                if (captureDuration > 2000) {
                    console.log(`[DIAGNOSTIC] ⚠️ WARNING: Capture took ${captureDuration}ms, exceeding 2000ms interval! Risk of overlap.`);
                }
            }
            catch (error) {
                console.log('[DebugSessionTracker] Error during periodic stack capture:', error);
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] CAPTURE ERROR:`, error);
            }
            finally {
                this.captureInProgress = false;
            }
            console.log(`[DIAGNOSTIC] [${elapsedSec}s] === Capture attempt #${this.captureAttempts} END ===`);
        }, 2000); // Capture every 2000ms (0.5Hz) to prevent overlap until latency is optimized
        console.log('[DebugSessionTracker] Registered periodic stack capture at 2000ms intervals (0.5Hz) to prevent overlap');
    }
    async stopRecording() {
        console.log('[DebugSessionTracker] Stopping recording');
        if (!this.isRecording) {
            console.log('[DebugSessionTracker] Not currently recording, returning 0');
            return 0;
        }
        this.isRecording = false;
        console.log('[DebugSessionTracker] Recording state set to false');
        console.log(`[DebugSessionTracker] Collected ${this.currentTraceFunctions.length} steps during recording`);
        // Clear thread cache when stopping recording
        this.cachedThreads.clear();
        this.lastThreadCacheTime.clear();
        this.threadLastStacks.clear();
        console.log('[THREAD CACHE] Cleared thread cache and stacks on stop recording');
        // Print diagnostic summary
        const totalDuration = ((Date.now() - this.captureStartTime) / 1000).toFixed(2);
        console.log('\n=== [DIAGNOSTIC SUMMARY] ===');
        console.log(`[DIAGNOSTIC] Total recording duration: ${totalDuration}s`);
        console.log(`[DIAGNOSTIC] Total capture attempts: ${this.captureAttempts}`);
        console.log(`[DIAGNOSTIC] Skipped (overlap): ${this.captureSkippedOverlap}`);
        console.log(`[DIAGNOSTIC] With empty stacks: ${this.captureWithEmptyStacks}`);
        console.log(`[DIAGNOSTIC] Only <module> frames: ${this.captureWithOnlyModule}`);
        console.log(`[DIAGNOSTIC] With app code: ${this.captureWithAppCode}`);
        console.log(`[DIAGNOSTIC] Final steps captured: ${this.currentTraceFunctions.length}`);
        if (this.captureAttempts > 0) {
            const successRate = ((this.captureWithAppCode / this.captureAttempts) * 100).toFixed(1);
            console.log(`[DIAGNOSTIC] Success rate (app code found): ${successRate}%`);
        }
        // Diagnose the most likely issue
        if (this.currentTraceFunctions.length === 0) {
            console.log('\n[DIAGNOSTIC] ⚠️ ROOT CAUSE ANALYSIS (No steps captured):');
            if (this.captureAttempts === 0) {
                console.log('[DIAGNOSTIC]   - REASON 4/5: No capture attempts made! Check isRecording/activeSession state.');
            }
            else if (this.captureSkippedOverlap > this.captureAttempts * 0.5) {
                console.log(`[DIAGNOSTIC]   - REASON 3: High overlap rate (${this.captureSkippedOverlap}/${this.captureAttempts}). Captures taking >100ms.`);
            }
            else if (this.captureWithEmptyStacks === this.captureAttempts) {
                console.log('[DIAGNOSTIC]   - REASON 2: All captures returned empty stacks. debugpy may be overloaded or rate-limiting.');
            }
            else if (this.captureWithOnlyModule === this.captureAttempts) {
                console.log('[DIAGNOSTIC]   - REASON 1: All captures only saw <module> frames. Recording during idle periods.');
            }
            else {
                console.log('[DIAGNOSTIC]   - REASON 1/4: Mix of issues. Likely timing misalignment + idle sampling.');
            }
        }
        console.log('=== [DIAGNOSTIC SUMMARY END] ===\n');
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
        const steps = this.currentTraceFunctions.slice();
        console.log(`[DebugSessionTracker] Copied ${steps.length} steps from current trace`);
        if (steps.length === 0) {
            console.log('[DebugSessionTracker] No steps to process, returning 0');
            return 0;
        }
        console.log('[DebugSessionTracker] Processing trace with steps:', steps.length);
        await this.processTrace(steps);
        console.log(`[DebugSessionTracker] Finished processing, returning count: ${steps.length}`);
        return steps.length;
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
            return;
        }
        const items = traces
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(t => ({
            label: `${new Date(t.createdAt).toLocaleString()} (${t.functions.length} steps)`,
            description: t.functions.join(' -> '),
            id: t.id
        }));
        const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Select a trace to review' });
        if (!picked)
            return;
        const trace = this.knowledgeLibrary.getTraceById(picked.id);
        console.log('[DebugSessionTracker] Retrieved trace from knowledge library:', trace);
        if (!trace) {
            vscode.window.showErrorMessage('Selected trace not found.');
            console.log('[DebugSessionTracker] Selected trace not found in knowledge library');
            return;
        }
        // Show the trace in the sidebar view
        // Create a Map for explanations
        const explanationsMap = new Map(Object.entries(trace.explanations || {}));
        // Update the existing view provider
        this.traceViewProvider.updateTrace(trace, explanationsMap);
        // Focus the view
        vscode.commands.executeCommand('ai-debug-explainer.traceView.focus');
        console.log('AI Debug Explainer: Opened Trace View in Sidebar');
    }
    async captureStackFunctions(session) {
        const captureStartTime = Date.now();
        console.log('=== [STACK CAPTURE] ATTEMPT START ===');
        try {
            // OPTIMIZATION: Cache thread enumeration
            let threads = [];
            const currentTime = Date.now();
            const sessionLastCacheTime = this.lastThreadCacheTime.get(session.id) || 0;
            const sessionThreads = this.cachedThreads.get(session.id);
            const cacheAge = sessionLastCacheTime > 0 ? (currentTime - sessionLastCacheTime) : Number.MAX_SAFE_INTEGER;
            if (sessionThreads && sessionLastCacheTime > 0 && cacheAge < this.THREAD_CACHE_DURATION_MS) {
                threads = sessionThreads;
            }
            else {
                const threadsResp = await session.customRequest('threads');
                if (!threadsResp || !Array.isArray(threadsResp.threads))
                    return;
                threads = threadsResp.threads;
                this.cachedThreads.set(session.id, threads);
                this.lastThreadCacheTime.set(session.id, currentTime);
            }
            // Detect new threads
            // (Keeping this logic minimal)
            // Process threads to find the current active execution point
            const threadPromises = threads.map(async (th) => {
                try {
                    const stackResp = await session.customRequest('stackTrace', {
                        threadId: th.id,
                        startFrame: 0,
                        levels: 20 // Optimized levels
                    });
                    if (!stackResp || !Array.isArray(stackResp.stackFrames) || stackResp.stackFrames.length === 0) {
                        return null;
                    }
                    const frames = stackResp.stackFrames;
                    const usefulFrames = [];
                    // Collect all application code frames
                    // Iterate from top (index 0) to bottom, but we want to store them Caller->Callee?
                    // Actually, stack frames are usually Callee (0) -> Caller (N).
                    // We want to process them Caller -> Callee for the trace history?
                    // No, usually we just want to know "What is the new state".
                    // Let's capture the stack as [Caller, ..., Callee] (Bottom-Up) for easy comparison with history.
                    for (let i = frames.length - 1; i >= 0; i--) {
                        const frame = frames[i];
                        const name = frame.name;
                        const src = (frame.source && (frame.source.path || frame.source.name)) || '';
                        const line = frame.line || 0;
                        // Handle both local and remote paths (WSL, SSH, etc.)
                        const isAppCode = (src.includes('/website/') || src.includes('website/') || src.includes('code_edu/website/') || src.includes('.py')) &&
                            !src.includes('/site-packages/') &&
                            !src.includes('/node_modules/') &&
                            !src.includes('<frozen ');
                        if (isAppCode && name !== '<module>') {
                            usefulFrames.push({
                                functionName: name,
                                filePath: src,
                                line: line,
                                timestamp: Date.now()
                            });
                        }
                    }
                    return {
                        threadId: th.id,
                        stack: usefulFrames // This is [Bottom/Caller, ..., Top/Callee]
                    };
                }
                catch (e) {
                    return null;
                }
            });
            const results = await Promise.all(threadPromises);
            // Collect valid steps using diff logic
            let appCodeFound = false;
            for (const res of results) {
                if (!res || !res.stack || res.stack.length === 0)
                    continue;
                appCodeFound = true;
                const uniqueThreadId = `${session.id}-${res.threadId}`;
                const lastStack = this.threadLastStacks.get(uniqueThreadId) || [];
                const currentStack = res.stack;
                // Compare current stack with last stack to find *new* progress
                // Strategy: Find the first point of divergence from the *root* (bottom).
                // Or simply: Add any frame that is "new execution" (different line or function) compared to the same depth in previous stack?
                // Actually, if stack depth changes, it's significant.
                // A better heuristic for "Trace Log":
                // If I am at [A, B].
                // Next is [A, B, C]. -> Add C.
                // Next is [A, B, D]. -> Add D.
                // Next is [A]. -> Nothing (B returned).
                // Next is [A']. (A moved to new line). -> Add A'.
                // We iterate from the bottom (index 0).
                let divergenceFound = false;
                for (let i = 0; i < currentStack.length; i++) {
                    const currentFrame = currentStack[i];
                    const lastFrame = lastStack[i]; // May be undefined
                    if (divergenceFound) {
                        // Once we diverged (or extended), everything subsequent is a new action/step
                        this.currentTraceFunctions.push(currentFrame);
                        console.log(`[TRACE STEP] Added (Divergence): ${currentFrame.functionName} at ${currentFrame.line}`);
                        this.functionSourceMap.set(currentFrame.functionName, currentFrame.filePath);
                    }
                    else {
                        // Check match
                        if (!lastFrame) {
                            // Stack grew deeper
                            divergenceFound = true;
                            this.currentTraceFunctions.push(currentFrame);
                            console.log(`[TRACE STEP] Added (Growth): ${currentFrame.functionName} at ${currentFrame.line}`);
                            this.functionSourceMap.set(currentFrame.functionName, currentFrame.filePath);
                        }
                        else {
                            const isSame = currentFrame.functionName === lastFrame.functionName &&
                                currentFrame.filePath === lastFrame.filePath &&
                                currentFrame.line === lastFrame.line;
                            if (!isSame) {
                                // Frame changed (e.g. moved line, or different function call at same depth)
                                divergenceFound = true;
                                this.currentTraceFunctions.push(currentFrame);
                                console.log(`[TRACE STEP] Added (Change): ${currentFrame.functionName} at ${currentFrame.line}`);
                                this.functionSourceMap.set(currentFrame.functionName, currentFrame.filePath);
                            }
                        }
                    }
                }
                // Update cache
                this.threadLastStacks.set(uniqueThreadId, currentStack);
            }
            // Diagnostic updates
            if (appCodeFound)
                this.captureWithAppCode++;
            else
                this.captureWithOnlyModule++;
        }
        catch (error) {
            console.log('[CAPTURE ERROR] Failed to capture stack functions:', error);
        }
        console.log('=== [STACK CAPTURE] ATTEMPT COMPLETE ===');
    }
    async processTrace(steps) {
        console.log('[DebugSessionTracker] processTrace called with steps:', steps.length);
        // Try to match with saved trace first
        const matched = this.knowledgeLibrary.findMatchingTrace(steps);
        console.log('[DebugSessionTracker] Matched existing trace:', matched);
        if (matched) {
            vscode.window.showInformationMessage('Matched a previously saved trace. Using local explanations.');
            return;
        }
        // Build project panorama (overview) using Dependency Analyzer
        let overview = this.knowledgeLibrary.getProjectOverview();
        if (!overview) {
            console.log('[DebugSessionTracker] Generating new project overview via DependencyAnalyzer');
            const analyzer = new dependencyAnalyzer_1.DependencyAnalyzer();
            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                await analyzer.analyze(vscode.workspace.workspaceFolders[0].uri);
                overview = analyzer.getOverviewText();
                // Also save the architecture graph for visual use
                const archGraph = analyzer.getMermaidGraph();
                // We need a place to store this. We can put it in knowledge library or just pass it to view.
                // Let's store it as a special "Architecture" node in the knowledge map essentially?
                // Or we can just save it to global state via a new method.
                // Since we don't have a dedicated method yet, let's just log it for now and maybe append to overview text for context?
                // Actually the prompt benefits from text. The View benefits from Graph.
                // Let's save the graph to KnowledgeLibrary. I'll need to add a method there.
                await this.knowledgeLibrary.saveArchitectureGraph(archGraph);
                // Push to UI
                this.knowledgeMapProvider.updateArchitecture(archGraph);
                await this.knowledgeLibrary.saveProjectOverview(overview);
            }
        }
        const explanations = {};
        const uniqueFunctions = [...new Set(steps.map(s => s.functionName))];
        console.log(`[DebugSessionTracker] Generating explanations for ${uniqueFunctions.length} unique functions`);
        for (const fn of uniqueFunctions) {
            console.log(`[DebugSessionTracker] Finding code for function: ${fn}`);
            const code = await this.findFunctionCode(fn);
            try {
                const exp = await this.aiService.explainFunction(code || '', fn, overview, '');
                explanations[fn] = exp;
            }
            catch (err) {
                console.error(`Failed to explain function ${fn}:`, err);
                explanations[fn] = '(Failed to retrieve AI explanation)';
            }
        }
        // Persist trace and explanations
        console.log('[DebugSessionTracker] Adding trace to knowledge library');
        const traceId = this.knowledgeLibrary.addTrace(steps, explanations);
        await this.knowledgeLibrary.saveFunctionExplanations(Object.entries(explanations).map(([functionName, explanation]) => ({ functionName, explanation })));
        vscode.window.showInformationMessage(`Trace saved (${traceId}). Explanations generated.`);
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
        console.log(`[FUNCTION CODE SEARCH] Looking for function: ${functionName}`);
        console.log(`[FUNCTION CODE SEARCH] Function source map size: ${this.functionSourceMap.size}`);
        console.log(`[FUNCTION CODE SEARCH] Function source map keys:`, Array.from(this.functionSourceMap.keys()));
        // First, try to find the function in the source file where it was detected
        const sourceFilePath = this.functionSourceMap.get(functionName);
        console.log(`[FUNCTION CODE SEARCH] Source file path from map for ${functionName}: ${sourceFilePath}`);
        if (sourceFilePath) {
            console.log(`[FUNCTION CODE SEARCH] Function ${functionName} was detected in ${sourceFilePath}. Trying this file first.`);
            try {
                // Convert file path to URI
                // If it looks like a URI, parse it. Otherwise, assume it's a file path.
                const fileUri = sourceFilePath.includes('://') ? vscode.Uri.parse(sourceFilePath) : vscode.Uri.file(sourceFilePath);
                console.log(`[FUNCTION CODE SEARCH] Opening document: ${fileUri.toString()}`);
                const doc = await vscode.workspace.openTextDocument(fileUri);
                const lines = doc.getText().split(/\r?\n/);
                console.log(`[FUNCTION CODE SEARCH] Document has ${lines.length} lines`);
                // Search for the function in this specific file
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Look for proper function definitions based on language
                    const fileName = sourceFilePath.toLowerCase();
                    let isFunctionDefinition = false;
                    if (fileName.endsWith('.py')) {
                        // Python function and method definitions
                        // Matches both regular functions: def function_name(
                        // And class methods: def method_name(self,  or  def method_name(cls,
                        isFunctionDefinition = new RegExp(`^\\s*def\\s+${escapeRegExp(functionName)}\\s*(\\(|\\w*[,)])`).test(line);
                        console.log(`[FUNCTION CODE SEARCH] Python regex test for line ${i + 1}: ${isFunctionDefinition}, line: ${line.trim()}`);
                    }
                    else if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
                        // JavaScript/TypeScript function definitions
                        isFunctionDefinition = new RegExp(`^\\s*(function\\s+${escapeRegExp(functionName)}\\s*\\(|const\\s+${escapeRegExp(functionName)}\\s*=|${escapeRegExp(functionName)}\\s*\\()`).test(line);
                    }
                    else if (fileName.endsWith('.java') || fileName.endsWith('.cs')) {
                        // Java/C# method definitions
                        isFunctionDefinition = new RegExp(`\\s+${escapeRegExp(functionName)}\\s*\\(`).test(line) && !line.includes('\\s*=\\s*') && line.includes('(');
                    }
                    else {
                        // Fallback to simple inclusion check for other languages
                        isFunctionDefinition = line.includes(functionName);
                    }
                    if (isFunctionDefinition) {
                        console.log(`[FUNCTION CODE FOUND] Function ${functionName} found in source file ${sourceFilePath} at line ${i + 1}`);
                        console.log(`[FUNCTION CODE SNIPPET] Line content: ${line.trim()}`);
                        // Grab a larger snippet around the function definition
                        const start = Math.max(0, i);
                        const end = Math.min(lines.length, i + 50); // Increased snippet size
                        const codeSnippet = lines.slice(start, end).join('\n');
                        console.log(`[FUNCTION CODE RETURN] Returning ${end - start} lines of code`);
                        return codeSnippet;
                    }
                }
                console.log(`[FUNCTION CODE SEARCH] Function ${functionName} not found in source file ${sourceFilePath}`);
            }
            catch (error) {
                console.log(`[FUNCTION CODE ERROR] Error reading source file ${sourceFilePath}:`, error);
            }
        }
        // If not found in source file or no source file info, fall back to searching all files
        // But exclude virtual environments and node_modules
        console.log(`[FUNCTION CODE SEARCH] Falling back to searching all files (excluding virtual environments and node_modules)`);
        const pythonFiles = await vscode.workspace.findFiles('**/*.py', '**/{node_modules,venv,__pycache__}/**', 100);
        const jsFiles = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx}', '**/node_modules/**', 50);
        const javaFiles = await vscode.workspace.findFiles('**/*.{java,cs,cpp,c,h,hpp}', '**/node_modules/**', 50);
        const files = [...pythonFiles, ...jsFiles, ...javaFiles];
        console.log(`[FUNCTION CODE SEARCH] Searching in ${files.length} files`);
        for (const file of files.slice(0, 200)) {
            // Skip the source file if we already tried it
            if (sourceFilePath && file.fsPath === sourceFilePath) {
                continue;
            }
            try {
                const doc = await vscode.workspace.openTextDocument(file);
                const lines = doc.getText().split(/\r?\n/);
                // Log file being searched
                console.log(`[FUNCTION CODE SEARCH] Checking file: ${file.path}`);
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Look for proper function definitions based on language
                    const fileName = file.path.toLowerCase();
                    let isFunctionDefinition = false;
                    if (fileName.endsWith('.py')) {
                        // Python function and method definitions
                        // Matches both regular functions: def function_name(
                        // And class methods: def method_name(self,  or  def method_name(cls,
                        isFunctionDefinition = new RegExp(`^\\s*def\\s+${escapeRegExp(functionName)}\\s*(\\(|\\w*[,)])`).test(line);
                    }
                    else if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
                        // JavaScript/TypeScript function definitions
                        isFunctionDefinition = new RegExp(`^\\s*(function\\s+${escapeRegExp(functionName)}\\s*\\(|const\\s+${escapeRegExp(functionName)}\\s*=|${escapeRegExp(functionName)}\\s*\\()`).test(line);
                    }
                    else if (fileName.endsWith('.java') || fileName.endsWith('.cs')) {
                        // Java/C# method definitions
                        isFunctionDefinition = new RegExp(`\\s+${escapeRegExp(functionName)}\\s*\\(`).test(line) && !line.includes('\\s*=\\s*') && line.includes('(');
                    }
                    else {
                        // Fallback to simple inclusion check for other languages
                        isFunctionDefinition = line.includes(functionName);
                    }
                    if (isFunctionDefinition) {
                        console.log(`[FUNCTION CODE FOUND] Function ${functionName} found in ${file.path} at line ${i + 1}`);
                        console.log(`[FUNCTION CODE SNIPPET] Line content: ${line.trim()}`);
                        // Grab a larger snippet around the function definition
                        const start = Math.max(0, i);
                        const end = Math.min(lines.length, i + 50); // Increased snippet size
                        const codeSnippet = lines.slice(start, end).join('\n');
                        console.log(`[FUNCTION CODE RETURN] Returning ${end - start} lines of code`);
                        return codeSnippet;
                    }
                }
            }
            catch (error) {
                console.log(`[FUNCTION CODE ERROR] Error reading file ${file.path}:`, error);
            }
        }
        console.log(`[FUNCTION CODE NOT FOUND] Function ${functionName} not found in any files`);
        return null;
    }
}
exports.DebugSessionTracker = DebugSessionTracker;
//# sourceMappingURL=debugSessionTracker.js.map