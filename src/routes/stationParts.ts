import express from 'express';
import { db } from '../db/client';
import { stationParts, stations, parts, products } from '../db/schema';
import { eq, asc } from "drizzle-orm";

export const stationPartsRouter = express.Router();

stationPartsRouter.get('/', async (req, res) => {
  try {
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
      .orderBy(asc(stationParts.stationId));

    res.json(stationData);
  } catch (error) {
    console.error('Failed to fetch station parts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
