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
const lookupCache_1 = require("../../lib/lookupCache");
const settingsService_1 = require("../../lib/settingsService");
const supplyUpdateHelper_1 = require("../../lib/supplyUpdateHelper");
dotenv_1.default.config();
const API_URL = process.env.PART_SUPPLY_SCAN_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 20000;
const SETTING_KEY = "last_updated_timestamp";
function pollUpdates() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            if (API_URL && BEARER_TOKEN) {
                console.log("🔄 Polling for supply updates...");
                const lastUpdated = yield (0, settingsService_1.getSetting)(SETTING_KEY);
                const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : new Date(0);
                const res = yield fetch(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
                const updates = yield res.json();
                console.log(`filtering data from ${lastUpdatedDate}`);
                const suppliedKanbans = updates.data
                    .filter((suppliedKanban) => new Date(suppliedKanban.SCAN_SYS_DATE) > lastUpdatedDate &&
                    suppliedKanban.WIP_LOCATION !== "TNGASSY" &&
                    suppliedKanban.WIP_LOCATION !== "TNGAMWIP")
                    .sort((a, b) => new Date(a.SCAN_SYS_DATE).getTime() - new Date(b.SCAN_SYS_DATE).getTime());
                // from ${suppliedKanbans[0].SCAN_SYS_DATE} to ${suppliedKanbans[-1].SCAN_SYS_DATE} 
                console.log(`📦 Found ${suppliedKanbans.length} new supply updates`);
                if (suppliedKanbans.length > 0)
                    console.log(`from ${new Date(suppliedKanbans[0].SCAN_SYS_DATE)} to ${new Date((_a = suppliedKanbans.at(-1)) === null || _a === void 0 ? void 0 : _a.SCAN_SYS_DATE)}`);
                if (!suppliedKanbans || !suppliedKanbans.length)
                    return;
                // Process each update
                const latest = (_b = suppliedKanbans.at(-1)) === null || _b === void 0 ? void 0 : _b.SCAN_SYS_DATE;
                const updated = yield (0, supplyUpdateHelper_1.handleSupplyUpdate)(suppliedKanbans);
                if (latest && updated) {
                    yield (0, settingsService_1.setSetting)(SETTING_KEY, latest); // you need to implement this in settingsService
                    console.log("Kanbans updated");
                }
                else {
                    console.log("No Kanban updated");
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
        // pollUpdates();
        setInterval(pollUpdates, POLL_INTERVAL_MS);
        console.log("📡 Polling worker started...");
    });
}
main();
