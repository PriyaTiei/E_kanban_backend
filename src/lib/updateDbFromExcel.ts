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

type Result = { success: true; message?: string } | { success: false; error: string };
type HeaderMap = Record<string, number>;
type txType = PgTransaction<any, typeof import("/home/tnga_iot/shiva/E_kanban_GD/E_kanban_backend/src/db/schema"), any>

function makeError(msg: string, err?: unknown): Result {
  console.error("❌ Error:", msg, err instanceof Error ? err.stack : err);
  return { success: false, error: msg };
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
async function processProducts(sheet: ExcelJS.Worksheet, tx: txType): Promise<Result> {
  const dbVariants = new Set(
    (await tx.select({ variant: products.variant }).from(products)).map(
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
        await tx.insert(products).values({ variant });
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
async function processStations(sheet: ExcelJS.Worksheet, tx: txType): Promise<Result> {
  const dbNames = new Set(
    (await tx.select({ name: stations.name }).from(stations)).map(
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
    const plant = row.getCell(headerMap["plant"]).value?.toString().trim();

    if (!name || !plant) continue;
    excelNames.add(name);

    if (!dbNames.has(name)) {
      try {
        const plantId = lookupCache.getPlantId(plant);
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
async function processParts(sheet: ExcelJS.Worksheet, tx: txType): Promise<Result> {
  const dbPartIds = new Set(
    (await tx.select({ partId: parts.partId }).from(parts)).map(
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
    const name = row.getCell(headerMap["name"]).value?.toString().trim();
    const partNumber = row.getCell(headerMap["partNumber"]).value?.toString().trim();

    if (!partId || !name || !partNumber) continue;
    excelPartIds.add(partId);

    if (!dbPartIds.has(partId)) {
      try {
        await tx.insert(parts).values({ partId, name, partNumber });
      } catch (err) {
        return makeError(
          `Failed to insert part '${partId}' (row ${row.number})`,
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
async function processStationParts(sheet: ExcelJS.Worksheet, tx: txType): Promise<Result> {
  const dbStationParts = await tx.select().from(stationParts);
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

    const station = String(row.getCell(headerMap["stationId"]).value).trim();
    const part = String(row.getCell(headerMap["partId"]).value).trim();

    let stationId, partId;
    try {
      stationId = await tx.select({id: stations.id})
        .from(stations)
        .where(like(stations.name, station));
      stationId = stationId[0].id
      partId = await tx.select({id: parts.id})
        .from(parts)
        .where(like(parts.partId, part));
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
      let value: any = String(row.getCell(headerMap[header]).value);
      if (header === "stationId") value = stationId;
      if (header === "partId") value = partId;
      updateData[header] = value;
    });

    try {
      if (!dbRow) {
        await tx.insert(stationParts).values(updateData);
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
async function processProductPartExceptions(sheet: ExcelJS.Worksheet, tx: txType): Promise<Result> {
  const dbExceptions = await tx
    .select({
      productId: productPartExceptions.productId,
      partId: productPartExceptions.partId,
    })
    .from(productPartExceptions);

  const exceptionSet = new Set(dbExceptions.map((e) => `${e.productId}_${e.partId}`));
  const excelExceptionSet = new Set<string>();
  let headerMap: HeaderMap = {};

  for (const row of sheet.getRows(1, sheet.rowCount) || []) {
    if (row.number === 1) {
      headerMap = getHeaderMap(row);
      continue;
    }

    const product = String(row.getCell(headerMap["product"]).value).trim();
    const part = String(row.getCell(headerMap["part"]).value).trim();

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
        const newProductId = await insertNewVariant(product);
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
        await tx.insert(productPartExceptions).values({ productId, partId });
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
  await lookupCache.initialize();

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    return await db.transaction(async (tx) => {
      // Products
      const productsSheet = workbook.getWorksheet("products");
      if (productsSheet) {
        const res = await processProducts(productsSheet, tx);
        if (!res.success) return res;
      }

      // Stations
      const stationsSheet = workbook.getWorksheet("stations");
      if (stationsSheet) {
        const res = await processStations(stationsSheet, tx);
        if (!res.success) return res;
      }

      // Parts
      const partsSheet = workbook.getWorksheet("parts");
      if (partsSheet) {
        const res = await processParts(partsSheet, tx);
        if (!res.success) return res;
      }

      // StationParts
      const stationPartsSheet = workbook.getWorksheet("stationParts");
      if (stationPartsSheet) {
        const res = await processStationParts(stationPartsSheet, tx);
        if (!res.success) return res;
      }

      // ProductPartExceptions
      const productPartExceptionsSheet = workbook.getWorksheet("productPartExceptions");
      if (productPartExceptionsSheet) {
        const res = await processProductPartExceptions(productPartExceptionsSheet, tx);
        if (!res.success) return res;
      }

      return { success: true, message: "✅ Excel sync completed successfully" };
    });
  } catch (err) {
    return makeError("Unexpected error while processing Excel", err);
  }
}
