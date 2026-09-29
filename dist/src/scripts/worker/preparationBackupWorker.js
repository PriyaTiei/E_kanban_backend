"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const preparationBackupHelper_1 = require("../../lib/preparationBackupHelper");
dotenv_1.default.config();
const INTERVAL_MINUTES = Number(process.env.BACKUP_INTERVAL_MINUTES || 15);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
let isRunning = false;
function executeBackup() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isRunning) {
            console.log("⏳ [Backup Worker] Previous backup cycle still in progress, skipping...");
            return;
        }
        isRunning = true;
        const startTime = Date.now();
        console.log(`\n======================================================`);
        console.log(`🔄 [Backup Worker] Starting automated backup cycle: ${new Date().toLocaleString("en-IN")}`);
        console.log(`======================================================`);
        try {
            const saved = yield (0, preparationBackupHelper_1.savePreparationBackupFiles)();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ [Backup Worker] Completed backup for ${saved.length} lines in ${duration}s.`);
            for (const item of saved) {
                console.log(`   📁 ${item.plant} -> ${item.path}`);
            }
        }
        catch (error) {
            console.error("❌ [Backup Worker] Error running automated preparation backup:", error);
        }
        finally {
            isRunning = false;
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("🚀 Starting E-Kanban Automated Preparation Backup Worker...");
        console.log(`⏱️ Schedule: Every ${INTERVAL_MINUTES} minutes`);
        // Run initial backup immediately on worker startup
        yield executeBackup();
        // Schedule recurring runs
        setInterval(executeBackup, INTERVAL_MS);
    });
}
main().catch((err) => {
    console.error("❌ Fatal error in Backup Worker:", err);
    process.exit(1);
});
