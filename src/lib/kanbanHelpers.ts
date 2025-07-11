import { Request, Response } from "express";
import { db } from "../db/client";
import { kanbanRequests } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
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

    const { kanbanIds } = req.body as KanbanModifyRequest;

    if (!Array.isArray(kanbanIds) || kanbanIds.length === 0 || kanbanIds.some(id => isNaN(Number(id)))) {
        return res.status(400).json({ error: 'kanbanIds (array of numbers) is required' });
    }

    try {
        const deleted = await db
        .delete(kanbanRequests)
        .where(inArray(kanbanRequests.plantId, kanbanIds))
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