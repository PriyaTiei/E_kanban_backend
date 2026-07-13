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
exports.listCsvEntriesSinceTimestamp = listCsvEntriesSinceTimestamp;
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sync_1 = __importDefault(require("csv-parse/sync"));
dotenv_1.default.config();
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
        const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 5000);
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
        return [resultGD, resultTNGA];
    });
}
