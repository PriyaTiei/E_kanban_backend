"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sleep = sleep;
exports.isTransientErr = isTransientErr;
exports.retryUntilAvailable = retryUntilAvailable;
exports.processEntries = processEntries;
const child_process_1 = require("child_process");
const productEntryHelper_1 = require("./productEntryHelper");
const productEntryHelperTNGA_1 = require("./productEntryHelperTNGA");
const settingsService_1 = require("./settingsService");
const productEntryWorker_1 = require("../scripts/worker/productEntryWorker");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isTransientErr(err) {
    if (!err || !err.code)
        return false;
    const transient = ['EHOSTDOWN', 'ENOTCONN', 'ENODEV', 'ENOENT', 'EIO', 'ETIMEDOUT', 'EACCES', 'EPERM'];
    return transient.includes(err.code);
}
function pingHost(ip) {
    return new Promise(resolve => {
        (0, child_process_1.exec)(`ping -c 1 -W 1 ${ip}`, (err) => {
            resolve(!err);
        });
    });
}
/**
 * Retry an async operation until it succeeds or a non-transient error is thrown.
 * Uses incremental backoff.
 */
function retryUntilAvailable(fn_1) {
    return __awaiter(this, arguments, void 0, function* (fn, description = 'resource') {
        let attempt = 0;
        while (true) {
            try {
                return yield fn();
            }
            catch (err) {
                if (!isTransientErr(err)) {
                    // Non-transient: rethrow so caller can decide
                    throw err;
                }
                const isAlive = yield pingHost('10.82.122.187');
                if (isAlive) {
                    console.log(`⚠️ ${description} is available but connection failed. Falling back to API call.`);
                    yield (0, productEntryWorker_1.pollEntries)();
                }
                attempt++;
                const delay = Math.min(30000, 2000 + attempt * 2000); // grow to max 30s
                console.warn(`⚠️ ${description} unavailable (${err.code}) at ${new Date()}. Retrying in ${Math.round(delay / 1000)}s...`);
                yield sleep(delay);
            }
        }
    });
}
function processEntries(sorted, plantId, settingKey) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const entry of sorted) {
            console.log(`⚙️ Processing ${entry.id_number} at ${entry.created_at} for plantId ${plantId}`);
            plantId === 1
                ? yield (0, productEntryHelper_1.handleProductShift)(entry.id_number, plantId)
                : yield (0, productEntryHelperTNGA_1.handleProductShiftTNGA)(entry.id_number, plantId);
        }
        if (sorted.length > 0) {
            const lastEntry = sorted[sorted.length - 1];
            yield (0, settingsService_1.setSetting)(settingKey, String(new Date(new Date(lastEntry.created_at).getTime() + 1000)));
        }
    });
}
