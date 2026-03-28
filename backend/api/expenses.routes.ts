import { Router } from 'express';
import { ExpenseService } from '../services/expense.service.ts';

const router = Router();

// GET /api/expenses/:communityId
router.get('/:communityId', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await ExpenseService.getSummary(
      req.params.communityId,
      startDate as string,
      endDate as string
    );
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
