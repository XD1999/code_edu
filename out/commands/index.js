"use strict";
/**
 * Central command registration. Wiring every command module through this single
 * entry point keeps extension.ts thin and makes the set of commands easy to
 * audit at a glance.
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
exports.registerCommands = void 0;
const vscode = __importStar(require("vscode"));
const debugCommands_1 = require("./debugCommands");
const explainCommands_1 = require("./explainCommands");
const contextCommands_1 = require("./contextCommands");
const learningInstanceCommands_1 = require("./learningInstanceCommands");
const practiceCommands_1 = require("./practiceCommands");
const visualizationCommands_1 = require("./visualizationCommands");
/** Register every command the extension contributes. Returns one Disposable. */
function registerCommands(services) {
    return vscode.Disposable.from((0, debugCommands_1.registerDebugCommands)(services), (0, explainCommands_1.registerExplainCommands)(services), (0, contextCommands_1.registerContextCommands)(services), (0, learningInstanceCommands_1.registerLearningInstanceCommands)(services), (0, practiceCommands_1.registerPracticeCommands)(services), (0, visualizationCommands_1.registerVisualizationCommands)(services));
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=index.js.map