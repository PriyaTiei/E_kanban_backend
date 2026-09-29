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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingPreparationKanbans = getPendingPreparationKanbans;
exports.getMasterStationParts = getMasterStationParts;
exports.generatePreparationExcel = generatePreparationExcel;
exports.savePreparationBackupFiles = savePreparationBackupFiles;
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const PLANT_NAMES = {
    1: "GD",
    2: "TNGA",
};
/**
 * Fetch all unacknowledged (pending) kanbans for the specified plant,
 * ordered by prepLocation and process for efficient shop-floor picking.
 */
function getPendingPreparationKanbans(plantId, processFilter) {
    return __awaiter(this, void 0, void 0, function* () {
        const stationPartsJoinCondition = (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.stationPartsId, schema_1.stationParts.id);
        let baseWhereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.kanbanRequests.acknowledgedByLogistics, false), (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.plantId, plantId));
        const orderByClause = (0, drizzle_orm_1.sql) `
    CASE
      WHEN ${schema_1.stationParts.prepLocation} LIKE 'TZ-%' THEN 1
      WHEN ${schema_1.stationParts.prepLocation} LIKE 'LOG-%' THEN 2
      ELSE 3
    END,
    NULLIF(regexp_replace(${schema_1.stationParts.prepLocation}, '[^0-9]', '', 'g'), '')::int,
    ${schema_1.kanbanRequests.partId},
    ${schema_1.kanbanRequests.requestedAt}
  `;
        // Fetch standard station-part kanbans
        const query = client_1.db
            .select({
            id: schema_1.kanbanRequests.id,
            plantId: schema_1.kanbanRequests.plantId,
            process: schema_1.stationParts.process,
            stationName: schema_1.stations.name,
            partIdNo: schema_1.parts.partId,
            partNumber: schema_1.parts.partNumber,
            partName: schema_1.parts.name,
            prepLocation: schema_1.stationParts.prepLocation,
            supplyLocation: schema_1.stationParts.supplyLocation,
            binQuantity: schema_1.stationParts.binQuantity,
            currentQuantity: schema_1.stationParts.currentQuantity,
            requestedAt: schema_1.kanbanRequests.requestedAt,
            reportId: schema_1.delayKanbans.id,
            reportedAt: schema_1.delayKanbans.reportedAt,
        })
            .from(schema_1.kanbanRequests)
            .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, schema_1.stations.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.sql) `${schema_1.parts.id} = COALESCE(${schema_1.stationParts.partId}, ${schema_1.kanbanRequests.partId})`)
            .leftJoin(schema_1.delayKanbans, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
            .where(processFilter
            ? (0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.eq)(schema_1.stationParts.process, processFilter))
            : baseWhereClause)
            .orderBy(orderByClause);
        const kanbans = yield query;
        // Also include rank parts if no process filter or 'rank parts' selected
        if (!processFilter || processFilter === "rank parts") {
            const rankKanbans = yield client_1.db
                .select({
                id: schema_1.kanbanRequests.id,
                plantId: schema_1.kanbanRequests.plantId,
                process: (0, drizzle_orm_1.sql) `'Rank Parts'`,
                stationName: (0, drizzle_orm_1.sql) `'-'`,
                partIdNo: schema_1.parts.partId,
                partNumber: schema_1.parts.partNumber,
                partName: schema_1.parts.name,
                prepLocation: (0, drizzle_orm_1.sql) `'-'`,
                supplyLocation: (0, drizzle_orm_1.sql) `'-'`,
                binQuantity: (0, drizzle_orm_1.sql) `1`,
                currentQuantity: (0, drizzle_orm_1.sql) `0`,
                requestedAt: schema_1.kanbanRequests.requestedAt,
                reportId: schema_1.delayKanbans.id,
                reportedAt: schema_1.delayKanbans.reportedAt,
            })
                .from(schema_1.kanbanRequests)
                .leftJoin(schema_1.stationParts, stationPartsJoinCondition)
                .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.kanbanRequests.partId, schema_1.parts.id))
                .leftJoin(schema_1.delayKanbans, (0, drizzle_orm_1.eq)(schema_1.delayKanbans.kanbanId, schema_1.kanbanRequests.id))
                .where((0, drizzle_orm_1.and)(baseWhereClause, (0, drizzle_orm_1.isNull)(schema_1.stationParts.id)))
                .orderBy(schema_1.kanbanRequests.requestedAt);
            kanbans.push(...rankKanbans);
        }
        return kanbans;
    });
}
/**
 * Fetch master station-parts catalogue for offline emergency reference.
 */
