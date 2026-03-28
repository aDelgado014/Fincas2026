import { Router } from 'express';
import { adminOnly } from './role.middleware.ts';
import { BookingService } from '../services/booking.service.ts';

const router = Router();

// ─── GET /api/facilities?communityId=X ───────────────────────────────────────
router.get('/', adminOnly, async (req, res) => {
  try {
    const { communityId } = req.query as { communityId: string };
    if (!communityId) return res.status(400).json({ error: 'communityId requerido' });
    const data = await BookingService.listAllFacilities(communityId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/facilities ────────────────────────────────────────────────────
router.post('/', adminOnly, async (req, res) => {
  try {
    const { communityId, name, type, icon, description, capacity, pricePerSlot, slotDuration, openTime, closeTime, maxDaysAhead, requiresApproval } = req.body;
    if (!communityId || !name) return res.status(400).json({ error: 'communityId y name son requeridos' });

    const facility = await BookingService.createFacility({
      communityId, name, type, icon, description,
      capacity: capacity ? Number(capacity) : undefined,
      pricePerSlot: pricePerSlot ? Number(pricePerSlot) : undefined,
      slotDuration: slotDuration ? Number(slotDuration) : undefined,
      openTime, closeTime,
      maxDaysAhead: maxDaysAhead ? Number(maxDaysAhead) : undefined,
      requiresApproval: requiresApproval ? Number(requiresApproval) : undefined,
    });

    res.status(201).json(facility);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/facilities/:id ───────────────────────────────────────────────
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const updated = await BookingService.updateFacility(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/facilities/bookings?communityId=X&date=YYYY-MM-DD ──────────────
router.get('/bookings', adminOnly, async (req, res) => {
  try {
    const { communityId, date } = req.query as { communityId: string; date?: string };
    if (!communityId) return res.status(400).json({ error: 'communityId requerido' });
    const data = await BookingService.listByCommunity(communityId, date);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── PATCH /api/facilities/bookings/:id/status ───────────────────────────────
router.patch('/bookings/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'status requerido' });
    const updated = await BookingService.updateStatus(req.params.id, status);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
