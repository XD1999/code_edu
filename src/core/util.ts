/**
 * Shared helpers used across the extension: webview nonces, filename
 * sanitization, and the recursive tree-walks over the ContextNode/TermNode
 * graph that were previously duplicated in extension.ts and the webview panels.
 */

import { ContextNode, TermNode } from '../traceModels';

/** Cryptographically-non-required nonce for the webview Content-Security-Policy. */
export function getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Turn an arbitrary expression string into a safe filesystem basename.
 * Keeps alphanumerics, CJK, underscore, hyphen; collapses spaces; caps length.
 */
export function sanitizeFilename(text: string): string {
    return text
        .replace(/\r?\n|\r/g, ' ')
        .replace(/[^a-zA-Z0-9一-龥_\- ]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100);
}

// Whitespace and zero-width characters to strip when comparing term names.
const normalizeTerm = (s: string): string =>
    s.replace(/[\s​-‍﻿]+/g, '').toLowerCase();

/** Recursively find a term by id anywhere in the context tree. */
export function findTermById(context: ContextNode, id: string): TermNode | undefined {
    for (const p of context.paragraphs) {
        const t = p.terms.find(term => term.id === id);
        if (t) return t;
        for (const term of p.terms) {
            for (const branch of term.branches) {
                if (branch.childContext) {
                    const found = findTermById(branch.childContext, id);
                    if (found) return found;
                }
            }
        }
    }
    return undefined;
}

/** Recursively find a term by display name (whitespace/zero-width-insensitive). */
export function findTermByName(context: ContextNode | null, name: string): TermNode | undefined {
    if (!context) return undefined;
    const normalizedName = normalizeTerm(name);
    for (const p of context.paragraphs) {
        const t = p.terms.find(term => normalizeTerm(term.term) === normalizedName);
        if (t) return t;
        for (const term of p.terms) {
            for (const branch of term.branches) {
                if (branch.childContext) {
                    const found = findTermByName(branch.childContext, name);
                    if (found) return found;
                }
            }
        }
    }
    return undefined;
}

/** Recursively collect every distinct term display name in the context tree. */
export function collectTermNames(context: ContextNode, names: string[]): void {
    for (const para of context.paragraphs) {
        for (const term of para.terms) {
            if (!names.includes(term.term)) {
                names.push(term.term);
            }
            for (const branch of term.branches) {
                if (branch.childContext) {
                    collectTermNames(branch.childContext, names);
                }
            }
        }
    }
}

/** Recursively delete the term with the given id; returns true if removed. */
export function recursiveDeleteTerm(context: ContextNode, termId: string): boolean {
    for (const para of context.paragraphs) {
        const index = para.terms.findIndex(t => t.id === termId);
        if (index >= 0) {
            para.terms.splice(index, 1);
            return true;
        }
        for (const t of para.terms) {
            for (const branch of t.branches) {
                if (branch.childContext) {
                    if (recursiveDeleteTerm(branch.childContext, termId)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

/** Collect every visualization file path reachable from a term (incl. children). */
export function collectVisualizationFiles(term: TermNode, files: string[]): void {
    if (term.visualizations) {
        term.visualizations.forEach(v => files.push(v.filePath));
    }
    term.branches.forEach(branch => {
        if (branch.childContext) {
            branch.childContext.paragraphs.forEach(para => {
                para.terms.forEach(childTerm => {
                    collectVisualizationFiles(childTerm, files);
                });
            });
        }
    });
}
