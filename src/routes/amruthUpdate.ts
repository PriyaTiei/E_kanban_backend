import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests, stationParts, parts, stations, products } from "../db/schema";
import express from "express";

export const amruthUpdateRouter = express.Router();

amruthUpdateRouter.get("/kanbans", async (req, res): Promise<any> => {
  try {
    const whereClause = and(
          eq(kanbanRequests.acknowledgedByLogistics, true),
          eq(kanbanRequests.fulfilled, false)
        )

    const orderByClause = sql`
      CASE
        WHEN ${stationParts.supplyLocation} LIKE 'SA-%' THEN 1
        WHEN ${stationParts.supplyLocation} LIKE 'MK1-%' THEN 2
        WHEN ${stationParts.supplyLocation} LIKE 'MK2-%' THEN 3
        ELSE 4
      END,
      regexp_replace(${stationParts.supplyLocation}, '[^0-9]', '', 'g')::int,
      ${stationParts.supplyLocation},
      ${kanbanRequests.acknowledgedAt}
    `;

    const kanbans = await db
      .select({
        id: kanbanRequests.id,
        process: stationParts.process,
        partId: parts.partId,
        partName: parts.name,
        partNumber: parts.partNumber,
        boxQty: stationParts.binQuantity,
        supplyLocation: stationParts.supplyLocation,
        sequenceNo: kanbanRequests.id
      })
      .from(kanbanRequests)
      .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
      .leftJoin(products, eq(kanbanRequests.productId, products.id))
      .where(whereClause)
      .orderBy(orderByClause);

    return res.status(200).json(kanbans);
  } catch (err: any) {
    console.error("Error fetching kanbans:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});