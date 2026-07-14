"use strict";
/**
 * Debug-supervision commands: toggle, start/stop learning, view trace, manual
 * capture, and the clear-traces / clear-explanations housekeeping commands.
 */
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
exports.registerDebugCommands = void 0;
const vscode = __importStar(require("vscode"));
function registerDebugCommands(services) {
    const disposables = [];
    // Toggle the explainer on/off. The debug-session lifecycle (tracker creation,
    // session add/remove) is handled by the consolidated subscription in
    // extension.ts; toggle only owns the active flag and the tracker lifetime.
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.toggle', () => {
        console.log('AI Debug Explainer: toggle command executed, current state:', services.active);
        services.active = !services.active;
        vscode.window.showInformationMessage(`AI Debug Explainer is now ${services.active ? 'active' : 'inactive'}`);
        if (services.active) {
            services.ensureDebugTracker();
        }
        else {
            services.disposeDebugTracker();
        }
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.startLearning', () => {
        console.log('AI Debug Explainer: startLearning command executed');
        const tracker = services.debugTracker;
        if (tracker) {
            tracker.startRecording();
            vscode.window.showInformationMessage('Supervision started. Interact with code to record an execution trace.');
        }
        else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.stopLearning', async () => {
        console.log('AI Debug Explainer: stopLearning command executed');
        const tracker = services.debugTracker;
        if (tracker) {
            vscode.window.showInformationMessage('Marking current supervision as an intact trace and processing...');
            const count = await tracker.stopRecording();
            if (count > 0) {
                vscode.window.showInformationMessage(`Trace complete! Recorded ${count} functions and saved explanations.`);
            }
        }
        else {
            vscode.window.showErrorMessage('No active debug session tracker.');
        }
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.viewTrace', async () => {
        console.log('AI Debug Explainer: viewTrace command executed');
        const tracker = services.debugTracker;
        if (tracker) {
            await tracker.openTraceViewer();
        }
        else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    }));
    // Manual capture command for debugging the stack-trace pipeline.
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.manualCapture', async () => {
        console.log('=== [MANUAL CAPTURE] EXECUTION START ===');
        console.log('[MANUAL] Timestamp:', new Date().toISOString());
        console.log('[MANUAL] Has debugSessionTracker:', !!services.debugTracker);
        const tracker = services.debugTracker;
        if (tracker) {
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
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.clearTraces', async () => {
        console.log('AI Debug Explainer: clearTraces command executed');
        try {
            await services.knowledgeLibrary.clearAllTraces();
            vscode.window.showInformationMessage('All saved traces have been cleared.');
            console.log('AI Debug Explainer: All traces cleared successfully');
        }
        catch (error) {
            console.error('AI Debug Explainer: Failed to clear traces:', error);
            vscode.window.showErrorMessage('Failed to clear traces: ' + error.message);
        }
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.clearFunctionExplanations', async () => {
        console.log('AI Debug Explainer: clearFunctionExplanations command executed');
        try {
            await services.knowledgeLibrary.clearAllFunctionExplanations();
            vscode.window.showInformationMessage('All function explanations have been cleared.');
            console.log('AI Debug Explainer: All function explanations cleared successfully');
        }
        catch (error) {
            console.error('AI Debug Explainer: Failed to clear function explanations:', error);
            vscode.window.showErrorMessage('Failed to clear function explanations: ' + error.message);
        }
    }));
    return vscode.Disposable.from(...disposables);
}
exports.registerDebugCommands = registerDebugCommands;
//# sourceMappingURL=debugCommands.js.map