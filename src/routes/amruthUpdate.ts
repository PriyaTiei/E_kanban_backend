import { and, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests, stationParts, parts, stations, products, plants } from "../db/schema";
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
        id: sql<number>`ROW_NUMBER() OVER (ORDER BY ${orderByClause})`.as('id'),
        sequenceNo: sql<number>`ROW_NUMBER() OVER (ORDER BY ${orderByClause})`.as('sequenceNo'),
        process: stationParts.process,
        plantId: plants.plantId,
        partId: parts.partId,
        partName: parts.name,
        partNumber: parts.partNumber,
        boxQty: stationParts.binQuantity,
        supplyLocation: stationParts.supplyLocation,
        // sequenceNo: kanbanRequests.id,
        acknowledgedAt: kanbanRequests.acknowledgedAt,
      })
      .from(kanbanRequests)
      .leftJoin(stations, eq(kanbanRequests.stationId, stations.id))
      .leftJoin(parts, eq(kanbanRequests.partId, parts.id))
      .leftJoin(stationParts, eq(kanbanRequests.partId, stationParts.partId))
      .leftJoin(products, eq(kanbanRequests.productId, products.id))
      .leftJoin(plants, eq(kanbanRequests.plantId, plants.id))
      .where(whereClause)
      .orderBy(orderByClause);

      const ISTDateFormatedResult = kanbans.map(kanban => {
        const acknowledgedAt = kanban.acknowledgedAt;
        if (acknowledgedAt) {
          const date = new Date(acknowledgedAt);
          const formattedDate = date.toLocaleString('en-GB', { 
            timeZone: 'Asia/Kolkata', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false
          }).replace(',', '');
          return { ...kanban, acknowledgedAt: formattedDate };
        }
        return kanban;
      });

      console.log("Count of kanbans for part id 2160: ", ISTDateFormatedResult.filter(k => k.partId === '2160').length);
      

    return res.status(200).json(ISTDateFormatedResult);
  } catch (err: any) {
    console.error("Error fetching kanbans:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});