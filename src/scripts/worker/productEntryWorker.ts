import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { ProductEntryResponse } from '../../lib/types';
import { handleProductShift } from '../../lib/productEntryHelper';
import { getSetting, setSetting } from '../../lib/settingsService';
import { lookupCache } from '../../lib/lookupCache';

dotenv.config();

const API_URL = process.env.PRODUCT_ENTRY_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 5000;
const SETTING_KEY = "last_processed_timestamp";

function formatDateFloorSeconds(dateString: string): string {
  const d = new Date(dateString);

  // Floor seconds (remove milliseconds, don't round)
  d.setMilliseconds(0);

  // Format as YYYY-MM-DDTHH:mm:ss
  return d.toISOString().slice(0, 19);
}

async function pollEntries() {
  const plantId = 1;
  try {
    if (API_URL && BEARER_TOKEN) {
      console.log("🔄 Polling for new product entries...");
      const lastProcessed = await getSetting(SETTING_KEY);
      const lastProcessedDate = lastProcessed ? new Date(lastProcessed) : new Date(0);

      const res = await fetch(API_URL, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${BEARER_TOKEN}`,
              'Content-Type': 'application/json',
          },
      });
      const json = await res.json() as ProductEntryResponse;
      const entries = json.data;

      if (!entries || !entries.length) return;

      // Sort oldest to newest
      const sorted = entries
      .slice(0, 10)
      .filter((e) => 
        new Date(e.created_at) > lastProcessedDate 
        && ((Number(e.id_number) >= 300 && Number(e.id_number) < 400) || (Number(e.id_number) >= 400 && Number(e.id_number) < 500))
      ).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      console.log(`📦 Found ${sorted.length} new entries since last processed at ${lastProcessedDate.toLocaleString()}: `,sorted);
      
      for (const entry of sorted) {
        console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at}`);
        await handleProductShift(entry.id_number, plantId);
      }

      // ✅ Update last processed timestamp only once, based on the last entry
      if (sorted.length > 0) {
        const lastEntry = sorted[sorted.length - 1];
        await setSetting(
          SETTING_KEY,
          new Date(new Date(lastEntry.created_at).getTime() + 1000).toISOString()
        );
      }
    }
  } catch (err) {
    console.error("❌ Polling error:", err);
  }
}

async function main() {
  await lookupCache.initialize();
  setInterval(pollEntries, POLL_INTERVAL_MS);
  console.log("📡 Polling worker started...");
}

main();
