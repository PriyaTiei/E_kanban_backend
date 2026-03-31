import express from "express";
import { db } from "../db/client";
import { kanbanRequests, parts, stationParts, delayKanbans } from "../db/schema";
import { eq, and, asc, count, sql, inArray, or, ilike, isNull } from "drizzle-orm";
import { KanbanModifyRequest } from "../lib/types";

export const delaySheetRouter = express.Router();


delaySheetRouter.get("/kanbans", async (req, res): Promise<any> => {
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
          eq(delayKanbans.arrangedByLogistics, false),
          eq(delayKanbans.plantId, plantId!),
        );

    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);
    
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
      .from(delayKanbans)
      .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
      .leftJoin(stationParts, stationPartsJoinCondition)
      .leftJoin(parts, eq(stationParts.partId, parts.id))
      .where(whereClause)
      .orderBy(asc(stationParts.process));

    const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);
    const rankKanbans = await db
        .select({ total: count() })
        .from(delayKanbans)
        .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .where(and(whereClause, isNull(stationParts.id)));
    if (rankKanbans[0]?.total! > 0 ) {
      uniqueProcesses.push('rank parts');
    }

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
        id: delayKanbans.id,
        process: stationParts.process,
        partIdNo: parts.partId,
        partName: parts.name,
        prepLocation: stationParts.prepLocation,
        reportedAt: delayKanbans.reportedAt,
      })
      .from(delayKanbans)
      .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
      .leftJoin(stationParts, stationPartsJoinCondition)
      .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

      const total = (await db
        .select({ total: count() })
        .from(delayKanbans)
        .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
        .where(whereClause))[0]?.total;

      const totalPages = Math.ceil((total ?? 0) / limit);

      return res.status(200).json({ kanbans, processes:uniqueProcesses, total, totalPages });

    }
    else if (processFilter === 'rank parts') {
      // Special case for 'rank parts' process filter
      const kanbans = await db
        .select({
        id: kanbanRequests.id,
        process: stationParts.process,
        partId: kanbanRequests.partId,
        partIdNo: parts.partId,
        partName: parts.name,
        reportedAt: delayKanbans.reportedAt,
      })
        .from(delayKanbans)
        .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(parts, eq(parts.id, kanbanRequests.partId))
        .leftJoin(stationParts, stationPartsJoinCondition)
        .where(and(whereClause, isNull(stationParts.id)))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

        const total = rankKanbans[0].total

        const totalPages = Math.ceil((total ?? 0) / limit);
        console.log(JSON.stringify(kanbans, null, 2));
        
      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: false, total, totalPages});
    } else {
      const kanbans = await db
      .select({
        id: delayKanbans.id,
        process: stationParts.process,
        partIdNo: parts.partId,
        partName: parts.name,
        prepLocation: stationParts.prepLocation,
        reportedAt: delayKanbans.reportedAt,
      })
      .from(delayKanbans)
      .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
      .leftJoin(stationParts, stationPartsJoinCondition)
      .leftJoin(parts, eq(stationParts.partId, parts.id))
      .where(and(whereClause, eq(stationParts.process, processFilter)))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

      const total = (await db
        .select({ total: count() })
        .from(delayKanbans)
        .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(stationParts.partId, parts.id))
        .where(and(whereClause, eq(stationParts.process, processFilter))))[0]?.total;

      const totalPages = Math.ceil((total ?? 0) / limit);

      return res.status(200).json({ kanbans, processes:uniqueProcesses, total, totalPages });
    }
  } catch (err: any) {
    console.error("Error fetching kanbans:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

delaySheetRouter.get("/kanbans/count", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const process = req.query?.process ? String(req.query.process) : null;    
    const plantId = user.plantId;
    const baseWhereClause = and(
      eq(delayKanbans.arrangedByLogistics,false),
    );
    const processWhereClause = process ? eq(stationParts.process, process) : sql`1=1`;
    const plantWhereClause = eq(delayKanbans.plantId, plantId);
    const whereClause = and(
      baseWhereClause,
      processWhereClause,
      plantWhereClause
    );
    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);

    const result = await db
      .select({ total: count() })
      .from(delayKanbans)
      .innerJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
      .leftJoin(stationParts, stationPartsJoinCondition)
      .where(whereClause);

    return res.status(200).json({ total: result[0]?.total ?? 0 });
  } catch (err: any) {
    console.error("Error fetching kanban count:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

delaySheetRouter.put("/kanban", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAuthorized = user.role === "admin" || user.role === "gd_logistics" || user.role === "tnga_logistics";
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
  }
  
  const { kanbanIds } = req.body as KanbanModifyRequest;
  console.log("Received request to update kanban in delay list:", kanbanIds);

  if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
    return res.status(400).json({ error: "kanbanIds array is required" });
  }

  try {
    const arranged_by_logistics = true;
    const arrangedAt = new Date();

    const result = await db
      .update(delayKanbans)
      .set({ arrangedByLogistics: arranged_by_logistics, arrangedAt })
      .where(inArray(delayKanbans.id, kanbanIds))
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

delaySheetRouter.put("/kanban/all", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAuthorized = user.role === "admin" 
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admins can update bulk kanbans" });
  }
  
  const { process } = req.query;
  console.log(`Received request to update all kanban in delay list ${process && `for process: ${process}`}`);
  
  try {
    const plantId = user.plantId;
    const arrangedByLogistics = true;
    const arrangedAt = new Date();
    const whereClause = and(
          eq(delayKanbans.arrangedByLogistics, false),
          eq(delayKanbans.plantId, plantId),
          process ? eq(stationParts.process, String(process)) : sql`1=1`
        );
    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);

    const kanbansToUpdate = await db
    .select({ id: delayKanbans.id })
    .from(delayKanbans)
    .leftJoin(kanbanRequests, eq(delayKanbans.kanbanId, kanbanRequests.id))
    .leftJoin(stationParts, stationPartsJoinCondition)
    .where(whereClause)
    .orderBy(asc(delayKanbans.reportedAt));

    if (kanbansToUpdate.length === 0) {
      console.log("Kanban not found");
      return res.status(404).json({ message: "Kanban not found" });
    }

    const result = await db
    .update(delayKanbans)
    .set({ arrangedByLogistics, arrangedAt })
    .where(inArray(delayKanbans.id, kanbansToUpdate.map(k => k.id)))
    .returning();

    if (result.length === 0) {
      console.log("Kanban not found");
      return res.status(404).json({ message: "Kanban not found" });
    }

    console.log("Delay Kanbans updated successfully:", result); 
    return res.status(200).json({ message: "Delay Kanban updated successfully", updatedKanbans: result });
  } catch (error: any) {
    console.log("Error updating kanban:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

delaySheetRouter.delete("/kanban", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
  }
  const isAuthorized = user.role === "admin" || user.role === "supplier";
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admin and supplier can delete delay reports" });
  }

  const { kanbanIds } = req.body as KanbanModifyRequest;

  if (!Array.isArray(kanbanIds) || kanbanIds.length === 0 || kanbanIds.some(id => isNaN(Number(id)))) {
      return res.status(400).json({ error: 'kanbanIds (array of numbers) is required' });
  }

  try {
      const deleted = await db
      .delete(delayKanbans)
      .where(inArray(delayKanbans.id, kanbanIds))
      .returning();

      if (deleted.length === 0) {
          return res.status(404).json({ message: "Kanban not found" });
      }

      return res.status(200).json({ message: "Report deleted successfully" });
  } catch (error: any) {
      console.error("Error deleting report:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
  }
});