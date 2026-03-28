import { Router } from 'express';
import { ReconciliationService } from '../services/reconciliation.service.ts';
import { adminOnly } from './role.middleware.ts';

const router = Router();

// Reconciliation
router.post('/', adminOnly, async (req, res) => {
  try {
    const { transactions } = req.body;
    const results = await ReconciliationService.reconcile(transactions);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
