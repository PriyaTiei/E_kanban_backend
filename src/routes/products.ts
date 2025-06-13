import express from 'express';
import { db } from '../db/client';
import { products } from '../db/schema';

export const productVariantsRouter = express.Router();

productVariantsRouter.get('/', async (req, res) => {
  try {
    const variants = await db.select().from(products).orderBy(products.id);
    res.json(variants);
  } catch (error) {
    console.error('Failed to fetch station product variants:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
