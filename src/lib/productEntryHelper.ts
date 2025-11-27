import { db } from "../db/client";
import { productEntryLogs, kanbanRequests, stationParts, products } from "../db/schema";
import { eq, and, or, desc, gte, sql } from "drizzle-orm";
import { LookupCache } from "./lookupCache";

export async function insertNewVariant(variant: string, plantId: number) {
  return db.insert(products)
    .values({
      variant,
      plantId
    }).returning({ id: products.id });
}

export async function handleProductShift(variant: string, plantId:number, lookupCache: LookupCache, refeedStationId?: number) {
  // console.log(`product ${Number(variant)} as entered plant ${plantId}: GD`);
  
  if (Number(variant) < 300 || Number(variant) >= 500) {
    console.error(`Invalid variant for GD plant: ${variant}`);
    return;
  }
  // const lookupCache = new LookupCache();
  // await lookupCache.initialize(plantId);
  let variantId = lookupCache.getProductId(String(variant));

  if (variantId === null) {
    const newVariant = await insertNewVariant(variant, plantId)
    variantId = newVariant[0].id
  }
  // const gdPlantName = "GD";
  // const plantId = lookupCache.getPlantId(gdPlantName);
  const stationIds = lookupCache.getStationSequence();

  // If refeedStationId is provided, use it; otherwise, use the first station
  const startStationId = refeedStationId ?? stationIds[0];
  const startIndex = stationIds.indexOf(startStationId);
  if (startIndex === -1) throw new Error("Invalid stationId");

  // Only select logs at or after the refeed station
  const productLogs = await db
    .select()
    .from(productEntryLogs)
    .where(
      and(
        eq(productEntryLogs.plantId, plantId),
        // Only logs with stationId >= startStationId
        gte(productEntryLogs.stationId, startStationId),
      )
    )
    .orderBy(desc(productEntryLogs.stationId));

  await db.transaction(async (tx) => {
    for (const log of productLogs) {
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
      } else {
        await tx.delete(productEntryLogs).where(eq(productEntryLogs.id, log.id));
      }
    }

    // Insert the new/re-fed product at the specified station
    await tx.insert(productEntryLogs).values({
      plantId,
      stationId: startStationId,
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

      const stationName = lookupCache.getStationName(log.stationId);
      // console.log(`processing station parts for station ${stationName}`);

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
          
          // TODO: Remove this condition after bin matching.
          // const stationName = lookupCache.getStationName(log.stationId);
          // if(!stationName.startsWith("BS-")){
          //   console.log("stationName:", stationName);
          //   continue;
          // }

          await tx.insert(kanbanRequests).values({
            plantId: plantId,
            stationId: log.stationId,
            partId: part.partId,
            productId: log.productId,
          });

          const productVariant = lookupCache.getProductVariant(log.productId);
          // console.log(`Raising a kanban request for variant ${variant} at ${stationName} of plant ${plantId} for product ${productVariant}`);
        
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
