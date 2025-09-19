import express from 'express';
import { db } from '../db/client';
import { stations } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export const stationsRouter = express.Router();

stationsRouter.get('/', async (req, res): Promise<any> => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const plantId = user.plantId;
    const whereClause = eq(stations.plantId, plantId);

    const stationDetails = await db.select().from(stations).where(whereClause).orderBy(stations.id);
    
    res.json(stationDetails);
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
