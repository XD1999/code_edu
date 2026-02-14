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
const debugSessionTracker_1 = require("./debugSessionTracker");
const knowledgeLibrary_1 = require("./knowledgeLibrary");
const aiService_1 = require("./aiService");
const traceViewerPanel_1 = require("./traceViewerPanel");
const knowledgeMapPanel_1 = require("./knowledgeMapPanel");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let isActive = false;
let isVisualizing = false;
let debugSessionTracker = null;
let knowledgeLibrary = null;
// Helper to find term by ID recursively
const findTermById = (ctx, id) => {
    for (const p of ctx.paragraphs) {
        const t = p.terms.find(term => term.id === id);
        if (t)
            return t;
        for (const term of p.terms) {
            for (const branch of term.branches) {
                if (branch.childContext) {
                    const found = findTermById(branch.childContext, id);
                    if (found)
                        return found;
                }
            }
        }
    }
    return undefined;
};
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
    // Provide initial instances and architecture to the provider
    if (knowledgeLibrary) {
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        const archGraph = knowledgeLibrary.getArchitectureGraph();
        if (archGraph) {
            knowledgeMapProvider.updateArchitecture(archGraph);
        }
    }
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
    // Explanation lock to prevent duplicates
    let currentExplanationTerm = null;
    // Clean, direct explanation handler
    async function handleExplainTerm(text, contextText, type = 'desc-encapsulation') {
        if (!text || text.trim().length === 0) {
            vscode.window.showWarningMessage('Please select a word or phrase to explain.');
            return;
        }
        const normalizedTerm = text.trim().toLowerCase();
        // Prevent duplicate explanations for the same term
        if (currentExplanationTerm === normalizedTerm) {
            console.log(`Skipping duplicate explanation request for: ${text}`);
            return;
        }
        currentExplanationTerm = normalizedTerm;
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Explaining "${text.length > 20 ? text.substring(0, 20) + '...' : text}"`,
                cancellable: false
            }, async () => {
                const aiService = new aiService_1.AIService();
                try {
                    // Focus the view first
                    await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
                    const explanation = await aiService.explainTerm(text, contextText, type);
                    knowledgeMapProvider.addTerm(text, explanation, type);
                }
                catch (error) {
                    console.error('AI Explain Error:', error);
                    vscode.window.showErrorMessage('Failed to explain term: ' + error.message);
                }
            });
        }
        finally {
            // Release the lock after a short delay to prevent rapid re-triggers
            setTimeout(() => {
                if (currentExplanationTerm === normalizedTerm) {
                    currentExplanationTerm = null;
                }
            }, 1000);
        }
    }
    // Connect the handler to the providers
    // Trace view uses description encapsulation by default
    traceViewProvider.setExplainHandler((term, ctx) => handleExplainTerm(term, ctx, 'desc-encapsulation'));
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
                    await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
                    await knowledgeMapProvider.processInputTerm(term, type);
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
    const descEncapsulationCommand = createExplainCommand('ai-debug-explainer.explainTermDescEncapsulation', 'desc-encapsulation');
    const descReductionCommand = createExplainCommand('ai-debug-explainer.explainTermDescReduction', 'desc-reduction');
    const modelEncapsulationCommand = createExplainCommand('ai-debug-explainer.explainTermModelEncapsulation', 'model-encapsulation');
    const modelReductionCommand = createExplainCommand('ai-debug-explainer.explainTermModelReduction', 'model-reduction');
    // Register Save Learning Instance command
    const saveLearningInstanceCommand = vscode.commands.registerCommand('ai-debug-explainer.saveLearningInstance', async (contextNode, existingName) => {
        if (!knowledgeLibrary)
            return;
        let name = existingName;
        if (!name) {
            name = await vscode.window.showInputBox({
                prompt: 'Enter a name for this learning instance',
                placeHolder: 'e.g., Understanding Maxwell Equations'
            });
        }
        if (!name)
            return;
        // Check if an instance with this name already exists
        const existingInstance = knowledgeLibrary.findLearningInstanceByName(name);
        const instance = {
            id: existingInstance ? existingInstance.id : `instance-${Date.now()}`,
            name: name,
            rootContext: contextNode,
            createdAt: existingInstance ? existingInstance.createdAt : Date.now()
        };
        await knowledgeLibrary.saveLearningInstance(instance);
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        // Provide feedback to webview
        const action = existingInstance ? 'Updated' : 'Saved';
        knowledgeMapProvider.postMessage({
            command: 'showNotification',
            text: `${action}: ${name}`
        });
        vscode.window.showInformationMessage(`Learning instance "${name}" ${action.toLowerCase()}.`);
    });
    // Register Load Learning Instance command
    const loadLearningInstanceCommand = vscode.commands.registerCommand('ai-debug-explainer.loadLearningInstance', async (instanceId) => {
        if (!knowledgeLibrary || !knowledgeMapProvider)
            return;
        const instance = knowledgeLibrary.getLearningInstance(instanceId);
        if (instance) {
            knowledgeMapProvider.setContext(instance.rootContext, instance.name);
            vscode.window.showInformationMessage(`Loaded instance: ${instance.name}`);
        }
    });
    // Register Delete Learning Instance command
    const deleteLearningInstanceCommand = vscode.commands.registerCommand('ai-debug-explainer.deleteLearningInstance', async (instanceId) => {
        if (!knowledgeLibrary || !knowledgeMapProvider)
            return;
        await knowledgeLibrary.deleteLearningInstance(instanceId);
        knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
        vscode.window.showInformationMessage(`Deleted learning instance.`);
    });
    // Register Generate Practice command
    const generatePracticeCommand = vscode.commands.registerCommand('ai-debug-explainer.generatePractice', async (termId, branchType, difficulty) => {
        if (!knowledgeLibrary || !knowledgeMapProvider)
            return;
        const currentCtx = knowledgeMapProvider.getCurrentContext();
        if (!currentCtx)
            return;
        const term = findTermById(currentCtx, termId);
        if (!term)
            return;
        const branch = term.branches.find(b => b.type === branchType);
        if (!branch)
            return;
        if (!branch.practices)
            branch.practices = [];
        // Show progress notification
        const progressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: 'Generating practice problem...',
            cancellable: false
        };
        await vscode.window.withProgress(progressOptions, async () => {
            // Ensure practices array exists
            if (!branch.practices)
                branch.practices = [];
            // Get last two practices for context
            const lastTwo = branch.practices.slice(-2);
            const lastDifficulties = lastTwo.map(p => p.difficulty);
            const lastContents = lastTwo.map(p => p.content);
            // Calculate target difficulty - first practice starts at 1 (easiest)
            let targetDifficulty = 1; // Default easiest for first practice
            if (lastTwo.length > 0) {
                targetDifficulty = lastTwo[lastTwo.length - 1].difficulty + difficulty;
            }
            targetDifficulty = Math.max(1, Math.min(10, targetDifficulty));
            const isFirstPractice = branch.practices.length === 0;
            const aiService = new aiService_1.AIService();
            const practiceContent = await aiService.generatePracticeProblem(term.term, branch.content, targetDifficulty, lastDifficulties, lastContents, isFirstPractice);
            const newPractice = {
                id: `practice-${Date.now()}`,
                difficulty: targetDifficulty,
                content: practiceContent,
                createdAt: Date.now()
            };
            branch.practices.push(newPractice);
            branch.currentPracticeIndex = branch.practices.length - 1;
            branch.practiceVisible = true; // Ensure practice section is visible
            knowledgeMapProvider.setContext(currentCtx, knowledgeMapProvider.getActiveInstanceName());
        });
        vscode.window.showInformationMessage(`Practice problem generated!`);
    });
    // Register Show Practice Set command
    const showPracticeSetCommand = vscode.commands.registerCommand('ai-debug-explainer.showPracticeSet', async (termId, branchType) => {
        if (!knowledgeLibrary || !knowledgeMapProvider)
            return;
        const currentCtx = knowledgeMapProvider.getCurrentContext();
        if (!currentCtx)
            return;
        const term = findTermById(currentCtx, termId);
        if (!term)
            return;
        const branch = term.branches.find(b => b.type === branchType);
        if (!branch || !branch.practices || branch.practices.length === 0) {
            vscode.window.showInformationMessage('No practice problems available.');
            return;
        }
        const items = branch.practices.map((p, idx) => ({
            label: `Practice ${idx + 1} (Difficulty: ${p.difficulty})`,
            description: p.content.substring(0, 50) + '...',
            index: idx
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a practice problem'
        });
        if (selected) {
            branch.currentPracticeIndex = selected.index;
            knowledgeMapProvider.setContext(currentCtx, knowledgeMapProvider.getActiveInstanceName());
        }
    });
    // Register Visualize Term command
    const visualizeTermCommand = vscode.commands.registerCommand('ai-debug-explainer.visualizeTerm', async (termId) => {
        if (!knowledgeLibrary || !knowledgeMapProvider)
            return;
        if (isVisualizing)
            return;
        isVisualizing = true;
        try {
            let currentCtx = knowledgeMapProvider.getCurrentContext();
            if (!currentCtx) {
                const clipboardText = await vscode.env.clipboard.readText();
                const termName = clipboardText?.trim() || 'Direct Visualization';
                knowledgeMapProvider.setCurrentContext(`Exploring: ${termName}`);
                currentCtx = knowledgeMapProvider.getCurrentContext();
            }
            if (!currentCtx) {
                vscode.window.showErrorMessage('Unable to initialize Knowledge Map context.');
                return;
            }
            const findTermByName = (ctx, name) => {
                if (!ctx)
                    return undefined;
                const normalize = (s) => s.replace(/[\s\u200B-\u200D\uFEFF]+/g, '').toLowerCase();
                const normalizedName = normalize(name);
                for (const p of ctx.paragraphs) {
                    const t = p.terms.find(term => normalize(term.term) === normalizedName);
                    if (t)
                        return t;
                    for (const term of p.terms) {
                        for (const branch of term.branches) {
                            if (branch.childContext) {
                                const found = findTermByName(branch.childContext, name);
                                if (found)
                                    return found;
                            }
                        }
                    }
                }
                return undefined;
            };
            let targetId = termId || knowledgeMapProvider.getFocusedTermId() || undefined;
            let expressionToVisualize;
            // Get expression from clipboard
            if (!termId) {
                const clipboardText = await vscode.env.clipboard.readText();
                if (clipboardText && clipboardText.trim()) {
                    expressionToVisualize = clipboardText.trim();
                    const term = findTermByName(currentCtx, expressionToVisualize);
                    if (term)
                        targetId = term.id;
                }
            }
            if (!targetId) {
                vscode.window.showWarningMessage('Please focus a term or copy an expression to visualize.');
                return;
            }
            const termNode = findTermById(currentCtx, targetId);
            if (!termNode) {
                vscode.window.showWarningMessage('Term not found.');
                return;
            }
            // If user pressed button without new expression, show list to choose
            if (!expressionToVisualize && termNode.visualizations && termNode.visualizations.length > 0) {
                const items = termNode.visualizations.map(v => ({
                    label: v.expression,
                    description: new Date(v.createdAt).toLocaleString(),
                    filePath: v.filePath
                }));
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select visualization to open'
                });
                if (selected && fs.existsSync(selected.filePath)) {
                    const doc = await vscode.workspace.openTextDocument(selected.filePath);
                    await vscode.window.showTextDocument(doc);
                    return;
                }
                return;
            }
            // Generate new visualization
            const expression = expressionToVisualize || termNode.term;
            const storagePath = context.globalStorageUri.fsPath;
            if (!fs.existsSync(storagePath))
                fs.mkdirSync(storagePath, { recursive: true });
            // Auto-generate filename from expression: remove newlines, sanitize
            const sanitizeFilename = (text) => {
                return text
                    .replace(/\r?\n|\r/g, ' ') // Replace newlines with space
                    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_\- ]/g, '_') // Keep alphanumeric, Chinese, underscore, hyphen, space
                    .replace(/\s+/g, '_') // Replace spaces with underscore
                    .substring(0, 100); // Limit length
            };
            const filename = sanitizeFilename(expression);
            const timestamp = Date.now();
            const scriptPath = path.join(storagePath, `${filename}_${timestamp}.py`);
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Generating visualization for "${expression}"`,
                cancellable: false
            }, async () => {
                const aiService = new aiService_1.AIService();
                try {
                    // Collect sub-terms from all pedagogical branches
                    const subTerms = termNode.branches.flatMap(b => b.childContext ? b.childContext.paragraphs.flatMap(p => p.terms) : []);
                    const allBranchContent = termNode.branches.map(b => b.content).join('\n\n');
                    let scriptContent = await aiService.generateVisualizationScript(expression, `Context: ${allBranchContent}\n\nExpression: ${expression}`, subTerms);
                    scriptContent = scriptContent.replace(/^```python\n/, '').replace(/\n```$/, '').replace(/^```\n/, '');
                    fs.writeFileSync(scriptPath, scriptContent);
                    // Add to visualizations array
                    if (!termNode.visualizations)
                        termNode.visualizations = [];
                    termNode.visualizations.push({
                        expression: expression,
                        filePath: scriptPath,
                        createdAt: timestamp
                    });
                    knowledgeMapProvider.setContext(currentCtx, knowledgeMapProvider.getActiveInstanceName());
                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                    await vscode.window.showTextDocument(doc);
                    vscode.window.showInformationMessage(`Visualization generated for "${expression}".`);
                }
                catch (err) {
                    vscode.window.showErrorMessage(`Failed to generate visualization: ${err}`);
                    const fallback = `print("Visualization failed for: ${expression}")`;
                    fs.writeFileSync(scriptPath, fallback);
                    const doc = await vscode.workspace.openTextDocument(scriptPath);
                    await vscode.window.showTextDocument(doc);
                }
            });
        }
        finally {
            isVisualizing = false;
        }
    });
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);
    context.subscriptions.push(viewTraceCommand);
    context.subscriptions.push(manualCaptureCommand);
    context.subscriptions.push(clearTracesCommand);
    context.subscriptions.push(clearFunctionExplanationsCommand);
    context.subscriptions.push(descEncapsulationCommand);
    context.subscriptions.push(descReductionCommand);
    context.subscriptions.push(modelEncapsulationCommand);
    context.subscriptions.push(modelReductionCommand);
    context.subscriptions.push(extractContextCommand);
    context.subscriptions.push(saveLearningInstanceCommand);
    context.subscriptions.push(loadLearningInstanceCommand);
    context.subscriptions.push(deleteLearningInstanceCommand);
    context.subscriptions.push(visualizeTermCommand);
    context.subscriptions.push(generatePracticeCommand);
    context.subscriptions.push(showPracticeSetCommand);
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