"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanup = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cleanup = (uploadDir) => {
    setImmediate(() => {
        try {
            // Clean up old folders if more than 5
            const directories = fs_1.default.readdirSync(uploadDir)
                .map(name => {
                const fullPath = path_1.default.join(uploadDir, name);
                const stats = fs_1.default.statSync(fullPath);
                return { name, time: stats.mtimeMs, path: fullPath };
            })
                .filter(entry => fs_1.default.lstatSync(entry.path).isDirectory())
                .sort((a, b) => a.time - b.time); // Oldest first
            while (directories.length > 5) {
                const dirToRemove = directories.shift();
                if (!dirToRemove)
                    break; // Safety check
                fs_1.default.rmSync(dirToRemove.path, { recursive: true, force: true });
                console.log(`🧹 Removed old folder: ${dirToRemove.name}`);
            }
        }
        catch (cleanupErr) {
            console.error('🧹 Cleanup error:', cleanupErr);
        }
    });
};
exports.cleanup = cleanup;
