import { and, asc, desc, eq, gt, gte, inArray, lt } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests, parts, plants } from "../db/schema";
import { suppliedKanban } from "./types";

export async function handleSupplyUpdate(suppliedKanbans: suppliedKanban[], plantId: number): Promise<number | undefined> {

  if (!Array.isArray(suppliedKanbans) || suppliedKanbans.length === 0) {
    throw new Error("kanbanIds array is required");
  }

  try {
    // sort the kanbanRequests table in ascending order w.r.t. part number.
    const oldestFirstKanbansResult = await Promise.all(suppliedKanbans.map(
      async(suppliedKanban) => await db.select({kanbanId: kanbanRequests.id, part: parts.partId, plant: plants.name})
        .from(kanbanRequests)
        .leftJoin(plants, eq(kanbanRequests.plantId, plants.id))
        .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
        .where(and(
          eq(kanbanRequests.plantId, plantId),
          eq(parts.partNumber, suppliedKanban.PART_NUMBER), 
          // gte(kanbanRequests.requestedAt, new Date(earliestSupplyKanban.getTime() - 24 * 60 * 60 * 1000)),
          lt(kanbanRequests.requestedAt, new Date(suppliedKanban.SCAN_SYS_DATE)),
          eq(kanbanRequests.acknowledgedByLogistics, true)))
        .orderBy(asc(kanbanRequests.requestedAt)).limit(1)
    ))

    const oldestFirstKanbanIds = oldestFirstKanbansResult.flat().map((idResult) => idResult.kanbanId)
    const oldestFirstPartIds = oldestFirstKanbansResult.flat().map((idResult) => idResult.part)
    const oldestFirstPlants = oldestFirstKanbansResult.flat().map((idResult) => idResult.plant)
    console.log(`Kanbans to update: ${oldestFirstKanbanIds.length}, kanbans for: ${oldestFirstPartIds}, plant: ${oldestFirstPlants}`);
    
    if(oldestFirstKanbanIds.length === 0) {
      console.log(`No kanban found to update for ${oldestFirstPlants}`);
      return;
    }

    const fulfilled = true;
    const fulfilledAt = new Date();

    const result = await db
      .update(kanbanRequests)
      .set({ fulfilled, fulfilledAt })
      .where(inArray(kanbanRequests.id, oldestFirstKanbanIds))
      .returning();

    const updatedPartIds = result.map(r => r.partId);
    const updatedParts = await db.select({ partId: parts.partId }).from(parts).where(inArray(parts.id, updatedPartIds));

    console.log(`Updated ${updatedParts.map((part)=> part.partId)} parts for ${oldestFirstPlants}`);
    

    if (result.length === 0) {
      throw new Error("Kanban not found");
    }

    return 1;
  } catch (error: any) {
    console.error("Error updating kanban:", error);
    throw new Error("Internal server error");
  }
};
