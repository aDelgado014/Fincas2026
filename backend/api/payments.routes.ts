import { Router } from 'express';
import { DebtService } from '../services/debt.service.ts';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const id = await DebtService.recordPayment(req.body);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
