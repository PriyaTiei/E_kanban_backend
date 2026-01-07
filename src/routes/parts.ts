import express from 'express';
import { db } from '../db/client';
import { parts, stationParts } from '../db/schema';
import { and, eq, isNull, not } from 'drizzle-orm';

export const partsRouter = express.Router();

partsRouter.get('/', async (req, res) => {
  try {
    const partDetails = await db.select().from(parts).orderBy(parts.id);
    res.json(partDetails);
  } catch (error) {
    console.error('Failed to fetch parts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

partsRouter.get('/rank-parts', async (req, res): Promise<any> => {
  const user = req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const plantId = user.plantId;
  try {
    const rankParts = await db.select({id:parts.id, partId: parts.partId})
      .from(parts)
      .leftJoin(stationParts, eq(parts.id, stationParts.partId))
      .where(and(isNull(stationParts.id), eq(parts.plantId, plantId)))
      .orderBy(parts.id);

    res.json(rankParts);
  } catch (error) {
    console.error('Failed to fetch parts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
