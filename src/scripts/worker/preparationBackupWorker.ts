import dotenv from "dotenv";
import { savePreparationBackupFiles } from "../../lib/preparationBackupHelper";

dotenv.config();

const INTERVAL_MINUTES = Number(process.env.BACKUP_INTERVAL_MINUTES || 15);
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

let isRunning = false;

async function executeBackup() {
  if (isRunning) {
    console.log("⏳ [Backup Worker] Previous backup cycle still in progress, skipping...");
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log(`\n======================================================`);
  console.log(`🔄 [Backup Worker] Starting automated backup cycle: ${new Date().toLocaleString("en-IN")}`);
  console.log(`======================================================`);

  try {
    const saved = await savePreparationBackupFiles();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [Backup Worker] Completed backup for ${saved.length} lines in ${duration}s.`);
    for (const item of saved) {
      console.log(`   📁 ${item.plant} -> ${item.path}`);
    }
  } catch (error) {
    console.error("❌ [Backup Worker] Error running automated preparation backup:", error);
  } finally {
    isRunning = false;
  }
}

async function main() {
  console.log("🚀 Starting E-Kanban Automated Preparation Backup Worker...");
  console.log(`⏱️ Schedule: Every ${INTERVAL_MINUTES} minutes`);

  // Run initial backup immediately on worker startup
  await executeBackup();

  // Schedule recurring runs
  setInterval(executeBackup, INTERVAL_MS);
}

main().catch((err) => {
  console.error("❌ Fatal error in Backup Worker:", err);
  process.exit(1);
});
