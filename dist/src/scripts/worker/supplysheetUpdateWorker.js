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
dotenv_1.default.config();
const API_URL = process.env.PART_SUPPLY_SCAN_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 5000;
function pollUpdates() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (API_URL && BEARER_TOKEN) {
                console.log("🔄 Polling for supply updates...");
                const res = yield fetch(API_URL, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${BEARER_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                });
                const updates = yield res.json();
                console.log(`📦 Found ${updates.length} new supply updates:`, updates);
                if (!updates || !updates.length)
                    return;
                // Process each update
                for (const update of updates) {
                    console.log(`⚙️ Processing update for part ${update.partId}`);
                    // Here you would handle the update logic, e.g., updating the database
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
        setInterval(pollUpdates, POLL_INTERVAL_MS);
        console.log("📡 Polling worker started...");
    });
}
main();
