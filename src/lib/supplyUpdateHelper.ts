import { inArray } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests } from "../db/schema";

export async function handleSupplyUpdate(kanbanIds: number[]) {
    console.log("Received request to update kanban in supply list:", kanbanIds);

  if (!Array.isArray(kanbanIds) || kanbanIds.length === 0) {
    throw new Error("kanbanIds array is required");
  }

  try {
    const fulfilled = true;
    const fulfilledAt = new Date();

    const result = await db
      .update(kanbanRequests)
      .set({ fulfilled, fulfilledAt })
      .where(inArray(kanbanRequests.id, kanbanIds))
      .returning();

    if (result.length === 0) {
      throw new Error("Kanban not found");
    }

    return 1;
  } catch (error: any) {
    console.error("Error updating kanban:", error);
    throw new Error("Internal server error");
  }
};
