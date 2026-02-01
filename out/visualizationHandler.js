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
exports.VisualizationHandler = void 0;
const vscode = __importStar(require("vscode"));
class VisualizationHandler {
    constructor(context) {
        this.context = context;
    }
    /**
     * Checks if the AI response contains visualization instructions
     * @param response The AI-generated response
     * @returns True if visualization instructions are detected
     */
    hasVisualizationInstructions(response) {
        const lowerResponse = response.toLowerCase();
        // Keywords that typically indicate visualization requests
        const visualizationKeywords = [
            'visualization',
            'visualize',
            'plot',
            'chart',
            'graph',
            'diagram',
            'show as',
            'display as',
            'generate plot',
            'create chart',
            'draw',
            'matplotlib',
            'seaborn',
            'plotly',
            'ggplot',
            'd3',
            'svg',
            'png',
            'image',
            'bar chart',
            'line chart',
            'scatter plot',
            'histogram',
            'heatmap',
            'pie chart',
            'network graph',
            'flowchart',
            'timeline',
            'distribution',
            'correlation matrix'
        ];
        return visualizationKeywords.some(keyword => lowerResponse.includes(keyword));
    }
    /**
     * Generates a visualization script from the AI response and saves it to a file
     * @param response The AI-generated response containing visualization instructions
     * @param term The term being explained
     * @returns The path of the generated visualization script
     */
    async generateVisualizationScript(response, term) {
        // Extract the visualization code from the response
        const codeBlocks = this.extractCodeBlocks(response);
        if (codeBlocks.length === 0) {
            // If no code blocks found, create a basic template
            return await this.createBasicVisualizationTemplate(response, term);
        }
        // Get the first code block that seems to be visualization-related
        const vizCode = codeBlocks.find(block => this.isVisualizationCode(block)) || codeBlocks[0];
        // Determine the appropriate file extension based on the content
        const extension = this.getFileExtension(vizCode);
        const fileName = `${this.sanitizeFileName(term)}_visualization.${extension}`;
        // Create the visualization script file
        const vizScriptPath = vscode.Uri.joinPath(this.context.globalStorageUri, 'visualizations', fileName);
        // Ensure the visualizations directory exists
        const vizDir = vscode.Uri.joinPath(this.context.globalStorageUri, 'visualizations');
        try {
            await vscode.workspace.fs.createDirectory(vizDir);
        }
        catch (error) {
            // Directory might already exist, which is fine
        }
        // Write the visualization script
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(vizScriptPath, encoder.encode(vizCode));
        // Show notification to user
        const selection = await vscode.window.showInformationMessage(`Visualization script generated for "${term}"`, 'Open Script', 'Open Directory', 'Dismiss');
        if (selection === 'Open Script') {
            const doc = await vscode.workspace.openTextDocument(vizScriptPath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        else if (selection === 'Open Directory') {
            await vscode.commands.executeCommand('revealFileInOS', vizScriptPath);
        }
        return vizScriptPath.fsPath;
    }
    /**
     * Extracts code blocks from the response
     * @param response The AI-generated response
     * @returns Array of code blocks found in the response
     */
    extractCodeBlocks(response) {
        const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
        const matches = [];
        let match;
        while ((match = codeBlockRegex.exec(response)) !== null) {
            matches.push(match[1].trim());
        }
        return matches;
    }
    /**
     * Determines if the code block is likely a visualization script
     * @param code The code block to check
     * @returns True if the code appears to be a visualization script
     */
    isVisualizationCode(code) {
        const lowerCode = code.toLowerCase();
        // Check for common visualization libraries and plotting functions
        const vizPatterns = [
            'matplotlib',
            'seaborn',
            'plotly',
            'plt.',
            'sns.',
            'fig, ax',
            'plot(',
            'scatter(',
            'bar(',
            'hist(',
            'heatmap(',
            'line(',
            'chart(',
            'd3.',
            'svg',
            'canvas',
            'ggplot'
        ];
        return vizPatterns.some(pattern => lowerCode.includes(pattern));
    }
    /**
     * Determines the appropriate file extension based on the code content
     * @param code The visualization code
     * @returns The appropriate file extension
     */
    getFileExtension(code) {
        const lowerCode = code.toLowerCase();
        if (lowerCode.includes('import matplotlib') || lowerCode.includes('plt.')) {
            return 'py';
        }
        else if (lowerCode.includes('import plotly') || lowerCode.includes('plotly.')) {
            return 'py';
        }
        else if (lowerCode.includes('import seaborn') || lowerCode.includes('sns.')) {
            return 'py';
        }
        else if (lowerCode.includes('d3.')) {
            return 'js';
        }
        else if (lowerCode.includes('<svg') || lowerCode.includes('svg.')) {
            return 'html';
        }
        else if (lowerCode.includes('ggplot')) {
            return 'r';
        }
        // Default to Python if it contains Python-like syntax
        if (lowerCode.includes('import ') || lowerCode.includes('def ') || lowerCode.includes('print(')) {
            return 'py';
        }
        // Default to HTML for web-based visualizations
        return 'html';
    }
    /**
     * Creates a basic visualization template when no code is found in the response
     * @param response The AI-generated response
     * @param term The term being explained
     * @returns Path to the created visualization script
     */
    async createBasicVisualizationTemplate(response, term) {
        // Create a basic Python visualization template
        const template = `# Visualization for "${term}"
import matplotlib.pyplot as plt
import numpy as np

# Sample data - replace with actual data relevant to "${term}"
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(10, 6))
plt.plot(x, y, label='Sample visualization for "${term}"')
plt.title('Visualization of "${term}"')
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.legend()
plt.grid(True)
plt.show()

# Explanation from AI:
"""
${response}
"""
`;
        const fileName = `${this.sanitizeFileName(term)}_visualization.py`;
        const vizScriptPath = vscode.Uri.joinPath(this.context.globalStorageUri, 'visualizations', fileName);
        // Ensure the visualizations directory exists
        const vizDir = vscode.Uri.joinPath(this.context.globalStorageUri, 'visualizations');
        try {
            await vscode.workspace.fs.createDirectory(vizDir);
        }
        catch (error) {
            // Directory might already exist, which is fine
        }
        // Write the visualization script
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(vizScriptPath, encoder.encode(template));
        return vizScriptPath.fsPath;
    }
    /**
     * Sanitizes a filename by removing invalid characters
     * @param name The original name
     * @returns A sanitized version suitable for filenames
     */
    sanitizeFileName(name) {
        return name
            .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace invalid characters with underscores
            .substring(0, 50) // Limit length
            .toLowerCase();
    }
}
exports.VisualizationHandler = VisualizationHandler;
//# sourceMappingURL=visualizationHandler.js.map