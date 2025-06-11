import express, { Response } from "express";
import { db } from "../db/client";
import { kanbanRequests, productEntryLogs, stationParts } from "../db/schema";
import { eq, and, or, isNull, ne, desc } from "drizzle-orm";
import { lookupCache } from "../scripts/lookupCache";

export const sensorTriggerRouter = express.Router();

interface SensorTriggerRequest {
  station: string;
  variant: string;
}

sensorTriggerRouter.post("/", async (req, res): Promise<any> => {
  const { variant } = req.body as SensorTriggerRequest;

  try {
    const variantId = lookupCache.getProductId(variant);
    
    // Map station ID order for easy lookup
    const stationIds = lookupCache.getStationSequence();

    // Get current product entries (who is at what station)
    const productLogs = await db
      .select()
      .from(productEntryLogs)
      .orderBy(desc(productEntryLogs.stationId)); // important: descending to avoid conflict while shifting

    await db.transaction(async (tx) => {
      // 1. Move existing products forward
      for (const log of productLogs) {
        const currentIndex = stationIds.indexOf(log.stationId);
        const nextStationId = stationIds[currentIndex + 1];

        if (nextStationId) {
          // Move product to next station
          await tx
            .update(productEntryLogs)
            .set({
              stationId: nextStationId,
              timestamp: new Date(),
            })
            .where(eq(productEntryLogs.id, log.id));
        } else {
          // Product has moved beyond last station — remove or ignore
          await tx.delete(productEntryLogs).where(eq(productEntryLogs.id, log.id));
        }
      }

      // 2. Insert the new product into the first station
      const firstStationId = stationIds[0];
      await tx.insert(productEntryLogs).values({
        stationId: firstStationId,
        productId: variantId,
        timestamp: new Date(),
      });

      // 3. Get updated logs after shifting
      const updatedLogs = await tx
        .select()
        .from(productEntryLogs);

      // 4. Process inventory deduction for each station-product pair
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

    return res.status(200).json({
      message: "Line shifted and part inventories updated successfully.",
    });
  } catch (err: any) {
    console.error("Sensor trigger error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

