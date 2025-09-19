import dotenv from 'dotenv';
import { lookupCache } from '../../lib/lookupCache';
import { suppliedKanban } from '../../lib/types';
import { getSetting, setSetting } from '../../lib/settingsService';
import { handleSupplyUpdate } from '../../lib/supplyUpdateHelper';

dotenv.config();

const API_URL = process.env.PART_SUPPLY_SCAN_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 20000;
const SETTING_KEY = "last_updated_timestamp";

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

      console.log(`filtering data from ${lastUpdatedDate}`);
      const suppliedKanbans = updates.data
        .filter((suppliedKanban) => 
          new Date(suppliedKanban.SCAN_SYS_DATE) > lastUpdatedDate &&
          suppliedKanban.WIP_LOCATION !== "TNGASSY" && 
          suppliedKanban.WIP_LOCATION !== "TNGAMWIP"
        )
        .sort(
            (a, b) => new Date(a.SCAN_SYS_DATE).getTime() - new Date(b.SCAN_SYS_DATE).getTime()
        )
      // from ${suppliedKanbans[0].SCAN_SYS_DATE} to ${suppliedKanbans[-1].SCAN_SYS_DATE} 
      console.log(`📦 Found ${suppliedKanbans.length} new supply updates`);
      if (suppliedKanbans.length > 0)
        console.log(`from ${new Date(suppliedKanbans[0].SCAN_SYS_DATE)} to ${new Date(suppliedKanbans.at(-1)?.SCAN_SYS_DATE!)}`);      
      
      if (!suppliedKanbans || !suppliedKanbans.length) return;
      
      // Process each update
      const latest = suppliedKanbans.at(-1)?.SCAN_SYS_DATE;
      const updated = await handleSupplyUpdate(suppliedKanbans);
      if (latest && updated) {
        await setSetting(SETTING_KEY, latest); // you need to implement this in settingsService
        console.log("Kanbans updated");
      } else {
        console.log("No Kanban updated");
        
      }
    }
  } catch (err) {
    console.error("❌ Polling error:", err);
  }
}

async function main() {
  await lookupCache.initialize();
  // pollUpdates();
  setInterval(pollUpdates, POLL_INTERVAL_MS);
  console.log("📡 Polling worker started...");
}

main();