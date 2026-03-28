import { Router } from 'express';
import { BudgetService } from '../services/budget.service.ts';

const router = Router();

// GET /api/budgets?communityId=xxx
router.get('/', async (req, res) => {
  try {
    const communityId = req.query.communityId as string;
    if (!communityId) {
      return res.status(400).json({ error: 'communityId es obligatorio.' });
    }
    const data = await BudgetService.getAll(communityId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/budgets/:id
router.get('/:id', async (req, res) => {
  try {
    const budget = await BudgetService.getById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    }
    res.json(budget);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/budgets
router.post('/', async (req, res) => {
  try {
    const { communityId, year, items, totalAmount, notes } = req.body;
    if (!communityId || !year) {
      return res.status(400).json({ error: 'communityId y year son obligatorios.' });
    }
    const id = await BudgetService.create({ communityId, year, items, totalAmount, notes });
    res.status(201).json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/budgets/:id
router.patch('/:id', async (req, res) => {
  try {
    const budget = await BudgetService.getById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    }
    await BudgetService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const budget = await BudgetService.getById(req.params.id);
    if (!budget) {
      return res.status(404).json({ error: 'Presupuesto no encontrado.' });
    }
    await BudgetService.remove(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
