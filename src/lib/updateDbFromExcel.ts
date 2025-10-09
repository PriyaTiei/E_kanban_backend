import ExcelJS from "exceljs";
import { db } from "../db/client";
import {
  products,
  stations,
  parts,
  stationParts,
  productPartExceptions,
} from "../db/schema";
import { eq, and, like } from "drizzle-orm";
import { lookupCache, LookupCache } from "./lookupCache";
import { insertNewVariant } from "./productEntryHelper";
import { PgTransaction } from "drizzle-orm/pg-core";
import { txType } from "./types";

type Result = { success: true; message?: string } | { success: false; error: string };
type HeaderMap = Record<string, number>;

function makeError(msg: string, err?: unknown): Result {
  console.error("❌ Error:", msg, err instanceof Error ? err.stack : err);
  throw new Error(msg);
}

function getHeaderMap(row: ExcelJS.Row): HeaderMap {
  const map: HeaderMap = {};
  row.eachCell((cell, colNumber) => {
    if (cell.value) {
      map[String(cell.value).trim()] = colNumber;
    }
  });
  return map;
}

/* ---------------- PRODUCTS ---------------- */
async function processProducts(sheet: ExcelJS.Worksheet, tx: txType, plantId: number): Promise<Result> {
  const dbVariants = new Set((
    await tx.select({ variant: products.variant })
      .from(products)
      .where(eq(products.plantId, plantId))
    ).map(
      (row) => row.variant
    )
  );
  const excelVariants = new Set<string>();
  let headerMap: HeaderMap = {};

  for (const row of sheet.getRows(1, sheet.rowCount) || []) {
    if (row.number === 1) {
      headerMap = getHeaderMap(row);
      continue;
    }

    const variant = row.getCell(headerMap["variant"]).value?.toString().trim();
    if (!variant) continue;

    excelVariants.add(variant);

    if (!dbVariants.has(variant)) {
      try {
        await tx.insert(products).values({ variant, plantId });
      } catch (err) {
        return makeError(
          `Failed to insert product '${variant}' (row ${row.number})`,
          err
        );
      }
    }
  }

  return { success: true };
}

/* ---------------- STATIONS ---------------- */
async function processStations(sheet: ExcelJS.Worksheet, tx: txType, plantId: number): Promise<Result> {
  const dbNames = new Set((
    await tx.select({ name: stations.name })
      .from(stations)
      .where(eq(stations.plantId, plantId))
    ).map(
      (row) => row.name
    )
  );
  const excelNames = new Set<string>();
  let headerMap: HeaderMap = {};

  for (const row of sheet.getRows(1, sheet.rowCount) || []) {
    if (row.number === 1) {
      headerMap = getHeaderMap(row);
      continue;
    }

    const name = row.getCell(headerMap["name"]).value?.toString().trim();
    // const plant = row.getCell(headerMap["plant"]).value?.toString().trim();

    if (!name) continue;
    excelNames.add(name);

    if (!dbNames.has(name)) {
      try {
        // const plantId = lookupCache.getPlantId(plant);
        await tx.insert(stations).values({ name, plantId });
      } catch (err) {
        return makeError(
          `Failed to insert station '${name}' (row ${row.number})`,
          err
        );
      }
    }
  }

  // Delete stations not in Excel
  for (const dbName of dbNames) {
    if (!excelNames.has(dbName)) {
      try {
        await tx.delete(stations).where(eq(stations.name, dbName));
      } catch (err) {
        return makeError(`Failed to delete station '${dbName}'`, err);
      }
    }
  }

  return { success: true };
}

/* ---------------- PARTS ---------------- */
async function processParts(sheet: ExcelJS.Worksheet, tx: txType, plantId: number): Promise<Result> {
  const dbPartIds = new Set((
    await tx.select({ partId: parts.partId })
      .from(parts)
      .where(eq(parts.plantId, plantId))
    ).map(
      (row) => row.partId
    )
  );
  const excelPartIds = new Set<string>();
  let headerMap: HeaderMap = {};

  for (const row of sheet.getRows(1, sheet.rowCount) || []) {
    if (row.number === 1) {
      headerMap = getHeaderMap(row);
      continue;
    }

    const partId = row.getCell(headerMap["partId"]).value?.toString().trim();
    let name = row.getCell(headerMap["name"]).value?.toString().trim();
    let partNumber = row.getCell(headerMap["partNumber"]).value?.toString().trim();

    if (!partId) continue;
    excelPartIds.add(partId);

    if (!dbPartIds.has(partId)) {
      try {
        name = name || "";
        partNumber = partNumber || "";
        const result = await tx.insert(parts).values({ partId, name, partNumber, plantId }).returning({id: parts.id});
        // console.log("Inserted new part:", result[0].id, partId, name, partNumber);
        
      } catch (err) {
        return makeError(
          `Failed to insert part '${partId}' (row ${row.number})`,
          err
        );
      }
    } else {
      // Optionally update existing part's name or partNumber if changed
      try {
        const dbPart = await tx.select()
          .from(parts)
          .where(and(eq(parts.partId, partId), eq(parts.plantId, plantId)));
        if (dbPart.length === 1) {
          const updates: any = {};
          if (name && dbPart[0].name !== name) updates.name = name;
          if (partNumber && dbPart[0].partNumber !== partNumber) updates.partNumber = partNumber;
          if (Object.keys(updates).length > 0) {
            await tx.update(parts).set(updates).where(eq(parts.partId, partId));
          }
        }
      } catch (err) {
        return makeError(
          `Failed to update part '${partId}' (row ${row.number})`,
          err
        );
      }
    }
  }

  // Delete parts not in Excel
  for (const dbPartId of dbPartIds) {
    if (dbPartId && !excelPartIds.has(dbPartId)) {
      try {
        await tx.delete(parts).where(eq(parts.partId, dbPartId));
      } catch (err) {
        return makeError(`Failed to delete part '${dbPartId}'`, err);
      }
    }
  }

  return { success: true };
}

