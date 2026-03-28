import { Router } from 'express';
import { IncidentService } from '../services/incident.service.ts';
import { adminOnly } from './role.middleware.ts';

const router = Router();

// GET /api/admin/incidents - Listar incidencias (Admin)
router.get('/incidents', adminOnly, async (req, res) => {
  try {
    const { communityId, status, priority } = req.query;
    const items = await IncidentService.list({ 
      communityId: communityId as string, 
      status: status as string, 
      priority: priority as string 
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/admin/incidents/:id/status - Actualizar estado de incidencia (Admin)
router.patch('/incidents/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Estado requerido' });

    const incident = await IncidentService.updateIncidentStatus(req.params.id, status);
    res.json({ message: 'Estado actualizado y notificaciones enviadas', incident });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
