import { and, eq, gte, inArray, isNull, lte, not, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { kanbanRequests, stationParts, parts, stations, products, plants } from "../db/schema";
import express from "express";

export const amruthUpdateRouter = express.Router();

amruthUpdateRouter.post("/kanbans", async (req, res): Promise<any> => {
  try {
    const previouslyAcknowledgedKanbans = req.body as number[];
    console.log("previouslyAcknowledgedKanbans: ", previouslyAcknowledgedKanbans);
    
    let whereClause = and(
          eq(kanbanRequests.acknowledgedByLogistics, true),
          eq(kanbanRequests.fulfilled, false),          
        )

    if (previouslyAcknowledgedKanbans && previouslyAcknowledgedKanbans.length > 0) {
      whereClause = and(whereClause,
        not(inArray(kanbanRequests.id, previouslyAcknowledgedKanbans))
      );
    }

    const orderByClause = sql`
      ${kanbanRequests.id},
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

    const stationPartsJoinCondition = eq(kanbanRequests.stationPartsId, stationParts.id);
    const kanbans = await db
      .selectDistinctOn([kanbanRequests.id],{
        id: kanbanRequests.id,
        sequenceNo: kanbanRequests.id,
        process: stationParts.process,
        plantId: plants.plantId,
        partId: parts.partId,
        partName: parts.name,
        partNumber: parts.partNumber,
        boxQty: stationParts.binQuantity,
        supplyLocation: stationParts.supplyLocation,
        acknowledgedAt: kanbanRequests.acknowledgedAt,
      })
      .from(kanbanRequests)
      .leftJoin(stationParts, stationPartsJoinCondition)
      .leftJoin(parts, eq(stationParts.partId, parts.id))
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

      console.log("Count of kanbans: ", ISTDateFormatedResult.length);
      

    return res.status(200).json(ISTDateFormatedResult);
  } catch (err: any) {
    console.error("Error fetching kanbans:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});