import { Router } from 'express';
import { DebtService } from '../services/debt.service.ts';
import { CommunityService } from '../services/community.service.ts';
import { IncidentService } from '../services/incident.service.ts';
import { AuditService } from '../services/audit.service.ts';
import { adminOnly } from './role.middleware.ts';

const router = Router();

// Financial Stats (Proxy to DebtService)
router.get('/', adminOnly, async (req, res) => {
  try {
    const debtStats = await DebtService.getFinancialStats();
    const globalStats = await CommunityService.getGlobalStats();
    const incidentStats = await IncidentService.getStatsByCategory();
    const recentLogs = await AuditService.getRecentLogs(5);
    
    res.json({
      ...debtStats,
      ...globalStats,
      incidents: incidentStats,
      recentActivities: recentLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/portfolio', adminOnly, async (req, res) => {
  try {
    const data = await DebtService.getPortfolioStats();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debt-by-community', adminOnly, async (req, res) => {
  try {
    const data = await DebtService.getDebtByCommunity();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
