import { Router } from 'express';
import { DebtService } from '../services/debt.service.ts';
import { SeedService } from '../services/seed.service.ts';
import { superadminOnly, adminOnly } from './role.middleware.ts';

const router = Router();

// Legacy/Frontend Compatibility endpoint for Debt list
router.get('/debts', adminOnly, async (req, res) => {
  try {
    const debts = await DebtService.getChargesFull({ 
      communityId: req.query.communityId as string,
      status: req.query.status as string || 'pending' 
    });
    res.json(debts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export-excel', adminOnly, async (req, res) => {
  try {
    const communityIds = req.query.communityIds ? (req.query.communityIds as string).split(',') : undefined;
    const data = await DebtService.getExportData(communityIds);
    
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contabilidad");
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=informe_fincas.xlsx');
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Seeding endpoint
router.post('/seed', superadminOnly, async (req, res) => {
  try {
    const result = await SeedService.runSeed();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
