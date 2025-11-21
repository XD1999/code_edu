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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.DebugSessionTracker = void 0;
var vscode = __importStar(require("vscode"));
var DebugSessionTracker = /** @class */ (function () {
    function DebugSessionTracker(aiService, knowledgeLibrary) {
        this.activeSession = null;
        this.projectOverview = '';
        this.isProcessing = false;
        this.aiService = aiService;
        this.knowledgeLibrary = knowledgeLibrary;
        // Listen for step into events
        vscode.debug.onDidChangeBreakpoints(function () {
            // This is a placeholder for step events
            // In a real implementation, we would listen for actual step events
        });
    }
    DebugSessionTracker.prototype.setActiveSession = function (session) {
        this.activeSession = session;
        // Generate project overview when session starts
        this.generateProjectOverview();
    };
    DebugSessionTracker.prototype.clearActiveSession = function () {
        this.activeSession = null;
        this.projectOverview = '';
    };
    DebugSessionTracker.prototype.generateProjectOverview = function () {
        return __awaiter(this, void 0, void 0, function () {
            var fileStructure, dependencies, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.getWorkspaceFileStructure()];
                    case 1:
                        fileStructure = _b.sent();
                        return [4 /*yield*/, this.getProjectDependencies()];
                    case 2:
                        dependencies = _b.sent();
                        // Generate overview using AI
                        _a = this;
                        return [4 /*yield*/, this.aiService.generateProjectOverview(fileStructure, dependencies)];
                    case 3:
                        // Generate overview using AI
                        _a.projectOverview = _b.sent();
                        // Save to knowledge library
                        return [4 /*yield*/, this.knowledgeLibrary.saveProjectOverview(this.projectOverview)];
                    case 4:
                        // Save to knowledge library
                        _b.sent();
                        vscode.window.showInformationMessage('Project overview generated and saved to knowledge library');
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _b.sent();
                        console.error('Error generating project overview:', error_1);
                        vscode.window.showErrorMessage('Failed to generate project overview');
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    DebugSessionTracker.prototype.handleStepInto = function () {
        return __awaiter(this, void 0, void 0, function () {
            var trace, functions, explanations, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.activeSession || this.isProcessing)
                            return [2 /*return*/];
                        this.isProcessing = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 7, 8, 9]);
                        return [4 /*yield*/, this.getStackTrace()];
                    case 2:
                        trace = _a.sent();
                        if (!(trace && trace.length > 0)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.extractFunctionsFromTrace(trace)];
                    case 3:
                        functions = _a.sent();
                        return [4 /*yield*/, this.explainFunctions(functions, trace)];
                    case 4:
                        explanations = _a.sent();
                        // Save to knowledge library
                        return [4 /*yield*/, this.knowledgeLibrary.saveFunctionExplanations(explanations)];
                    case 5:
                        // Save to knowledge library
                        _a.sent();
                        vscode.window.showInformationMessage("Explained ".concat(explanations.length, " functions and saved to knowledge library"));
                        _a.label = 6;
                    case 6: return [3 /*break*/, 9];
                    case 7:
                        error_2 = _a.sent();
                        console.error('Error handling step into:', error_2);
                        vscode.window.showErrorMessage('Failed to explain functions in trace');
                        return [3 /*break*/, 9];
                    case 8:
                        this.isProcessing = false;
                        return [7 /*endfinally*/];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    DebugSessionTracker.prototype.getStackTrace = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // This is a simplified implementation
                // In a real implementation, you would get the actual stack trace from the debug session
                return [2 /*return*/, []];
            });
        });
    };
    DebugSessionTracker.prototype.getWorkspaceFileStructure = function () {
        return __awaiter(this, void 0, void 0, function () {
            var files, fileStructure;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,c,cpp,cs}', '**/node_modules/**')];
                    case 1:
                        files = _a.sent();
                        fileStructure = {};
                        files.forEach(function (file) {
                            var relativePath = vscode.workspace.asRelativePath(file);
                            fileStructure[relativePath] = 'file';
                        });
                        return [2 /*return*/, fileStructure];
                }
            });
        });
    };
    DebugSessionTracker.prototype.getProjectDependencies = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Simplified dependency detection
                // In a real implementation, you would parse package.json, requirements.txt, etc.
                return [2 /*return*/, {
                        'package.json': 'detected',
                        'requirements.txt': 'not found'
                    }];
            });
        });
    };
    DebugSessionTracker.prototype.extractFunctionsFromTrace = function (trace) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Simplified function extraction
                // In a real implementation, you would extract function names and code from the trace
                return [2 /*return*/, []];
            });
        });
    };
    DebugSessionTracker.prototype.explainFunctions = function (functions, trace) {
        return __awaiter(this, void 0, void 0, function () {
            var explanations, traceContext, _i, functions_1, func, explanation;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        explanations = [];
                        traceContext = trace.map(function (frame) { return "".concat(frame.name, " (").concat(frame.file, ":").concat(frame.line, ")"); }).join(' -> ');
                        _i = 0, functions_1 = functions;
                        _a.label = 1;
                    case 1:
                        if (!(_i < functions_1.length)) return [3 /*break*/, 4];
                        func = functions_1[_i];
                        return [4 /*yield*/, this.aiService.explainFunction(func.code, func.name, this.projectOverview, traceContext)];
                    case 2:
                        explanation = _a.sent();
                        explanations.push({
                            functionName: func.name,
                            explanation: explanation
                        });
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, explanations];
                }
            });
        });
    };
    return DebugSessionTracker;
}());
exports.DebugSessionTracker = DebugSessionTracker;
