import { db } from "../db/client";
import { stations } from "../db/schema";
import { eq } from "drizzle-orm";

export class StationRepository {
  static async create(name: string) {
    try {
      const result = await db.insert(stations).values({ name }).returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating station:", error);
      return { success: false, error: "Failed to create station." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db.select().from(stations).where(eq(stations.id, id));
      if (!result[0]) {
        return { success: false, error: "Station not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error finding station with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve station." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(stations);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching stations:", error);
      return { success: false, error: "Failed to fetch stations." };
    }
  }

  static async update(id: number, updates: Partial<typeof stations.$inferInsert>) {
    try {
      const result = await db.update(stations)
        .set(updates)
        .where(eq(stations.id, id))
        .returning();

      if (!result[0]) {
        return { success: false, error: "Station not found or no changes applied." };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error updating station with id ${id}:`, error);
      return { success: false, error: "Failed to update station." };
    }
  }

  static async delete(id: number) {
    try {
      const result = await db.delete(stations)
        .where(eq(stations.id, id))
        .returning();

      if (!result[0]) {
        return { success: false, error: "Station not found." };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error deleting station with id ${id}:`, error);
      return { success: false, error: "Failed to delete station." };
    }
  }
}
