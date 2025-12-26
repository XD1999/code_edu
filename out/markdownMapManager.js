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
exports.MarkdownMapManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class MarkdownMapManager {
    constructor(panelProvider) {
        this.fileName = 'knowledge-map.md';
        this._panelProvider = panelProvider;
    }
    getFilePath() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return path.join(workspaceFolders[0].uri.fsPath, this.fileName);
    }
    async setContext(text) {
        const filePath = this.getFilePath();
        if (!filePath) {
            throw new Error('No open workspace to save the map.');
        }
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        let content = `# Knowledge Map\n\n`;
        content += `> **Context Set:** ${new Date().toLocaleString()}\n\n`;
        paragraphs.forEach((para, index) => {
            content += `${para.trim()}\n\n`;
            // Add a placeholder line for terms to ensure structure
            content += `**Terms:** \n\n`;
            content += `---\n\n`;
        });
        fs.writeFileSync(filePath, content, 'utf8');
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc, { preview: false });
    }
    async addTerm(term, explanation) {
        const filePath = this.getFilePath();
        if (!filePath || !fs.existsSync(filePath)) {
            throw new Error('Knowledge Map file not found. Please Extract Context first (Ctrl+Alt+S).');
        }
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        // Strategy: Find the paragraph containing the term.
        // Then find the "**Terms:**" line immediately following it.
        // Then append the term to that line.
        // Then append the explanation block at the end of that section (before "---").
        let bestMatchIndex = -1;
        // Simple search: Find line containing the exact term in the context text (not in terms list or details)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip headers, separators, existing terms lines, and explanation blocks
            if (line.startsWith('#') || line.startsWith('**Terms:**') || line.startsWith('<details') || line.startsWith('---') || line.startsWith('>') || line.trim() === '') {
                continue;
            }
            if (line.toLowerCase().includes(term.toLowerCase())) {
                bestMatchIndex = i;
                break; // Found the first containing paragraph
            }
        }
        if (bestMatchIndex === -1) {
            // Term not found in context, append to specific "Loose Ends" or just the end?
            // For now, let's append a "Loose Ends" section if not exists
            if (!content.includes('## External Terms')) {
                content += `## External Terms\n\n**Terms:** \n\n---\n`;
            }
            // Re-read lines to find this section... expensive?
            // Simplification: Just regex replace for now.
            // Fallback: Just append to end
            // Not ideal. Let's error or warn? 
            vscode.window.showWarningMessage(`Term "${term}" not found in current context paragraphs. Added to bottom.`);
            content += `\n**Term:** ${term}\n<details>\n<summary>Explanation</summary>\n\n${explanation}\n</details>\n\n---\n`;
            fs.writeFileSync(filePath, content, 'utf8');
            return;
        }
        // We found the paragraph at bestMatchIndex.
        // Now look forward for "**Terms:**"
        let termsLineIndex = -1;
        for (let i = bestMatchIndex + 1; i < lines.length; i++) {
            if (lines[i].startsWith('**Terms:**')) {
                termsLineIndex = i;
                break;
            }
            if (lines[i].startsWith('---') || lines[i].startsWith('#')) {
                break; // Boundary hit
            }
        }
        if (termsLineIndex !== -1) {
            // 1. Add term to the Terms line
            // Check if already there?
            if (!lines[termsLineIndex].includes(`[${term}]`)) {
                lines[termsLineIndex] += ` [${term}]`; // Add as a "button" look
            }
            // 2. Add explanation after the Terms line (inserting it)
            const explanationBlock = `\n<details>\n<summary>Use: ${term}</summary>\n\n${explanation}\n</details>\n`;
            lines.splice(termsLineIndex + 1, 0, explanationBlock);
            const newContent = lines.join('\n');
            fs.writeFileSync(filePath, newContent, 'utf8');
            // Optionally focus the file
            const doc = await vscode.workspace.openTextDocument(filePath);
            // Don't force focus if already visible to avoid jumping
            // vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        }
    }
    // Helper to read context directly from file if we need it for AI
    getCurrentContext() {
        const filePath = this.getFilePath();
        if (!filePath || !fs.existsSync(filePath)) {
            return '';
        }
        return fs.readFileSync(filePath, 'utf8');
    }
}
exports.MarkdownMapManager = MarkdownMapManager;
//# sourceMappingURL=markdownMapManager.js.map