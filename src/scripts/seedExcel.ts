import * as XLSX from "xlsx";
import { db } from "../db/client";
import { parts, productPartExceptions, products, stationParts, stations } from "../db/schema";
import { lookupCache } from "../lib/lookupCache";
import { eq } from "drizzle-orm";

const workbook = XLSX.readFile("/home/tnga_iot/shiva/E_kanban_GD/E_kanban_backend/src/data/seedData.xlsx");

type SheetRow = Record<string, any>;

function parseSheet(sheetName: string): SheetRow[] {
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
}

async function seed() {
  
  // 1. Products
  // const productRows = parseSheet("products");
  // await db.insert(products).values(
  //   productRows.map(row => ({ variant: row.variant }))
  // );

  // 2. Stations
  // const stationRows = parseSheet("stations");
  // await db.insert(stations).values(
  //   stationRows.map(row => ({name: row.name}
  //   )));
  

  // 3. Parts
  const partRows = parseSheet("parts");
  for (const row of partRows) {
    await db.update(parts).set({
      name: row.name,
      partId: row.partId || null,
      partNumber: row.partNumber || null,
    }).where(eq(parts.partId, row.partId));
  }

  // // 4. Station Parts
  // await lookupCache.initialize();
  // const stationPartRows = parseSheet("stationParts");
  
  // await db.insert(stationParts).values(
  //   stationPartRows.map((row) =>{
  //     console.log("Processing Station: ", row.station, "Part: ", row.part);
  //     return({
  //       stationId: lookupCache.getStationId(row.station),
  //       partId: lookupCache.getPartId(String(row.part)),
  //       consumptionPerProduct: row.consumptionPerProduct,
  //       binQuantity: row.binQuantity,
  //       currentQuantity: row.currentQuantity,
  //       supplyLocation: row.supplyLocation || null,
  //       process: row.process || null,
  //       prepLocation: row.prepLocation || null,
  //       allowedForAllProducts: row.allowed_for_all_products || false,
  // })}));

//   const productPartExceptionsRows = parseSheet("productPartExceptions");
//   await db.insert(productPartExceptions).values(
//     productPartExceptionsRows.map((row) => ({
//       productId: lookupCache.getProductId(row.product),
//       partId: lookupCache.getPartId(row.part)
//     }))
//   );

  console.log("All data updated successfully.");
}

seed().catch(console.error);
