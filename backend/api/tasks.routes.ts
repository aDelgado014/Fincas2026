import { Router } from 'express';
import { db } from '../db/index.ts';
import { tasks } from '../db/schema.ts';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await db.query.tasks.findMany();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
