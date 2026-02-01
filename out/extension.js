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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const debugSessionTracker_1 = require("./debugSessionTracker");
const knowledgeLibrary_1 = require("./knowledgeLibrary");
const aiService_1 = require("./aiService");
const traceViewerPanel_1 = require("./traceViewerPanel");
const knowledgeMapPanel_1 = require("./knowledgeMapPanel");
let isActive = false;
let debugSessionTracker = null;
let knowledgeLibrary = null;
// This is the entry point for the extension activation
function activate(context) {
    console.log('AI Debug Explainer: activate called');
    // Set default auto-select family attempt timeout to 1000ms to improve connectivity
    if (net.setDefaultAutoSelectFamilyAttemptTimeout) {
        net.setDefaultAutoSelectFamilyAttemptTimeout(1000);
    }
    // Initialize knowledge library
    knowledgeLibrary = new knowledgeLibrary_1.KnowledgeLibrary(context);
    // Register the sidebar Trace View Provider
    const traceViewProvider = new traceViewerPanel_1.TraceViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(traceViewerPanel_1.TraceViewProvider.viewType, traceViewProvider));
    // Register the sidebar Knowledge Map Provider
    const knowledgeMapProvider = new knowledgeMapPanel_1.KnowledgeMapProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(knowledgeMapPanel_1.KnowledgeMapProvider.viewType, knowledgeMapProvider));
    // Register the toggle command
    const toggleCommand = vscode.commands.registerCommand('ai-debug-explainer.toggle', () => {
        console.log('AI Debug Explainer: toggle command executed, current state:', isActive);
        isActive = !isActive;
        vscode.window.showInformationMessage(`AI Debug Explainer is now ${isActive ? 'active' : 'inactive'}`);
        if (isActive && !debugSessionTracker) {
            console.log('AI Debug Explainer: creating new DebugSessionTracker');
            const aiService = new aiService_1.AIService();
            debugSessionTracker = new debugSessionTracker_1.DebugSessionTracker(aiService, knowledgeLibrary, traceViewProvider, knowledgeMapProvider);
            // Subscribe to debug session events
            context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(session => {
                console.log('AI Debug Explainer: onDidChangeActiveDebugSession triggered', session?.id);
                // We no longer strictly need to track "active" session changes for functionality, 
                // but we ensure any newly focused session is added to our list.
                if (session) {
                    debugSessionTracker?.addSession(session);
                }
            }), vscode.debug.onDidStartDebugSession(session => {
                console.log('AI Debug Explainer: onDidStartDebugSession triggered', session.id);
                debugSessionTracker?.addSession(session);
            }), vscode.debug.onDidTerminateDebugSession(session => {
                console.log('AI Debug Explainer: onDidTerminateDebugSession triggered', session.id);
                debugSessionTracker?.removeSession(session.id);
            }));
        }
        else if (!isActive && debugSessionTracker) {
            // Dispose of the debug session tracker when toggling off
            console.log('AI Debug Explainer: disposing DebugSessionTracker');
            debugSessionTracker.dispose();
            debugSessionTracker = null;
        }
    });
    // Automatically create debug session tracker when a debug session starts
    // This ensures the functionality works without requiring manual toggle
    context.subscriptions.push(vscode.debug.onDidStartDebugSession(session => {
        console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session STARTED', {
            sessionId: session.id,
            type: session.type,
            name: session.name,
            timestamp: new Date().toISOString()
        });
        // Ensure tracker exists
        if (!debugSessionTracker) {
            console.log('AI Debug Explainer: automatically creating DebugSessionTracker');
            const aiService = new aiService_1.AIService();
            debugSessionTracker = new debugSessionTracker_1.DebugSessionTracker(aiService, knowledgeLibrary, traceViewProvider, knowledgeMapProvider);
        }
        // Add the new session
        debugSessionTracker.addSession(session);
    }), vscode.debug.onDidChangeActiveDebugSession(session => {
        console.log('AI Debug Explainer: [SESSION LIFECYCLE] Active session changed', {
            sessionId: session?.id,
            timestamp: new Date().toISOString()
        });
        if (session) {
            if (!debugSessionTracker) {
                console.log('AI Debug Explainer: automatically creating DebugSessionTracker');
                const aiService = new aiService_1.AIService();
                debugSessionTracker = new debugSessionTracker_1.DebugSessionTracker(aiService, knowledgeLibrary, traceViewProvider, knowledgeMapProvider);
            }
            debugSessionTracker.addSession(session);
        }
    }), vscode.debug.onDidTerminateDebugSession(session => {
        console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session TERMINATED', {
            sessionId: session.id,
            timestamp: new Date().toISOString()
        });
        if (debugSessionTracker) {
            debugSessionTracker.removeSession(session.id);
        }
    }), vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
        console.log('AI Debug Explainer: Received debug session custom event', {
            sessionId: event.session.id,
            sessionType: event.session.type,
            sessionName: event.session.name,
            eventType: event.event,
            eventBodyKeys: event.body ? Object.keys(event.body) : [],
            hasOutput: !!(event.body && event.body.output),
            timestamp: new Date().toISOString()
        });
    }), 
    // Listen for all debug adapter events
    vscode.debug.onDidChangeBreakpoints(e => {
        console.log('AI Debug Explainer: Breakpoints changed', e);
    }));
    // Register the start learning command
    const startLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.startLearning', () => {
        console.log('AI Debug Explainer: startLearning command executed');
        if (debugSessionTracker) {
            debugSessionTracker.startRecording();
            vscode.window.showInformationMessage('Supervision started. Interact with code to record an execution trace.');
        }
        else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    });
    // Register the stop learning command
    const stopLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.stopLearning', async () => {
        console.log('AI Debug Explainer: stopLearning command executed');
        if (debugSessionTracker) {
            vscode.window.showInformationMessage('Marking current supervision as an intact trace and processing...');
            const count = await debugSessionTracker.stopRecording();
            if (count > 0) {
                vscode.window.showInformationMessage(`Trace complete! Recorded ${count} functions and saved explanations.`);
            }
        }
        else {
            vscode.window.showErrorMessage('No active debug session tracker.');
        }
    });
    // Register the view trace command
    const viewTraceCommand = vscode.commands.registerCommand('ai-debug-explainer.viewTrace', async () => {
        console.log('AI Debug Explainer: viewTrace command executed');
        if (debugSessionTracker) {
            await debugSessionTracker.openTraceViewer();
        }
        else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    });
    // Register a manual capture command for debugging
    const manualCaptureCommand = vscode.commands.registerCommand('ai-debug-explainer.manualCapture', async () => {
        console.log('=== [MANUAL CAPTURE] EXECUTION START ===');
        console.log('[MANUAL] Timestamp:', new Date().toISOString());
        console.log('[MANUAL] Has debugSessionTracker:', !!debugSessionTracker);
        if (debugSessionTracker) {
            // Cast to any to access private methods for debugging
            const tracker = debugSessionTracker;
            console.log('[MANUAL] Tracker state:', {
                hasActiveSession: !!tracker.activeSession,
                isRecording: tracker.isRecording,
                traceFunctionCount: tracker.currentTraceFunctions?.length || 0
            });
            if (tracker.activeSession) {
                console.log('[MANUAL] Active session details:', {
                    id: tracker.activeSession.id,
                    type: tracker.activeSession.type,
                    name: tracker.activeSession.name
                });
                console.log('[MANUAL] Attempting stack capture...');
                try {
                    await tracker.captureStackFunctions(tracker.activeSession);
                    console.log('[MANUAL] Stack capture completed successfully');
                    console.log('[MANUAL] Current trace functions:', tracker.currentTraceFunctions);
                }
                catch (error) {
                    console.error('[MANUAL] Stack capture failed:', error);
                }
            }
            else {
                console.log('[MANUAL] No active session - cannot capture stack');
            }
        }
        else {
            console.log('[MANUAL] No debug session tracker available');
        }
        console.log('=== [MANUAL CAPTURE] EXECUTION COMPLETE ===');
    });
    // Register command to clear all traces
    const clearTracesCommand = vscode.commands.registerCommand('ai-debug-explainer.clearTraces', async () => {
        console.log('AI Debug Explainer: clearTraces command executed');
        if (knowledgeLibrary) {
            try {
                await knowledgeLibrary.clearAllTraces();
                vscode.window.showInformationMessage('All saved traces have been cleared.');
                console.log('AI Debug Explainer: All traces cleared successfully');
            }
            catch (error) {
                console.error('AI Debug Explainer: Failed to clear traces:', error);
                vscode.window.showErrorMessage('Failed to clear traces: ' + error.message);
            }
        }
        else {
            vscode.window.showErrorMessage('Knowledge library not initialized.');
        }
    });
    // Register command to clear all function explanations
    const clearFunctionExplanationsCommand = vscode.commands.registerCommand('ai-debug-explainer.clearFunctionExplanations', async () => {
        console.log('AI Debug Explainer: clearFunctionExplanations command executed');
        if (knowledgeLibrary) {
            try {
                await knowledgeLibrary.clearAllFunctionExplanations();
                vscode.window.showInformationMessage('All function explanations have been cleared.');
                console.log('AI Debug Explainer: All function explanations cleared successfully');
            }
            catch (error) {
                console.error('AI Debug Explainer: Failed to clear function explanations:', error);
                vscode.window.showErrorMessage('Failed to clear function explanations: ' + error.message);
            }
        }
        else {
            vscode.window.showErrorMessage('Knowledge library not initialized.');
        }
    });
    // Helper function to handle the explanation logic
    async function handleExplainTerm(text, contextText, type = 'general') {
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('Please select a word or phrase to explain.');
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Explaining "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
            cancellable: false
        }, async () => {
            const aiService = new aiService_1.AIService();
            try {
                // Focus the view first so the user sees it appearing
                await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
                const explanation = await aiService.explainTerm(text, contextText, type);
                knowledgeMapProvider.addTerm(text, explanation);
            }
            catch (error) {
                console.error('AI Explain Error:', error);
                vscode.window.showErrorMessage('Failed to explain term: ' + error.message);
            }
        });
    }
    // Connect the handler to the providers
    // Trace view usually implies general explanation
    traceViewProvider.setExplainHandler((term, ctx) => handleExplainTerm(term, ctx, 'general'));
    knowledgeMapProvider.setExplainHandler(handleExplainTerm);
    // Register command to extract context
    const extractContextCommand = vscode.commands.registerCommand('ai-debug-explainer.extractContext', async () => {
        console.log('AI Debug Explainer: extractContext command triggered');
        const clipboardText = await vscode.env.clipboard.readText();
        if (clipboardText && clipboardText.trim().length > 0) {
            knowledgeMapProvider.setCurrentContext(clipboardText);
            // Focus the view
            await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
            vscode.window.showInformationMessage('Context extracted from clipboard.');
        }
        else {
            vscode.window.showWarningMessage('Clipboard is empty. Please copy some text first.');
        }
    });
    const createExplainCommand = (commandId, type) => {
        return vscode.commands.registerCommand(commandId, async () => {
            console.log(`AI Debug Explainer: ${commandId} triggered`);
            const clipboardText = await vscode.env.clipboard.readText();
            if (clipboardText && clipboardText.trim().length > 0) {
                const term = clipboardText;
                try {
                    if (type === 'visualization') {
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: `Generating visualization for "${term}"...`,
                            cancellable: false
                        }, async () => {
                            const aiService = new aiService_1.AIService();
                            // Pass empty context if none extraction, or we could use clipboard as context if lengthy
                            // For simplicity, let's use knowledgeMapProvider's context if available, or just term
                            // But usually users want visualization of the clipboard term based on clipboard context?
                            // The original design uses knowledgeMapProvider.processInputTerm which uses _currentContext.
                            // Let's stick to the pattern: prompt for code -> save -> run.
                            // However, we need context.
                            // We can reuse knowledgeMapProvider logic BUT we want to intercept the result.
                            // The current architecture delegates to knowledgeMapProvider.
                            // Let's modify the command handler here to do the work directly for Visualization
                            // OR modify knowledgeMapProvider to return the result (which is harder due to async/void).
                            // Let's implement the logic here directly using AIService.
                            // We need the context. Let's try to get it from KnowledgeMapProvider if possible, 
                            // or ask user to provide it? 
                            // Actually, let's just use the clipboard text as the TERM, and if there is a context set in the panel reuse it.
                            // Accessing private _currentContext from here is hard. 
                            // Let's ASSUME the user has set context via Ctrl+Alt+S. 
                            // If they haven't, we can default to using the term itself as context or warn.
                            // Since we can't easily access the private context from here, let's just warn if we really need it.
                            // BUT, the command `createExplainCommand` is generic.
                            // Alternative: We ask AIService directly.
                            // We need an instance of AIService.
                            // Let's assume the user just copied the term. 
                            const explanation = await aiService.explainTerm(term, "Context provided by user selection.", 'visualization');
                            // Parse Python code
                            const match = explanation.match(/```python([\s\S]*?)```/);
                            if (match && match[1]) {
                                const pythonCode = match[1].trim();
                                // Create file
                                const workspaceFolders = vscode.workspace.workspaceFolders;
                                if (!workspaceFolders) {
                                    throw new Error('No workspace folder open.');
                                }
                                const rootPath = workspaceFolders[0].uri.fsPath;
                                const sanitizedTerm = term.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
                                const fileName = `visualize_${sanitizedTerm}.py`;
                                const filePath = path.join(rootPath, fileName);
                                fs.writeFileSync(filePath, pythonCode);
                                // Open file
                                const doc = await vscode.workspace.openTextDocument(filePath);
                                await vscode.window.showTextDocument(doc);
                                // Run in terminal
                                const terminal = vscode.window.createTerminal(`Visualization: ${term}`);
                                terminal.show();
                                terminal.sendText(`python3 "${filePath}"`);
                                vscode.window.showInformationMessage(`Generated ${fileName} and started execution.`);
                            }
                            else {
                                throw new Error('No Python code block found in AI response.');
                            }
                        });
                    }
                    else {
                        // Default behavior for other types
                        await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
                        await knowledgeMapProvider.processInputTerm(term, type);
                    }
                }
                catch (error) {
                    console.error('AI Explain Error:', error);
                    vscode.window.showErrorMessage('Failed to explain term: ' + error.message);
                }
                return;
            }
            vscode.window.showWarningMessage('Clipboard is empty. Please Select Text -> Ctrl+C -> Shortcut');
        });
    };
    const explainTermCommand = createExplainCommand('ai-debug-explainer.explainTerm', 'general');
    const explainTermAnalogyCommand = createExplainCommand('ai-debug-explainer.explainTermAnalogy', 'analogy');
    const explainTermExampleCommand = createExplainCommand('ai-debug-explainer.explainTermExample', 'example');
    const explainTermMathCommand = createExplainCommand('ai-debug-explainer.explainTermMath', 'math');
    const explainTermVisualizationCommand = createExplainCommand('ai-debug-explainer.explainTermVisualization', 'visualization');
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);
    context.subscriptions.push(viewTraceCommand);
    context.subscriptions.push(manualCaptureCommand);
    context.subscriptions.push(clearTracesCommand);
    context.subscriptions.push(clearFunctionExplanationsCommand);
    context.subscriptions.push(explainTermCommand);
    context.subscriptions.push(explainTermAnalogyCommand);
    context.subscriptions.push(explainTermExampleCommand);
    context.subscriptions.push(explainTermMathCommand);
    context.subscriptions.push(explainTermVisualizationCommand);
    context.subscriptions.push(extractContextCommand);
    console.log('AI Debug Explainer: activation completed');
}
exports.activate = activate;
function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    if (debugSessionTracker) {
        debugSessionTracker.dispose();
    }
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map