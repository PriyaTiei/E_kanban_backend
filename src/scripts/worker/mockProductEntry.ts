import dotenv from 'dotenv';
import { ProductEntry } from '../../lib/types';
import { handleProductShift } from '../../lib/productEntryHelper';
import { getSetting, setSetting } from '../../lib/settingsService';
import { handleProductShiftTNGA } from '../../lib/productEntryHelperTNGA';
import { listGDCsvEntriesSinceTimestamp } from '../fileWatcher';

dotenv.config();

const WATCH_FOLDER = process.env.CSV_WATCH_FOLDER || '/mnt/network_share';
const SETTING_KEY_GD = "last_processed_timestamp";
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientErr(err: any) {
    if (!err || !err.code) return false;
    const transient = ['EHOSTDOWN', 'ENOTCONN', 'ENODEV', 'ENOENT', 'EIO', 'ETIMEDOUT', 'EACCES', 'EPERM'];
    return transient.includes(err.code);
}

/**
 * Retry an async operation until it succeeds or a non-transient error is thrown.
 * Uses incremental backoff.
 */
async function retryUntilAvailable<T>(fn: () => Promise<T>, description = 'resource') : Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            if (!isTransientErr(err)) {
                // Non-transient: rethrow so caller can decide
                throw err;
            }
            attempt++;
            const delay = Math.min(30000, 2000 + attempt * 2000); // grow to max 30s
            console.warn(`⚠️ ${description} unavailable (${err.code}). Retrying in ${Math.round(delay/1000)}s...`);
            await sleep(delay);
        }
    }
}

async function processEntries(sorted: ProductEntry[], plantId: number, settingKey: string) {
  for (const entry of sorted) {
    console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at} for plantId ${plantId}`);
    plantId === 1
      ? await handleProductShift(entry.id_number, plantId)
      : await handleProductShiftTNGA(entry.id_number, plantId);
  }

  if (sorted.length > 0) {
    const lastEntry = sorted[sorted.length - 1];
    await setSetting(
      settingKey,
      new Date(new Date(lastEntry.created_at).getTime() + 1000).toISOString()
    );
  }
}

async function main() {
  const gdPlantId = 1;
  const tngaPlantId = 2;


  const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 2000);

  console.log("📡 File watcher started...");
  while (true) {
    try{
      // Load last processed timestamps first
      const lastProcessed = await getSetting(SETTING_KEY_GD);
    //   const lastProcessedTNGA = await getSetting(SETTING_KEY_TNGA);
      const lastDateGD = lastProcessed ? new Date(lastProcessed) : new Date(0);
    //   const lastDateTNGA = lastProcessedTNGA ? new Date(lastProcessedTNGA) : new Date(0);

      // 1) Scan files by modification time (skip already processed files by mtime)
      console.log(`🔍 Starting mock run after ${lastDateGD.toISOString()}`);
      // Retry scanning until the network share/mount is available instead of letting the process crash
      const newGD = [{ 
        id_number: '425',
        created_at: String(new Date()) 
      }];
      
      const gdItems = newGD
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (gdItems.length > 0) {
        console.log(`📦 Found ${gdItems.length} GD entries`);
        await processEntries(gdItems, gdPlantId, SETTING_KEY_GD);
      }
      
      console.log('completed');
      

    //   const tngaItems = newTNGA
    //     .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    //   if (tngaItems.length > 0) {
    //     console.log(`📦 Found ${tngaItems.length} TNGA entries`);
    //     await processEntries(tngaItems, tngaPlantId, SETTING_KEY_TNGA);
    //   }
      await sleep(pollIntervalMs);
    } catch (err) {
      console.error('Unexpected error in polling loop:', err);
      await sleep(pollIntervalMs);
    }
  }
}

main();