import { Router } from 'express';
import { CommunityService } from '../services/community.service.ts';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const list = await CommunityService.getAll();
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const community = await CommunityService.getById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json(community);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/units-full', async (req, res) => {
  try {
    const data = await CommunityService.getUnitsFull(req.params.id);
    // Transformar el join de Drizzle a la estructura esperada por el frontend
    const result = data.map(item => ({
      ...item.units,
      ownerName: item.owners?.fullName,
      ownerEmail: item.owners?.email,
      ownerPhone: item.owners?.phone,
      tenantName: item.tenants?.fullName,
      tenantEmail: item.tenants?.email,
      tenantPhone: item.tenants?.phone,
    }));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
