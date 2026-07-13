import dotenv from 'dotenv';
import { getSetting } from '../../lib/settingsService';
import { listGDCsvEntriesSinceTimestamp } from '../fileWatcher';
import { processEntries, retryUntilAvailable, sleep } from '../../lib/watcherHelper';

dotenv.config();

const WATCH_FOLDER_GD = process.env.CSV_WATCH_FOLDER_GD || '/mnt/network_share';
const SETTING_KEY_GD = "last_processed_timestamp";

async function main() {
  const gdPlantId = 1;

  const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);

  console.log("📡 File watcher started...");
  while (true) {
    try{
      // Load last processed timestamps first
      const lastProcessed = await getSetting(SETTING_KEY_GD);
      const lastDateGD = lastProcessed ? new Date(lastProcessed) : new Date(0);

      // Scan files by modification time (skip already processed files by mtime)
      console.log(`🔍 [GD] Scanning for files modified after ${lastDateGD}`);
      // Retry scanning until the network share/mount is available instead of letting the process crash
      const [newGD, _] = await retryUntilAvailable(
        () => listGDCsvEntriesSinceTimestamp(WATCH_FOLDER_GD, lastDateGD),
        `CSV watch folder (${WATCH_FOLDER_GD})`
      );

      const gdItems = newGD.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (gdItems.length > 0) {
        console.log(`📦 Found ${gdItems.length} GD entries`);
        await processEntries(gdItems, gdPlantId, SETTING_KEY_GD);
      }

      await sleep(pollIntervalMs);
    } catch (err) {
      console.error('Unexpected error in polling loop:', err);
      await sleep(pollIntervalMs);
    }
  }
}

main();