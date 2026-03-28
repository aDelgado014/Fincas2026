import { Router } from 'express';
import { CommunicationsService } from '../services/communications.service.ts';

const router = Router();

// POST /api/communications/send — Enviar comunicación
router.post('/send', async (req, res) => {
  try {
    const { communityId, channel, subject, body, recipientCount } = req.body;

    if (!channel || !body) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: channel, body' });
    }

    const result = await CommunicationsService.send({
      communityId,
      channel,
      subject,
      body,
      recipientCount,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/communications/history — Historial de envíos
router.get('/history', async (req, res) => {
  try {
    const data = await CommunicationsService.getHistory(req.query.communityId as string);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/communications/remind-debt/:id — Recordatorio individual
router.post('/remind-debt/:id', async (req, res) => {
  try {
    const result = await CommunicationsService.sendDebtReminder(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