/* ---------------- STATION PARTS ---------------- */
async function processStationParts(sheet: ExcelJS.Worksheet, tx: txType, plantId: number): Promise<Result> {
  const dbStationParts = await tx.select()
    .from(stationParts)
    .where(eq(stationParts.plantId, plantId));
  const stationPartMap = new Map<string, any>();
  dbStationParts.forEach((sp) => {
    stationPartMap.set(`${sp.stationId}_${sp.partId}`, sp);
  });

  const excelStationPartKeys = new Set<string>();
  let headerMap: HeaderMap = {};

  for (const row of sheet.getRows(1, sheet.rowCount) || []) {
    if (row.number === 1) {
      row.eachCell((cell, colNumber) => {
        if (cell.value === "station") headerMap["stationId"] = colNumber;
        else if (cell.value === "part") headerMap["partId"] = colNumber;
        else headerMap[String(cell.value).trim()] = colNumber;
      });
      continue;
    }

    const stationRaw = row.getCell(headerMap["stationId"]).value;
    const partRaw = row.getCell(headerMap["partId"]).value;

    if(!stationRaw || !partRaw) {
      console.log(`Skipping row ${row.number} due to missing station or part`);
      continue;
    }

    const station = String(stationRaw).trim();
    const part = String(partRaw).trim();
    let stationId, partId;
    try {
      stationId = await tx.select({id: stations.id, name: stations.name})
        .from(stations)
        .where(like(stations.name, station));
      // console.log("stationId lookup", stationId);
      
      stationId = stationId[0].id
      partId = await tx.select({id: parts.id, partId: parts.partId})
        .from(parts)
        .where(like(parts.partId, part));
      // console.log("partId lookup", partId);
      
      partId = partId[0].id
    } catch (err) {
      return makeError(
        `Lookup failed for station='${station}', part='${part}' (row ${row.number})`,
        err
      );
    }

    const key = `${stationId}_${partId}`;
    excelStationPartKeys.add(key);
    const dbRow = stationPartMap.get(key);

    const updateData: any = {};
    Object.keys(headerMap).forEach((header) => {
      let cellValue = row.getCell(headerMap[header]).value;
      
      // unwrap ExcelJS objects
      if (typeof cellValue === "object" && cellValue !== null) {
        console.log(`cellValue: ${JSON.stringify(cellValue, null, 2)}`);
        if ("result" in cellValue) cellValue = cellValue.result; // for formula cells
        else if ("text" in cellValue) cellValue = cellValue.text;
        else if ("richText" in cellValue)
          cellValue = cellValue.richText.map((t: any) => t.text).join("");
        else if ("value" in cellValue)
          cellValue = String(cellValue.value);
      }
      if (typeof cellValue === "number") cellValue = Math.round(cellValue);
      let value: any = String(cellValue).trim();
      console.log(`value: ${value}`);
      
      if (header === "stationId") value = stationId;
      if (header === "partId") value = partId;
      updateData[header] = value;
    });

    try {
      if (!dbRow) {
        await tx.insert(stationParts).values({...updateData, plantId});
      } else {
        delete updateData.currentQuantity;
        let needsUpdate = false;
        for (const key in updateData) {
          if (dbRow[key] !== updateData[key]) {
            needsUpdate = true;
            break;
          }
        }
        if (needsUpdate) {
          await tx
            .update(stationParts)
            .set(updateData)
            .where(
              and(
                eq(stationParts.stationId, stationId),
                eq(stationParts.partId, partId)
              )
            );
        }
      }
    } catch (err) {
      return makeError(
        `Failed to insert/update stationPart (station=${station}, part=${part})`,
        err
      );
    }
  }

  // Delete stationParts not in Excel
  for (const dbKey of stationPartMap.keys()) {
    if (!excelStationPartKeys.has(dbKey)) {
      const [stationId, partId] = dbKey.split("_").map(Number);
      try {
        await tx
          .delete(stationParts)
          .where(
            and(
              eq(stationParts.stationId, stationId),
              eq(stationParts.partId, partId)
            )
          );
      } catch (err) {
        return makeError(
          `Failed to delete stationPart (stationId=${stationId}, partId=${partId})`,
          err
        );
      }
    }
  }

  return { success: true };
}

