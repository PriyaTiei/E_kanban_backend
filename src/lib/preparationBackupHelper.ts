import ExcelJS from "exceljs";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { db } from "../db/client";
import {
  kanbanRequests,
  stations,
  parts,
  stationParts,
  delayKanbans,
  plants,
} from "../db/schema";
import { eq, and, sql, asc, isNull } from "drizzle-orm";

export interface PreparationExportOptions {
  plantId: number;
  processFilter?: string | null;
  includeMasterReference?: boolean;
}

const PLANT_NAMES: Record<number, string> = {
  1: "GD",
  2: "TNGA",
};

/**
 * Fetch all unacknowledged (pending) kanbans for the specified plant,
 * ordered by prepLocation and process for efficient shop-floor picking.
 */
export async function getPendingPreparationKanbans(plantId: number, processFilter?: string | null) {
  const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);

  let baseWhereClause = and(
    eq(kanbanRequests.acknowledgedByLogistics, false),
    eq(kanbanRequests.plantId, plantId)
  );

  const orderByClause = sql`
    CASE
      WHEN ${stationParts.prepLocation} LIKE 'TZ-%' THEN 1
      WHEN ${stationParts.prepLocation} LIKE 'LOG-%' THEN 2
      ELSE 3
    END,
    NULLIF(regexp_replace(${stationParts.prepLocation}, '[^0-9]', '', 'g'), '')::int,
    ${kanbanRequests.partId},
    ${kanbanRequests.requestedAt}
  `;

  // Fetch standard station-part kanbans
  const query = db
    .select({
      id: kanbanRequests.id,
      plantId: kanbanRequests.plantId,
      process: stationParts.process,
      stationName: stations.name,
      partIdNo: parts.partId,
      partNumber: parts.partNumber,
      partName: parts.name,
      prepLocation: stationParts.prepLocation,
      supplyLocation: stationParts.supplyLocation,
      binQuantity: stationParts.binQuantity,
      currentQuantity: stationParts.currentQuantity,
      requestedAt: kanbanRequests.requestedAt,
      reportId: delayKanbans.id,
      reportedAt: delayKanbans.reportedAt,
    })
    .from(kanbanRequests)
    .leftJoin(stationParts, stationPartsJoinCondition)
    .leftJoin(stations, eq(stationParts.stationId, stations.id))
    .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
    .leftJoin(delayKanbans, eq(delayKanbans.kanbanId, kanbanRequests.id))
    .where(
      processFilter
        ? and(baseWhereClause, eq(stationParts.process, processFilter))
        : baseWhereClause
    )
    .orderBy(orderByClause);

  const kanbans = await query;

  // Also include rank parts if no process filter or 'rank parts' selected
  if (!processFilter || processFilter === "rank parts") {
    const rankKanbans = await db
      .select({
        id: kanbanRequests.id,
        plantId: kanbanRequests.plantId,
        process: sql<string>`'Rank Parts'`,
        stationName: sql<string>`'-'`,
        partIdNo: parts.partId,
        partNumber: parts.partNumber,
        partName: parts.name,
        prepLocation: sql<string>`'-'`,
        supplyLocation: sql<string>`'-'`,
        binQuantity: sql<number>`1`,
        currentQuantity: sql<number>`0`,
        requestedAt: kanbanRequests.requestedAt,
        reportId: delayKanbans.id,
        reportedAt: delayKanbans.reportedAt,
      })
      .from(kanbanRequests)
      .leftJoin(stationParts, stationPartsJoinCondition)
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(delayKanbans, eq(delayKanbans.kanbanId, kanbanRequests.id))
      .where(and(baseWhereClause, isNull(stationParts.id)))
      .orderBy(kanbanRequests.requestedAt);

    kanbans.push(...(rankKanbans as any));
  }

  return kanbans;
}

/**
 * Fetch master station-parts catalogue for offline emergency reference.
 */
export async function getMasterStationParts(plantId: number) {
  return await db
    .select({
      process: stationParts.process,
      stationName: stations.name,
      partIdNo: parts.partId,
      partNumber: parts.partNumber,
      partName: parts.name,
      prepLocation: stationParts.prepLocation,
      supplyLocation: stationParts.supplyLocation,
      binQuantity: stationParts.binQuantity,
      consumptionPerProduct: stationParts.consumptionPerProduct,
    })
    .from(stationParts)
    .leftJoin(stations, eq(stationParts.stationId, stations.id))
    .leftJoin(parts, eq(stationParts.partId, parts.id))
    .where(eq(stationParts.plantId, plantId))
    .orderBy(asc(stationParts.process), asc(stations.name), asc(stationParts.prepLocation));
}

