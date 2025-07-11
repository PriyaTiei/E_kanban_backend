"use strict";
// import * as XLSX from "xlsx";
// import { db } from "../db/client";
// import { parts, products, stationParts, stations } from "../db/schema";
// import { lookupCache } from "../lib/lookupCache";
// import { eq } from "drizzle-orm";
// const workbook = XLSX.readFile("/home/tnga_iot/shiva/E_kanban_GD/E_kanban_backend/src/data/partsDetails.xlsx");
// type SheetRow = Record<string, any>;
// function parseSheet(sheetName: string): SheetRow[] {
//   const sheet = workbook.Sheets[sheetName];
//   return XLSX.utils.sheet_to_json(sheet);
// }
// async function seed() {
//   // 1. Products
//   const productRows = parseSheet("products");
//   await db.insert(products).values(
//     productRows.map(row => ({ variant: row.variant }))
//   );
//   // 2. Stations
//   const stationRows = parseSheet("stations");
//   await db.insert(stations).values(
//     stationRows.map(row => ({name: row.name}
//     )));
//   // 3. Parts
//   const partRows = parseSheet("parts");
//   await db.insert(parts).values(
//     partRows.map((row) => ({
//       name: row.name,
//       description: row.description ?? null,
//   })));
// const sheetName = workbook.SheetNames[0];
// const sheet = workbook.Sheets[sheetName];
// const rows: any[] = XLSX.utils.sheet_to_json(sheet);
// let updated = 0;
// for (const row of rows) {
//     // Adjust these keys if your Excel headers are different
//     const name = String(row["name"]).trim();
//     const process = Number(row["process"]);
//     const prepLocation = String(row["prep-location"]).trim();
//     const supplyLocation = String(row["supply-location"]).trim();
//     if (!name) continue;
//     // Update the parts table where name matches
//     const result = await db
//     .update(parts)
//     .set({
//         process,
//         prepLocation,
//         supplyLocation,
//     })
//     .where(eq(parts.name, name));
//     if (result.rowCount && result.rowCount > 0) {
//     updated++;
//     console.log(`Updated part: ${name}`);
//     } else {
//     console.warn(`No part found with name: ${name}`);
//     }
// }
// console.log(`Done. Updated ${updated} parts.`);
// process.exit(0);
//   // 4. Station Parts
//   await lookupCache.initialize();
//   const stationPartRows = parseSheet("stationParts");
//   console.log("stationPartRows: ", stationPartRows);
//   await db.insert(stationParts).values(
//     stationPartRows.map((row) =>({
//       stationId: lookupCache.getStationId(row.station),
//       partId: lookupCache.getPartId(String(row.part)),
//       productId: row.product ? lookupCache.getProductId(String(row.product)) : null, 
//       consumptionPerProduct: row.consumptionPerProduct,
//       binQuantity: row.binQuantity,
//       currentQuantity: row.currentQuantity,
//       updatedBy: row.updatedBy || null,
//   })));
//   console.log("All data updated successfully.");
// }
// seed().catch(console.error);
