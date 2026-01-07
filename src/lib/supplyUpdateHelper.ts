import { inArray } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests } from "../db/schema";
import { suppliedKanban } from "./types";

export async function handleSupplyUpdate(suppliedKanbans: suppliedKanban[]): Promise<number | undefined> {

  if (!Array.isArray(suppliedKanbans) || suppliedKanbans.length === 0) {
    throw new Error("kanbanIds array is required");
  }

  try {

    const fulfilled = true;
    const fulfilledAt = new Date();

    const kanbansToUpdate = suppliedKanbans.map(suppliedKanban => Number(suppliedKanban.KANBAN_NO));

    function chunkArray<T>(arr: T[], size: number): T[][] {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    }

    const BATCH_SIZE = 1000;
    const batches = chunkArray(kanbansToUpdate, BATCH_SIZE);

    const result = batches.map(async(batch) => (await db
      .update(kanbanRequests)
      .set({ fulfilled, fulfilledAt })
      .where(inArray(kanbanRequests.id, batch))
      .returning({id: kanbanRequests.id})).length).flat();    

    if (result.length === 0) {
      throw new Error("Kanban not found");
    }
    console.log(`✅ Updated ${result.length} kanban batches as fulfilled.`);
    return 1;
  } catch (error: any) {
    console.error("Error updating kanban:", error);
    throw new Error("Internal server error");
  }
};
