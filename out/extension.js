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
let isActive = false;
let debugSessionTracker = null;
let knowledgeLibrary = null;
function activate(context) {
    console.log('AI Debug Explainer: activate called');
    // Set default auto-select family attempt timeout to 1000ms to improve connectivity
    if (net.setDefaultAutoSelectFamilyAttemptTimeout) {
        net.setDefaultAutoSelectFamilyAttemptTimeout(1000);
    }
    // Initialize knowledge library
    knowledgeLibrary = new knowledgeLibrary_1.KnowledgeLibrary(context);
    // Register the toggle command
    const toggleCommand = vscode.commands.registerCommand('ai-debug-explainer.toggle', () => {
        console.log('AI Debug Explainer: toggle command executed, current state:', isActive);
        isActive = !isActive;
        vscode.window.showInformationMessage(`AI Debug Explainer is now ${isActive ? 'active' : 'inactive'}`);
        if (isActive && !debugSessionTracker) {
            console.log('AI Debug Explainer: creating new DebugSessionTracker');
            const aiService = new aiService_1.AIService();
            debugSessionTracker = new debugSessionTracker_1.DebugSessionTracker(aiService, knowledgeLibrary);
            // Subscribe to debug session events
            context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(session => {
                console.log('AI Debug Explainer: onDidChangeActiveDebugSession triggered', session?.id);
                if (session) {
                    debugSessionTracker?.setActiveSession(session);
                }
            }), vscode.debug.onDidTerminateDebugSession(() => {
                console.log('AI Debug Explainer: onDidTerminateDebugSession triggered');
                debugSessionTracker?.clearActiveSession();
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
    context.subscriptions.push(vscode.debug.onDidChangeActiveDebugSession(session => {
        console.log('AI Debug Explainer: automatic onDidChangeActiveDebugSession triggered', session?.id);
        if (session) {
            if (!debugSessionTracker) {
                console.log('AI Debug Explainer: automatically creating DebugSessionTracker');
                const aiService = new aiService_1.AIService();
                debugSessionTracker = new debugSessionTracker_1.DebugSessionTracker(aiService, knowledgeLibrary);
            }
            debugSessionTracker.setActiveSession(session);
        }
        else if (!session && debugSessionTracker) {
            console.log('AI Debug Explainer: automatically clearing DebugSessionTracker');
            debugSessionTracker.clearActiveSession();
        }
    }));
    // Register the start learning command
    const startLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.startLearning', () => {
        console.log('AI Debug Explainer: startLearning command executed');
        if (debugSessionTracker) {
            debugSessionTracker.startRecording();
            vscode.window.showInformationMessage('AI Learning Mode Started. Please run your code to teach the extension.');
        }
        else {
            vscode.window.showErrorMessage('Please activate the extension first (Toggle AI Debug Explainer).');
        }
    });
    // Register the stop learning command
    const stopLearningCommand = vscode.commands.registerCommand('ai-debug-explainer.stopLearning', async () => {
        console.log('AI Debug Explainer: stopLearning command executed');
        if (debugSessionTracker) {
            vscode.window.showInformationMessage('Stopping learning mode...');
            const count = await debugSessionTracker.stopRecording();
            if (count > 0) {
                vscode.window.showInformationMessage(`Learning Complete! Learned ${count} functions based on your execution.`);
            }
        }
        else {
            vscode.window.showErrorMessage('No active debug session tracker.');
        }
    });
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(startLearningCommand);
    context.subscriptions.push(stopLearningCommand);
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