function getMasterStationParts(plantId) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield client_1.db
            .select({
            process: schema_1.stationParts.process,
            stationName: schema_1.stations.name,
            partIdNo: schema_1.parts.partId,
            partNumber: schema_1.parts.partNumber,
            partName: schema_1.parts.name,
            prepLocation: schema_1.stationParts.prepLocation,
            supplyLocation: schema_1.stationParts.supplyLocation,
            binQuantity: schema_1.stationParts.binQuantity,
            consumptionPerProduct: schema_1.stationParts.consumptionPerProduct,
        })
            .from(schema_1.stationParts)
            .leftJoin(schema_1.stations, (0, drizzle_orm_1.eq)(schema_1.stationParts.stationId, schema_1.stations.id))
            .leftJoin(schema_1.parts, (0, drizzle_orm_1.eq)(schema_1.stationParts.partId, schema_1.parts.id))
            .where((0, drizzle_orm_1.eq)(schema_1.stationParts.plantId, plantId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.stationParts.process), (0, drizzle_orm_1.asc)(schema_1.stations.name), (0, drizzle_orm_1.asc)(schema_1.stationParts.prepLocation));
    });
}
/**
 * Generates an Excel workbook containing:
 *  1) "Active Preparation List" - The current pending kanban queue for shop floor manual picking.
 *  2) "Master Parts Reference" - Master BOM / locations reference table for manual line feeding.
 */
