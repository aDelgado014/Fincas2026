import { Router } from 'express';
import { db } from '../db/index.ts';
import { tenants, owners, communities } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { BookingService } from '../services/booking.service.ts';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dev_key_change_in_production';

// ─── Middleware: verificar token de tenant/owner ─────────────────────────────
const requireTenantAuth = (req: any, res: any, next: any) => {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET) as any;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ─── POST /api/tenant/auth/login ─────────────────────────────────────────────
// Login por email + communityCode. No requiere contraseña (portal inquilino).
router.post('/auth/login', async (req, res) => {
  try {
    const { email, communityCode } = req.body;
    if (!email || !communityCode) {
      return res.status(400).json({ error: 'email y communityCode son requeridos' });
    }

    // Buscar comunidad por código
    const [community] = await db.select()
      .from(communities)
      .where(and(eq(communities.code, communityCode), eq(communities.status, 'active')))
      .limit(1);

    if (!community) {
      return res.status(404).json({ error: 'Comunidad no encontrada o inactiva' });
    }

    // Buscar en tenants primero, luego en owners
    const [tenant] = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
    const [owner] = await db.select().from(owners).where(eq(owners.email, email)).limit(1);

    if (!tenant && !owner) {
      return res.status(404).json({ error: 'No se encontró ningún inquilino o propietario con ese email en esta comunidad' });
    }

    const subject = tenant || owner!;
    const role = tenant ? 'tenant' : 'owner';

    const token = jwt.sign(
      {
        id: subject.id,
        name: subject.fullName,
        email: subject.email,
        role,
        communityId: community.id,
        communityName: community.name,
        tenantId: tenant?.id,
        ownerId: owner?.id,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: subject.id,
        name: subject.fullName,
        email: subject.email,
        role,
        communityId: community.id,
        communityName: community.name,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/tenant/auth/me ─────────────────────────────────────────────────
router.get('/auth/me', requireTenantAuth, (req: any, res) => {
  const { id, name, email, role, communityId, communityName } = req.user;
  res.json({ user: { id, name, email, role, communityId, communityName } });
});

// ─── GET /api/tenant/facilities ─────────────────────────────────────────────
router.get('/facilities', requireTenantAuth, async (req: any, res) => {
  try {
    const communityId = req.query.communityId || req.user.communityId;
    const data = await BookingService.listFacilities(communityId);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/tenant/facilities/:id/availability ────────────────────────────
router.get('/facilities/:id/availability', requireTenantAuth, async (req, res) => {
  try {
    const { date } = req.query as { date: string };
    if (!date) return res.status(400).json({ error: 'Parámetro date requerido (YYYY-MM-DD)' });
    const slots = await BookingService.getAvailability(req.params.id, date);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/tenant/bookings ───────────────────────────────────────────────
router.post('/bookings', requireTenantAuth, async (req: any, res) => {
  try {
    const { facilityId, bookingDate, startTime, endTime, notes } = req.body;
    if (!facilityId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'facilityId, bookingDate, startTime y endTime son requeridos' });
    }

    const booking = await BookingService.create({
      facilityId,
      bookingDate,
      startTime,
      endTime,
      notes,
      tenantId: req.user.tenantId,
      ownerId: req.user.ownerId,
    });

    res.status(201).json(booking);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ─── GET /api/tenant/bookings ────────────────────────────────────────────────
router.get('/bookings', requireTenantAuth, async (req: any, res) => {
  try {
    const data = await BookingService.listByUser({
      tenantId: req.user.tenantId,
      ownerId: req.user.ownerId,
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── DELETE /api/tenant/bookings/:id ────────────────────────────────────────
router.delete('/bookings/:id', requireTenantAuth, async (req: any, res) => {
  try {
    const updated = await BookingService.cancel(req.params.id, req.user.id, req.user.role);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
