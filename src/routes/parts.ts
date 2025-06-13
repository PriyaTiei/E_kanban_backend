import express from 'express';
import { db } from '../db/client';
import { parts } from '../db/schema';

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