/* ---------------- PRODUCT PART EXCEPTIONS ---------------- */
async function processProductPartExceptions(sheet: ExcelJS.Worksheet, tx: txType, plantId: number): Promise<Result> {
  const dbExceptions = await tx
    .select({
      productId: productPartExceptions.productId,
      partId: productPartExceptions.partId,
    })
    .from(productPartExceptions)
    .where(eq(productPartExceptions.plantId, plantId));

  const exceptionSet = new Set(dbExceptions.map((e) => `${e.productId}_${e.partId}`));
  const excelExceptionSet = new Set<string>();
  let headerMap: HeaderMap = {};

  for (const row of sheet.getRows(1, sheet.rowCount) || []) {
    if (row.number === 1) {
      headerMap = getHeaderMap(row);
      continue;
    }

    const productRaw = row.getCell(headerMap["product"]).value;
    const partRaw = row.getCell(headerMap["part"]).value;

    if(!productRaw || !partRaw) {
      console.log(`Skipping row ${row.number} due to missing product or part`);
      continue;
    }

    const product = String(productRaw).trim();
    const part = String(partRaw).trim();

    if(!product || !part) {
      console.log(`Skipping row ${row.number} due to missing product or part`);
      continue;
    }

    let productId, partId;
    try {
      productId = await tx.select({id: products.id})
        .from(products)
        .where(like(products.variant, product));
      productId = productId[0].id;
      partId = await tx.select({id: parts.id})
        .from(parts)
        .where(like(parts.partId, part));
      partId = partId[0].id;
      if (!productId) {
        const newProductId = await insertNewVariant(product, plantId);
        productId = newProductId[0].id;
      }
    } catch (err) {
      return makeError(
        `Lookup/insert failed for exception (product='${product}', part='${part}', row ${row.number})`,
        err
      );
    }

    const key = `${productId}_${partId}`;
    excelExceptionSet.add(key);

    if (!exceptionSet.has(key)) {
      try {
        await tx.insert(productPartExceptions).values({ productId, partId, plantId });
      } catch (err) {
        return makeError(
          `Failed to insert productPartException (product=${product}, part=${part})`,
          err
        );
      }
    }
  }

  // Delete exceptions not in Excel
  for (const dbKey of exceptionSet) {
    if (!excelExceptionSet.has(dbKey)) {
      const [productId, partId] = dbKey.split("_").map(Number);
      try {
        await tx
          .delete(productPartExceptions)
          .where(
            and(
              eq(productPartExceptions.productId, productId),
              eq(productPartExceptions.partId, partId)
            )
          );
      } catch (err) {
        return makeError(
          `Failed to delete productPartException (productId=${productId}, partId=${partId})`,
          err
        );
      }
    }
  }

  return { success: true };
}

/* ---------------- MAIN FUNCTION ---------------- */
export async function updateDbFromExcel(filePath: string): Promise<Result> {
  
  try {
    let plantId: number;
    if (filePath.endsWith("GD.xlsx")) {
      plantId = 1;
    } else if (filePath.endsWith("TNGA.xlsx")) {
      plantId = 2;
    } else {
      throw new Error("Invalid filePath: must end with 'GD' or 'TNGA'");
    }
    await lookupCache.initialize(plantId);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    return await db.transaction(async (tx) => {
      // Products
      const productsSheet = workbook.getWorksheet("products");
      if (productsSheet) {
        await processProducts(productsSheet, tx, plantId);
        // if (!res.success) return res;
      }

      // Stations
      const stationsSheet = workbook.getWorksheet("stations");
      if (stationsSheet) {
        await processStations(stationsSheet, tx, plantId);
        // if (!res.success) return res;
      }

      // Parts
      const partsSheet = workbook.getWorksheet("parts");
      if (partsSheet) {
        await processParts(partsSheet, tx, plantId);
        // if (!res.success) return res;
      }

      // StationParts
      const stationPartsSheet = workbook.getWorksheet("stationParts");
      if (stationPartsSheet) {
        await processStationParts(stationPartsSheet, tx, plantId);
        // if (!res.success) return res;
      }

      // ProductPartExceptions
      const productPartExceptionsSheet = workbook.getWorksheet("productPartExceptions");
      if (productPartExceptionsSheet) {
        await processProductPartExceptions(productPartExceptionsSheet, tx, plantId);
        // if (!res.success) return res;
      }

      return { success: true, message: "✅ Excel sync completed successfully" };
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
