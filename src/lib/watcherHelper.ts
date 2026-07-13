import { exec } from 'child_process';
import { handleProductShift } from "./productEntryHelper";
import { handleProductShiftTNGA } from "./productEntryHelperTNGA";
import { setSetting } from "./settingsService";
import { ProductEntry } from "./types";
import { pollEntries } from '../scripts/worker/productEntryWorker';

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function isTransientErr(err: any) {
    if (!err || !err.code) return false;
    const transient = ['EHOSTDOWN', 'ENOTCONN', 'ENODEV', 'ENOENT', 'EIO', 'ETIMEDOUT', 'EACCES', 'EPERM'];
    return transient.includes(err.code);
}

function pingHost(ip: string): Promise<boolean> {
    return new Promise(resolve => {
        exec(`ping -c 1 -W 1 ${ip}`, (err) => {
            resolve(!err);
        });
    });
}

/**
 * Retry an async operation until it succeeds or a non-transient error is thrown.
 * Uses incremental backoff.
 */
export async function retryUntilAvailable<T>(fn: () => Promise<T>, description = 'resource') : Promise<T> {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (err: any) {
            if (!isTransientErr(err)) {
                // Non-transient: rethrow so caller can decide
                throw err;
            }
            const isAlive = await pingHost('10.82.122.187');
            if (isAlive){
                console.log(`⚠️ ${description} is available but connection failed. Falling back to API call.`)
                await pollEntries();
            }
            attempt++;
            const delay = Math.min(30000, 2000 + attempt * 2000); // grow to max 30s
            console.warn(`⚠️ ${description} unavailable (${err.code}) at ${new Date()}. Retrying in ${Math.round(delay/1000)}s...`);
            await sleep(delay);
        }
    }
}

export async function processEntries(sorted: ProductEntry[], plantId: number, settingKey: string) {
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
      String(new Date(new Date(lastEntry.created_at).getTime() + 1000))
    );
  }
}