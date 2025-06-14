import express from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products } from "../db/schema";
import { eq, and, asc, count } from "drizzle-orm";
import { KanbanModifyRequest } from "../lib/types";
import { deleteKanban } from "../lib/kanbanHelpers";

export const preparationSheetRouter = express.Router();

preparationSheetRouter.get("/kanbans", async (req, res): Promise<any> => {
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

        const kanbans = await db
            .select({
                id: kanbanRequests.id,
                plantId: kanbanRequests.plantId,
                stationId: kanbanRequests.stationId,
                stationName: stations.name,
                partId: kanbanRequests.partId,
                partName: parts.name,
                productId: kanbanRequests.productId,
                productName: products.variant, // or products.name if you have it
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
    
    const { plantId, stationId, partId, productId } = req.body as KanbanModifyRequest;
    console.log("Received request to update kanban:", req.body);
    
    if (
        plantId === undefined ||
        stationId === undefined ||
        partId === undefined ||
        productId === undefined
    ) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const whereClause = and (
            eq(kanbanRequests.stationId, stationId),
            eq(kanbanRequests.partId, partId),
            eq(kanbanRequests.productId, productId),
            eq(kanbanRequests.plantId, plantId)
        );

        const acknowledgedByLogistics = true;
        const acknowledgedAt = new Date();

        const result = await db
        .update(kanbanRequests)
        .set({ acknowledgedByLogistics, acknowledgedAt })
        .where(whereClause)
        .returning();

        if (result.length === 0) {
        return res.status(404).json({ message: "Kanban not found" });
        }

        console.log("Preparation Kanban updated successfully:", result); 
        return res.status(200).json({ message: "Kanban updated successfully", updatedKanbans: result });
    } catch (error: any) {
        console.error("Error updating kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});

preparationSheetRouter.delete("/kanban", (req, res) => {
    deleteKanban(req, res);
});