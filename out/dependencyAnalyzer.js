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
exports.DependencyAnalyzer = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class DependencyAnalyzer {
    constructor() {
        this.nodes = new Map();
        this.workspaceRoot = '';
    }
    async analyze(workspaceUri) {
        this.nodes.clear();
        this.workspaceRoot = workspaceUri.fsPath;
        // Find all relevant files
        // Exclude node_modules, .git, __pycache__, venv, etc.
        const excludePattern = '**/{node_modules,.git,.vscode,__pycache__,venv,env,dist,out,build}/**';
        const includePattern = '**/*.{ts,js,py,tsx,jsx}';
        const files = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceUri, includePattern), excludePattern);
        for (const file of files) {
            await this.processFile(file);
        }
    }
    async processFile(uri) {
        const relativePath = vscode.workspace.asRelativePath(uri);
        const extension = path.extname(relativePath).toLowerCase();
        const content = await vscode.workspace.fs.readFile(uri);
        const text = new TextDecoder().decode(content);
        const dependencies = [];
        if (extension === '.ts' || extension === '.js' || extension === '.tsx' || extension === '.jsx') {
            this.extractJSDependencies(text, dependencies);
        }
        else if (extension === '.py') {
            this.extractPythonDependencies(text, dependencies);
        }
        this.nodes.set(relativePath, {
            id: relativePath,
            type: 'file',
            dependencies: [...new Set(dependencies)] // deduplicate
        });
    }
    extractJSDependencies(text, deps) {
        // Simple regex for imports
        // import ... from '...'
        // require('...')
        const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"]([^'"]+)['"]/g;
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
        let match;
        while ((match = importRegex.exec(text)) !== null) {
            deps.push(match[1]);
        }
        while ((match = requireRegex.exec(text)) !== null) {
            deps.push(match[1]);
        }
        while ((match = dynamicImportRegex.exec(text)) !== null) {
            deps.push(match[1]);
        }
    }
    extractPythonDependencies(text, deps) {
        // from ... import ...
        // import ...
        const fromImportRegex = /^from\s+([\w.]+)\s+import/gm;
        const importRegex = /^import\s+([\w.]+)/gm;
        let match;
        while ((match = fromImportRegex.exec(text)) !== null) {
            deps.push(match[1]);
        }
        while ((match = importRegex.exec(text)) !== null) {
            deps.push(match[1]);
        }
    }
    getOverviewText() {
        let output = '# Project Overview & Dependencies\n\n';
        // Group by directory for readability
        const files = Array.from(this.nodes.values()).sort((a, b) => a.id.localeCompare(b.id));
        for (const node of files) {
            output += `## ${node.id}\n`;
            if (node.dependencies.length > 0) {
                output += `Depends on: ${node.dependencies.join(', ')}\n`;
            }
            else {
                output += `No detected dependencies.\n`;
            }
            output += '\n';
        }
        return output;
    }
    getMermaidGraph() {
        let graph = 'graph TD\n';
        const fileIdToNodeId = new Map();
        let counter = 0;
        // Create unique Node IDs (A, B, C...) to avoid special char issues in Mermaid
        for (const [path, node] of this.nodes) {
            const safeId = `N${counter++}`;
            fileIdToNodeId.set(path, safeId);
            // Use basename for label to keep it clean
            const label = path.split('/').pop() || path;
            graph += `    ${safeId}["${label}"]\n`;
        }
        // Add edges
        for (const [sourcePath, node] of this.nodes) {
            const sourceId = fileIdToNodeId.get(sourcePath);
            if (!sourceId)
                continue;
            for (const dep of node.dependencies) {
                // Try to resolve dependency to a known file
                // Dependencies in imports are often "relative" or "module names"
                // e.g. './utils' or 'react'
                // If it's a 3rd party lib (no ./ or /), we might skip or show as external?
                // For now, let's try to find a best fuzzy match in our file list for local files
                const resolved = this.resolveDependency(sourcePath, dep);
                if (resolved && fileIdToNodeId.has(resolved)) {
                    const targetId = fileIdToNodeId.get(resolved);
                    graph += `    ${sourceId} --> ${targetId}\n`;
                }
            }
        }
        return graph;
    }
    resolveDependency(sourcePath, dep) {
        // Very basic resolution
        if (dep.startsWith('.')) {
            // resolve relative to sourcePath
            try {
                const dir = path.dirname(sourcePath);
                // Simple string manipulation or use path.resolve logic if we had full paths
                // Since our IDs are relative to root, we can try to join
                // But we don't have 'path' module with full fs capability here easily for "relative strings"
                // Let's mimic basic join:
                // Normalize is tricky without full path lib for browser context, but valid for Node (extension host)
                // We are in Node extension host, so 'path' module works.
                const absoluteSource = path.join('/root', dir); // imaginary root
                const absoluteTarget = path.join(absoluteSource, dep);
                let relativeTarget = absoluteTarget.replace('/root/', '');
                // Try .ts, .js extensions
                if (this.nodes.has(relativeTarget))
                    return relativeTarget;
                if (this.nodes.has(relativeTarget + '.ts'))
                    return relativeTarget + '.ts';
                if (this.nodes.has(relativeTarget + '.js'))
                    return relativeTarget + '.js';
                if (this.nodes.has(relativeTarget + '.py'))
                    return relativeTarget + '.py';
                if (this.nodes.has(relativeTarget + '/index.ts'))
                    return relativeTarget + '/index.ts';
            }
            catch (e) {
                return null;
            }
        }
        // Non-relative import (modules or absolute from root? Python usually absolute)
        // Python: 'models.user' -> 'models/user.py'
        if (!dep.startsWith('.')) {
            const pyPath = dep.replace(/\./g, '/') + '.py';
            if (this.nodes.has(pyPath))
                return pyPath;
            // Maybe it is just a filename match?
            for (const key of this.nodes.keys()) {
                if (key.endsWith(dep + '.ts') || key.endsWith(dep + '.js') || key.endsWith(dep + '.py')) {
                    // Be careful of false positives, but for overview this is okay
                    return key;
                }
            }
        }
        return null;
    }
}
exports.DependencyAnalyzer = DependencyAnalyzer;
//# sourceMappingURL=dependencyAnalyzer.js.map