import { Router } from 'express';
import { AdminFincasService } from '../services/admin-fincas.service';

const router = Router();

// GET /api/admin-fincas/summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await AdminFincasService.getAdminSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error getting admin summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen de administrador' });
  }
});

// GET /api/admin-fincas/export-db
router.get('/export-db', async (req, res) => {
  try {
    const data = await AdminFincasService.exportDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="adminfincas_backup_${new Date().toISOString().split('T')[0]}.json"`);
    res.json(data);
  } catch (error) {
    console.error('Error exporting database:', error);
    res.status(500).json({ error: 'Error al exportar base de datos' });
  }
});

export default router;
