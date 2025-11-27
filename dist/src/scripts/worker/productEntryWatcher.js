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
const lookupCache_1 = require("../../lib/lookupCache");
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
                console.warn(`⚠️ ${description} unavailable (${err.code}). Retrying in ${Math.round(delay / 1000)}s...`);
                yield sleep(delay);
            }
        }
    });
}
function processEntries(sorted, plantId, settingKey, lookupCache) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const entry of sorted) {
            console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at} for plantId ${plantId}`);
            plantId === 1
                ? yield (0, productEntryHelper_1.handleProductShift)(entry.id_number, plantId, lookupCache)
                : yield (0, productEntryHelperTNGA_1.handleProductShiftTNGA)(entry.id_number, plantId, lookupCache);
        }
        if (sorted.length > 0) {
            const lastEntry = sorted[sorted.length - 1];
            yield (0, settingsService_1.setSetting)(settingKey, new Date(new Date(lastEntry.created_at).getTime() + 1000).toISOString());
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const gdPlantId = 1;
        const tngaPlantId = 2;
        const lookupCacheGD = new lookupCache_1.LookupCache();
        const lookupCacheTNGA = new lookupCache_1.LookupCache();
        yield lookupCacheGD.initialize(gdPlantId);
        yield lookupCacheTNGA.initialize(tngaPlantId);
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
                console.log(`🔍 Scanning for files modified after ${lastDateGD.toISOString()}`);
                // Retry scanning until the network share/mount is available instead of letting the process crash
                const [existingGD, existingTNGA] = yield retryUntilAvailable(() => (0, fileWatcher_1.listCsvEntriesSinceTimestamp)(WATCH_FOLDER, lastDateGD, lastDateTNGA), `CSV watch folder (${WATCH_FOLDER})`);
                const gdItems = existingGD
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (gdItems.length > 0) {
                    console.log(`📦 Found ${gdItems.length} GD entries`);
                    yield processEntries(gdItems, gdPlantId, SETTING_KEY_GD, lookupCacheGD);
                }
                const tngaItems = existingTNGA
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (tngaItems.length > 0) {
                    console.log(`📦 Found ${tngaItems.length} TNGA entries`);
                    yield processEntries(tngaItems, tngaPlantId, SETTING_KEY_TNGA, lookupCacheTNGA);
                }
                yield sleep(pollIntervalMs);
            }
            catch (err) {
                console.error('Unexpected error in polling loop:', err);
                yield sleep(pollIntervalMs);
            }
        }
        // 2) Start watcher for real-time incoming files
        // If starting the watcher fails because the mount is down, keep retrying until it succeeds.
        // await retryUntilAvailable(
        // () => watchFolderForCSV(WATCH_FOLDER, async (records) => {
        //     try {
        //       const lastProcessedNow = await getSetting(SETTING_KEY_GD);
        //       const lastProcessedNowTNGA = await getSetting(SETTING_KEY_TNGA);
        //       const lastDateNowGD = lastProcessedNow ? new Date(lastProcessedNow) : new Date(0);
        //       const lastDateNowTNGA = lastProcessedNowTNGA ? new Date(lastProcessedNowTNGA) : new Date(0);
        //       const resultGD: Array<ProductEntry> = [];
        //       const resultTNGA: Array<ProductEntry> = [];
        //       for (const record of records) {
        //         try {
        //           const sequenceData = String(record['SEQUENCE DATA'] ?? "").trim();
        //           if (!sequenceData) continue;
        //           const match = sequenceData.match(/(GD|TNGA)(.{3})/);
        //           if (!match) continue;
        //           const plant = match[1];        // "GD" or "TNGA"
        //           const variant = match[2];   // next 3 characters after it
        //           const id_number = variant;
        //           const dateRaw = (record['DATE'] ?? "").trim();
        //           const timeRaw = (record['TIME'] ?? "").trim();
        //           if (!dateRaw || !timeRaw) continue;
        //           const parts = dateRaw.split('-');
        //           if (parts.length !== 3) continue;
        //           const [day, month, year] = parts;
        //           const created_at = new Date(`${year}-${month}-${day}T${timeRaw}:00`).toISOString();
        //           if (isNaN(new Date(created_at).getTime())) continue;
        //           if (plant === 'TNGA' && new Date(created_at) > lastDateNowTNGA) {
        //             resultTNGA.push({ id_number, created_at });
        //           } else if (plant === 'GD' && new Date(created_at) > lastDateNowGD) {
        //             resultGD.push({ id_number, created_at });
        //           }
        //         } catch (recErr) {
        //           console.warn('Skipping malformed record', recErr);
        //           continue;
        //         }
        //       }
        //       const gdEntries = resultGD
        //         .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        //       if (gdEntries.length) {
        //         console.log(`📦 Found ${gdEntries.length} new GD entries`);
        //         await processEntries(gdEntries, gdPlantId, SETTING_KEY_GD, lookupCacheGD);
        //       }
        //       const tngaEntries = resultTNGA
        //         .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        //       if (tngaEntries.length) {
        //         console.log(`📦 Found ${tngaEntries.length} new TNGA entries`);
        //         await processEntries(tngaEntries, tngaPlantId, SETTING_KEY_TNGA, lookupCacheTNGA);
        //       }
        //     } catch (err) {
        //       console.error('Error handling added CSV entries:', err);
        //     }
        //   }),
        //   `start file watcher on ${WATCH_FOLDER}`
        // );
    });
}
main();
