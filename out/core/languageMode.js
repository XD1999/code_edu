"use strict";
/**
 * Global language mode — the extension-wide choice between natural-language
 * (description) and mathematical (model) explanations.
 *
 * This decouples *language* from the explain/compare keybindings: the modifier
 * (Ctrl+Alt vs Ctrl+Shift) controls whether a visualization is auto-generated,
 * while *which language* the prompt uses is this single global choice, toggled
 * by the `ai-debug-explainer.toggleLanguageMode` command (Ctrl+Alt+F).
 *
 * The choice is persisted in `globalState` so it survives reloads, and is
 * surfaced in a clickable status bar item.
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
exports.LanguageMode = void 0;
const vscode = __importStar(require("vscode"));
const STATE_KEY = 'ai-debug-explainer.languageMode';
const TOGGLE_COMMAND = 'ai-debug-explainer.toggleLanguageMode';
class LanguageMode {
    constructor(context) {
        this.context = context;
        this._dimension = context.globalState.get(STATE_KEY) ?? 'description';
        this._status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this._status.command = TOGGLE_COMMAND;
        this._status.tooltip = 'AI Debug Explainer: switch language mode (Natural ⇄ Math). Click or press Ctrl+Alt+F.';
        this.refresh();
        this._status.show();
    }
    /** The current language dimension used to resolve pedagogical prompts. */
    get dimension() {
        return this._dimension;
    }
    /** Flip between natural-language and math, persist, and refresh the UI. */
    toggle() {
        this._dimension = this._dimension === 'description' ? 'model' : 'description';
        this.context.globalState.update(STATE_KEY, this._dimension);
        this.refresh();
        vscode.window.showInformationMessage(`AI Explainer language mode: ${this._dimension === 'description' ? 'Natural Language' : 'Math (Model)'}`);
    }
    refresh() {
        this._status.text = `$(symbol-class) AI: ${this._dimension === 'description' ? 'Natural' : 'Math'}`;
    }
    dispose() {
        this._status.dispose();
    }
}
exports.LanguageMode = LanguageMode;
//# sourceMappingURL=languageMode.js.map