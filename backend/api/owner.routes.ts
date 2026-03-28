import { Router } from 'express';
import { OwnerService } from '../services/owner.service.ts';
import { NotificationService } from '../services/notification.service.ts';
import { ownerAllowed } from './role.middleware.ts';

const router = Router();

// Middleware de aplicación para todas las rutas de propietario
router.use(ownerAllowed);

// GET /api/owner/me - Obtener perfil del propietario vinculado
router.get('/me', async (req: any, res) => {
  try {
    // El middleware de auth inyecta el usuario en req.user o req.auth
    const userId = req.user?.id || (req as any).auth?.user?.id;
    const owner = await OwnerService.getOwnerProfile(userId);
    if (!owner) {
      return res.status(404).json({ error: 'Propietario no encontrado para este usuario' });
    }
    res.json(owner);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/owner/summary - Estadísticas rápidas
router.get('/summary', async (req: any, res) => {
  try {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.status(400).json({ error: 'ownerId requerido' });
    
    const summary = await OwnerService.getOwnerSummary(ownerId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/owner/units - Mis propiedades
router.get('/units', async (req: any, res) => {
  try {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.status(400).json({ error: 'ownerId requerido' });
    const units = await OwnerService.getOwnerUnits(ownerId);
    res.json(units);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/owner/charges - Mis recibos
router.get('/charges', async (req: any, res) => {
  try {
    const ownerId = req.query.ownerId as string;
    if (!ownerId) return res.status(400).json({ error: 'ownerId requerido' });
    const charges = await OwnerService.getOwnerCharges(ownerId);
    res.json(charges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/owner/incidents - Reportar incidencia
router.post('/incidents', async (req: any, res) => {
  try {
    const incidentId = await OwnerService.reportIncident(req.body);
    res.status(201).json({ id: incidentId, message: 'Incidencia reportada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/owner/link - Vincular usuario con registro de propietario existente
router.post('/link', async (req: any, res) => {
  try {
    const userId = req.user?.id || (req as any).auth?.user?.id;
    const { ownerId, taxId } = req.body;
    
    if (!ownerId || !taxId) {
      return res.status(400).json({ error: 'ownerId y taxId son requeridos' });
    }

    const owner = await OwnerService.linkOwner(userId, ownerId, taxId);
    res.json({ message: 'Vinculación exitosa', owner });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Notifications
router.get('/notifications', async (req: any, res) => {
  try {
    const userId = req.user?.id || (req as any).auth?.user?.id;
    const notifications = await NotificationService.getUserNotifications(userId);
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/:id/read', async (req: any, res) => {
  try {
    await NotificationService.markAsRead(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Profile update
router.put('/profile', async (req: any, res) => {
  try {
    const userId = req.user?.id || (req as any).auth?.user?.id;
    await OwnerService.updateUserProfile(userId, req.body);
    res.json({ message: 'Perfil actualizado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