/**
 * Generates an Excel workbook containing:
 *  1) "Active Preparation List" - The current pending kanban queue for shop floor manual picking.
 *  2) "Master Parts Reference" - Master BOM / locations reference table for manual line feeding.
 */
export async function generatePreparationExcel(options: PreparationExportOptions): Promise<Buffer> {
  const { plantId, processFilter, includeMasterReference = true } = options;
  const plantName = PLANT_NAMES[plantId] || `Plant ${plantId}`;
  const now = new Date();
  const timestampStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const workbook = new ExcelJS.Workbook();
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
  const kanbans = await getPendingPreparationKanbans(plantId, processFilter);

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
  } else {
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
        } else {
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

    const masterParts = await getMasterStationParts(plantId);
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
        } else {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      });
    });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Saves both GD (Plant 1) and TNGA (Plant 2) backup Excel snapshots to disk.
 * Stored at: <backupDir>/GD_Preparation_Backup_Latest.xlsx
 *            <backupDir>/TNGA_Preparation_Backup_Latest.xlsx
 * Also saves a timestamped copy in <backupDir>/archive/ for historical reference.
 */
export async function savePreparationBackupFiles(customBackupDir?: string) {
  let backupDir = customBackupDir || process.env.BACKUP_DIR;

  // Support setting SHOPFLOOR_PC_IP in .env
  if (!backupDir && process.env.SHOPFLOOR_PC_IP) {
    const shareName = process.env.SHOPFLOOR_SHARE_NAME || "E_Kanban_Backup";
    backupDir = `\\\\${process.env.SHOPFLOOR_PC_IP}\\${shareName}`;
  }

  if (!backupDir) {
    backupDir = path.resolve(process.cwd(), "exports", "backups");
  }

  let archiveDir = path.join(backupDir, "archive");

  try {
    await fs.mkdir(backupDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
  } catch (err: any) {
    console.error(`⚠️ [Backup Worker] Could not connect to remote backup directory (${backupDir}): ${err.message}`);
    // Safe local fallback so backups never fail completely
    backupDir = path.resolve(process.cwd(), "exports", "backups");
    archiveDir = path.join(backupDir, "archive");
    console.log(`ℹ️ [Backup Worker] Using local server fallback folder: ${backupDir}`);
    await fs.mkdir(backupDir, { recursive: true });
    await fs.mkdir(archiveDir, { recursive: true });
  }

  const now = new Date();
  const dateStamp = now.toISOString().replace(/[:.]/g, "-");

  const results: { plant: string; path: string; archivePath: string }[] = [];

  for (const [plantIdStr, plantName] of Object.entries(PLANT_NAMES)) {
    const plantId = Number(plantIdStr);
    try {
      const buffer = await generatePreparationExcel({ plantId });

      // 1. Overwrite latest file (easy fixed path for shop floor to open)
      const latestPath = path.join(backupDir, `${plantName}_Preparation_Backup_Latest.xlsx`);
      await fs.writeFile(latestPath, buffer);

      // 2. Save timestamped archive
      const archivePath = path.join(
        archiveDir,
        `${plantName}_Preparation_Backup_${dateStamp}.xlsx`
      );
      await fs.writeFile(archivePath, buffer);

      results.push({ plant: plantName, path: latestPath, archivePath });
      console.log(`✅ [Backup Worker] Saved ${plantName} preparation backup to ${latestPath}`);
    } catch (error) {
      console.error(`❌ [Backup Worker] Failed to save backup for ${plantName}:`, error);
    }
  }

  // Cleanup archive files older than 7 days
  await cleanupOldArchives(archiveDir, 7);

  return results;
}

/**
 * Deletes archive backup files older than maxDays.
 */
async function cleanupOldArchives(archiveDir: string, maxDays = 7) {
  try {
    const files = await fs.readdir(archiveDir);
    const now = Date.now();
    const maxAgeMs = maxDays * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".xlsx")) continue;
      const filePath = path.join(archiveDir, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          console.log(`🧹 [Backup Cleanup] Deleted old archive: ${file}`);
        }
      } catch (err) {
        // Ignore single file error
      }
    }
  } catch (err) {
    // Ignore cleanup directory error
  }
}
