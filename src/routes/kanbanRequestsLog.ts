import express, { Request, Response } from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products, plants } from "../db/schema";
import { eq, sql, desc } from "drizzle-orm";

export const kanbanRequestsLogRouter = express.Router();

kanbanRequestsLogRouter.get("/", async (req: Request, res: Response): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    const plantId = user.plantId;

    const whereClause = isAdmin && plantId === null
      ? sql`1=1`
      : eq(kanbanRequests.plantId, plantId!);

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
      .orderBy(desc(kanbanRequests.requestedAt));

    return res.json(logs);
  } catch (error) {
    console.error("Error fetching kanban requests log:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});