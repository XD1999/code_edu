import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AIService } from './aiService';
import { KnowledgeLibrary } from './knowledgeLibrary';

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface TraceSummary {
    id: string;
    functions: string[];
    createdAt: number;
}

export class DebugSessionTracker {
    private aiService: AIService;
    private knowledgeLibrary: KnowledgeLibrary;
    private activeSession: vscode.DebugSession | null = null;
    private isRecording: boolean = false;
    private currentTraceFunctions: string[] = [];
    private functionSourceMap: Map<string, string> = new Map(); // Maps function names to source file paths
    private debugEventDisposable: vscode.Disposable | null = null;
    private allEventsDisposable: vscode.Disposable | null = null;
    private terminateEventsDisposable: vscode.Disposable | null = null;
    private healthCheckInterval: NodeJS.Timeout | null = null;

    // Diagnostic tracking for 100ms frequency issue
    private captureInProgress: boolean = false; // Prevent overlapping calls
    private captureAttempts: number = 0; // Total capture attempts
    private captureSkippedOverlap: number = 0; // Skipped due to overlap
    private captureWithEmptyStacks: number = 0; // Had threads but all empty stacks
    private captureWithOnlyModule: number = 0; // Only <module> frames seen
    private captureWithAppCode: number = 0; // Successfully found app code frames
    private captureStartTime: number = 0; // When recording started

    // Thread caching for performance optimization
    private cachedThreads: any[] | null = null;
    private lastThreadCacheTime: number = 0;
    private readonly THREAD_CACHE_DURATION_MS = 1000; // Cache threads for 1 second

    constructor(aiService: AIService, knowledgeLibrary: KnowledgeLibrary) {
        this.aiService = aiService;
        this.knowledgeLibrary = knowledgeLibrary;
    }