function generatePreparationExcel(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { plantId, processFilter, includeMasterReference = true } = options;
        const plantName = PLANT_NAMES[plantId] || `Plant ${plantId}`;
        const now = new Date();
        const timestampStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
        const workbook = new exceljs_1.default.Workbook();
        workbook.creator = "E-Kanban System";
        workbook.created = now;
        // ─────────────────────────────────────────────────────────────
        // SHEET 1: Active Preparation List (Contingency Manual Sheet)
        // ─────────────────────────────────────────────────────────────
        const prepSheet = workbook.addWorksheet("Preparation Backup List", {
            pageSetup: { orientation: "landscape", paperSize: 9 }, // A4 Landscape for printing
        });
        // Header Banner styling
        const headerBgColor = plantId === 1 ? "FF1E3A8A" : "FF0F766E"; // Dark Blue for GD, Dark Teal for TNGA
        // Row 1: Title
        prepSheet.mergeCells("A1:K1");
        const titleCell = prepSheet.getCell("A1");
        titleCell.value = `TOYOTA E-KANBAN PREPARATION LIST — MANUAL CONTINGENCY BACKUP (${plantName} LINE)`;
        titleCell.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
        titleCell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: headerBgColor },
        };
        titleCell.alignment = { horizontal: "center", vertical: "middle" };
        prepSheet.getRow(1).height = 30;
        // Row 2: Metadata / Subtitle
        prepSheet.mergeCells("A2:K2");
        const metaCell = prepSheet.getCell("A2");
        metaCell.value = `Plant: ${plantName} (Plant ID: ${plantId}) | Generated At: ${timestampStr} | Status: OFFLINE BACKUP MODE | Filter: ${processFilter ? `Process ${processFilter}` : "All Processes"}`;
        metaCell.font = { italic: true, size: 10, color: { argb: "FF333333" } };
        metaCell.alignment = { horizontal: "center", vertical: "middle" };
        prepSheet.getRow(2).height = 20;
        // Row 3: Blank separator
        prepSheet.getRow(3).height = 10;
        // Row 4: Column Headers
        const columns = [
            { key: "sno", header: "S.No", width: 8 },
            { key: "kanbanId", header: "Kanban ID", width: 12 },
            { key: "process", header: "Process", width: 14 },
            { key: "station", header: "Station", width: 18 },
            { key: "partIdNo", header: "Part ID", width: 16 },
            { key: "partName", header: "Part Name / Description", width: 28 },
            { key: "prepLocation", header: "Prep Location", width: 16 },
            { key: "supplyLocation", header: "Supply Location", width: 16 },
            { key: "binQty", header: "Bin Qty", width: 10 },
            { key: "requestedAt", header: "Requested Time", width: 20 },
            { key: "manualCheck", header: "Prepared? (✓ / Sign)", width: 22 },
        ];
        prepSheet.columns = columns;
        const headerRow = prepSheet.getRow(4);
        headerRow.height = 25;
        columns.forEach((col, idx) => {
            const cell = headerRow.getCell(idx + 1);
            cell.value = col.header;
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF374151" }, // Slate dark gray
            };
            cell.alignment = { horizontal: "center", vertical: "middle" };
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "medium" },
                right: { style: "thin" },
            };
        });
        // Fetch data
        const kanbans = yield getPendingPreparationKanbans(plantId, processFilter);
        if (kanbans.length === 0) {
            const emptyRow = prepSheet.addRow([
                "-",
                "-",
                "-",
                "-",
                "-",
                "No pending kanban requests at this time.",
                "-",
                "-",
                "-",
                "-",
                "-",
            ]);
            emptyRow.alignment = { horizontal: "center", vertical: "middle" };
        }
        else {
            kanbans.forEach((item, index) => {
                const requestedDate = item.requestedAt
                    ? new Date(item.requestedAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    })
                    : "-";
                const row = prepSheet.addRow([
                    index + 1,
                    `#${item.id}`,
                    item.process || "-",
                    item.stationName || "-",
                    item.partIdNo || item.partNumber || "-",
                    item.partName || "-",
                    item.prepLocation || "-",
                    item.supplyLocation || "-",
                    item.binQuantity || 1,
                    requestedDate,
                    "[  ] Done", // Checkbox box for manual ticking on printed sheet
                ]);
                row.height = 22;
                // Styling each cell with borders
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFCCCCCC" } },
                        left: { style: "thin", color: { argb: "FFCCCCCC" } },
                        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
                        right: { style: "thin", color: { argb: "FFCCCCCC" } },
                    };
                    cell.font = { size: 9 };
                    // Center align specific columns
                    if ([1, 2, 3, 4, 5, 7, 8, 9, 10, 11].includes(colNumber)) {
                        cell.alignment = { horizontal: "center", vertical: "middle" };
                    }
                    else {
                        cell.alignment = { horizontal: "left", vertical: "middle" };
                    }
                    // Highlight delayed kanbans if any
                    if (item.reportId) {
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFFFF1F2" }, // Light red warning
                        };
                    }
                });
            });
        }
        // ─────────────────────────────────────────────────────────────
        // SHEET 2: Master Parts & Locations Reference (Static Catalog)
        // ─────────────────────────────────────────────────────────────
        if (includeMasterReference) {
            const masterSheet = workbook.addWorksheet("Master Parts Reference");
            masterSheet.mergeCells("A1:H1");
            const masterTitle = masterSheet.getCell("A1");
            masterTitle.value = `MASTER PARTS & LOCATIONS CATALOG — ${plantName} LINE`;
            masterTitle.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
            masterTitle.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF1F2937" },
            };
            masterTitle.alignment = { horizontal: "center", vertical: "middle" };
            masterSheet.getRow(1).height = 26;
            const masterColumns = [
                { key: "sno", header: "S.No", width: 8 },
                { key: "process", header: "Process", width: 14 },
                { key: "station", header: "Station Name", width: 20 },
                { key: "partId", header: "Part ID", width: 16 },
                { key: "partName", header: "Part Description", width: 28 },
                { key: "prepLocation", header: "Prep Location (Supermarket)", width: 20 },
                { key: "supplyLocation", header: "Supply Location (Line)", width: 20 },
                { key: "binQty", header: "Standard Bin Qty", width: 16 },
            ];
            masterSheet.columns = masterColumns;
            const masterHeaderRow = masterSheet.getRow(2);
            masterHeaderRow.height = 24;
            masterColumns.forEach((col, idx) => {
                const cell = masterHeaderRow.getCell(idx + 1);
                cell.value = col.header;
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9 };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF4B5563" },
                };
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "medium" },
                    right: { style: "thin" },
                };
            });
            const masterParts = yield getMasterStationParts(plantId);
            masterParts.forEach((part, idx) => {
                const row = masterSheet.addRow([
                    idx + 1,
                    part.process || "-",
                    part.stationName || "-",
                    part.partIdNo || part.partNumber || "-",
                    part.partName || "-",
                    part.prepLocation || "-",
                    part.supplyLocation || "-",
                    part.binQuantity || 1,
                ]);
                row.height = 20;
                row.eachCell((cell, colNumber) => {
                    cell.font = { size: 9 };
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE5E7EB" } },
                        left: { style: "thin", color: { argb: "FFE5E7EB" } },
                        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
                        right: { style: "thin", color: { argb: "FFE5E7EB" } },
                    };
                    if ([1, 2, 3, 4, 6, 7, 8].includes(colNumber)) {
                        cell.alignment = { horizontal: "center", vertical: "middle" };
                    }
                    else {
                        cell.alignment = { horizontal: "left", vertical: "middle" };
                    }
                });
            });
        }
        return Buffer.from(yield workbook.xlsx.writeBuffer());
    });
}
/**
 * Saves both GD (Plant 1) and TNGA (Plant 2) backup Excel snapshots to disk.
 * Stored at: <backupDir>/GD_Preparation_Backup_Latest.xlsx
 *            <backupDir>/TNGA_Preparation_Backup_Latest.xlsx
 * Also saves a timestamped copy in <backupDir>/archive/ for historical reference.
 */
