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
        allowed_for_all_products: stationParts.allowed_for_all_products,
        process:stationParts.process,
        prepLocation: stationParts.prepLocation,
        supplyLoaction: stationParts.supplyLocation,
        consumptionPerProduct: stationParts.consumptionPerProduct,
        binQuantity: stationParts.binQuantity,
        currentQuantity: stationParts.currentQuantity,
        updatedAt: stationParts.updatedAt,
      })
      .from(stationParts)
      .leftJoin(stations, eq(stationParts.stationId, stations.id))
      .leftJoin(parts, eq(stationParts.partId, parts.id))
      .where(whereClause)
      .orderBy(asc(stationParts.stationId));      

    res.json(stationData);
  } catch (error) {
    console.error('Failed to fetch station parts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// TODO: Implement respective tables update logic
// CREATE /station-parts
stationPartsRouter.post("/", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Only admins can create station parts" });
  }

  const data = req.body;
  try {
    const result = await StationPartsRepository.create(data);
    return res.status(201).json({ message: "Station part created successfully.", data: result });
  } catch (error) {
    console.error("Failed to create station part:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// PUT /station-parts/:id
stationPartsRouter.put("/:id", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Only admins can modify stations" });
  }

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

// TODO: Implement respective tables update logic
// DELETE /station-parts/:id
stationPartsRouter.delete("/:id", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    return res.status(403).json({ error: "Forbidden: Only admins can delete station parts" });
  }

  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid station part ID." });
  }

  try {
    const result = await StationPartsRepository.delete(id);
    if (result.success) {
      return res.json({ message: "Station part deleted successfully." });
    } else {
      return res.status(404).json({ error: result.error || "Station part not found." });
    }
  } catch (error) {
    console.error("Failed to delete station part:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});