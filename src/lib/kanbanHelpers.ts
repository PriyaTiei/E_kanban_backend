import { Request, Response } from "express";
import { db } from "../db/client";
import { kanbanRequests } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { KanbanModifyRequest } from "./types";

export async function deleteKanban(req:Request, res:Response): Promise<Response> {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const isAdmin = user.role === "admin";
    if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Only admins can delete kanbans" });
    }

    const { plantId, stationId, partId, productId } = req.query;

    if (
        isNaN(Number(plantId)) ||
        isNaN(Number(stationId)) ||
        isNaN(Number(partId)) ||
        isNaN(Number(productId))
    ) {
        return res.status(400).json({ error: 'Invalid or missing query parameters' });
    }

    const parsedRequest: KanbanModifyRequest = {
        plantId: Number(plantId),
        stationId: Number(stationId),
        partId: Number(partId),
        productId: Number(productId),
    };

    try {
        const deleted = await db
        .delete(kanbanRequests)
        .where(and(
            eq(kanbanRequests.plantId, parsedRequest.plantId),
            eq(kanbanRequests.stationId, parsedRequest.stationId),
            eq(kanbanRequests.partId, parsedRequest.partId),
            eq(kanbanRequests.productId, parsedRequest.productId)
        ))
        .returning();

        if (deleted.length === 0) {
        return res.status(404).json({ message: "Kanban not found" });
        }

        return res.status(200).json({ message: "Kanban deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting kanban:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}