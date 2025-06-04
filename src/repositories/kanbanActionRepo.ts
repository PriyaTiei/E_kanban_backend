import { db } from "../db/client";
import { kanbanActions } from "../db/schema";
import { eq } from "drizzle-orm";

export class KanbanActionsRepository {
  static async create(data: typeof kanbanActions.$inferInsert) {
    try {
      const result = await db.insert(kanbanActions).values(data).returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating kanban action:", error);
      return { success: false, error: "Failed to create kanban action." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db.select().from(kanbanActions).where(eq(kanbanActions.id, id));
      if (!result[0]) {
        return { success: false, error: "Kanban action not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error retrieving kanban action with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve kanban action." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(kanbanActions);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching kanban actions:", error);
      return { success: false, error: "Failed to fetch kanban actions." };
    }
  }

  static async update(id: number, updates: Partial<typeof kanbanActions.$inferInsert>) {
    try {
      const result = await db.update(kanbanActions).set(updates).where(eq(kanbanActions.id, id)).returning();
      if (!result[0]) {
        return { success: false, error: "Kanban action not found or no changes applied." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error updating kanban action with id ${id}:`, error);
      return { success: false, error: "Failed to update kanban action." };
    }
  }

  static async delete(id: number) {
    try {
      const result = await db.delete(kanbanActions).where(eq(kanbanActions.id, id)).returning();
      if (!result[0]) {
        return { success: false, error: "Kanban action not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error deleting kanban action with id ${id}:`, error);
      return { success: false, error: "Failed to delete kanban action." };
    }
  }
}
