import { db } from "../db/client";
import { productEntryLogs } from "../db/schema";
import { eq } from "drizzle-orm";

export class ProductEntryLogsRepository {
  static async create(data: typeof productEntryLogs.$inferInsert) {
    try {
      const result = await db.insert(productEntryLogs).values(data).returning();
      return { success: true, data: result[0] };
    } catch (error) {
      console.error("Error creating product entry log:", error);
      return { success: false, error: "Failed to create product entry log." };
    }
  }

  static async findById(id: number) {
    try {
      const result = await db
        .select()
        .from(productEntryLogs)
        .where(eq(productEntryLogs.id, id));
      if (!result[0]) {
        return { success: false, error: "Product entry log not found." };
      }
      return { success: true, data: result[0] };
    } catch (error) {
      console.error(`Error retrieving product entry log with id ${id}:`, error);
      return { success: false, error: "Failed to retrieve product entry log." };
    }
  }

  static async findAll() {
    try {
      const result = await db.select().from(productEntryLogs);
      return { success: true, data: result };
    } catch (error) {
      console.error("Error fetching product entry logs:", error);
      return { success: false, error: "Failed to fetch product entry logs." };
    }
  }

  static async findByProductId(productId: number) {
    try {
      const result = await db
        .select()
        .from(productEntryLogs)
        .where(eq(productEntryLogs.productId, productId));
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error fetching logs for productId ${productId}:`, error);
      return { success: false, error: "Failed to fetch logs by product ID." };
    }
  }

  static async findByStationId(stationId: number) {
    try {
      const result = await db
        .select()
        .from(productEntryLogs)
        .where(eq(productEntryLogs.stationId, stationId));
      return { success: true, data: result };
    } catch (error) {
      console.error(`Error fetching logs for stationId ${stationId}:`, error);
      return { success: false, error: "Failed to fetch logs by station ID." };
    }
  }
}