    setActiveSession(session: vscode.DebugSession) {
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
        this.cachedThreads = null;
        this.lastThreadCacheTime = 0;

        console.log('[DebugSessionTracker] Recording started. Cleared function trace array and source map.');
        console.log('[DebugSessionTracker] Recording state set to true, trace functions array cleared');
        console.log('[DIAGNOSTIC] Reset all capture statistics. Start time:', new Date(this.captureStartTime).toISOString());
        console.log('[THREAD CACHE] Cleared thread cache on start recording');

        // Log the active session info when starting recording
        if (this.activeSession) {
            console.log(`[DebugSessionTracker] Active session at start: id=${this.activeSession.id}, type=${this.activeSession.type}, name=${this.activeSession.name}`);
        } else {
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
            try {
                await this.captureStackFunctions(e.session);
            } catch (error) {
                console.log(`[DebugSessionTracker] Error capturing stack functions for event: ${e.event}`, error);
            }
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
            if (!this.activeSession) {
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] SKIPPED: No activeSession`);
                return;
            }

            this.captureAttempts++;
            console.log(`[DIAGNOSTIC] [${elapsedSec}s] === Capture attempt #${this.captureAttempts} START ===`);
            console.log('[DebugSessionTracker] Periodic stack capture for HTTP request detection');

            this.captureInProgress = true;
            const captureStart = Date.now();
            try {
                await this.captureStackFunctions(this.activeSession);
                const captureDuration = Date.now() - captureStart;
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] Capture completed in ${captureDuration}ms`);

                // REASON 2: Warn if capture took longer than interval
                if (captureDuration > 100) {
                    console.log(`[DIAGNOSTIC] ⚠️ WARNING: Capture took ${captureDuration}ms, exceeding 100ms interval! Risk of overlap.`);
                }
            } catch (error) {
                console.log('[DebugSessionTracker] Error during periodic stack capture:', error);
                console.log(`[DIAGNOSTIC] [${elapsedSec}s] CAPTURE ERROR:`, error);
            } finally {
                this.captureInProgress = false;
            }
            console.log(`[DIAGNOSTIC] [${elapsedSec}s] === Capture attempt #${this.captureAttempts} END ===`);
        }, 100); // Capture every 100ms (10Hz) for high-frequency statistical sampling
        console.log('[DebugSessionTracker] Registered periodic stack capture at 100ms intervals (10Hz) for statistical sampling');
    }

    async stopRecording(): Promise<number> {
        console.log('[DebugSessionTracker] Stopping recording');
        if (!this.isRecording) {
            console.log('[DebugSessionTracker] Not currently recording, returning 0');
            return 0;
        }
        this.isRecording = false;
        console.log('[DebugSessionTracker] Recording state set to false');
        console.log(`[DebugSessionTracker] Collected ${this.currentTraceFunctions.length} functions during recording:`, this.currentTraceFunctions);

        // Clear thread cache when stopping recording
        this.cachedThreads = null;
        this.lastThreadCacheTime = 0;
        console.log('[THREAD CACHE] Cleared thread cache on stop recording');

        // Print diagnostic summary
        const totalDuration = ((Date.now() - this.captureStartTime) / 1000).toFixed(2);
        console.log('\n=== [DIAGNOSTIC SUMMARY] ===');
        console.log(`[DIAGNOSTIC] Total recording duration: ${totalDuration}s`);
        console.log(`[DIAGNOSTIC] Total capture attempts: ${this.captureAttempts}`);
        console.log(`[DIAGNOSTIC] Skipped (overlap): ${this.captureSkippedOverlap}`);
        console.log(`[DIAGNOSTIC] With empty stacks: ${this.captureWithEmptyStacks}`);
        console.log(`[DIAGNOSTIC] Only <module> frames: ${this.captureWithOnlyModule}`);
        console.log(`[DIAGNOSTIC] With app code: ${this.captureWithAppCode}`);
        console.log(`[DIAGNOSTIC] Final functions captured: ${this.currentTraceFunctions.length}`);

        if (this.captureAttempts > 0) {
            const successRate = ((this.captureWithAppCode / this.captureAttempts) * 100).toFixed(1);
            console.log(`[DIAGNOSTIC] Success rate (app code found): ${successRate}%`);
        }

        // Diagnose the most likely issue
        if (this.currentTraceFunctions.length === 0) {
            console.log('\n[DIAGNOSTIC] ⚠️ ROOT CAUSE ANALYSIS (No functions captured):');
            if (this.captureAttempts === 0) {
                console.log('[DIAGNOSTIC]   - REASON 4/5: No capture attempts made! Check isRecording/activeSession state.');
            } else if (this.captureSkippedOverlap > this.captureAttempts * 0.5) {
                console.log(`[DIAGNOSTIC]   - REASON 3: High overlap rate (${this.captureSkippedOverlap}/${this.captureAttempts}). Captures taking >100ms.`);
            } else if (this.captureWithEmptyStacks === this.captureAttempts) {
                console.log('[DIAGNOSTIC]   - REASON 2: All captures returned empty stacks. debugpy may be overloaded or rate-limiting.');
            } else if (this.captureWithOnlyModule === this.captureAttempts) {
                console.log('[DIAGNOSTIC]   - REASON 1: All captures only saw <module> frames. Recording during idle periods.');
            } else {
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
        const traces: TraceSummary[] = this.knowledgeLibrary.listTraces();
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

    private async captureStackFunctions(session: vscode.DebugSession) {
        const captureStartTime = Date.now();
        console.log('=== [STACK CAPTURE] ATTEMPT START ===');
        console.log('[CAPTURE] Session ID:', session.id);
        console.log('[CAPTURE] Timestamp:', new Date().toISOString());
        console.log('[CAPTURE] Current trace functions before capture:', this.currentTraceFunctions);
        console.log('[CAPTURE] Current function source map size:', this.functionSourceMap.size);
        console.log('[CAPTURE TIMING] Capture triggered at:', captureStartTime);

        try {
            // OPTIMIZATION: Cache thread enumeration to reduce overhead
            let threads: any[] = [];
            const currentTime = Date.now();

            if (this.cachedThreads &&
                (currentTime - this.lastThreadCacheTime) < this.THREAD_CACHE_DURATION_MS) {
                // Use cached threads
                threads = this.cachedThreads;
                console.log(`[THREAD CACHE] Using cached threads (${threads.length} threads, ${currentTime - this.lastThreadCacheTime}ms old)`);
            } else {
                // Request fresh threads
                console.log('[THREADS] Requesting threads...');
                const threadsResp: any = await session.customRequest('threads');
                console.log('[THREADS] Response received:', threadsResp);

                if (!threadsResp || !Array.isArray(threadsResp.threads)) {
                    console.log('[THREADS] Invalid threads response');
                    console.log('=== [STACK CAPTURE] ATTEMPT COMPLETE ===');
                    return;
                }

                threads = threadsResp.threads;
                // Cache the threads
                this.cachedThreads = threads;
                this.lastThreadCacheTime = currentTime;
                console.log(`[THREAD CACHE] Cached ${threads.length} threads`);
            }
            console.log('[THREADS] Found threads:', threads.length);
            console.log('[THREADS] Thread summary:', threads.map((t: any) => `[ID:${t.id}, Name:"${t.name}"]`).join(', '));

            threads.forEach((thread: any, index: number) => {
                console.log(`[THREAD ${index}] ID: ${thread.id}, Name: "${thread.name}"`);
            });

            const workspaceFolders = vscode.workspace.workspaceFolders || [];
            const workspacePaths = workspaceFolders.map(f => f.uri.fsPath);
            console.log('[WORKSPACE] Paths:', workspacePaths);

            // Process all threads to capture all function activations
            // This provides a more comprehensive trace of all code execution
            const threadsToProcess = threads;
            console.log(`[THREAD FILTER] Processing all ${threadsToProcess.length} threads`);

            // OPTIMIZATION: Parallelize stack trace collection across threads
            // Create promises for all thread stack traces
            const threadPromises = threadsToProcess.map(async (th: any) => {
                console.log(`[STACK TRACE] Processing thread ${th.id} "${th.name}"`);
                const threadStartTime = new Date().getTime();

                try {
                    // OPTIMIZATION: Reduce stack depth from 50 to 30 levels per memory specification
                    const stackResp: any = await session.customRequest('stackTrace', {
                        threadId: th.id,
                        startFrame: 0,
                        levels: 30 // Optimized to 30 levels to balance visibility and performance
                    });

                    const threadEndTime = new Date().getTime();
                    console.log(`[STACK TRACE] Response for thread ${th.id}:`, stackResp);
                    console.log(`[STACK TRACE TIMING] Thread ${th.id} stack trace took ${threadEndTime - threadStartTime}ms`);

                    if (!stackResp || !Array.isArray(stackResp.stackFrames)) {
                        console.log(`[STACK TRACE] Invalid stack trace response for thread ${th.id}`);
                        return null;
                    }

                    const frames = stackResp.stackFrames;
                    const totalFrames = stackResp.totalFrames || frames.length;
                    console.log(`[STACK TRACE] Found frames in thread ${th.id}:`, frames.length, 'Total available:', totalFrames);

                    // Log all frames for debugging
                    console.log(`[STACK TRACE] Detailed frames for thread ${th.id}:`);
                    frames.forEach((frame: any, index: number) => {
                        console.log(`  Frame ${index}: Name="${frame.name}", Source="${frame.source?.path || frame.source?.name || 'unknown'}", Line=${frame.line || 'unknown'}`);
                    });

                    // Process frames and collect statistics
                    let appCodeFrames = 0;
                    let totalFramesProcessed = 0;
                    const processedFrames: any[] = [];

                    for (const frame of frames) {
                        totalFramesProcessed++;
                        console.log(`[FRAME] Name: "${frame.name}", Source: "${frame.source?.path || frame.source?.name || 'unknown'}"`);

                        // Filter and add to trace
                        const name: string = frame.name;
                        const src: string = (frame.source && (frame.source.path || frame.source.name)) || '';

                        // Check if it's application code and filter out less useful functions
                        // Handle both local and remote paths (WSL, SSH, etc.)
                        // Relax the filtering to capture more functions, but still exclude virtual environments
                        const isAppCode = (src.includes('/website/') || src.includes('website/') || src.includes('code_edu/website/') || src.includes('.py')) &&
                            !src.includes('/site-packages/') &&
                            !src.includes('/node_modules/') &&
                            !src.includes('<frozen '); // Removed filtering of <module> - it can contain important execution flow

                        console.log(`[FRAME FILTER] Name: "${name}", IsAppCode: ${isAppCode}, Source: "${src}"`);

                        if (isAppCode) {
                            appCodeFrames++;
                            // Skip <module> frames as they don't represent specific functions
                            if (name === '<module>') {
                                console.log(`[FUNCTION SKIP] Skipping <module> frame as it doesn't represent a specific function`);
                                continue;
                            }

                            console.log(`[FUNCTION DETECTED] Found application function: "${name}" in file: ${src}`);

                            // Store frame info for later processing
                            processedFrames.push({ name, src });
                        } else {
                            console.log(`[FRAME FILTERED] Frame "${name}" from ${src} filtered out as non-application code`);
                            // Log detailed reason for filtering
                            if (src.includes('/site-packages/')) {
                                console.log(`[FRAME FILTER REASON] Contains '/site-packages/'`);
                            } else if (src.includes('/node_modules/')) {
                                console.log(`[FRAME FILTER REASON] Contains '/node_modules/'`);
                            } else if (src.includes('<frozen ')) {
                                console.log(`[FRAME FILTER REASON] Contains '<frozen '`);
                            } else if (!(src.includes('/website/') || src.includes('website/') || src.includes('code_edu/website/') || src.includes('.py'))) {
                                console.log(`[FRAME FILTER REASON] Does not contain website path indicators or .py extension`);
                            } else {
                                console.log(`[FRAME FILTER REASON] Unknown filtering reason`);
                            }
                        }
                    }

                    // Return thread statistics
                    return {
                        threadId: th.id,
                        threadName: th.name,
                        frameCount: frames.length,
                        totalFrames: totalFrames,
                        isEmpty: frames.length === 0,
                        appCodeFrames: appCodeFrames,
                        totalFramesProcessed: totalFramesProcessed,
                        processedFrames: processedFrames
                    };
                } catch (frameError) {
                    console.log(`[STACK TRACE ERROR] Failed to get stack trace for thread ${th.id}:`, frameError);
                    return {
                        threadId: th.id,
                        threadName: th.name,
                        error: true,
                        errorMessage: String(frameError)
                    };
                }
            });

            // Execute all thread stack traces in parallel
            console.log(`[PARALLEL CAPTURE] Starting parallel capture of ${threadsToProcess.length} threads`);
            const threadResults = await Promise.all(threadPromises);
            console.log(`[PARALLEL CAPTURE] Completed parallel capture of ${threadsToProcess.length} threads`);

            // Filter out null results and build threadStats
            const threadStats = threadResults.filter(result => result !== null) as any[];

            // Process all collected frames to update function trace and source map
            for (const threadResult of threadStats) {
                if (threadResult.error) continue;

                // Log per-thread statistics
                console.log(`[THREAD STATS] Thread ${threadResult.threadId} "${threadResult.threadName}": Total frames=${threadResult.totalFramesProcessed}, App code frames=${threadResult.appCodeFrames}`);

                // Process each frame from this thread
                for (const frameInfo of threadResult.processedFrames) {
                    const { name, src } = frameInfo;

                    // Store the source file path for this function
                    this.functionSourceMap.set(name, src);
                    console.log(`[FUNCTION SOURCE MAP] Stored source for "${name}": ${src}`);

                    // Check if function already exists in the trace to prevent duplicates
                    const functionExists = this.currentTraceFunctions.includes(name);
                    const shouldAdd = !functionExists;

                    console.log(`[FUNCTION ADD] Current: "${name}", AlreadyExists: ${functionExists}, ShouldAdd: ${shouldAdd}`);

                    if (shouldAdd) {
                        this.currentTraceFunctions.push(name);
                        console.log(`[FUNCTION ADDED] "${name}". Total functions: ${this.currentTraceFunctions.length}`);
                    } else {
                        console.log(`[FUNCTION SKIPPED] "${name}" already exists in trace`);
                    }
                }
            }

            // Summary of all threads
            console.log('\n=== [THREAD ANALYSIS SUMMARY] ===');
            console.log('[SUMMARY] Total threads examined:', threadStats.length);
            const emptyThreads = threadStats.filter(t => t.isEmpty);
            const activeThreads = threadStats.filter(t => !t.isEmpty && !t.error);
            const errorThreads = threadStats.filter(t => t.error);
            console.log('[SUMMARY] Empty threads (no frames):', emptyThreads.length);
            console.log('[SUMMARY] Active threads (with frames):', activeThreads.length);
            console.log('[SUMMARY] Error threads:', errorThreads.length);

            if (emptyThreads.length > 0) {
                console.log('[SUMMARY] Empty thread details:', emptyThreads.map(t => `Thread ${t.threadId} "${t.threadName}"`).join(', '));
            }
            if (activeThreads.length > 0) {
                console.log('[SUMMARY] Active thread details:');
                activeThreads.forEach(t => {
                    console.log(`  - Thread ${t.threadId} "${t.threadName}": ${t.frameCount} frames, ${t.appCodeFrames || 0} app code frames`);
                });
            }
            if (errorThreads.length > 0) {
                console.log('[SUMMARY] Error thread details:', errorThreads.map(t => `Thread ${t.threadId} "${t.threadName}": ${t.errorMessage}`).join(', '));
            }

            // Analysis: why might we have missed functions?
            if (this.currentTraceFunctions.length < 5) {
                console.log('\n=== [INCOMPLETE CAPTURE ANALYSIS] ===');
                console.log('[ANALYSIS] Expected ~5 functions but only captured:', this.currentTraceFunctions.length);
                console.log('[ANALYSIS] Possible reasons:');
                if (emptyThreads.length > 0) {
                    console.log(`  - ${emptyThreads.length} thread(s) had empty stacks (finished execution or not yet started)`);
                }
                if (activeThreads.length === 0) {
                    console.log('  - NO active threads with frames at capture time!');
                }
                const totalAppCodeFrames = activeThreads.reduce((sum, t) => sum + (t.appCodeFrames || 0), 0);
                console.log(`  - Total app code frames across all threads: ${totalAppCodeFrames}`);
                if (totalAppCodeFrames < 5) {
                    console.log('  - Very few app code frames detected - likely captured too early or too late in execution');
                }
            }
            console.log('=== [THREAD ANALYSIS COMPLETE] ===\n');

            // REASON 1 & 2: Track diagnostic counters based on what we found
            const totalAppCodeFrames = activeThreads.reduce((sum, t) => sum + (t.appCodeFrames || 0), 0);
            const totalModuleOnlyFrames = activeThreads.reduce((sum, t) => {
                // Count threads that have frames but 0 app code frames
                return sum + (t.frameCount > 0 && (t.appCodeFrames || 0) === 0 ? 1 : 0);
            }, 0);

            if (activeThreads.length === 0 && emptyThreads.length > 0) {
                // REASON 1/2: All threads had empty stacks
                this.captureWithEmptyStacks++;
                console.log('[DIAGNOSTIC] This capture: All threads had empty stacks');
            } else if (totalAppCodeFrames === 0 && activeThreads.length > 0) {
                // REASON 1: Threads had frames, but all were filtered (likely all <module>)
                this.captureWithOnlyModule++;
                console.log('[DIAGNOSTIC] This capture: Threads had frames but no app code (likely all <module>)');
            } else if (totalAppCodeFrames > 0) {
                // Success: found some app code
                this.captureWithAppCode++;
                console.log(`[DIAGNOSTIC] This capture: SUCCESS - Found ${totalAppCodeFrames} app code frames`);
            }

            console.log('[CAPTURE RESULT] Final trace functions:', this.currentTraceFunctions);
            console.log('[CAPTURE RESULT] Final function source map entries:', Array.from(this.functionSourceMap.entries()));

            // LATENCY OPTIMIZATION: Measure total capture time
            const captureEndTime = Date.now();
            const totalCaptureTime = captureEndTime - captureStartTime;
            console.log(`[CAPTURE LATENCY] Total capture time: ${totalCaptureTime}ms`);

            // Track capture performance for optimization
            if (totalCaptureTime > 1000) {
                console.log(`[CAPTURE PERFORMANCE] ⚠️ WARNING: Capture took ${totalCaptureTime}ms (>1000ms). Consider further optimizations.`);
            } else if (totalCaptureTime > 100) {
                console.log(`[CAPTURE PERFORMANCE] Capture time acceptable: ${totalCaptureTime}ms`);
            } else {
                console.log(`[CAPTURE PERFORMANCE] Excellent capture time: ${totalCaptureTime}ms`);
            }

        } catch (error) {
            console.log('[CAPTURE ERROR] Failed to capture stack functions:', error);
        }

        console.log('=== [STACK CAPTURE] ATTEMPT COMPLETE ===');
    }

    private async processTrace(functions: string[]) {
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
            } catch (err) {
                console.error('Failed to generate project overview:', err);
                overview = '';
            }
        }

        const explanations: { [fn: string]: string } = {};
        console.log(`[DebugSessionTracker] Generating explanations for ${functions.length} functions`);
        console.log(`[DebugSessionTracker] Function source map entries:`, Array.from(this.functionSourceMap.entries()));
        for (const fn of functions) {
            console.log(`[DebugSessionTracker] Finding code for function: ${fn}`);
            console.log(`[DebugSessionTracker] Checking if function ${fn} exists in source map:`, this.functionSourceMap.has(fn));
            const code = await this.findFunctionCode(fn);
            console.log(`[DebugSessionTracker] Found code for function ${fn}: ${!!code}`);

            // Log code snippet if found
            if (code) {
                const codeLines = code.split('\n');
                console.log(`[DebugSessionTracker] Code snippet for ${fn} (${codeLines.length} lines):`, codeLines.slice(0, 5).join('\n'));
            } else {
                console.log(`[DebugSessionTracker] WARNING: Could not find code for function ${fn}`);
                console.log(`[DebugSessionTracker] Function source map has ${this.functionSourceMap.size} entries`);
                console.log(`[DebugSessionTracker] Function source map keys:`, Array.from(this.functionSourceMap.keys()));
            }

            try {
                console.log(`[DebugSessionTracker] Calling AI to explain function: ${fn}`);
                const exp = await this.aiService.explainFunction(code || '', fn, overview, '');
                explanations[fn] = exp;
                console.log(`[DebugSessionTracker] AI explanation for ${fn}:`, exp.substring(0, 100) + '...');
            } catch (err) {
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

    private async collectWorkspaceStructure() {
        const folders = vscode.workspace.workspaceFolders;
        const result: any = {};
        if (!folders || folders.length === 0) { return result; }
        for (const folder of folders) {
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, '**/*'), '**/node_modules/**', 200);
            result[folder.name] = files.map(f => vscode.workspace.asRelativePath(f));
        }
        return result;
    }

    private async collectDependencies() {
        const deps: any = {};
        const packageFiles = await vscode.workspace.findFiles('**/package.json', '**/node_modules/**', 2);
        if (packageFiles.length > 0) {
            try {
                const doc = await vscode.workspace.openTextDocument(packageFiles[0]);
                const json = JSON.parse(doc.getText());
                deps.node = { dependencies: json.dependencies || {}, devDependencies: json.devDependencies || {} };
            } catch { }
        }
        const reqFiles = await vscode.workspace.findFiles('**/requirements.txt', '**/node_modules/**', 2);
        if (reqFiles.length > 0) {
            try {
                const doc = await vscode.workspace.openTextDocument(reqFiles[0]);
                deps.python = doc.getText().split(/\r?\n/).filter(Boolean);
            } catch { }
        }
        return deps;
    }

    private extractFunctionName(doc: vscode.TextDocument, pos: vscode.Position): string | null {
        const lang = doc.languageId;
        const maxLookBack = Math.max(0, pos.line - 50);
        for (let line = pos.line; line >= maxLookBack; line--) {
            const text = doc.lineAt(line).text;
            // Common patterns
            // JS/TS
            let m = text.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
            if (m) return m[1];
            m = text.match(/const\s+([A-Za-z0-9_]+)\s*=\s*\([^)]*\)\s*=>/);
            if (m) return m[1];
            m = text.match(/([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/); // methods
            if (m) return m[1];
            // Python
            m = text.match(/def\s+([A-Za-z0-9_]+)\s*\(/);
            if (m) return m[1];
            // Java/C#/C++
            m = text.match(/(?:public|private|protected|static|virtual|inline|\s)*[A-Za-z0-9_<>\[\]]+\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/);
            if (m) return m[1];
        }
        return null;
    }

    private async findFunctionCode(functionName: string): Promise<string | null> {
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
                const fileUri = vscode.Uri.file(sourceFilePath);
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
                    } else if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
                        // JavaScript/TypeScript function definitions
                        isFunctionDefinition = new RegExp(`^\\s*(function\\s+${escapeRegExp(functionName)}\\s*\\(|const\\s+${escapeRegExp(functionName)}\\s*=|${escapeRegExp(functionName)}\\s*\\()`).test(line);
                    } else if (fileName.endsWith('.java') || fileName.endsWith('.cs')) {
                        // Java/C# method definitions
                        isFunctionDefinition = new RegExp(`\\s+${escapeRegExp(functionName)}\\s*\\(`).test(line) && !line.includes('\\s*=\\s*') && line.includes('(');
                    } else {
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
            } catch (error) {
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
                    } else if (fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.tsx')) {
                        // JavaScript/TypeScript function definitions
                        isFunctionDefinition = new RegExp(`^\\s*(function\\s+${escapeRegExp(functionName)}\\s*\\(|const\\s+${escapeRegExp(functionName)}\\s*=|${escapeRegExp(functionName)}\\s*\\()`).test(line);
                    } else if (fileName.endsWith('.java') || fileName.endsWith('.cs')) {
                        // Java/C# method definitions
                        isFunctionDefinition = new RegExp(`\\s+${escapeRegExp(functionName)}\\s*\\(`).test(line) && !line.includes('\\s*=\\s*') && line.includes('(');
                    } else {
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
            } catch (error) {
                console.log(`[FUNCTION CODE ERROR] Error reading file ${file.path}:`, error);
            }
        }

        console.log(`[FUNCTION CODE NOT FOUND] Function ${functionName} not found in any files`);
        return null;
    }
}
