import dotenv from 'dotenv';
import { suppliedKanban } from '../../lib/types';
import { getSetting, setSetting } from '../../lib/settingsService';
import { handleSupplyUpdate } from '../../lib/supplyUpdateHelper';

dotenv.config();

const API_URL = process.env.PART_SUPPLY_SCAN_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 20000;
const SETTING_KEY = "last_updated_timestamp";

async function processEntries(suppliedKanbans: suppliedKanban[], settingKey: string) {
    const latest = suppliedKanbans.at(-1)?.CREATED_SYS_DATE;
    const updated = await handleSupplyUpdate(suppliedKanbans);
    if (latest && updated) {
        await setSetting(settingKey, latest);
    } else {
        console.log(`No Kanban updated`);
    }
}

async function pollUpdates() {
    try {
        if (API_URL && BEARER_TOKEN) {
            console.log("🔄 Polling for supply updates...");
            const lastUpdated = await getSetting(SETTING_KEY);
            const lastUpdatedDate = lastUpdated ? new Date(lastUpdated) : new Date(0);

            const res = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${BEARER_TOKEN}`,
                'Content-Type': 'application/json',
            },
            });
            const updates = await res.json() as { data: suppliedKanban[] };

            console.log(`filtering data from ${lastUpdatedDate} for GD`);
            const seen = new Set<string>();
            const suppliedKanbans = updates.data
            .filter((suppliedKanban) => 
                new Date(suppliedKanban.CREATED_SYS_DATE) > lastUpdatedDate
            )
            .filter(k => {
                if (seen.has(k.KANBAN_NO)) return false;
                seen.add(k.KANBAN_NO);
                return true;
            })
            .sort(
                (a, b) => new Date(a.CREATED_SYS_DATE).getTime() - new Date(b.CREATED_SYS_DATE).getTime()
            )

            console.log(`📦 Found ${suppliedKanbans.length} new supply updates`);
            if (suppliedKanbans.length > 0)
            console.log(`from ${new Date(suppliedKanbans[0].CREATED_SYS_DATE)} to ${new Date(suppliedKanbans.at(-1)?.CREATED_SYS_DATE!)}`);      
            
            if (!suppliedKanbans || !suppliedKanbans.length) return;

            processEntries(suppliedKanbans, SETTING_KEY);
        }
    } catch (err) {
        console.error("❌ Polling error:", err);
    }
}

async function main() {
    setInterval(pollUpdates, POLL_INTERVAL_MS);
    console.log("📡 Polling worker started...");
}

main();