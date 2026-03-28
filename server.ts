import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';

// Import All Routes (Modular)
import communityRoutes from './backend/api/communities.routes.ts';
import ownerRoutes from './backend/api/owners.routes.ts';
import chargeRoutes from './backend/api/charges.routes.ts';
import paymentRoutes from './backend/api/payments.routes.ts';
import taskRoutes from './backend/api/tasks.routes.ts';
import unitRoutes from './backend/api/units.routes.ts';
import ownerPortalRoutes from './backend/api/owner.routes.ts';
import aiRoutes from './backend/api/ai.routes.ts';
import reconciliationRoutes from './backend/api/reconciliation.routes.ts';
import statsRoutes from './backend/api/stats.routes.ts';
import importRoutes from './backend/api/import.routes.ts';
import adminRoutes from './backend/api/admin.routes.ts';
import documentRoutes from './backend/api/document.routes.ts';
import adminIncidentsRoutes from './backend/api/admin-incidents.routes.ts';
import incidentRoutes from './backend/api/incidents.routes.ts';
import minuteRoutes from './backend/api/minutes.routes.ts';
import communicationRoutes from './backend/api/communications.routes.ts';
import userRoutes from './backend/api/user.routes.ts';
import analyticsRoutes from './backend/api/analytics.routes.ts';
import searchRoutes from './backend/api/search.routes.ts';
import calendarRoutes from './backend/api/calendar.routes.ts';
import debtAnalyticsRoutes from './backend/api/debt-analytics.routes.ts';
import budgetRoutes from './backend/api/budget.routes.ts';
import expenseRoutes from './backend/api/expenses.routes.ts';
import notificationsRoutes from './backend/api/notifications.routes.ts';
import adminFincasRoutes from './backend/api/admin-fincas.routes';
import communityOnboardingRoutes from './backend/api/community-onboarding.routes.ts';
import bankRoutes from './backend/api/bank.routes.ts';
import tenantRoutes from './backend/api/tenant.routes.ts';
import facilitiesRoutes from './backend/api/admin-facilities.routes.ts';
import telegramRoutes from './backend/api/telegram.routes.ts';

import { authConfig } from './backend/auth.config.ts';
import { adminOnly, superadminOnly, operatorAllowed, ownerAllowed } from './backend/api/role.middleware.ts';
import { startAutomationWorker } from './backend/workers/automation.worker.ts';
import { startCallWorker } from './backend/workers/call.worker.ts';
import { startScheduler } from './backend/services/scheduler.service.ts';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS Middleware (antes que todo lo demás)
  app.use((req: any, res: any, next: any) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.set("trust proxy", true);

  // JSON parser ANTES de las rutas de auth (fix: orden incorrecto previo)
  app.use(express.json());

  // Authentication Middleware
  app.use("/api/auth", authConfig);
  // JSON Error Handling Middleware
  app.use((err: any, req: any, res: any, next: any) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'JSON mal formado' });
    }
    next();
  });

  // API Health
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', architecture: 'modular', db: 'sqlite + drizzle' });
  });

  // Register Modular Routes
  app.use('/api/communities', ownerAllowed, communityRoutes); // fix V-02: requiere auth
  app.use('/api/owners', ownerAllowed, ownerRoutes);          // fix V-02: requiere auth
  app.use('/api/charges', operatorAllowed, chargeRoutes);
  app.use('/api/payments', operatorAllowed, paymentRoutes);
  app.use('/api/tasks', superadminOnly, taskRoutes);
  app.use('/api/units', ownerAllowed, unitRoutes);            // fix V-03: requiere auth
  
  // Feature Routes
  app.use('/api/ai', aiRoutes);
  app.use('/api/reconcile', reconciliationRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/owner', ownerPortalRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/admin', adminIncidentsRoutes);
  app.use('/api/minutes', minuteRoutes);
  app.use('/api/communications', communicationRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/debt-analytics', debtAnalyticsRoutes);
  app.use('/api/budgets', budgetRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/admin-fincas', adminFincasRoutes);
  app.use('/api/community-onboarding', communityOnboardingRoutes);
  app.use('/api/bank', operatorAllowed, bankRoutes);
  app.use('/api/tenant', tenantRoutes);
  app.use('/api/facilities', facilitiesRoutes);
  app.use('/api/telegram', telegramRoutes);

  // Admin Core (Debts, Export, Seed)
  app.use('/api', adminRoutes);

  // Start Workers
  startAutomationWorker();
  startCallWorker();
  startScheduler();

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Modular Server running on http://localhost:${PORT}`);
  });
}

startServer();
