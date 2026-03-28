import { Router } from 'express';
import { MinutesService } from '../services/minutes.service.ts';

const router = Router();

// POST /api/minutes/generate — Generar acta con IA
router.post('/generate', async (req, res) => {
  try {
    const { communityId, communityName, meetingDate, attendees, agendaItems } = req.body;

    if (!communityId || !meetingDate || !attendees || !agendaItems) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: communityId, meetingDate, attendees, agendaItems' });
    }

    const result = await MinutesService.generate({
      communityId,
      communityName: communityName || 'Comunidad',
      meetingDate,
      attendees,
      agendaItems,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/minutes — Listar actas
router.get('/', async (req, res) => {
  try {
    const data = await MinutesService.list(req.query.communityId as string);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/minutes/:id — Obtener acta por ID
router.get('/:id', async (req, res) => {
  try {
    const data = await MinutesService.getById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Acta no encontrada' });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/minutes/:id/status — Cambiar estado
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await MinutesService.updateStatus(req.params.id, status);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/sync-notion', async (req, res) => {
  try {
    const data = await MinutesService.getById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Acta no encontrada' });

    const { NotionService } = await import('../services/notion.service.ts');
    await NotionService.syncDocument({
      title: `Acta: ${data.title} (${data.meetingDate})`,
      url: '' // We don't have a public URL for actas yet, but we could add one
    });

    res.json({ message: 'Acta sincronizada con Notion' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
