import { Router } from 'express';
import { AIAnalyticsService } from '../services/ai-analytics.service';
import { adminOnly } from './role.middleware';

const router = Router();

// GET /api/analytics/predictive-budget/:communityId
router.get('/predictive-budget/:communityId', adminOnly, async (req, res) => {
  try {
    const { communityId } = req.params;
    const analysis = await AIAnalyticsService.getPredictiveBudget(communityId);
    res.json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
