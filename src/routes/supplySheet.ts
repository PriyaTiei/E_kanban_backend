import express from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products } from "../db/schema";
import { eq, and, asc, count } from "drizzle-orm";
import { KanbanModifyRequest } from "../lib/types";
import { deleteKanban } from "../lib/kanbanHelpers";

export const supplySheetRouter = express.Router();

supplySheetRouter.get("/kanbans", async (req, res): Promise<any> => {
    try {
      const user = req.session.user;
      if (!user) {
          return res.status(401).json({ error: "Unauthorized" });
      }
      const isAdmin = user.role === "admin";
      const plantId = user.plantId;
      const whereClause = isAdmin && plantId === null
        ? and(
            eq(kanbanRequests.acknowledgedByLogistics, true),
            eq(kanbanRequests.fulfilled, false)
          )
        : and(
            eq(kanbanRequests.acknowledgedByLogistics, true),
            eq(kanbanRequests.fulfilled, false),
            eq(kanbanRequests.plantId, plantId!)
          );

      const kanbans = await db
          .select({
              id: kanbanRequests.id,
              stationId: kanbanRequests.stationId,
              stationName: stations.name,
              partId: kanbanRequests.partId,
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
          .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
          .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
          .leftJoin(products, eq(kanbanRequests.productId, products.id))
          .where(whereClause)
          .orderBy(asc(kanbanRequests.requestedAt));

      return res.status(200).json(kanbans);
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
      const isAdmin = user.role === "admin";
      const plantId = user.plantId;
      const whereClause = isAdmin && plantId === null
        ? and(
            eq(kanbanRequests.acknowledgedByLogistics, true),
            eq(kanbanRequests.fulfilled, false)
          )
        : and(
            eq(kanbanRequests.acknowledgedByLogistics, true),
            eq(kanbanRequests.fulfilled, false),
            eq(kanbanRequests.plantId, plantId!)
          );

        const result = await db
            .select({ total: count() })
            .from(kanbanRequests)
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
  
  const { plantId, stationId, partId, productId } = req.body as KanbanModifyRequest;

  if (
    plantId === undefined ||
    stationId === undefined ||
    partId === undefined ||
    productId === undefined
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const whereClause = and(
      eq(kanbanRequests.stationId, stationId),
      eq(kanbanRequests.partId, partId),
      eq(kanbanRequests.productId, productId),
      eq(kanbanRequests.plantId, plantId!)
    );

    const fulfilled = true;
    const fulfilledAt = new Date();

    const result = await db
      .update(kanbanRequests)
      .set({ fulfilled, fulfilledAt })
      .where(whereClause)
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

supplySheetRouter.delete("/kanban", (req, res) => {
  deleteKanban(req, res);
});