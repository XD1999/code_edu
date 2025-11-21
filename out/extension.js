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
const debugSessionTracker_1 = require("./debugSessionTracker");
const knowledgeLibrary_1 = require("./knowledgeLibrary");
const aiService_1 = require("./aiService");
const knowledgePanel_1 = require("./knowledgePanel");
let isActive = false;
let debugSessionTracker = null;
let knowledgeLibrary = null;
let knowledgePanel = null;
function activate(context) {
    console.log('AI Debug Explainer: activate called');
    // Initialize knowledge library
    knowledgeLibrary = new knowledgeLibrary_1.KnowledgeLibrary(context);
    knowledgePanel = new knowledgePanel_1.KnowledgePanel(knowledgeLibrary);
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
    // Register command to show knowledge panel
    const showKnowledgeCommand = vscode.commands.registerCommand('ai-debug-explainer.showKnowledge', () => {
        console.log('AI Debug Explainer: showKnowledge command executed');
        knowledgePanel?.show();
    });
    context.subscriptions.push(toggleCommand);
    context.subscriptions.push(showKnowledgeCommand);
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