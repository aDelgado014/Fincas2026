import { Router } from 'express';
import { DebtService } from '../services/debt.service.ts';
import { db } from '../db/index.ts';
import { charges, units, unitOwners } from '../db/schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const communityId = req.query.communityId as string | undefined;

    const allCharges = await DebtService.getChargesFull({ communityId: communityId || undefined });

    const total = allCharges.length;
    const offset = (page - 1) * limit;
    const data = allCharges.slice(offset, offset + limit);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const id = await DebtService.createCharge(req.body);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /bulk — creates a charge for every unit in a community
router.post('/bulk', async (req, res) => {
  try {
    const { communityId, concept, amount, dueDate } = req.body;

    if (!communityId || !concept || amount == null || !dueDate) {
      return res.status(400).json({ error: 'communityId, concept, amount y dueDate son obligatorios.' });
    }

    // Get all units for the community with their owners
    const communityUnits = await db
      .select({
        unitId: units.id,
        ownerId: unitOwners.ownerId,
      })
      .from(units)
      .leftJoin(unitOwners, eq(unitOwners.unitId, units.id))
      .where(eq(units.communityId, communityId))
      .execute();

    if (communityUnits.length === 0) {
      return res.status(404).json({ error: 'No se encontraron unidades para la comunidad indicada.' });
    }

    const now = new Date().toISOString();
    const createdIds: string[] = [];

    for (const row of communityUnits) {
      const id = uuidv4();
      await db.insert(charges).values({
        id,
        communityId,
        unitId: row.unitId,
        ownerId: row.ownerId ?? null,
        concept,
        amount: Number(amount),
        dueDate,
        issueDate: now,
        status: 'pending',
      });
      createdIds.push(id);
    }

    res.json({ success: true, created: createdIds.length, ids: createdIds });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
