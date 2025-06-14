import express from 'express';
import { db } from '../db/client';
import { productEntryLogs, products, stations } from '../db/schema';
import { eq, sql } from "drizzle-orm";

export const productEntryLogsRouter = express.Router();

productEntryLogsRouter.get('/', async (req, res): Promise<any> => {
  try {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAdmin = user.role === "admin";
  const plantId = user.plantId;
  const whereClause = isAdmin && plantId === null
    ? sql`1=1`
    : eq(productEntryLogs.plantId, plantId!);

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
      .leftJoin(stations, eq(productEntryLogs.stationId, stations.id))
      .where(whereClause);

    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch product entry logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
