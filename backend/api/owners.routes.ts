import { Router } from 'express';
import { OwnerService } from '../services/community.service.ts';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await OwnerService.getAll();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const owner = await OwnerService.getById(req.params.id);
    if (!owner) return res.status(404).json({ error: 'Owner not found' });
    res.json(owner);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
