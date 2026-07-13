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
const fileWatcher_1 = require("../fileWatcher");
const watcherHelper_1 = require("../../lib/watcherHelper");
dotenv_1.default.config();
const WATCH_FOLDER = process.env.CSV_WATCH_FOLDER || '/mnt/network_share';
const SETTING_KEY_GD = "last_processed_timestamp";
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const gdPlantId = 1;
        const tngaPlantId = 2;
        const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);
        console.log("📡 File watcher started...");
        while (true) {
            try {
                // Load last processed timestamps first
                const lastProcessed = yield (0, settingsService_1.getSetting)(SETTING_KEY_GD);
                const lastProcessedTNGA = yield (0, settingsService_1.getSetting)(SETTING_KEY_TNGA);
                const lastDateGD = lastProcessed ? new Date(lastProcessed) : new Date(0);
                const lastDateTNGA = lastProcessedTNGA ? new Date(lastProcessedTNGA) : new Date(0);
                // 1) Scan files by modification time (skip already processed files by mtime)
                console.log(`🔍 Scanning for files modified after ${lastDateGD}`);
                // Retry scanning until the network share/mount is available instead of letting the process crash
                const [newGD, newTNGA] = yield (0, watcherHelper_1.retryUntilAvailable)(() => (0, fileWatcher_1.listCsvEntriesSinceTimestamp)(WATCH_FOLDER, lastDateGD, lastDateTNGA), `CSV watch folder (${WATCH_FOLDER})`);
                // // If folder is empty, fallback to polling from API
                // if (newGD.length === 0 && newTNGA.length === 0) {
                //   console.log('📭 No CSV entries found in folder, falling back to API polling...');
                //   await pollEntries();
                //   await sleep(pollIntervalMs);
                //   continue;
                // }
                const gdItems = newGD
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (gdItems.length > 0) {
                    console.log(`📦 Found ${gdItems.length} GD entries`);
                    yield (0, watcherHelper_1.processEntries)(gdItems, gdPlantId, SETTING_KEY_GD);
                }
                const tngaItems = newTNGA
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
