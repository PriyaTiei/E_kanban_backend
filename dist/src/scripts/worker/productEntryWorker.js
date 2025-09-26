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
const node_fetch_1 = __importDefault(require("node-fetch"));
const productEntryHelper_1 = require("../../lib/productEntryHelper");
const settingsService_1 = require("../../lib/settingsService");
const lookupCache_1 = require("../../lib/lookupCache");
dotenv_1.default.config();
const API_URL = process.env.PRODUCT_ENTRY_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 5000;
const SETTING_KEY = "last_processed_timestamp";
function formatDateFloorSeconds(dateString) {
    const d = new Date(dateString);
    // Floor seconds (remove milliseconds, don't round)
    d.setMilliseconds(0);
    // Format as YYYY-MM-DDTHH:mm:ss
    return d.toISOString().slice(0, 19);
}
function pollEntries() {
    return __awaiter(this, void 0, void 0, function* () {
        const plantId = 1;
        try {
            if (API_URL && BEARER_TOKEN) {
                console.log("🔄 Polling for new product entries...");
                const lastProcessed = yield (0, settingsService_1.getSetting)(SETTING_KEY);
                const lastProcessedDate = lastProcessed ? new Date(lastProcessed) : new Date(0);
                const res = yield (0, node_fetch_1.default)(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
                const json = yield res.json();
                const entries = json.data;
                if (!entries || !entries.length)
                    return;
                // Sort oldest to newest
                const sorted = entries
                    .slice(0, 10)
                    .filter((e) => new Date(e.created_at) > lastProcessedDate
                    && ((Number(e.id_number) >= 300 && Number(e.id_number) < 400) || (Number(e.id_number) >= 400 && Number(e.id_number) < 500))).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                console.log(`📦 Found ${sorted.length} new entries since last processed at ${lastProcessedDate.toLocaleString()}: `, sorted);
                for (const entry of sorted) {
                    console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at}`);
                    yield (0, productEntryHelper_1.handleProductShift)(entry.id_number, plantId);
                }
                // ✅ Update last processed timestamp only once, based on the last entry
                if (sorted.length > 0) {
                    const lastEntry = sorted[sorted.length - 1];
                    yield (0, settingsService_1.setSetting)(SETTING_KEY, new Date(new Date(lastEntry.created_at).getTime() + 1000).toISOString());
                }
            }
        }
        catch (err) {
            console.error("❌ Polling error:", err);
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield lookupCache_1.lookupCache.initialize();
        setInterval(pollEntries, POLL_INTERVAL_MS);
        console.log("📡 Polling worker started...");
    });
}
main();
