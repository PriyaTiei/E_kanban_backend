import express from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products, stationParts } from "../db/schema";
import { eq, and, asc, count, sql, inArray, or, ilike } from "drizzle-orm";
import { KanbanModifyRequest } from "../lib/types";
import { deleteKanban } from "../lib/kanbanHelpers";

export const supplySheetRouter = express.Router();

// *****Joining with stationParts based on partId might incorrect data since partId in stationParts is not unique*****

supplySheetRouter.get("/kanbans", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const processFilter = req.query.process ? String(req.query.process) : null;
    const searchFilter = req.query.search ? String(req.query.search) : null;
    console.log(`processFilter: ${processFilter}, searchFilter: ${searchFilter}`);
    
    const plantId = user.plantId;

    // pagination details from query params, e.g., /kanbans?page=1&limit=20
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;
    const offset = (page - 1) * limit;

    let whereClause = and(
          eq(kanbanRequests.acknowledgedByLogistics, true),
          eq(kanbanRequests.fulfilled, false),
          eq(kanbanRequests.plantId, plantId!),
        );
    
    if (searchFilter) {
      whereClause = and(whereClause, 
        or(
          ilike(parts.partId, `%${searchFilter}%`),
          ilike(stationParts.prepLocation, `%${searchFilter}%`),
          ilike(stationParts.supplyLocation, `%${searchFilter}%`)
        )
      );
    }

    // query for all unique processes
    const processes = await db
      .selectDistinct({ process: stationParts.process })
      .from(kanbanRequests)
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
      .where(whereClause)
      .orderBy(asc(stationParts.process));

    const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);

    const orderByClause = sql`
      CASE
        WHEN ${stationParts.supplyLocation} LIKE 'SA-%' THEN 1
        WHEN ${stationParts.supplyLocation} LIKE 'MK1-%' THEN 2
        WHEN ${stationParts.supplyLocation} LIKE 'MK2-%' THEN 3
        ELSE 4
      END,
      regexp_replace(${stationParts.supplyLocation}, '[^0-9]', '', 'g')::int,
      ${stationParts.supplyLocation},
      ${kanbanRequests.partId}
    `;

    if(!processFilter) {
    const kanbans = await db
      .select({
        id: kanbanRequests.id,
        process: stationParts.process,
        partId: kanbanRequests.partId,
        partIdNo: parts.partId,
        partName: parts.name,
        supplyLocation: stationParts.supplyLocation,
        acknowledgedAt: kanbanRequests.acknowledgedAt,
      })
      .from(kanbanRequests)
      .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
      // .leftJoin(products, eq(kanbanRequests.productId, products.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

      const total = await db
        .select({ total: count() })
        .from(kanbanRequests)
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
        .where(whereClause);

      const totalPages = Math.ceil((total[0]?.total ?? 0) / limit);

      return res.status(200).json({ kanbans, processes:uniqueProcesses, totalPages });

    } else {

      const kanbans = await db
      .select({
        id: kanbanRequests.id,
        process: stationParts.process,
        partId: kanbanRequests.partId,
        partIdNo: parts.partId,
        partName: parts.name,
        supplyLocation: stationParts.supplyLocation,
        acknowledgedAt: kanbanRequests.acknowledgedAt,
      })
      .from(kanbanRequests)
      .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
      // .leftJoin(products, eq(kanbanRequests.productId, products.id))
      .where(and(whereClause, eq(stationParts.process, processFilter)))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

      const total = await db
        .select({ total: count() })
        .from(kanbanRequests)
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
        .where(and(whereClause, eq(stationParts.process, processFilter)));

      const totalPages = Math.ceil((total[0]?.total ?? 0) / limit);

      return res.status(200).json({ kanbans, processes:uniqueProcesses, totalPages });
    }
  } catch (err: any) {
    console.error("Error fetching kanbans:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

supplySheetRouter.get("/kanbans/count", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const process = req.query?.process ? String(req.query.process) : null;    
    const plantId = user.plantId;
    const baseWhereClause = and(
      eq(kanbanRequests.acknowledgedByLogistics, true),
      eq(kanbanRequests.fulfilled, false)
    );
    const processWhereClause = process ? eq(stationParts.process, process) : sql`1=1`;
    const plantWhereClause = eq(kanbanRequests.plantId, plantId);
    const whereClause = and(
      baseWhereClause,
      processWhereClause,
      plantWhereClause
    );
    const result = await db
      .select({ total: count() })
      .from(kanbanRequests)
      .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
      .where(whereClause);

    return res.status(200).json({ total: result[0]?.total ?? 0 });
  } catch (err: any) {
    console.error("Error fetching kanban count:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

supplySheetRouter.put("/kanban", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAuthorized = user.role === "admin" || user.role === "supplier";
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admins and suppliers can update kanbans" });
  }
  
  const { kanbanIds } = req.body as KanbanModifyRequest;
  console.log("Received request to update kanban in supply list:", kanbanIds);

  if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
    return res.status(400).json({ error: "kanbanIds array is required" });
  }

  try {
    const fulfilled = true;
    const fulfilledAt = new Date();

    const result = await db
      .update(kanbanRequests)
      .set({ fulfilled, fulfilledAt })
      .where(inArray(kanbanRequests.id, kanbanIds))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Kanban not found" });
    }

    return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
  } catch (error: any) {
    console.error("Error updating kanban:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

supplySheetRouter.put("/kanban/all", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAuthorized = user.role === "admin" || user.role === "logistics";
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
  }
  
  const { process } = req.query;
  console.log(`Received request to update all kanban in supply list ${process && `for process: ${process}`}`);
  
  try {
    const plantId = user.plantId;
    const fulfilled = true;
    const fulfilledAt = new Date();
    const whereClause = and(
          eq(kanbanRequests.acknowledgedByLogistics, true),
          eq(kanbanRequests.plantId, plantId),
          process ? eq(stationParts.process, String(process)) : sql`1=1`
        );

    const kanbansToUpdate = await db
    .select({ id: kanbanRequests.id })
    .from(kanbanRequests)
    .leftJoin(stationParts, and(eq(kanbanRequests.stationId, stationParts.stationId), eq(kanbanRequests.partId, stationParts.partId)))
    .where(whereClause)
    .orderBy(asc(kanbanRequests.requestedAt));

    if (kanbansToUpdate.length === 0) {
      console.log("Kanban not found");
      return res.status(404).json({ message: "Kanban not found" });
    }

    const result = await db
    .update(kanbanRequests)
    .set({ fulfilled, fulfilledAt })
    .where(inArray(kanbanRequests.id, kanbansToUpdate.map(k => k.id)))
    .returning();

    if (result.length === 0) {
      console.log("Kanban not found");
      return res.status(404).json({ message: "Kanban not found" });
    }

    console.log("Supply Kanbans updated successfully:", result); 
    return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
  } catch (error: any) {
    console.log("Error updating kanban:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

supplySheetRouter.delete("/kanban", (req, res) => {
  deleteKanban(req, res);
});