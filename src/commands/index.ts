/**
 * Central command registration. Wiring every command module through this single
 * entry point keeps extension.ts thin and makes the set of commands easy to
 * audit at a glance.
 */

import * as vscode from 'vscode';
import { Services } from '../core/services';
import { registerDebugCommands } from './debugCommands';
import { registerExplainCommands } from './explainCommands';
import { registerContextCommands } from './contextCommands';
import { registerLearningInstanceCommands } from './learningInstanceCommands';
import { registerPracticeCommands } from './practiceCommands';
import { registerVisualizationCommands } from './visualizationCommands';

/** Register every command the extension contributes. Returns one Disposable. */
export function registerCommands(services: Services): vscode.Disposable {
    return vscode.Disposable.from(
        registerDebugCommands(services),
        registerExplainCommands(services),
        registerContextCommands(services),
        registerLearningInstanceCommands(services),
        registerPracticeCommands(services),
        registerVisualizationCommands(services)
    );
}
