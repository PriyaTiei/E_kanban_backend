import express, { Request, Response } from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products, plants } from "../db/schema";
import { eq, sql, desc, count } from "drizzle-orm";

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

    const whereClause = eq(kanbanRequests.plantId, plantId);

    const logs = await db
      .select({
        id: kanbanRequests.id,
        plantId: kanbanRequests.plantId,
        plantName: plants.name,
        stationId: kanbanRequests.stationId,
        stationName: stations.name,
        partId: kanbanRequests.partId,
        partIdNo: parts.partId,
        partName: parts.name,
        productId: kanbanRequests.productId,
        productName: products.variant,
        requestedAt: kanbanRequests.requestedAt,
        acknowledgedByLogistics: kanbanRequests.acknowledgedByLogistics,
        acknowledgedAt: kanbanRequests.acknowledgedAt,
        fulfilled: kanbanRequests.fulfilled,
        fulfilledAt: kanbanRequests.fulfilledAt,
      })
      .from(kanbanRequests)
      .leftJoin(plants, eq(kanbanRequests.plantId, plants.id))
      .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(products, eq(kanbanRequests.productId, products.id))
      .where(whereClause)
      .orderBy(desc(kanbanRequests.requestedAt))
      .limit(limit)
      .offset(offset);

      const totalLogs = await db.
      select({ total: count() })
      .from(kanbanRequests)
      .where(whereClause);

      const totalPages = Math.ceil((totalLogs[0]?.total ?? 0) / limit);

    return res.json({logs, totalPages});
  } catch (error) {
    console.error("Error fetching kanban requests log:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});