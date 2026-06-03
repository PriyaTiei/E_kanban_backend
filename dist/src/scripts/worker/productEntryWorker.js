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
exports.pollEntries = pollEntries;
const dotenv_1 = __importDefault(require("dotenv"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const productEntryHelper_1 = require("../../lib/productEntryHelper");
const settingsService_1 = require("../../lib/settingsService");
const productEntryHelperTNGA_1 = require("../../lib/productEntryHelperTNGA");
dotenv_1.default.config();
const API_URL = process.env.PRODUCT_ENTRY_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 5000;
const SETTING_KEY_GD = "last_processed_timestamp";
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";
function processEntries(sorted, plantId, settingKey) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const entry of sorted) {
            console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at} for plantId ${plantId}`);
            plantId === 1 ?
                yield (0, productEntryHelper_1.handleProductShift)(entry.id_number, plantId)
                : yield (0, productEntryHelperTNGA_1.handleProductShiftTNGA)(entry.id_number, plantId);
        }
        // ✅ Update last processed timestamp only once, based on the last entry
        if (sorted.length > 0) {
            const lastEntry = sorted[sorted.length - 1];
            yield (0, settingsService_1.setSetting)(settingKey, new Date(new Date(lastEntry.created_at).getTime() + 1000).toISOString());
        }
    });
}
function pollEntries() {
    return __awaiter(this, void 0, void 0, function* () {
        const gdPlantId = 1;
        const tngaPlantId = 2;
        try {
            if (API_URL && BEARER_TOKEN) {
                console.log("🔄 Polling for new product entries...");
                const lastProcessed = yield (0, settingsService_1.getSetting)(SETTING_KEY_GD);
                const lastProcessedTNGA = yield (0, settingsService_1.getSetting)(SETTING_KEY_TNGA);
                const lastProcessedDateGD = lastProcessed ? new Date(lastProcessed) : new Date(0);
                const lastProcessedDateTNGA = lastProcessedTNGA ? new Date(lastProcessedTNGA) : new Date(0);
                const res = yield (0, node_fetch_1.default)(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
                console.log("API");
                const json = yield res.json();
                const entries = json.data;
                if (!entries || !entries.length)
                    return;
                // Sort oldest to newest for GD
                const sortedGD = entries
                    .slice(0, 10)
                    .filter((e) => new Date(e.created_at) > lastProcessedDateGD
                    && ((Number(e.id_number) >= 300 && Number(e.id_number) < 400) || (Number(e.id_number) >= 400 && Number(e.id_number) < 500))).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                console.log(`📦 Found ${sortedGD.length} new entries for GD since last processed at ${lastProcessedDateGD.toLocaleString()}: `, sortedGD);
                processEntries(sortedGD, gdPlantId, SETTING_KEY_GD);
                // Sort oldest to newest for TNGA
                const sortedTNGA = entries
                    .slice(0, 10)
                    .filter((e) => new Date(e.created_at) > lastProcessedDateTNGA
                    && ((Number(e.id_number) >= 100 && Number(e.id_number) < 200) || (Number(e.id_number) >= 200 && Number(e.id_number) < 300))).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                console.log(`📦 Found ${sortedTNGA.length} new entries for TNGA since last processed at ${lastProcessedDateTNGA.toLocaleString()}: `, sortedTNGA);
                processEntries(sortedTNGA, tngaPlantId, SETTING_KEY_TNGA);
            }
        }
        catch (err) {
            console.error("❌ Polling error:", err);
        }
    });
}
// async function main() {
//   setInterval(pollEntries, POLL_INTERVAL_MS);
//   console.log("📡 Polling worker started...");
// }
// main();
