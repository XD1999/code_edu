"use strict";
/** Context-extraction command: pulls context text from the clipboard. */
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
exports.registerContextCommands = void 0;
const vscode = __importStar(require("vscode"));
function registerContextCommands(services) {
    return vscode.commands.registerCommand('ai-debug-explainer.extractContext', async () => {
        console.log('AI Debug Explainer: extractContext command triggered');
        const clipboardText = await vscode.env.clipboard.readText();
        if (clipboardText && clipboardText.trim().length > 0) {
            services.knowledgeMapProvider.setCurrentContext(clipboardText);
            // Focus the view
            await vscode.commands.executeCommand('ai-debug-explainer.knowledgeMapView.focus');
            vscode.window.showInformationMessage('Context extracted from clipboard.');
        }
        else {
            vscode.window.showWarningMessage('Clipboard is empty. Please copy some text first.');
        }
    });
}
exports.registerContextCommands = registerContextCommands;
//# sourceMappingURL=contextCommands.js.map