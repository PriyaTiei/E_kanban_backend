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
const settingsService_1 = require("../../lib/settingsService");
const watcherHelper_1 = require("../../lib/watcherHelper");
const fileWatcherTNGA_1 = require("../fileWatcherTNGA");
dotenv_1.default.config();
const WATCH_FOLDER_TNGA = process.env.CSV_WATCH_FOLDER_TNGA || '/mnt/network_share2';
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const tngaPlantId = 2;
        const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);
        console.log("📡 File watcher started...");
        while (true) {
            try {
                // Load last processed timestamps first
                const lastProcessedTNGA = yield (0, settingsService_1.getSetting)(SETTING_KEY_TNGA);
                const lastDateTNGA = lastProcessedTNGA ? new Date(lastProcessedTNGA) : new Date(0);
                // Scan files by modification time (skip already processed files by mtime)
                console.log(`🔍 [TNGA] Scanning for files modified after ${lastDateTNGA}`);
                // Retry scanning until the network share/mount is available instead of letting the process crash
                const [newTNGA] = yield (0, watcherHelper_1.retryUntilAvailable)(() => (0, fileWatcherTNGA_1.listTNGACsvEntriesSinceTimestamp)(WATCH_FOLDER_TNGA, lastDateTNGA), `CSV watch folder (${WATCH_FOLDER_TNGA})`);
                const tngaItems = newTNGA.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (tngaItems.length > 0) {
                    console.log(`📦 Found ${tngaItems.length} TNGA entries`);
                    yield (0, watcherHelper_1.processEntries)(tngaItems, tngaPlantId, SETTING_KEY_TNGA);
                }
                yield (0, watcherHelper_1.sleep)(pollIntervalMs);
            }
            catch (err) {
                console.error('Unexpected error in polling loop:', err);
                yield (0, watcherHelper_1.sleep)(pollIntervalMs);
            }
        }
    });
}
main();
