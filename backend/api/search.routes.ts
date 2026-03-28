import { Router } from 'express';
import { SearchService } from '../services/search.service.ts';

const router = Router();

// GET /api/search?q=query
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const results = await SearchService.search(q);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
