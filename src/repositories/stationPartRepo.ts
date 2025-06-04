import { db } from "../db/client";
import { stationParts } from "../db/schema";
import { and, eq } from "drizzle-orm";

export class StationPartsRepository {
    static async create(data: typeof stationParts.$inferInsert) {
        try {
            const result = await db.insert(stationParts).values(data).returning();
            return { success: true, data: result[0] };
        } catch (error) {
            console.error("Error creating station part:", error);
            return { success: false, error: "Failed to create station part." };
        }
    }

    static async findById(id: number) {
        try {
            const result = await db.select().from(stationParts).where(eq(stationParts.id, id));
        if (!result[0]) {
            return { success: false, error: "Station part not found." };
        }
        return { success: true, data: result[0] };
        } catch (error) {
        console.error(`Error finding station part with id ${id}:`, error);
        return { success: false, error: "Failed to retrieve station part." };
        }
    }

    static async findAll() {
        try {
        const result = await db.select().from(stationParts);
        return { success: true, data: result };
        } catch (error) {
        console.error("Error fetching station parts:", error);
        return { success: false, error: "Failed to fetch station parts." };
        }
    }

    static async update(id: number, updates: Partial<typeof stationParts.$inferInsert>) {
        try {
        const result = await db
            .update(stationParts)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(stationParts.id, id))
            .returning();

        if (!result[0]) {
            return { success: false, error: "Station part not found or no changes applied." };
        }

        return { success: true, data: result[0] };
        } catch (error) {
        console.error(`Error updating station part with id ${id}:`, error);
        return { success: false, error: "Failed to update station part." };
        }
    }

    static async delete(id: number) {
        try {
        const result = await db
            .delete(stationParts)
            .where(eq(stationParts.id, id))
            .returning();

        if (!result[0]) {
            return { success: false, error: "Station part not found." };
        }

        return { success: true, data: result[0] };
        } catch (error) {
        console.error(`Error deleting station part with id ${id}:`, error);
        return { success: false, error: "Failed to delete station part." };
        }
    }

    // Optional: Fetch by composite keys (e.g., for station + part + product)
    static async findByComposite(stationId: number, partId: number, productId: number) {
        try {
        const result = await db.select().from(stationParts).where(
            and(
                eq(stationParts.stationId, stationId), 
                (eq(stationParts.partId, partId)),
                (eq(stationParts.productId, productId))
            ));
        return { success: true, data: result };
        } catch (error) {
        console.error("Error fetching by composite keys:", error);
        return { success: false, error: "Failed to fetch station part by composite keys." };
        }
    }
}
