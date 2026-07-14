import * as vscode from 'vscode';
import * as net from 'net';
import { Services } from './core/services';
import { registerCommands } from './commands';
import { makeExplainHandler } from './commands/explainCommands';
import { findPedagogyByApproach, PedagogicalType } from './pedagogy/registry';
import { TraceViewProvider } from './traceViewerPanel';
import { KnowledgeMapProvider } from './knowledgeMapPanel';
import { LearningInstance } from './traceModels';

// Owned by the activate/deactivate cycle.
let services: Services | null = null;

// This is the entry point for the extension activation
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Debug Explainer: activate called');

    // Set default auto-select family attempt timeout to 1000ms to improve connectivity
    if ((net as any).setDefaultAutoSelectFamilyAttemptTimeout) {
        (net as any).setDefaultAutoSelectFamilyAttemptTimeout(1000);
    }

    services = new Services(context);

    // The status bar item backing the global language-mode toggle lives on the
    // LanguageMode service; dispose it with the extension.
    context.subscriptions.push(services.languageMode);

    // Register the sidebar Trace View Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TraceViewProvider.viewType, services.traceViewProvider)
    );

    // Register the sidebar Knowledge Map Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(KnowledgeMapProvider.viewType, services.knowledgeMapProvider)
    );

    // Provide initial instances and architecture to the provider
    services.knowledgeMapProvider.setLearningInstances(services.knowledgeLibrary.getAllLearningInstances());
    const archGraph = services.knowledgeLibrary.getArchitectureGraph();
    if (archGraph) {
        services.traceViewProvider.updateArchitecture(archGraph);
    }

    // Register auto-save handler: saves context + graph whenever a named instance is mutated
    services.knowledgeMapProvider.setAutoSaveHandler(async (contextNode, name, graph) => {
        const knowledgeLibrary = services!.knowledgeLibrary;
        const existingInstance = knowledgeLibrary.findLearningInstanceByName(name);
        const instance: LearningInstance = {
            id: existingInstance ? existingInstance.id : `instance-${Date.now()}`,
            name,
            rootContext: contextNode,
            knowledgeGraph: graph,
            createdAt: existingInstance ? existingInstance.createdAt : Date.now()
        };
        await knowledgeLibrary.saveLearningInstance(instance);
        services!.knowledgeMapProvider.setLearningInstances(knowledgeLibrary.getAllLearningInstances());
    });

    // Context-arch handler: generates the shallow logic framework when a context
    // is set. Passes the known-framework registry so the AI prefers known
    // frameworks and can propose new ones. If any BLOCK uses a new framework,
    // the user is offered a Save prompt per new framework (fire-and-forget so
    // arch rendering isn't blocked); on Save the framework is persisted.
    services.knowledgeMapProvider.setContextArchHandler(async (contextText) => {
        const graph = await services!.aiService.generateContextArch(
            contextText, services!.frameworkRegistry.list()
        );
        // Collect distinct new frameworks across blocks (and the legacy top-level flag).
        const newFws: { parent: 'natural' | 'panoramic'; name: string; description: string }[] = [];
        const seen = new Set<string>();
        const push = (parent: 'natural' | 'panoramic', name: string, description: string) => {
            const key = `${parent}/${name}`;
            if (name && !seen.has(key)) {
                seen.add(key);
                newFws.push({ parent, name, description });
            }
        };
        if (graph.boxes) {
            for (const b of graph.boxes) {
                if (b.isNewFramework) {
                    push(b.category, b.framework, b.frameworkDescription || '');
                }
            }
        } else if (graph.isNewFramework && graph.framework) {
            push(graph.category || 'natural', graph.framework, graph.frameworkDescription || '');
        }
        for (const fw of newFws) {
            vscode.window.showInformationMessage(
                `New logic framework detected: "${fw.name}"${fw.description ? ' — ' + fw.description : ''}. Save it as a known framework for future arch generation?`,
                'Save',
                'Dismiss'
            ).then(async (choice) => {
                if (choice === 'Save') {
                    await services!.frameworkRegistry.add({
                        parent: fw.parent,
                        name: fw.name,
                        description: fw.description
                    });
                    vscode.window.showInformationMessage(`Framework "${fw.name}" saved.`);
                }
            });
        }
        return graph;
    });

    // Connect the shared explain handler to both providers.
    // Trace view uses the encapsulation approach, with the language (natural vs
    // math) resolved from the global LanguageMode and never auto-visualizing.
    const explainHandler = makeExplainHandler(services);
    services.traceViewProvider.setExplainHandler((term, ctx) => {
        const type = findPedagogyByApproach('encapsulation', services!.languageMode.dimension).type as PedagogicalType;
        return explainHandler(term, ctx, type, false);
    });
    services.knowledgeMapProvider.setExplainHandler(explainHandler);

    // One consolidated debug-session lifecycle subscription. The tracker is
    // created lazily on demand; this replaces the duplicate subscriptions that
    // previously lived both here and inside the toggle command.
    context.subscriptions.push(
        vscode.debug.onDidStartDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session STARTED', {
                sessionId: session.id,
                type: session.type,
                name: session.name,
                timestamp: new Date().toISOString()
            });
            services!.ensureDebugTracker().addSession(session);
        }),

        vscode.debug.onDidChangeActiveDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Active session changed', {
                sessionId: session?.id,
                timestamp: new Date().toISOString()
            });
            if (session) {
                services!.ensureDebugTracker().addSession(session);
            }
        }),

        vscode.debug.onDidTerminateDebugSession(session => {
            console.log('AI Debug Explainer: [SESSION LIFECYCLE] Debug session TERMINATED', {
                sessionId: session.id,
                timestamp: new Date().toISOString()
            });
            services?.debugTracker?.removeSession(session.id);
        }),

        vscode.debug.onDidReceiveDebugSessionCustomEvent(event => {
            console.log('AI Debug Explainer: Received debug session custom event', {
                sessionId: event.session.id,
                sessionType: event.session.type,
                sessionName: event.session.name,
                eventType: event.event,
                eventBodyKeys: event.body ? Object.keys(event.body) : [],
                hasOutput: !!(event.body && event.body.output),
                timestamp: new Date().toISOString()
            });
        }),

        // Listen for all debug adapter events
        vscode.debug.onDidChangeBreakpoints(e => {
            console.log('AI Debug Explainer: Breakpoints changed', e);
        })
    );

    // Register every command through the single entry point.
    context.subscriptions.push(registerCommands(services));

    // Global language-mode toggle (Ctrl+Alt+F): switches the whole extension
    // between natural-language and math prompts. Backed by the LanguageMode
    // service (status bar + persisted globalState).
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-debug-explainer.toggleLanguageMode', () => {
            services!.languageMode.toggle();
        })
    );

    // Manage saved (user) frameworks: QuickPick to delete one. Built-ins are
    // not listed (they cannot be removed). Used to discard frameworks that
    // turned out not abstract enough (e.g. "stepwise-derivation").
    context.subscriptions.push(
        vscode.commands.registerCommand('ai-debug-explainer.manageFrameworks', async () => {
            const userFws = services!.frameworkRegistry.listUser();
            if (userFws.length === 0) {
                vscode.window.showInformationMessage('No user-saved frameworks to manage.');
                return;
            }
            const items = userFws.map(f => ({
                label: `${f.parent}/${f.name}`,
                description: f.description,
                parent: f.parent,
                name: f.name
            }));
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a saved framework to delete (built-ins cannot be removed)'
            });
            if (!picked) { return; }
            const removed = await services!.frameworkRegistry.remove(picked.parent, picked.name);
            if (removed) {
                vscode.window.showInformationMessage(`Framework "${picked.label}" discarded.`);
            } else {
                vscode.window.showInformationMessage(`Could not discard "${picked.label}" (it may be a built-in or already removed).`);
            }
        })
    );

    console.log('AI Debug Explainer: activation completed');
}

export function deactivate() {
    // Clean up resources
    console.log('AI Debug Explainer: deactivate called');
    services?.disposeDebugTracker();
    services = null;
}
