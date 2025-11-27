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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchFolderForCSV = watchFolderForCSV;
exports.listCsvEntriesSinceTimestamp = listCsvEntriesSinceTimestamp;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sync_1 = __importDefault(require("csv-parse/sync"));
function watchFolderForCSV(folderPath, onNewEntries) {
    return __awaiter(this, void 0, void 0, function* () {
        // const watcher = chokidar.watch(folderPath, {
        //   persistent: true,
        //   ignoreInitial: true,
        //   usePolling: true,              // more reliable on network shares
        //   interval: 1000,               // poll interval (ms)
        //   binaryInterval: 1000,
        //   awaitWriteFinish: {
        //     stabilityThreshold: 2000,
        //     pollInterval: 100,
        //   },
        // });
        // watcher.on('add', async (filePath) => {
        //   try {
        //     if (!filePath.toLowerCase().endsWith('.csv')) return;
        //     console.log(`📄 New CSV file detected: ${filePath}`);
        //     const content = await fs.readFile(filePath, 'utf-8');
        //     const records = csv.parse(content, {
        //       columns: true,
        //       skip_empty_lines: true,
        //     }) as PartScanCSVFormat[];
        //     await onNewEntries(records);
        //   } catch (error) {
        //     console.error(`❌ Error processing file ${filePath}:`, error);
        //   }
        // });
        // watcher.on('error', (err) => {
        //   console.error('Chokidar watcher error:', err);
        // });
        //  // resolve once chokidar signals it's ready (initial scan complete).
        // await new Promise<void>((resolve, reject) => {
        //   const onReady = () => {
        //     console.log(`👀 Watching folder: ${folderPath} (ready)`);
        //     watcher.off('error', onError);
        //     resolve();
        //   };
        //   const onError = (err: any) => {
        //     watcher.off('ready', onReady);
        //     reject(err);
        //   };
        //   watcher.once('ready', onReady);
        //   watcher.once('error', onError);
        // });
        const pollIntervalMs = Number(process.env.CSV_POLL_INTERVAL_MS || 5000);
        const seenFiles = new Set();
        function scanOnce() {
            return __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    const dirents = yield promises_1.default.readdir(folderPath, { withFileTypes: true });
                    for (const dirent of dirents) {
                        if (!dirent.isFile())
                            continue;
                        const name = dirent.name;
                        if (!name.toLowerCase().endsWith('.csv'))
                            continue;
                        const fp = path_1.default.join(folderPath, name);
                        if (seenFiles.has(fp))
                            continue;
                        try {
                            const content = yield promises_1.default.readFile(fp, 'utf-8');
                            const records = sync_1.default.parse(content, {
                                columns: true,
                                skip_empty_lines: true,
                            });
                            yield onNewEntries(records);
                            // only mark as seen if processed successfully
                            seenFiles.add(fp);
                            console.log(`📄 Processed and marked seen: ${fp}`);
                        }
                        catch (fileErr) {
                            console.error(`❌ Error reading/processing file ${fp}:`, fileErr);
                            // do not mark as seen so we'll retry next poll
                        }
                    }
                    return true;
                }
                catch (err) {
                    // Likely mount / opendir error — log and indicate failure so caller can wait/retry
                    console.warn(`⚠️ Poll scan failed for ${folderPath}: ${(_a = err.code) !== null && _a !== void 0 ? _a : err.message}`);
                    return false;
                }
            });
        }
        // Try scanning until we succeed at least once (so caller knows watcher is active)
        while (true) {
            const ok = yield scanOnce();
            if (ok)
                break;
            yield new Promise((r) => setTimeout(r, pollIntervalMs));
        }
        // Schedule background polling
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield scanOnce();
            }
            catch (err) {
                // scanOnce already logs errors; keep interval running
                console.warn('Watcher poll error:', err);
            }
        }), pollIntervalMs);
        console.log(`👀 Polling watcher started for: ${folderPath} (interval ${pollIntervalMs}ms)`);
    });
}
/**
 * Scan existing CSV files in the folder by checking file modification time.
 * Returns entries that were modified after lastProcessedDate.
 * More efficient than reading all 200k files into memory.
 */
function listCsvEntriesSinceTimestamp(folderPath, lastProcessedDateGD, lastProcessedDateTNGA) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        var _d, _e, _f;
        const resultGD = [];
        const resultTNGA = [];
        const dir = yield promises_1.default.opendir(folderPath);
        try {
            try {
                for (var _g = true, dir_1 = __asyncValues(dir), dir_1_1; dir_1_1 = yield dir_1.next(), _a = dir_1_1.done, !_a; _g = true) {
                    _c = dir_1_1.value;
                    _g = false;
                    const dirent = _c;
                    if (!dirent.isFile())
                        continue;
                    const f = dirent.name;
                    if (!f.toLowerCase().endsWith('.csv'))
                        continue;
                    const fp = path_1.default.join(folderPath, f);
                    try {
                        const stats = yield promises_1.default.stat(fp);
                        // skip files not modified after either timestamp
                        if (stats.mtime <= lastProcessedDateGD && stats.mtime <= lastProcessedDateTNGA) {
                            continue;
                        }
                        const content = yield promises_1.default.readFile(fp, 'utf-8');
                        const records = sync_1.default.parse(content, { columns: true, skip_empty_lines: true });
                        for (const record of records) {
                            const sequenceData = String((_d = record['SEQUENCE DATA']) !== null && _d !== void 0 ? _d : "").trim();
                            if (!sequenceData)
                                continue;
                            const match = sequenceData.match(/(GD|TNGA)(.{3})/);
                            if (!match)
                                continue;
                            const plant = match[1];
                            const variant = match[2];
                            const id_number = variant;
                            const date = String((_e = record['DATE']) !== null && _e !== void 0 ? _e : "").trim();
                            const time = String((_f = record['TIME']) !== null && _f !== void 0 ? _f : "").trim();
                            if (!date || !time)
                                continue;
                            const parts = date.split('-');
                            if (parts.length !== 3)
                                continue;
                            const [day, month, year] = parts;
                            const created_at = new Date(`${year}-${month}-${day}T${time}:00`).toISOString();
                            if (isNaN(new Date(created_at).getTime()))
                                continue;
                            if (plant === 'TNGA' && new Date(created_at) > lastProcessedDateTNGA) {
                                resultTNGA.push({ id_number, created_at });
                            }
                            else if (plant === 'GD' && new Date(created_at) > lastProcessedDateGD) {
                                resultGD.push({ id_number, created_at });
                            }
                        }
                    }
                    catch (err) {
                        console.error(`Failed to process CSV ${fp}:`, err);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_g && !_a && (_b = dir_1.return)) yield _b.call(dir_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        catch (err) {
            console.error("Err: ", err);
        }
        finally {
            // if (dir) {
            //   try {
            //     await dir.close();
            //   } catch (closeErr) {
            //     console.warn('Error closing directory handle:', closeErr);
            //   }
            // }
        }
        return [resultGD, resultTNGA];
    });
}
