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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.AIService = void 0;
var vscode = __importStar(require("vscode"));
var axios_1 = __importDefault(require("axios"));
var AIService = /** @class */ (function () {
    function AIService() {
        var config = vscode.workspace.getConfiguration('ai-debug-explainer');
        this.apiKey = config.get('apiKey', '');
        this.apiUrl = config.get('apiUrl', 'https://api.openai.com/v1/chat/completions');
        this.model = config.get('model', 'gpt-3.5-turbo');
        this.client = axios_1["default"].create({
            baseURL: this.apiUrl,
            headers: {
                'Authorization': "Bearer ".concat(this.apiKey),
                'Content-Type': 'application/json'
            }
        });
    }
    AIService.prototype.generateProjectOverview = function (fileStructure, dependencies) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt;
            return __generator(this, function (_a) {
                prompt = "\n\t\t\tGenerate a comprehensive overview and panorama of the target project. \n\t\t\tInclude all file and function names and dependency relationships.\n\t\t\t\n\t\t\tFile structure: ".concat(JSON.stringify(fileStructure, null, 2), "\n\t\t\tDependencies: ").concat(JSON.stringify(dependencies, null, 2), "\n\t\t\t\n\t\t\tResponse format:\n\t\t\t# Project Overview\n\t\t\t\n\t\t\t## File Structure\n\t\t\t[List all files and their purposes]\n\t\t\t\n\t\t\t## Key Functions\n\t\t\t[List key functions and their roles]\n\t\t\t\n\t\t\t## Dependency Relationships\n\t\t\t[Describe how modules/files depend on each other]\n\t\t");
                return [2 /*return*/, this.callAI(prompt)];
            });
        });
    };
    AIService.prototype.explainFunction = function (functionCode, functionName, projectOverview, traceContext) {
        return __awaiter(this, void 0, void 0, function () {
            var prompt;
            return __generator(this, function (_a) {
                prompt = "\n\t\t\tYou are helping a newcomer understand a complex project during debugging.\n\t\t\tUse the following project overview for context:\n\t\t\t\n\t\t\t".concat(projectOverview, "\n\t\t\t\n\t\t\tTrace context:\n\t\t\t").concat(traceContext, "\n\t\t\t\n\t\t\tFunction to explain:\n\t\t\tName: ").concat(functionName, "\n\t\t\tCode:\n\t\t\t```\n\t\t\t").concat(functionCode, "\n\t\t\t```\n\t\t\t\n\t\t\tPlease provide:\n\t\t\t1. Purpose: Explain the function's role in the overall project context\n\t\t\t2. Inputs: Describe what parameters it takes and what they represent\n\t\t\t3. Outputs: Describe what it returns and what it represents\n\t\t\t4. Process: Briefly explain key steps in the function's logic\n\t\t");
                return [2 /*return*/, this.callAI(prompt)];
            });
        });
    };
    AIService.prototype.callAI = function (prompt) {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.post('', {
                                model: this.model,
                                messages: [{ role: 'user', content: prompt }],
                                temperature: 0.3
                            })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.data.choices[0].message.content.trim()];
                    case 2:
                        error_1 = _a.sent();
                        console.error('AI Service Error:', error_1);
                        return [2 /*return*/, "Error generating explanation: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error')];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    return AIService;
}());
exports.AIService = AIService;
