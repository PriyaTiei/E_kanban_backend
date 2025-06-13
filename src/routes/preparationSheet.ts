import express from "express";
import { db } from "../db/client";
import { kanbanRequests, stations, parts, products } from "../db/schema";
import { eq, and, asc, count } from "drizzle-orm";

export const preparationSheetRouter = express.Router();

interface PreparationSheetModifyRequest {
    stationId: number;
    partId: number;
    productId: number;
}

preparationSheetRouter.get("/kanbans", async (_, res): Promise<any> => {
    try {
        const kanbans = await db
            .select({
                id: kanbanRequests.id,
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
            .where(eq(kanbanRequests.acknowledgedByLogistics, false))
            .orderBy(asc(kanbanRequests.requestedAt));

        return res.status(200).json(kanbans);
    } catch (err: any) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});

preparationSheetRouter.get("/kanbans/count", async (_, res): Promise<any> => {
    try {
        const result = await db
            .select({ total: count() })
            .from(kanbanRequests)
            .where(eq(kanbanRequests.acknowledgedByLogistics, false));

        // result is an array with one object: [{ total: number }]
        return res.status(200).json({ total: result[0]?.total ?? 0 });
    } catch (err: any) {
        console.error("Error fetching kanban count:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});

preparationSheetRouter.put("/kanban", async (req, res): Promise<any> => {
    const { stationId, partId, productId } = req.body as PreparationSheetModifyRequest;
    console.log("Received request to update kanban:", req.body);
    
    if (
        stationId === undefined ||
        partId === undefined ||
        productId === undefined
    ) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const acknowledgedByLogistics = true;
        const acknowledgedAt = new Date();

        const result = await db
        .update(kanbanRequests)
        .set({ acknowledgedByLogistics, acknowledgedAt })
        .where(
            and(
            eq(kanbanRequests.stationId, stationId),
            eq(kanbanRequests.partId, partId),
            eq(kanbanRequests.productId, productId)
            )
        )
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

preparationSheetRouter.delete("/kanban", async (req, res): Promise<any> => {
    const { stationId, partId, productId } = req.query;

    if (
        isNaN(Number(stationId)) ||
        isNaN(Number(partId)) ||
        isNaN(Number(productId))
    ) {
        return res.status(400).json({ error: 'Invalid or missing query parameters' });
    }

    const parsedRequest: PreparationSheetModifyRequest = {
        stationId: Number(stationId),
        partId: Number(partId),
        productId: Number(productId),
    };
        
    try {
        const deleted = await db
        .delete(kanbanRequests)
        .where(
            and(
            eq(kanbanRequests.stationId, parsedRequest.stationId),
            eq(kanbanRequests.partId, parsedRequest.partId),
            eq(kanbanRequests.productId, parsedRequest.productId)
            )
        )
        .returning();

        if (deleted.length === 0) {
            return res.status(404).json({ message: "Kanban not found" });
        }

        return res.status(200).json({ message: "Kanban deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
});