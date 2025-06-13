import express from 'express';
import { db } from '../db/client';
import { stations } from '../db/schema';

export const stationsRouter = express.Router();

stationsRouter.get('/', async (req, res) => {
  try {
    const stationDetails = await db.select().from(stations).orderBy(stations.id);
    res.json(stationDetails);
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
