import express from 'express';
import { db } from '../db/client';
import { productEntryLogs, products, stations } from '../db/schema';
import { eq, sql } from "drizzle-orm";
import { handleProductShift } from "../lib/productEntryHelper";

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

// UPDATE productEntryLog (only productId)
productEntryLogsRouter.put('/:id', async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only admins can modify stations" });
    }

    const id = Number(req.params.id);
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const result = await db
      .update(productEntryLogs)
      .set({
        productId,
        timestamp: new Date(),
      })
      .where(eq(productEntryLogs.id, id));

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product entry log not found" });
    }

    res.json({ message: "Product entry log updated successfully" });
  } catch (error) {
    console.error('Failed to update product entry log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE productEntryLog
productEntryLogsRouter.delete('/:id', async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only admins can modify stations" });
    }

    const id = Number(req.params.id);

    const result = await db
      .delete(productEntryLogs)
      .where(eq(productEntryLogs.id, id));

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product entry log not found" });
    }

    res.json({ message: "Product entry log deleted successfully" });
  } catch (error) {
    console.error('Failed to delete product entry log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Refeed Update Route
productEntryLogsRouter.put('/refeed/:stationId', async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only admins can refeed products" });
    }

    const { variant } = req.body;
    const stationId = Number(req.params.stationId);

    if (!variant || isNaN(stationId)) {
      return res.status(400).json({ error: "variant and valid stationId are required" });
    }

    await handleProductShift(variant, stationId);

    res.json({ message: "Product re-fed successfully at the specified station." });
  } catch (error) {
    console.error('Failed to refeed product:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


