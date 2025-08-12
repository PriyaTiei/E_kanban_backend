import express from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products, frozenKanbans, processFreezeState, stationParts } from "../db/schema";
import { eq, and, asc, count, sql, inArray } from "drizzle-orm";
import { KanbanEntry, KanbanModifyRequest } from "../lib/types";
import { deleteKanban } from "../lib/kanbanHelpers";

export const preparationSheetRouter = express.Router();

const selectKanbanFields = {
    id: kanbanRequests.id,
    process: stationParts.process,
    partId: kanbanRequests.partId,
    partIdNo: parts.partId,
    partName: parts.name,
    prepLocation: stationParts.prepLocation,
}

preparationSheetRouter.get("/kanbans", async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdmin = user.role === "admin";
    const plantId = user.plantId;

    // Process filter from query params, e.g., /kanbans?process=1
    const processFilter = req.query.process ? Number(req.query.process) : null;

    // query for all unique processes
    const processes = await db
      .selectDistinct({ process: stationParts.process })
      .from(kanbanRequests)
      .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
      .orderBy(asc(stationParts.process));

    const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);

    console.log("Unique processes:", uniqueProcesses);
    
    // Base where clause for acknowledgedByLogistics and plant scope
    const baseWhereClause = isAdmin && plantId === null
      ? eq(kanbanRequests.acknowledgedByLogistics, false)
      : and(
          eq(kanbanRequests.acknowledgedByLogistics, false),
          eq(kanbanRequests.plantId, plantId!)
        );

    const orderByClause = sql`
      CASE
        WHEN ${stationParts.prepLocation} LIKE 'TZ-%' THEN 1
        WHEN ${stationParts.prepLocation} LIKE 'LOG-%' THEN 2
        ELSE 3
      END,
      regexp_replace(${stationParts.prepLocation}, '[^0-9]', '', 'g')::int,
      ${kanbanRequests.requestedAt}
    `;

    if (!processFilter) {
      // No process filter — return all kanbans normally
      const kanbans = await db
        .select(selectKanbanFields)
        .from(kanbanRequests)
        .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
        .leftJoin(products, eq(kanbanRequests.productId, products.id))
        .where(baseWhereClause)
        .orderBy(orderByClause);

      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: false});
    }

    // Check if this process is frozen
    const freezeState = await db
      .select()
      .from(processFreezeState)
      .where(eq(processFreezeState.process, processFilter))
      .limit(1);

    const isFrozen = freezeState.length > 0 && freezeState[0].isFrozen;

    if (isFrozen) {
      // Fetch frozen kanbans for this process
      // Join frozenKanbans -> kanbanRequests + other tables for details
      const kanbans = await db
        .select(selectKanbanFields)
        .from(frozenKanbans)
        .innerJoin(kanbanRequests, eq(frozenKanbans.kanbanId, kanbanRequests.id))
        .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
        .leftJoin(products, eq(kanbanRequests.productId, products.id))
        .where(and(eq(frozenKanbans.process, processFilter), baseWhereClause))
        .orderBy(orderByClause);

      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: true});
    } else {
      // Not frozen, fetch kanbans filtered by process normally
      const kanbans = await db
        .select(selectKanbanFields)
        .from(kanbanRequests)
        .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
        .leftJoin(products, eq(kanbanRequests.productId, products.id))
        .where(and(baseWhereClause, eq(stationParts.process, processFilter)))
        .orderBy(orderByClause);

      return res.status(200).json({kanbans, processes:uniqueProcesses, isFrozenData: false});
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
    const isAdmin = user.role === "admin";
    const plantId = user.plantId;
    const whereClause = isAdmin && plantId === null
      ? eq(kanbanRequests.acknowledgedByLogistics, false)
      : and(
        eq(kanbanRequests.acknowledgedByLogistics, false),
        eq(kanbanRequests.plantId, plantId!)
      );

    const result = await db
      .select({ total: count() })
      .from(kanbanRequests)
      .where(whereClause);

    // result is an array with one object: [{ total: number }]
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
  const isAuthorized = user.role === "admin" || user.role === "logistics";
  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden: Only admins and logistics can update kanbans" });
  }
  
  const { kanbanIds } = req.body as KanbanModifyRequest;
  console.log("Received request to update kanban in prep list:", kanbanIds);

  if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
    console.log("kanbanIds array is required");
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
    const isAuthorized = user.role === "admin" || user.role === "logistics";
    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden: Only admins and logistics can freeze kanbans" });
    }

    const { process } = req.body;
    if (!process) {
      return res.status(400).json({ error: "Process is required" });
    }

    const plantId = user.plantId;
    const whereClause = user.role === "admin" && plantId === null
      ? and(
          eq(kanbanRequests.acknowledgedByLogistics, false),
          eq(stationParts.process, process)
        )
      : and(
          eq(kanbanRequests.acknowledgedByLogistics, false),
          eq(kanbanRequests.plantId, plantId!),
          eq(stationParts.process, process)
        );

    // Check if already frozen
    const existingFreeze = await db
      .select()
      .from(processFreezeState)
      .where(eq(processFreezeState.process, process))
      .limit(1);

    if (existingFreeze.length > 0 && existingFreeze[0].isFrozen) {
      return res.status(400).json({ error: "Process already frozen" });
    }

    // Fetch kanbans to freeze (acknowledgedByLogistics = false, plantId filtered)
    const kanbansToFreeze = await db
      .select({ id: kanbanRequests.id })
      .from(kanbanRequests)
      .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
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
        INSERT INTO process_freeze_state (process, is_frozen, frozen_at)
        VALUES (${process}, true, ${freezeTimestamp})
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
    const isAuthorized = user.role === "admin" || user.role === "logistics";
    if (!isAuthorized) {
      return res.status(403).json({ error: "Forbidden: Only admins and logistics can unfreeze kanbans" });
    }

    const { process } = req.body;
    if (!process) {
      return res.status(400).json({ error: "Process is required" });
    }

    await db.transaction(async (tx) => {
      // Update freeze state
      await tx
        .update(processFreezeState)
        .set({ isFrozen: false, frozenAt: null})
        .where(eq(processFreezeState.process, process));

      // Delete frozenKanbans for process
      await tx.delete(frozenKanbans).where(eq(frozenKanbans.process, process));
    });

    return res.status(200).json({ message: `Process ${process} unfrozen successfully` });
  } catch (err: any) {
    console.error("Error unfreezing process:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});
