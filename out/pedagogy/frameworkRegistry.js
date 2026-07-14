"use strict";
/**
 * Framework registry — the logic frameworks the arch generator classifies into.
 *
 * All frameworks are DATA, not code: the shipped defaults live in
 * `resources/frameworks.default.json` (versioned with the extension), and
 * user-approved new frameworks are persisted to
 * <globalStorage>/frameworks.json. `list()` merges both, with USER-SAVED
 * taking precedence by `parent/name` — so you can override a default's
 * `guidance` by adding a same-named user framework, without touching source.
 *
 * Each FrameworkDef's `guidance` is the full arch-build text the AI uses;
 * `description` is the one-line summary shown in the Arch caption + the
 * manage-frameworks picker. To add or adjust a framework, edit the relevant
 * JSON file (the bundled default for shipped ones; globalStorage for your own).
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
exports.FrameworkRegistry = exports.PARENT_CATEGORY_DEFS = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * The two parent categories a block can belong to. Kept in source (not JSON)
 * because they are a fixed enum the code branches on, not an extensible list.
 */
exports.PARENT_CATEGORY_DEFS = {
    natural: '自然型 (natural): smooth forward deduction; arrows go front -> later.',
    panoramic: '全貌型 (panoramic): constructed text; a later node exists to serve an earlier purpose; requires a needed-for back-arrow.'
};
function isValidFramework(f) {
    return !!f
        && (f.parent === 'natural' || f.parent === 'panoramic')
        && typeof f.name === 'string' && f.name.trim().length > 0
        && typeof f.description === 'string';
}
class FrameworkRegistry {
    /**
     * @param globalStoragePath extension globalStorage dir (user frameworks live in <here>/frameworks.json).
     * @param defaultFilePath  absolute path to the bundled `resources/frameworks.default.json`.
     */
    constructor(globalStoragePath, defaultFilePath) {
        this.userFrameworks = [];
        this.defaultFrameworks = [];
        this.userFilePath = path.join(globalStoragePath, 'frameworks.json');
        this.defaultFilePath = defaultFilePath;
        this.defaultFrameworks = this.loadFile(this.defaultFilePath);
        this.userFrameworks = this.loadFile(this.userFilePath);
    }
    loadFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                if (data && Array.isArray(data.frameworks)) {
                    return data.frameworks.filter(isValidFramework);
                }
            }
        }
        catch {
            // Corrupt/missing file → empty list (built-ins still load if present).
        }
        return [];
    }
    /** All known frameworks: user-saved override defaults by parent/name, then defaults. */
    list() {
        const map = new Map();
        // User first so a user framework with the same parent/name shadows the default.
        for (const f of this.userFrameworks) {
            map.set(`${f.parent}/${f.name}`, f);
        }
        for (const f of this.defaultFrameworks) {
            const key = `${f.parent}/${f.name}`;
            if (!map.has(key)) {
                map.set(key, f);
            }
        }
        return Array.from(map.values());
    }
    has(parent, name) {
        return this.list().some(f => f.parent === parent && f.name === name);
    }
    /** Only user-saved frameworks (excludes bundled defaults). For the manage command. */
    listUser() {
        return this.userFrameworks.slice();
    }
    /** Persist a new user framework. Dedups only against user-saved — a same-named
     *  entry is allowed so it can override a bundled default's guidance. */
    async add(def) {
        if (this.userFrameworks.some(f => f.parent === def.parent && f.name === def.name)) {
            return;
        }
        this.userFrameworks.push(def);
        this.saveUser();
    }
    /** Remove a user-saved framework by parent/name. Bundled defaults cannot be removed
     *  (they live in the shipped JSON); returns true if a user framework was removed. */
    async remove(parent, name) {
        const before = this.userFrameworks.length;
        this.userFrameworks = this.userFrameworks.filter(f => !(f.parent === parent && f.name === name));
        if (this.userFrameworks.length === before) {
            return false;
        }
        this.saveUser();
        return true;
    }
    saveUser() {
        const dir = path.dirname(this.userFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.userFilePath, JSON.stringify({ frameworks: this.userFrameworks }, null, 2), 'utf8');
    }
}
exports.FrameworkRegistry = FrameworkRegistry;
//# sourceMappingURL=frameworkRegistry.js.map