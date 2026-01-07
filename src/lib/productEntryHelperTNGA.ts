import { db } from "../db/client";
import { productEntryLogs, kanbanRequests, stationParts, products } from "../db/schema";
import { eq, and, or, desc, gte, sql, inArray } from "drizzle-orm";
import { LookupCache } from "./lookupCache";
import { txType } from "./types";

export async function insertNewVariant(variant: string, plantId: number) {
  return db.insert(products)
    .values({
      variant,
      plantId
    }).returning({ id: products.id });
}

export async function handleProductShiftTNGA(variant: string, plantId:number, refeedStationId?: number) {
  if (Number(variant) < 100 || Number(variant) >= 300) {
    console.error(`Invalid variant for TNGA plant: ${variant}`);
    return;
  }
  const lookupCache = new LookupCache();
  await lookupCache.initialize(plantId);
  let variantId = lookupCache.getProductId(String(variant));

  if (variantId === null) {
    const newVariant = await insertNewVariant(variant, plantId)
    variantId = newVariant[0].id
  }
  const stations = lookupCache.getStationSequenceTNGA();
  const simultaneousStations = lookupCache.getSimultaneousStations();
  console.log(`simultaneous stations: ${simultaneousStations}`);
  
  let stationsMK = stations.filter(s => s.name.startsWith("MK"));
  const isRefeedAtMK = refeedStationId && stationsMK.map(station => station.id).includes(refeedStationId);

  const startStationsMKId = isRefeedAtMK ? refeedStationId : stationsMK.length > 0 ? stationsMK[0].id : null;
  
  // If refeedStationId is provided, use it; otherwise, use the first stations
  const startStationIds = refeedStationId ?? simultaneousStations.map((group) => group[0]);
  if (!startStationIds) throw new Error("Invalid stationId");
  if(!startStationsMKId) throw new Error("No MK stations found in this plant");
  const lastStationInLongestSimulGroup = simultaneousStations.filter((group) => group.length === Math.max(...simultaneousStations.map(g => g.length)))[0].slice(-1)[0];

  // select product logs in station groups
  const groupProductLogs = await Promise.all(simultaneousStations.map(async (stationGroup) => {
    return db
      .select()
      .from(productEntryLogs)
      .where(
        and(
          eq(productEntryLogs.plantId, plantId),
          inArray(productEntryLogs.stationId, stationGroup),
        )
      )
      .orderBy(desc(productEntryLogs.stationId));
  }))
  const productLogsMK = await db
    .select()
    .from(productEntryLogs)
    .where(
      and(
        eq(productEntryLogs.plantId, plantId),
        gte(productEntryLogs.stationId, startStationsMKId),
      )
    )
    .orderBy(desc(productEntryLogs.stationId));

  let simulLastStationProduct: number | null = null;

  async function shiftStations(group: typeof groupProductLogs[0], tx: txType, stationIds: number[]) {
    for (const log of group) {
      const currentIndex = stationIds.indexOf(log.stationId);
      const nextStationId = stationIds[currentIndex + 1];
      if (nextStationId) {
        await tx
          .update(productEntryLogs)
          .set({
            stationId: nextStationId,
            timestamp: new Date(),
          })
          .where(eq(productEntryLogs.id, log.id));
        const previousStationName = lookupCache.getStationName(log.stationId);
        const nextStationName = lookupCache.getStationName(nextStationId);
        console.log(`Product ${log.productId} moved from ${previousStationName} to ${nextStationName}`);
                
      } else {
        const lastStationName = lookupCache.getStationName(log.stationId);
        console.log("Is Simultaneous last station:", !productLogsMK.map(l => l.stationId).includes(log.stationId), lastStationName);
        if(lastStationInLongestSimulGroup === log.stationId || refeedStationId) {
          const lastProduct = await tx.select({productId:productEntryLogs.productId}).from(productEntryLogs).where(eq(productEntryLogs.id, log.id));
          simulLastStationProduct = lastProduct[0].productId;
          console.log("Product exiting at longest last simultaneous station:", lastStationName, simulLastStationProduct);
        }
        await tx.delete(productEntryLogs).where(eq(productEntryLogs.id, log.id));
      }
    }
  }

  await db.transaction(async (tx) => {

    if(refeedStationId && simultaneousStations.flat().includes(refeedStationId)) {
      const stationsIds = simultaneousStations.find(s => s.includes(refeedStationId));
      if (stationsIds) {
        const group = groupProductLogs.find(g => g.some(log => log.stationId === refeedStationId));
        const groupLogFromRefeedStation = group?.filter(log => log.stationId >= refeedStationId);
        console.log("Shifting refeed station group:", stationsIds, groupLogFromRefeedStation?.map(l => lookupCache.getStationName(l.stationId)));
        if (groupLogFromRefeedStation) {
          await shiftStations(groupLogFromRefeedStation, tx, stationsIds);
        }
      }
    } else if(!refeedStationId) {
      console.log("Shifting simultaneous stations groups");
      await Promise.all(groupProductLogs.map(async (group, i) => {
        const stationsIds = simultaneousStations.find(s => group.some(log => s.includes(log.stationId)));
        if (!stationsIds) return;
        group.forEach(log => {
          const stationName = lookupCache.getStationName(log.stationId);
          console.log(`Group ${i} log at station:`, stationName);
        });
        await shiftStations(group, tx, stationsIds);
      }));
    }

    // Re-insert products that exited simultaneous stations back into the line at the next station group
    if (simulLastStationProduct === null) {
      console.error("No products exited simultaneous stations");
    }
    // if (simulLastStationProduct.size > 1) {
    //   console.error("Multiple products exited simultaneous stations, not re-inserting:", simulLastStationProduct);
    //   return;
    // }
    if ((simulLastStationProduct || refeedStationId) && startStationsMKId) {
      // Shift MK stations
      console.log("Shifting MK stations");
      await shiftStations(productLogsMK, tx, stationsMK.map(s => s.id));
      
      console.log("Re-inserting product exiting simultaneous stations back into the line at MK:", simulLastStationProduct);
      const productId = simulLastStationProduct;
      if(!productId) {
        console.error("No productId found for re-insertion");
        return;
      }
      await tx.insert(productEntryLogs).values({
        plantId,
        stationId: startStationsMKId,
        productId: productId,
        timestamp: new Date(),
      });
    }

    // Insert if new product, at the start of all simultaneous statinos else if re-fed product then at the specified station
    if(Array.isArray(startStationIds) && startStationIds.length !== 0) {
      await tx.insert(productEntryLogs).values(startStationIds.map(stationId => ({
        plantId,
        stationId: stationId,
        productId: variantId,
        timestamp: new Date(),
      })));
    }
    else if(typeof startStationIds === "number")
      await tx.insert(productEntryLogs).values({
        plantId,
        stationId: startStationIds,
        productId: variantId,
        timestamp: new Date(),
      });

    const updatedLogs = await tx.select().from(productEntryLogs).where(eq(productEntryLogs.plantId, plantId));

    for (const log of updatedLogs) {
      const parts = await tx
        .select({
          id: stationParts.id,
          binQuantity: stationParts.binQuantity,
          currentQuantity: stationParts.currentQuantity,
          consumptionPerProduct: stationParts.consumptionPerProduct,
          partId: stationParts.partId,
        })
        .from(stationParts)
        .where(
          and(
            eq(stationParts.stationId, log.stationId),
            or(
              eq(stationParts.allowed_for_all_products, true),
              sql`EXISTS (
                SELECT 1 FROM product_part_exceptions
                WHERE product_part_exceptions.product_id = ${log.productId}
                AND product_part_exceptions.part_id = station_parts.part_id
              )`
            )
          )
        );

      for (const part of parts) {
        let updatedQuantity: number;
        let remainder: number;

        if (part.currentQuantity - part.consumptionPerProduct <= 0) {
          remainder = Math.abs(part.currentQuantity - part.consumptionPerProduct);
          updatedQuantity = part.binQuantity - remainder;

          await tx
            .update(stationParts)
            .set({
              currentQuantity: updatedQuantity,
              updatedAt: new Date(),
            })
            .where(eq(stationParts.id, part.id));
      
          await tx.insert(kanbanRequests).values({
            plantId: plantId,
            stationId: log.stationId,
            partId: part.partId,
            productId: log.productId,
          });
        } else {
          updatedQuantity = part.currentQuantity - part.consumptionPerProduct;

          await tx
            .update(stationParts)
            .set({
              currentQuantity: updatedQuantity,
              updatedAt: new Date(),
            })
            .where(eq(stationParts.id, part.id));
        }
      }
    }
  });
}
