import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { ProductEntry, ProductEntryResponse } from '../../lib/types';
import { handleProductShift } from '../../lib/productEntryHelper';
import { getSetting, setSetting } from '../../lib/settingsService';
import { handleProductShiftTNGA } from '../../lib/productEntryHelperTNGA';

dotenv.config();

const API_URL = process.env.PRODUCT_ENTRY_API;
const BEARER_TOKEN = process.env.AMRUTH_API_TOKEN;
const POLL_INTERVAL_MS = 5000;
const SETTING_KEY_GD = "last_processed_timestamp";
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";

async function processEntries(sorted: ProductEntry[], plantId: number, settingKey: string) {
  for (const entry of sorted) {
    console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at} for plantId ${plantId}`);
    plantId === 1 ? 
      await handleProductShift(entry.id_number, plantId)
      : await handleProductShiftTNGA(entry.id_number, plantId);
  }

  // ✅ Update last processed timestamp only once, based on the last entry
  if (sorted.length > 0) {
    const lastEntry = sorted[sorted.length - 1];
    await setSetting(
      settingKey,
      new Date(new Date(lastEntry.created_at).getTime() + 1000).toISOString()
    );
  }
}

export async function pollEntries() {
  const gdPlantId = 1;
  const tngaPlantId = 2;
  try {
    if (API_URL && BEARER_TOKEN) {
      console.log("🔄 Polling for new product entries...");
      const lastProcessed = await getSetting(SETTING_KEY_GD);
      const lastProcessedTNGA = await getSetting(SETTING_KEY_TNGA);
      const lastProcessedDateGD = lastProcessed ? new Date(lastProcessed) : new Date(0);
      const lastProcessedDateTNGA = lastProcessedTNGA ? new Date(lastProcessedTNGA) : new Date(0);
      
      const res = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });
      console.log("API");
      const json = await res.json() as ProductEntryResponse;
      const entries = json.data;

      if (!entries || !entries.length) return;

      // Sort oldest to newest for GD
      const sortedGD = entries
      .slice(0, 10)
      .filter((e) => 
        new Date(e.created_at) > lastProcessedDateGD 
        && ((Number(e.id_number) >= 300 && Number(e.id_number) < 400) || (Number(e.id_number) >= 400 && Number(e.id_number) < 500))
      ).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      console.log(`📦 Found ${sortedGD.length} new entries for GD since last processed at ${lastProcessedDateGD.toLocaleString()}: `,sortedGD);
      
      processEntries(sortedGD, gdPlantId, SETTING_KEY_GD);

      // Sort oldest to newest for TNGA
      const sortedTNGA = entries
      .slice(0, 10)
      .filter((e) => 
        new Date(e.created_at) > lastProcessedDateTNGA 
        && ((Number(e.id_number) >= 100 && Number(e.id_number) < 200) || (Number(e.id_number) >= 200 && Number(e.id_number) < 300))
      ).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      console.log(`📦 Found ${sortedTNGA.length} new entries for TNGA since last processed at ${lastProcessedDateTNGA.toLocaleString()}: `,sortedTNGA);
      
      processEntries(sortedTNGA, tngaPlantId, SETTING_KEY_TNGA);
    }
  } catch (err) {
    console.error("❌ Polling error:", err);
  }
}

async function main() {
  setInterval(pollEntries, POLL_INTERVAL_MS);
  console.log("📡 Polling worker started...");
}

main();
