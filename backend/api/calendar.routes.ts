import { Router } from 'express';
import { CalendarService } from '../services/calendar.service.ts';

const router = Router();

// GET /api/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/events', async (req, res) => {
  try {
    const from = (req.query.from as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const to = (req.query.to as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

    const result = await CalendarService.getEvents(from, to);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
