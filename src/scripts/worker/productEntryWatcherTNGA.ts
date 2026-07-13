import dotenv from 'dotenv';
import { getSetting } from '../../lib/settingsService';
import { processEntries, retryUntilAvailable, sleep } from '../../lib/watcherHelper';
import { listTNGACsvEntriesSinceTimestamp } from '../fileWatcherTNGA';

dotenv.config();

const WATCH_FOLDER_TNGA = process.env.CSV_WATCH_FOLDER_TNGA || '/mnt/network_share2';
const SETTING_KEY_TNGA = "last_processed_timestamp_tnga";

async function main() {
  const tngaPlantId = 2;

  const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);

  console.log("📡 File watcher started...");
  while (true) {
    try{
      // Load last processed timestamps first
      const lastProcessedTNGA = await getSetting(SETTING_KEY_TNGA);
      const lastDateTNGA = lastProcessedTNGA ? new Date(lastProcessedTNGA) : new Date(0);

      // Scan files by modification time (skip already processed files by mtime)
      console.log(`🔍 [TNGA] Scanning for files modified after ${lastDateTNGA}`);
      // Retry scanning until the network share/mount is available instead of letting the process crash
      const [newTNGA] = await retryUntilAvailable(
        () => listTNGACsvEntriesSinceTimestamp(WATCH_FOLDER_TNGA, lastDateTNGA),
        `CSV watch folder (${WATCH_FOLDER_TNGA})`
      );

      const tngaItems = newTNGA.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (tngaItems.length > 0) {
        console.log(`📦 Found ${tngaItems.length} TNGA entries`);
        await processEntries(tngaItems, tngaPlantId, SETTING_KEY_TNGA);
      }
      await sleep(pollIntervalMs);
    } catch (err) {
      console.error('Unexpected error in polling loop:', err);
      await sleep(pollIntervalMs);
    }
  }
}

main();