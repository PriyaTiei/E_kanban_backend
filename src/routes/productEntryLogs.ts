import express from 'express';
import { db } from '../db/client';
import { productEntryLogs, products, stations } from '../db/schema';
import { eq } from "drizzle-orm";

export const productEntryLogsRouter = express.Router();

productEntryLogsRouter.get('/', async (req, res) => {
  try {
    const logs = await db
      .select({
        id: productEntryLogs.id,
        productId: productEntryLogs.productId,
        productName: products.variant,
        stationId: productEntryLogs.stationId,
        stationName: stations.name,
        timestamp: productEntryLogs.timestamp,
      })
      .from(productEntryLogs)
      .leftJoin(products, eq(productEntryLogs.productId, products.id))
      .leftJoin(stations, eq(productEntryLogs.stationId, stations.id));

    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch product entry logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
