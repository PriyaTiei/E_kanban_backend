import express, { Request, Response } from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products, plants, stationParts } from "../db/schema";
import { eq, sql, desc, count, and, or, ilike, SQL, lte, isNull, asc } from "drizzle-orm";

export const kanbanRequestsLogRouter = express.Router();

kanbanRequestsLogRouter.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const plantId = user.plantId;

    // pagination details from query params, e.g., /kanbans?page=1&limit=20
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.min(100, Math.max(1, Number(req.query.limit))) : 20;
    const offset = (page - 1) * limit;

    // filters from query params
    const status = req.query.status ? String(req.query.status) : null;
    const dateTime = req.query.dateTime ? String(req.query.dateTime) : null;
    const searchFilter = req.query.search ? String(req.query.search) : null;
    const processFilter = req.query.process ? String(req.query.process) : null;

    console.log("processFilter: ", processFilter);
    
    let whereClause: SQL | undefined = eq(kanbanRequests.plantId, plantId);

    if (status === "requested") {
      whereClause = sql`${whereClause} AND ${kanbanRequests.acknowledgedByLogistics} = false AND ${kanbanRequests.fulfilled} = false`;
    } else if (status === "acknowledged") {
      whereClause = sql`${whereClause} AND ${kanbanRequests.acknowledgedByLogistics} = true AND ${kanbanRequests.fulfilled} = false`;
    } else if (status === "fulfilled") {
      whereClause = sql`${whereClause} AND ${kanbanRequests.fulfilled} = true`;
    }

    if (processFilter){
      whereClause = sql`${whereClause} AND ${stationParts.process} = ${processFilter}`
    }

    if (dateTime) {
      whereClause = and(whereClause, lte(kanbanRequests.requestedAt, new Date(dateTime)));
    }

    if (searchFilter) {
      whereClause = and(whereClause, 
        or(
          ilike(parts.partId, `%${searchFilter}%`),
          ilike(stations.name, `%${searchFilter}%`),
        )
      );
    }

    const logs = await db
      .select({
        id: kanbanRequests.id,
        plantId: kanbanRequests.plantId,
        plantName: plants.name,
        stationName: stations.name,
        partIdNo: parts.partId,
        partName: parts.name,
        process: stationParts.process,
        requestedAt: kanbanRequests.requestedAt,
        acknowledgedByLogistics: kanbanRequests.acknowledgedByLogistics,
        acknowledgedAt: kanbanRequests.acknowledgedAt,
        fulfilled: kanbanRequests.fulfilled,
        fulfilledAt: kanbanRequests.fulfilledAt,
      })
      .from(kanbanRequests)
      .leftJoin(plants, eq(kanbanRequests.plantId, plants.id))
      .leftJoin(stationParts,  eq(kanbanRequests.stationPartsId, stationParts.id))
      .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
      .leftJoin(stations, eq(stationParts.stationId, stations.id))
      .where(whereClause)
      .orderBy(desc(kanbanRequests.requestedAt))
      .limit(limit)
      .offset(offset);

    const totalLogs = await db.
      select({ total: count() })
      .from(kanbanRequests)
      .leftJoin(stationParts, eq(kanbanRequests.stationPartsId, stationParts.id))
      .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
      .leftJoin(stations, eq(stationParts.stationId, stations.id))
      .where(whereClause);

    const totalPages = Math.ceil((totalLogs[0]?.total ?? 0) / limit);
    
    return res.json({logs, totalPages});
  } catch (error) {
    console.error("Error fetching kanban requests log:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

kanbanRequestsLogRouter.get("/processes", async (req: Request, res: Response): Promise<any> => {
  // query for all unique processes
      const processes = await db
        .selectDistinct({ process: stationParts.process })
        .from(kanbanRequests)
        .leftJoin(stationParts, eq(kanbanRequests.stationPartsId, stationParts.id))
        .leftJoin(parts, sql`${parts.id} = COALESCE(${stationParts.partId}, ${kanbanRequests.partId})`)
        .orderBy(asc(stationParts.process));
  
      const uniqueProcesses = processes.map(row => row.process).filter(p => p !== null);
      const rankKanbans = await db
          .select({ total: count() })
          .from(kanbanRequests)
          .leftJoin(stationParts, eq(kanbanRequests.stationPartsId, stationParts.id))
          .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
          .where(isNull(stationParts.id));
      if (rankKanbans[0]?.total! > 0 ) {
        uniqueProcesses.push('rank parts');
      }

      return res.json(uniqueProcesses)
})