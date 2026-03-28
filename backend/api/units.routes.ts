import { Router } from 'express';
import { DebtService } from '../services/debt.service.ts';

const router = Router();

router.get('/:id/statement', async (req, res) => {
  try {
    const statement = await DebtService.getUnitStatement(req.params.id);
    res.json(statement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
