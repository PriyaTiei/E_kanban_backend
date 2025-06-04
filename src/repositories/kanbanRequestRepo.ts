import { db } from "../db/client";
import { kanbanRequests } from "../db/schema";
import { eq } from "drizzle-orm";

export class KanbanRequestsRepository {
  static async create(data: typeof kanbanRequests.$inferInsert) {
    try {
      const result = await db.insert(kanbanRequests).values(data).returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating kanban request:", error);
      return { success: false, error: "Failed to create kanban request." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db.select().from(kanbanRequests).where(eq(kanbanRequests.id, id));
      if (!result[0]) {
        return { success: false, error: "Kanban request not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error retrieving kanban request with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve kanban request." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(kanbanRequests);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching kanban requests:", error);
      return { success: false, error: "Failed to fetch kanban requests." };
    }
  }

  static async update(id: number, updates: Partial<typeof kanbanRequests.$inferInsert>) {
    try {
      const result = await db.update(kanbanRequests).set(updates).where(eq(kanbanRequests.id, id)).returning();
      if (!result[0]) {
        return { success: false, error: "Kanban request not found or no changes applied." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error updating kanban request with id ${id}:`, error);
      return { success: false, error: "Failed to update kanban request." };
    }
  }

  static async delete(id: number) {
    try {
      const result = await db.delete(kanbanRequests).where(eq(kanbanRequests.id, id)).returning();
      if (!result[0]) {
        return { success: false, error: "Kanban request not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error deleting kanban request with id ${id}:`, error);
      return { success: false, error: "Failed to delete kanban request." };
    }
  }
}
