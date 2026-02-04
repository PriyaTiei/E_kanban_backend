import express from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products, frozenKanbans, processFreezeState, stationParts } from "../db/schema";
import { eq, and, asc, count, sql, inArray, or, ilike, isNull } from "drizzle-orm";
import { KanbanCreateRequest, KanbanEntry, KanbanModifyRequest } from "../lib/types";
import { deleteKanban } from "../lib/kanbanHelpers";
import { request } from "http";

export const preparationSheetRouter = express.Router();

const selectKanbanFields = {
    id: kanbanRequests.id,
    process: stationParts.process,
    partIdNo: parts.partId,
    partName: parts.name,
    requestedAt: kanbanRequests.requestedAt,
    prepLocation: stationParts.prepLocation,
}

preparationSheetRouter.get("/kanbans", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const plantId = user.plantId;    

    // Process filter from query params, e.g., /kanbans?process=1
    const processFilter = req.query.process ? String(req.query.process) : null;
    const searchFilter = req.query.search ? String(req.query.search) : null;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;
    const offset = (page - 1) * limit;

    
    // Base where clause for acknowledgedByLogistics and plant scope
    let baseWhereClause = and(
      eq(kanbanRequests.acknowledgedByLogistics, false),
      eq(kanbanRequests.plantId, plantId)
    );

    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);

    if (searchFilter) {
          baseWhereClause = and(baseWhereClause, 
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
      .leftJoin(stationParts, stationPartsJoinCondition)
      .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
      .where(baseWhereClause)
      .orderBy(asc(stationParts.process));

    const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);
    const rankKanbans = await db
        .select({ total: count() })
        .from(kanbanRequests)
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .where(and(baseWhereClause, isNull(stationParts.id)));
    if (rankKanbans[0]?.total! > 0 ) {
      uniqueProcesses.push('rank parts');
    }

    const orderByClause = sql`
      CASE
        WHEN ${stationParts.prepLocation} LIKE 'TZ-%' THEN 1
        WHEN ${stationParts.prepLocation} LIKE 'LOG-%' THEN 2
        ELSE 3
      END,
      NULLIF(regexp_replace(${stationParts.prepLocation}, '[^0-9]', '', 'g'), '')::int,
      ${kanbanRequests.partId}
    `;

    if (!processFilter) {
      // No process filter — return all kanbans normally
      const kanbans = await db
        .select(selectKanbanFields)
        .from(kanbanRequests)
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
        .where(baseWhereClause)
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

        const total = (await db
        .select({ total: count() })
        .from(kanbanRequests)
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
        .where(baseWhereClause))[0]?.total

        const totalPages = Math.ceil((total ?? 0) / limit);
        
      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: false, total, totalPages});
    }

    if (processFilter === 'rank parts') {
      // Special case for 'rank parts' process filter
      const kanbans = await db
        .select(selectKanbanFields)
        .from(kanbanRequests)
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(parts.id, kanbanRequests.partId))
        .where(and(baseWhereClause, isNull(stationParts.id)))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

        const total = rankKanbans[0].total

        const totalPages = Math.ceil((total ?? 0) / limit);
        
      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: false, total, totalPages});
    }

    // Check if this process is frozen
    const freezeState = await db
      .select()
      .from(processFreezeState)
      .where(and((eq(processFreezeState.process, processFilter)),eq(processFreezeState.plantId, plantId)))
      .limit(1);

    const isFrozen = freezeState.length > 0 && freezeState[0].isFrozen;

    if (isFrozen) {
      // Fetch frozen kanbans for this process
      // Join frozenKanbans -> kanbanRequests + other tables for details
      const kanbans = await db
        .select(selectKanbanFields)
        .from(frozenKanbans)
        .innerJoin(kanbanRequests, eq(frozenKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(stationParts.partId, parts.id))
        .where(and(eq(frozenKanbans.process, processFilter), eq(frozenKanbans.process, stationParts.process), baseWhereClause))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const total = (await db
        .select({ total: count() })
        .from(frozenKanbans)
        .innerJoin(kanbanRequests, eq(frozenKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(stationParts.partId, parts.id))
        .where(and(eq(frozenKanbans.process, processFilter), eq(frozenKanbans.process, stationParts.process), baseWhereClause)))[0]?.total

      const totalPages = Math.ceil((total ?? 0) / limit);

      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: true, total, totalPages});
    } else {
      // Not frozen, fetch kanbans filtered by process normally
      const kanbans = await db
        .select(selectKanbanFields)
        .from(kanbanRequests)
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(stationParts.partId, parts.id))
        .where(and(baseWhereClause, eq(stationParts.process, processFilter)))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      const total = (await db
        .select({ total: count() })
        .from(kanbanRequests)
        .leftJoin(stationParts, stationPartsJoinCondition)
        .leftJoin(parts, eq(stationParts.partId, parts.id))
        .where(and(baseWhereClause, eq(stationParts.process, processFilter))))[0]?.total

      const totalPages = Math.ceil((total ?? 0) / limit);

      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: false, total, totalPages});
    }
  } catch (err: any) {
    console.error("Error fetching kanbans:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

preparationSheetRouter.get("/kanbans/count", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const process = req.query?.process ? String(req.query.process) : null;
    const plantId = user.plantId;
    const baseWhereClause = eq(kanbanRequests.acknowledgedByLogistics, false);
    const processWhereClause = process ? eq(stationParts.process, process) : sql`1=1`;
    const plantWhereClause = eq(kanbanRequests.plantId, plantId!);
    const whereClause = and(
      baseWhereClause,
      processWhereClause,
      plantWhereClause
    );

    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);
    const result = await db
      .select({ total: count() })
      .from(kanbanRequests)
      .leftJoin(stationParts, stationPartsJoinCondition)
      .where(whereClause);

    return res.status(200).json({ total: result[0]?.total ?? 0 });
  } catch (err: any) {
    console.error("Error fetching kanban count:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

preparationSheetRouter.put("/kanban", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // const isAuthorized = user.role === "admin" || user.role === "logistics";
  // if (!isAuthorized) {
  //   return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
  // }
  
  const { kanbanIds } = req.body as KanbanModifyRequest;
  console.log("Received request to update kanban in prep list:", kanbanIds);

  if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
    return res.status(400).json({ error: "kanbanIds array is required" });
  }

  try {
    const acknowledgedByLogistics = true;
    const acknowledgedAt = new Date();

    const result = await db
    .update(kanbanRequests)
    .set({ acknowledgedByLogistics, acknowledgedAt })
    .where(inArray(kanbanRequests.id, kanbanIds))
    .returning();

    if (result.length === 0) {
      return res.status(404).json({ message: "Kanban not found" });
    }

    return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
  } catch (error: any) {
    console.log("Error updating kanban:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

preparationSheetRouter.put("/kanban/all", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const isAuthorized = user.role === "admin";
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admins can update multiple kanbans at once." });
  }
  
  const { process } = req.query;
  console.log(`Received request to update all kanban in prep list ${process && `for process: ${process}`}`);
  
  try {
    const plantId = user.plantId;
    const acknowledgedByLogistics = true;
    const acknowledgedAt = new Date();
    const whereClause = and(
          eq(kanbanRequests.acknowledgedByLogistics, false),
          eq(kanbanRequests.plantId, plantId),
          process ? eq(stationParts.process, String(process)) : sql`1=1`
        );
      
    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);

    const kanbansToUpdate = await db
    .select({ id: kanbanRequests.id })
    .from(kanbanRequests)
    .leftJoin(stationParts, stationPartsJoinCondition)
    .where(whereClause)
    .orderBy(asc(kanbanRequests.requestedAt));

    if (kanbansToUpdate.length === 0) {
      console.log("Kanban not found");
      return res.status(404).json({ message: "Kanban not found" });
    }

    const result = await db
    .update(kanbanRequests)
    .set({ acknowledgedByLogistics, acknowledgedAt })
    .where(inArray(kanbanRequests.id, kanbansToUpdate.map(k => k.id)))
    .returning();

    if (result.length === 0) {
      console.log("Kanban not found");
      return res.status(404).json({ message: "Kanban not found" });
    }

    console.log("Preparation Kanban updated successfully:", result); 
    return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
  } catch (error: any) {
    console.log("Error updating kanban:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

preparationSheetRouter.delete("/kanban", (req, res) => {
  deleteKanban(req, res);
});

preparationSheetRouter.post("/kanbans/freeze", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // const isAuthorized = user.role === "admin" || user.role === "logistics";
    // if (!isAuthorized) {
    //   return res.status(403).json({ error: "Forbidden: Only admins and logistics can freeze kanbans" });
    // }

    const { process } = req.body;
    if (!process) {
      return res.status(400).json({ error: "Process is required" });
    }

    const plantId = user.plantId;
    const whereClause = and(
          eq(kanbanRequests.acknowledgedByLogistics, false),
          eq(kanbanRequests.plantId, plantId),
          eq(stationParts.process, process)
        );

    // Check if already frozen
    const existingFreeze = await db
      .select()
      .from(processFreezeState)
      .where(and(eq(processFreezeState.process, process),eq(processFreezeState.plantId, plantId)))
      .limit(1);

    if (existingFreeze.length > 0 && existingFreeze[0].isFrozen) {
      return res.status(400).json({ error: "Process already frozen" });
    }

    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);

    // Fetch kanbans to freeze (acknowledgedByLogistics = false, plantId filtered)
    const kanbansToFreeze = await db
      .select({ id: kanbanRequests.id })
      .from(kanbanRequests)
      .leftJoin(stationParts, stationPartsJoinCondition)
      .where(whereClause)
      .orderBy(asc(kanbanRequests.requestedAt));

    if (kanbansToFreeze.length === 0) {
      return res.status(400).json({ error: "No kanbans found to freeze for this process" });
    }

    // Insert into frozenKanbans - avoid duplicates if any
    await db.transaction(async (tx) => {
      // Upsert processFreezeState row
      const freezeTimestamp = new Date();

      const upsertProcessFreeze = sql`
        INSERT INTO process_freeze_state (process, plant_id, is_frozen, frozen_at)
        VALUES (${process}, ${plantId}, true, ${freezeTimestamp})
        ON CONFLICT (process) DO UPDATE
          SET is_frozen = true,
              frozen_at = EXCLUDED.frozen_at
      `;
      await tx.execute(upsertProcessFreeze);

      // Insert frozenKanbans rows for each kanbanId
      for (const kanban of kanbansToFreeze) {
        // During race conditions, we might have duplicates, so we use ON CONFLICT DO NOTHING
        const insertFrozenKanban = sql`
          INSERT INTO frozen_kanbans (process, kanban_id, frozen_at)
          VALUES (${process}, ${kanban.id}, ${freezeTimestamp})
          ON CONFLICT DO NOTHING
        `;
        await tx.execute(insertFrozenKanban);
      }
    });

    return res.status(200).json({ message: `Process ${process} frozen successfully` });
  } catch (err: any) {
    console.error("Error freezing process:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

preparationSheetRouter.post("/kanbans/unfreeze", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    // const isAuthorized = user.role === "admin" || user.role === "logistics";
    // if (!isAuthorized) {
    //   return res.status(403).json({ error: "Forbidden: Only admins and logistics can unfreeze kanbans" });
    // }

    const { process } = req.body;
    const plantId = user.plantId;
    if (!process) {
      return res.status(400).json({ error: "Process is required" });
    }

    await db.transaction(async (tx) => {
      // Update freeze state
      await tx
        .update(processFreezeState)
        .set({ isFrozen: false, frozenAt: null})
        .where(and(eq(processFreezeState.process, process),eq(processFreezeState.plantId, plantId)));

      // Delete frozenKanbans for process
      const frozenKanbansToDelete = await db.select({ id: frozenKanbans.id })
      .from(frozenKanbans)
      .leftJoin(kanbanRequests, eq(frozenKanbans.kanbanId, kanbanRequests.id))
      .where(and(eq(frozenKanbans.process, process),eq(kanbanRequests.plantId, plantId)));
    
      await tx
        .delete(frozenKanbans)
        .where(inArray(frozenKanbans.id, frozenKanbansToDelete.map(k => k.id)));
    });

    return res.status(200).json({ message: `Process ${process} unfrozen successfully` });
  } catch (err: any) {
    console.error("Error unfreezing process:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

preparationSheetRouter.post("/kanbans/create", async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // const isAdmin = user.role === "admin";
  // if (!isAdmin) {
  //   return res.status(403).json({ error: "Forbidden: Only admins can create kanbans" });
  // }

  const plantId = user.plantId;
  const data:KanbanCreateRequest = req.body;
  try {    
    if (data.stationPartIds?.length === 0 && data.rankPartIds?.length === 0) {
      return res.status(400).json({ error: "At least one kanban entry is required" });
    }

    if (data.stationPartIds && data.stationPartIds.length > 0) {
      // Create new kanban request
      const newKanban = await db.insert(kanbanRequests).values(
        data.stationPartIds.map((id) => ({
          plantId: plantId,
          stationPartsId: Number(id),
        }))).returning();

      console.log(`Created kanban: ${JSON.stringify(newKanban)}`);
      return res.status(201).json({ message: "Kanban created successfully", kanban: newKanban[0] });
    } else if (data.rankPartIds && data.rankPartIds.length > 0) {
      // Create new kanban request for Rank Parts (no stationPartsId)
      const newKanban = await db.insert(kanbanRequests).values(
        data.rankPartIds.map((id) => ({
          plantId: plantId,
          partId: Number(id),
        }))).returning();

      console.log(`Created kanban: ${JSON.stringify(newKanban)}`);
      return res.status(201).json({ message: "Kanban created successfully", kanban: newKanban[0] });
    } 
  } catch (error) {
    console.error("Failed to create kanban:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});