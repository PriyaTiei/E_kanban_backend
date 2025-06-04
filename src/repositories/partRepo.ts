import { db } from "../db/client";
import { parts } from "../db/schema";
import { eq } from "drizzle-orm";

export class PartsRepository {
  static async create(name: string, description?: string) {
    try {
      const result = await db
        .insert(parts)
        .values({ name, description })
        .returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating part:", error);
      return { success: false, error: "Failed to create part." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db
        .select()
        .from(parts)
        .where(eq(parts.id, id));
      if (!result[0]) {
        return { success: false, error: "Part not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error finding part with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve part." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(parts);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching parts:", error);
      return { success: false, error: "Failed to fetch parts." };
    }
  }

  static async update(id: number, updates: Partial<typeof parts.$inferInsert>) {
    try {
      const result = await db
        .update(parts)
        .set(updates)
        .where(eq(parts.id, id))
        .returning();

      if (!result[0]) {
        return { success: false, error: "Part not found or no changes applied." };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error updating part with id ${id}:`, error);
      return { success: false, error: "Failed to update part." };
    }
  }

  static async delete(id: number) {
    try {
      const result = await db
        .delete(parts)
        .where(eq(parts.id, id))
        .returning();

      if (!result[0]) {
        return { success: false, error: "Part not found." };
      }

      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error deleting part with id ${id}:`, error);
      return { success: false, error: "Failed to delete part." };
    }
  }
}
