import { Router } from 'express';
import { IncidentService } from '../services/incident.service.ts';

const router = Router();

// GET /api/incidents — Listar incidencias
router.get('/', async (req, res) => {
  try {
    const data = await IncidentService.list({
      communityId: req.query.communityId as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/incidents/stats — Estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await IncidentService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/incidents/categories — Para gráfico del dashboard
router.get('/categories', async (req, res) => {
  try {
    const data = await IncidentService.getStatsByCategory();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/incidents — Crear incidencia
router.post('/', async (req, res) => {
  try {
    const { communityId, title, description, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
    
    const result = await IncidentService.create({ communityId, title, description, priority });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/incidents/:id — Actualizar incidencia
router.patch('/:id', async (req, res) => {
  try {
    const { status, priority, providerId, cost } = req.body;
    const result = await IncidentService.updateIncidentStatus(req.params.id, status);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
