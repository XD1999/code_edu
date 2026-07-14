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

import * as vscode from 'vscode';

export type LanguageDimension = 'description' | 'model';

const STATE_KEY = 'ai-debug-explainer.languageMode';
const TOGGLE_COMMAND = 'ai-debug-explainer.toggleLanguageMode';

export class LanguageMode implements vscode.Disposable {
    private _dimension: LanguageDimension;
    private readonly _status: vscode.StatusBarItem;

    constructor(private readonly context: vscode.ExtensionContext) {
        this._dimension = context.globalState.get<LanguageDimension>(STATE_KEY) ?? 'description';
        this._status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this._status.command = TOGGLE_COMMAND;
        this._status.tooltip = 'AI Debug Explainer: switch language mode (Natural ⇄ Math). Click or press Ctrl+Alt+F.';
        this.refresh();
        this._status.show();
    }

    /** The current language dimension used to resolve pedagogical prompts. */
    get dimension(): LanguageDimension {
        return this._dimension;
    }

    /** Flip between natural-language and math, persist, and refresh the UI. */
    toggle(): void {
        this._dimension = this._dimension === 'description' ? 'model' : 'description';
        this.context.globalState.update(STATE_KEY, this._dimension);
        this.refresh();
        vscode.window.showInformationMessage(
            `AI Explainer language mode: ${this._dimension === 'description' ? 'Natural Language' : 'Math (Model)'}`
        );
    }

    private refresh(): void {
        this._status.text = `$(symbol-class) AI: ${this._dimension === 'description' ? 'Natural' : 'Math'}`;
    }

    dispose(): void {
        this._status.dispose();
    }
}
