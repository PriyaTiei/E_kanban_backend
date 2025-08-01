import ExcelJS from "exceljs";
import { db } from "../db/client";
import { products, stations, parts, stationParts, productPartExceptions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { lookupCache } from './lookupCache';


export const updateDbFromExcel = async (filePath: string) => {
  lookupCache.initialize();
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    // PRODUCTS
    const productsSheet = workbook.getWorksheet("products");
    if (productsSheet) {
      const dbVariants = new Set(
        (await db.select({ variant: products.variant }).from(products)).map((row) => row.variant)
      );
      const excelVariants = new Set<string>();
      const headerMap: Record<string, any> = {};
      productsSheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) { 
          row.eachCell((cell, colNumber) => {
            headerMap[String(cell.value)] = colNumber;
          });
          return;
        };
        const variant = row.getCell(headerMap["variant"]).value?.toString();
        if (variant) {
          excelVariants.add(variant);
          if (!dbVariants.has(variant)) {
            await db.insert(products).values({ variant });
          }
        }
      });
      // Delete products not in Excel
      for (const dbVariant of dbVariants) {
        if (!excelVariants.has(dbVariant)) {
          await db.delete(products).where(eq(products.variant, dbVariant));
        }
      }
    }
    
    // STATIONS
    const stationsSheet = workbook.getWorksheet("stations");
    if (stationsSheet) {
      const dbNames = new Set(
        (await db.select({ name: stations.name }).from(stations)).map((row) => row.name)
      );
      console.log("Database station names: ", dbNames);
      const excelNames = new Set<string>();
      const headerMap: Record<string, any> = {};
      const rows: { row: ExcelJS.Row, rowNumber: number }[] = [];
      console.log("A");
      stationsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        rows.push({ row, rowNumber });
      });
      console.log("B");
      
      for (const { row, rowNumber } of rows) {
        if (rowNumber === 1) { 
          row.eachCell((cell, colNumber) => {
            headerMap[String(cell.value)] = colNumber;
          });
          continue;
        };
        const name = row.getCell(headerMap["name"]).value?.toString();
        const plant = row.getCell(headerMap["plant"]).value?.toString();
        if (name && plant) {
          excelNames.add(name);
          if (!dbNames.has(name)) {
            const plantId = lookupCache.getPlantId(plant); // Ensure plant exists
            await db.insert(stations).values({ name, plantId });
          }
        }
      };
      console.log("Excel station names: ", excelNames);
      
      // Delete stations not in Excel
      for (const dbName of dbNames) {
        if (!excelNames.has(dbName)) {
          console.log("station to delete: ", dbName);
          await db.delete(stations).where(eq(stations.name, dbName));
        }
      }
    }

    // PARTS
    const partsSheet = workbook.getWorksheet("parts");
    if (partsSheet) {
      const dbPartIds = new Set((
        await db.select({ partId: parts.partId }).from(parts)).map((row) => row.partId
      ));
      const excelPartIds = new Set<string>();
      const headerMap: Record<string, any> = {};
      partsSheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) { 
          row.eachCell((cell, colNumber) => {
            headerMap[String(cell.value)] = colNumber;
          });
          return;
        };
        const partId = row.getCell(headerMap["partId"]).value?.toString();
        const name = row.getCell(headerMap["name"]).value?.toString();
        const partNumber = row.getCell(headerMap["partNumber"]).value?.toString();

        if (partId && name && partNumber) {
          excelPartIds.add(partId);
          if (!dbPartIds.has(partId)) {
            await db.insert(parts).values({ partId, name, partNumber });
          }
        }
      });
      // Delete parts not in Excel
      for (const dbPartId of dbPartIds) {
        if (dbPartId && !excelPartIds.has(dbPartId)) {
          await db.delete(parts).where(eq(parts.name, dbPartId));
        }
      }
    }

    // STATION PARTS
    const stationPartsSheet = workbook.getWorksheet("stationParts");
    if (stationPartsSheet) {
      const dbStationParts = await db.select().from(stationParts);
      const stationPartMap = new Map<string, any>();
      dbStationParts.forEach((sp) => {
        stationPartMap.set(`${sp.stationId}_${sp.partId}`, sp);
      });
      const excelStationPartKeys = new Set<string>();
      const headerMap: Record<string, any> = {};

      stationPartsSheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) { 
          row.eachCell((cell, colNumber) => {
            if (cell.value === 'station') headerMap["stationId"] = colNumber
            else if (cell.value === 'part') headerMap["partId"] = colNumber;
            else headerMap[String(cell.value)] = colNumber;
          });
          return;
        };

        const station = String(row.getCell(headerMap["stationId"]).value);
        const part = String(row.getCell(headerMap["partId"]).value);
        const stationId = lookupCache.getStationId(station);
        const partId = lookupCache.getPartId(part);
        const key = `${stationId}_${partId}`;
        excelStationPartKeys.add(key);
        const dbRow = stationPartMap.get(key);

        const updateData: any = {};
        
        Object.keys(headerMap).forEach((header) => {
          let value;
          value = String(row.getCell(headerMap[header]).value);
          if (header === "stationId") {
            value = stationId;
          } else if (header === "partId") {
            value = partId;
          }
          updateData[header] = value;
        });
        console.log("updating stationParts: ", updateData);

        if (!dbRow) {
          
          await db.insert(stationParts).values(updateData);
        } else {
          // Compare and update if necessary (excluding currentQuantity)
          delete updateData.currentQuantity;
          let needsUpdate = false;
          for (const key in updateData) {
            if (dbRow[key] !== updateData[key]) {
              needsUpdate = true;
              break;
            }
          }
          if (needsUpdate) {
            await db.update(stationParts)
              .set(updateData)
              .where(and(eq(stationParts.stationId, stationId), eq(stationParts.partId, partId)));
          }
        }
      });
      // Delete stationParts not in Excel
      for (const dbKey of stationPartMap.keys()) {
        if (!excelStationPartKeys.has(dbKey)) {
          const [stationId, partId] = dbKey.split("_").map(Number);
          await db.delete(stationParts)
            .where(and(eq(stationParts.stationId, stationId), eq(stationParts.partId, partId)));
        }
      }
    }

    // PRODUCT PART EXCEPTIONS
    const productPartExceptionsSheet = workbook.getWorksheet("productPartExceptions");
    if (productPartExceptionsSheet) {
      const dbExceptions = await db.select({
        productId: productPartExceptions.productId,
        partId: productPartExceptions.partId,
      }).from(productPartExceptions);

      const exceptionSet = new Set(dbExceptions.map(e => `${e.productId}_${e.partId}`));
      const excelExceptionSet = new Set<string>();
      const headerMap: Record<string, any> = {};

      productPartExceptionsSheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
        if (rowNumber === 1) { 
          row.eachCell((cell, colNumber) => {
            headerMap[String(cell.value)] = colNumber;
          });
          return;
        };
        const product = String(row.getCell(headerMap["product"]).value);
        const part = String(row.getCell(headerMap["part"]).value);
        const productId = lookupCache.getProductId(product);
        const partId = lookupCache.getPartId(part);
        const key = `${productId}_${partId}`;
        excelExceptionSet.add(key);
        if (!exceptionSet.has(key)) {
          await db.insert(productPartExceptions).values({ productId, partId });
        }
      });
      // Delete exceptions not in Excel
      for (const dbKey of exceptionSet) {
        if (!excelExceptionSet.has(dbKey)) {
          const [productId, partId] = dbKey.split("_").map(Number);
          await db.delete(productPartExceptions)
            .where(and(eq(productPartExceptions.productId, productId), eq(productPartExceptions.partId, partId)));
        }
      }
    }

    return { success: true };
  } catch (error) {
    throw error;
  }
};
