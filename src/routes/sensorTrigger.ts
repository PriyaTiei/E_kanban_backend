import express, { Response } from "express";
import { db } from "../db/client";
import { kanbanRequests, stationParts } from "../db/schema";
import { eq, and, or, isNull, ne } from "drizzle-orm";
import { lookupCache } from "../scripts/lookupCache";

export const sensorTriggerRouter = express.Router();

interface SensorTriggerRequest {
  station: string;
  variant: string;
}

sensorTriggerRouter.post("/", async (req, res): Promise<any> => {
  const { station, variant } = req.body as SensorTriggerRequest;

  try {
    const stationId = lookupCache.getStationId(station);
    const variantId = lookupCache.getProductId(variant);

    const rows = await db
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
          eq(stationParts.stationId, stationId),
          or(isNull(stationParts.productId), eq(stationParts.productId, variantId)),
          or(isNull(stationParts.exceptionProductId), ne(stationParts.exceptionProductId, variantId))
        )
      );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "No consumable parts found for this station and product.",
      });
    }

    // Run all updates and inserts in a transaction
    await db.transaction(async (tx) => {
      for (const part of rows) {
        let updatedQuantity: number;
        let remainder: number;

        if (part.currentQuantity - part.consumptionPerProduct <= 0) {
          remainder = Math.abs(part.currentQuantity - part.consumptionPerProduct);
          updatedQuantity = part.binQuantity - remainder;

          // Update stationParts
          await tx
            .update(stationParts)
            .set({
              currentQuantity: updatedQuantity,
              updatedAt: new Date(),
            })
            .where(eq(stationParts.id, part.id))
            .returning();

          // Insert kanban request (one bin used up)
          await tx
            .insert(kanbanRequests)
            .values({
              stationId: stationId,
              partId: part.partId,
              productId: variantId,
            });
        } else {
          // Just update quantity normally
          updatedQuantity = part.currentQuantity - part.consumptionPerProduct;

          await tx
            .update(stationParts)
            .set({
              currentQuantity: updatedQuantity,
              updatedAt: new Date(),
            })
            .where(eq(stationParts.id, part.id))
            .returning();
        }
      }
    });

    return res.status(200).json({
      message: `Part quantities updated successfully for station ${station} and variant ${variant}.`,
    });
  } catch (err: any) {
    console.error("Sensor trigger error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
