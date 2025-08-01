import path from "path";
import fs from "fs/promises";
import { db } from "../db/client";
import { products, stations, parts, stationParts, productPartExceptions } from "../db/schema";
import ExcelJS from "exceljs";
import { cleanup } from "./cleanupUploads";

export async function excelExport(): Promise<Buffer> {
  // Fetch all data
  const [productsData, stationsData, partsData, stationPartsData, productPartExceptionsData] = await Promise.all([
    db.select().from(products),
    db.select().from(stations),
    db.select().from(parts),
    db.select().from(stationParts),
    db.select().from(productPartExceptions),
  ]);

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();

  // Helper to add a worksheet from data
  function addSheet(name: string, data: any[]) {
    const sheet = workbook.addWorksheet(name);
    if (data.length > 0) {
      sheet.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
      sheet.addRows(data);
    }
  }

  addSheet("products", productsData);
  addSheet("stations", stationsData);
  addSheet("parts", partsData);
  addSheet("stationParts", stationPartsData);
  addSheet("productPartExceptions", productPartExceptionsData);

  // Write to buffer
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const exportDir = path.resolve(process.cwd(), 'export');

export async function excelExportToLocal() {
  try {
    const buffer = await excelExport();
    // Ensure the export directory exists
    await fs.mkdir(exportDir, { recursive: true });
    const filePath = path.join(exportDir, `E_Kanban_data_export_${Date.now()}.xlsx`);
    await fs.writeFile(filePath, buffer);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
    throw new Error("Failed to export data to Excel");
  } finally {
    cleanup(exportDir);
  }
}