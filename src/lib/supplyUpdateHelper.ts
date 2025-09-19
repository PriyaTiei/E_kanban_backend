import { and, desc, eq, gt, gte, inArray, lt } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests, parts } from "../db/schema";
import { suppliedKanban } from "./types";

export async function handleSupplyUpdate(suppliedKanbans: suppliedKanban[]) {

  if (!Array.isArray(suppliedKanbans) || suppliedKanbans.length === 0) {
    throw new Error("kanbanIds array is required");
  }

  try {
    const earliestSupplyKanban = new Date(suppliedKanbans[0].SCAN_SYS_DATE);
    // sort the kanbanRequests table in ascending order w.r.t. part number.
    const oldestFirstKanbansResult = await Promise.all(suppliedKanbans.map(
      async(suppliedKanban) => await db.select({kanbanId: kanbanRequests.id})
        .from(kanbanRequests)
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .where(and(
          eq(parts.partNumber, suppliedKanban.PART_NUMBER), 
          // gte(kanbanRequests.requestedAt, new Date(earliestSupplyKanban.getTime() - 24 * 60 * 60 * 1000)),
          lt(kanbanRequests.requestedAt, new Date(suppliedKanban.SCAN_SYS_DATE))))
        .orderBy(desc(kanbanRequests.requestedAt)).limit(1)
    ))

    const oldestFirstKanbanIds = oldestFirstKanbansResult.flat().map((idResult) => idResult.kanbanId)
    console.log(`Kanbans to update: ${oldestFirstKanbanIds.length}, kanbans: ${oldestFirstKanbanIds}`);
    
    if(oldestFirstKanbanIds.length === 0) {
      console.log("No kanban found to update");
      return;
    }

    const fulfilled = true;
    const fulfilledAt = new Date();

    const result = await db
      .update(kanbanRequests)
      .set({ fulfilled, fulfilledAt })
      .where(inArray(kanbanRequests.id, oldestFirstKanbanIds))
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
