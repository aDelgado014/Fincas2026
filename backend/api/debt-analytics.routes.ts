import { Router } from 'express';
import { DebtAnalyticsService } from '../services/debt-analytics.service.ts';

const router = Router();

// GET /api/debt-analytics/overview
router.get('/overview', async (req, res) => {
  try {
    const data = await DebtAnalyticsService.getOverview();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
