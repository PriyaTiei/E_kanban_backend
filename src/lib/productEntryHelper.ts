// src/lib/sensorTriggerHandler.ts

import { db } from "../db/client";
import { productEntryLogs, kanbanRequests, stationParts, productPartExceptions } from "../db/schema";
import { eq, and, or, isNull, ne, desc, gte, sql } from "drizzle-orm";
import { lookupCache } from "./lookupCache";

export async function handleProductShift(variant: string, refeedStationId?: number) {
  const variantId = lookupCache.getProductId(String(variant));
  const gdPlantName = "GD";
  const plantId = lookupCache.getPlantId(gdPlantName);
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

    const updatedLogs = await tx.select().from(productEntryLogs);

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
