import express from 'express';
import { db } from '../db/client';
import { stationParts, stations, parts, products } from '../db/schema';
import { eq, asc, sql } from "drizzle-orm";
import { StationPartsRepository } from '../repositories/stationPartRepo';

export const stationPartsRouter = express.Router();

stationPartsRouter.get('/', async (req, res): Promise<any> => {
  try {
    const user = req.session.user;    
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    const plantId = user.plantId;
    const whereClause = isAdmin && plantId === null
      ? sql`1=1`
      : eq(stationParts.plantId, plantId!);

    const stationData = await db
      .select({
        id: stationParts.id,
        stationId: stationParts.stationId,
        stationName: stations.name,
        partId: stationParts.partId,
        partName: parts.name,
        productId: stationParts.productId,
        productName: products.variant, 
        exceptionProductId: stationParts.exceptionProductId,
        exceptionProductName: products.variant,
        consumptionPerProduct: stationParts.consumptionPerProduct,
        binQuantity: stationParts.binQuantity,
        currentQuantity: stationParts.currentQuantity,
        updatedAt: stationParts.updatedAt,
      })
      .from(stationParts)
      .leftJoin(stations, eq(stationParts.stationId, stations.id))
      .leftJoin(parts, eq(stationParts.partId, parts.id))
      .leftJoin(products, eq(stationParts.productId, products.id))
      .where(whereClause)
      .orderBy(asc(stationParts.stationId));

    res.json(stationData);
  } catch (error) {
    console.error('Failed to fetch station parts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PUT /station-parts/:id
stationPartsRouter.put("/:id", async (req, res): Promise<any> => {
  const id = Number(req.params.id);
  const updates = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid station part ID." });
  }

  const result = await StationPartsRepository.update(id, updates);

  if (result.success) {
    return res.json({ message: "Station part updated successfully.", data: result.data });
  } else {
    return res.status(404).json({ error: result.error });
  }
});
