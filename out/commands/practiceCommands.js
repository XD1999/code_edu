"use strict";
/** Practice-problem commands: generate a new problem and browse the set. */
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
exports.registerPracticeCommands = void 0;
const vscode = __importStar(require("vscode"));
const util_1 = require("../core/util");
function registerPracticeCommands(services) {
    const disposables = [];
    const { knowledgeMapProvider, aiService } = services;
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.generatePractice', async (termId, branchType, difficulty) => {
        const currentCtx = knowledgeMapProvider.getCurrentContext();
        if (!currentCtx)
            return;
        const term = (0, util_1.findTermById)(currentCtx, termId);
        if (!term)
            return;
        const branch = term.branches.find(b => b.type === branchType);
        if (!branch)
            return;
        if (!branch.practices)
            branch.practices = [];
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating practice problem...',
            cancellable: false
        }, async () => {
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
    }));
    disposables.push(vscode.commands.registerCommand('ai-debug-explainer.showPracticeSet', async (termId, branchType) => {
        const currentCtx = knowledgeMapProvider.getCurrentContext();
        if (!currentCtx)
            return;
        const term = (0, util_1.findTermById)(currentCtx, termId);
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
    }));
    return vscode.Disposable.from(...disposables);
}
exports.registerPracticeCommands = registerPracticeCommands;
//# sourceMappingURL=practiceCommands.js.map