import dotenv from 'dotenv';
import { lookupCache } from '../../lib/lookupCache';

dotenv.config();

const API_URL = process.env.PART_SUPPLY_SCAN_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 5000;

async function pollUpdates() {
  try {
    if (API_URL && BEARER_TOKEN) {
      console.log("🔄 Polling for supply updates...");
      const res = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      const updates = await res.json();
      console.log(`📦 Found ${updates.length} new supply updates:`, updates);
      
      if (!updates || !updates.length) return;

      
      // Process each update
      for (const update of updates) {
        console.log(`⚙️ Processing update for part ${update.partId}`);
        // Here you would handle the update logic, e.g., updating the database
      }
    }
  } catch (err) {
    console.error("❌ Polling error:", err);
  }
}

async function main() {
  await lookupCache.initialize();
  setInterval(pollUpdates, POLL_INTERVAL_MS);
  console.log("📡 Polling worker started...");
}

main();