function savePreparationBackupFiles(customBackupDir) {
    return __awaiter(this, void 0, void 0, function* () {
        let backupDir = customBackupDir || process.env.BACKUP_DIR;
        // Support setting SHOPFLOOR_PC_IP in .env
        if (!backupDir && process.env.SHOPFLOOR_PC_IP) {
            const shareName = process.env.SHOPFLOOR_SHARE_NAME || "E_Kanban_Backup";
            backupDir = `\\\\${process.env.SHOPFLOOR_PC_IP}\\${shareName}`;
        }
        if (!backupDir) {
            backupDir = path_1.default.resolve(process.cwd(), "exports", "backups");
        }
        let archiveDir = path_1.default.join(backupDir, "archive");
        try {
            yield promises_1.default.mkdir(backupDir, { recursive: true });
            yield promises_1.default.mkdir(archiveDir, { recursive: true });
        }
        catch (err) {
            console.error(`⚠️ [Backup Worker] Could not connect to remote backup directory (${backupDir}): ${err.message}`);
            // Safe local fallback so backups never fail completely
            backupDir = path_1.default.resolve(process.cwd(), "exports", "backups");
            archiveDir = path_1.default.join(backupDir, "archive");
            console.log(`ℹ️ [Backup Worker] Using local server fallback folder: ${backupDir}`);
            yield promises_1.default.mkdir(backupDir, { recursive: true });
            yield promises_1.default.mkdir(archiveDir, { recursive: true });
        }
        const now = new Date();
        const dateStamp = now.toISOString().replace(/[:.]/g, "-");
        const results = [];
        for (const [plantIdStr, plantName] of Object.entries(PLANT_NAMES)) {
            const plantId = Number(plantIdStr);
            try {
                const buffer = yield generatePreparationExcel({ plantId });
                // 1. Overwrite latest file (easy fixed path for shop floor to open)
                const latestPath = path_1.default.join(backupDir, `${plantName}_Preparation_Backup_Latest.xlsx`);
                yield promises_1.default.writeFile(latestPath, buffer);
                // 2. Save timestamped archive
                const archivePath = path_1.default.join(archiveDir, `${plantName}_Preparation_Backup_${dateStamp}.xlsx`);
                yield promises_1.default.writeFile(archivePath, buffer);
                results.push({ plant: plantName, path: latestPath, archivePath });
                console.log(`✅ [Backup Worker] Saved ${plantName} preparation backup to ${latestPath}`);
            }
            catch (error) {
                console.error(`❌ [Backup Worker] Failed to save backup for ${plantName}:`, error);
            }
        }
        // Cleanup archive files older than 7 days
        yield cleanupOldArchives(archiveDir, 7);
        return results;
    });
}
/**
 * Deletes archive backup files older than maxDays.
 */
function cleanupOldArchives(archiveDir_1) {
    return __awaiter(this, arguments, void 0, function* (archiveDir, maxDays = 7) {
        try {
            const files = yield promises_1.default.readdir(archiveDir);
            const now = Date.now();
            const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;
            for (const file of files) {
                if (!file.endsWith(".xlsx"))
                    continue;
                const filePath = path_1.default.join(archiveDir, file);
                try {
                    const stats = yield promises_1.default.stat(filePath);
                    if (now - stats.mtimeMs > maxAgeMs) {
                        yield promises_1.default.unlink(filePath);
                        console.log(`🧹 [Backup Cleanup] Deleted old archive: ${file}`);
                    }
                }
                catch (err) {
                    // Ignore single file error
                }
            }
        }
        catch (err) {
            // Ignore cleanup directory error
        }
    });
}
