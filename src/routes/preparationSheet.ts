import express from "express";
import { db } from "../db/client";
import { kanbanRequests } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";

export const preparationSheetRouter = express.Router();

interface PreparationSheetModifyRequest {
    stationId: number;
    partId: number;
    productId: number;
}

preparationSheetRouter.get("/kanbans", async (_, res): Promise<any> => {
    try {
        const kanbans = await db
        .select()
        .from(kanbanRequests)
        .where(eq(kanbanRequests.acknowledgedByLogistics, false))
        .orderBy(asc(kanbanRequests.requestedAt));

        return res.status(200).json(kanbans);
    } catch (err: any) {
        console.error("Error fetching kanbans:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});

preparationSheetRouter.put("/kanban", async (req, res): Promise<any> => {
    const { stationId, partId, productId } = req.body as PreparationSheetModifyRequest;

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