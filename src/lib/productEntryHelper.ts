// src/lib/sensorTriggerHandler.ts

import { db } from "../db/client";
import { productEntryLogs, kanbanRequests, stationParts } from "../db/schema";
import { eq, and, or, isNull, ne, desc } from "drizzle-orm";
import { lookupCache } from "./lookupCache";

export async function handleSensorTrigger(variant: string) {
  const variantId = lookupCache.getProductId(String(variant));
  const gdPlantName = "GD";
  const plantId = lookupCache.getPlantId(gdPlantName);
  const stationIds = lookupCache.getStationSequence();

  const productLogs = await db
    .select()
    .from(productEntryLogs)
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

    const firstStationId = stationIds[0];
    await tx.insert(productEntryLogs).values({
      plantId,
      stationId: firstStationId,
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
          productId: stationParts.productId,
          partId: stationParts.partId,
        })
        .from(stationParts)
        .where(
          and(
            eq(stationParts.stationId, log.stationId),
            or(isNull(stationParts.productId), eq(stationParts.productId, log.productId)),
            or(isNull(stationParts.exceptionProductId), ne(stationParts.exceptionProductId, log.productId))
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
