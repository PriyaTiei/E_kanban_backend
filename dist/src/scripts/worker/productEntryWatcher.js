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
const productEntryHelper_1 = require("../../lib/productEntryHelper");
const settingsService_1 = require("../../lib/settingsService");
const productEntryHelperTNGA_1 = require("../../lib/productEntryHelperTNGA");
const fileWatcher_1 = require("../fileWatcher");
dotenv_1.default.config();
const WATCH_FOLDER = process.env.CSV_WATCH_FOLDER || '/mnt/network_share';
const SETTING_KEY_GD = "last_processed_timestamp";
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isTransientErr(err) {
    if (!err || !err.code)
        return false;
    const transient = ['EHOSTDOWN', 'ENOTCONN', 'ENODEV', 'ENOENT', 'EIO', 'ETIMEDOUT', 'EACCES', 'EPERM'];
    return transient.includes(err.code);
}
/**
 * Retry an async operation until it succeeds or a non-transient error is thrown.
 * Uses incremental backoff.
 */
function retryUntilAvailable(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, description = 'resource') {
        let attempt = 0;
        while (true) {
            try {
                return yield fn();
            }
            catch (err) {
                if (!isTransientErr(err)) {
                    // Non-transient: rethrow so caller can decide
                    throw err;
                }
                attempt++;
                const delay = Math.min(30000, 2000 + attempt * 2000); // grow to max 30s
                console.warn(`⚠️ ${description} unavailable (${err.code}) at ${new Date()}. Retrying in ${Math.round(delay / 1000)}s...`);
                yield sleep(delay);
            }
        }
    });
}
function processEntries(sorted, plantId, settingKey) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const entry of sorted) {
            console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at} for plantId ${plantId}`);
            plantId === 1
                ? yield (0, productEntryHelper_1.handleProductShift)(entry.id_number, plantId)
                : yield (0, productEntryHelperTNGA_1.handleProductShiftTNGA)(entry.id_number, plantId);
        }
        if (sorted.length > 0) {
            const lastEntry = sorted[sorted.length - 1];
            yield (0, settingsService_1.setSetting)(settingKey, String(new Date(new Date(lastEntry.created_at).getTime() + 1000)));
        }
    });
}
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
                const [newGD, newTNGA] = yield retryUntilAvailable(() => (0, fileWatcher_1.listCsvEntriesSinceTimestamp)(WATCH_FOLDER, lastDateGD, lastDateTNGA), `CSV watch folder (${WATCH_FOLDER})`);
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
                    yield processEntries(gdItems, gdPlantId, SETTING_KEY_GD);
                }
                const tngaItems = newTNGA
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (tngaItems.length > 0) {
                    console.log(`📦 Found ${tngaItems.length} TNGA entries`);
                    yield processEntries(tngaItems, tngaPlantId, SETTING_KEY_TNGA);
                }
                yield sleep(pollIntervalMs);
            }
            catch (err) {
                console.error('Unexpected error in polling loop:', err);
                yield sleep(pollIntervalMs);
            }
        }
    });
}
main();
