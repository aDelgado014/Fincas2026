import { Router } from 'express';
import { db } from './db/index.ts';
import { users, owners } from './db/schema.ts';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_dev_key_change_in_production';
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET no está configurado en producción. El servidor debe detenerse.');
    process.exit(1);
  } else {
    console.warn('⚠️  ADVERTENCIA: JWT_SECRET no configurado. Usando clave insegura de desarrollo.');
  }
}
const JWT_EXPIRES_IN = '8h';

// ─── Rate Limiter simple en memoria para rutas de auth ───────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const AUTH_RATE_LIMIT = 10;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

const authRateLimiter = (req: any, res: any, next: any) => {
  const ip: string = (req.ip as string) || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= AUTH_RATE_LIMIT) {
      return res.status(429).json({ error: 'Demasiados intentos. Inténtalo de nuevo en 15 minutos.' });
    }
    record.count++;
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
  }
  next();
};

// ─── Middleware: Verificar JWT ───────────────────────────────────────────────
export const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Token requerido.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// ─── Middleware: Solo roles específicos ──────────────────────────────────────
export const requireRole = (...roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso denegado: permisos insuficientes.' });
  }
  next();
};

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    // Buscar si el usuario es un propietario para incluir su ownerId
    let ownerId = undefined;
    if (user.role === 'owner') {
      const [ownerData] = await db.select().from(owners).where(eq(owners.userId, user.id)).limit(1);
      ownerId = ownerData?.id;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan ?? 'free', ownerId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan ?? 'free', ownerId },
      message: 'Login exitoso.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/auth/register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    // NOTA: 'role' del body se ignora intencionalmente — todos los nuevos usuarios
    // son 'operator' por defecto. Un superadmin debe promoverlos manualmente.

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña requeridos.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) {
      return res.status(409).json({ error: 'El usuario ya existe.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userId = uuidv4();
    
    // ─── Lógica de Auto-Vinculación de Propietario ───
    const [matchingOwner] = await db.select().from(owners).where(eq(owners.email, email)).limit(1);
    const assignedRole = matchingOwner ? 'owner' : 'operator';

    const [newUser] = await db.insert(users).values({
      id: userId,
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
    }).returning();

    if (matchingOwner) {
      // Vincular el registro de owner con el nuevo usuario
      await db.update(owners)
        .set({ userId: newUser.id })
        .where(eq(owners.id, matchingOwner.id));
    }

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, plan: newUser.plan ?? 'free', ownerId: matchingOwner?.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, plan: newUser.plan ?? 'free', ownerId: matchingOwner?.id },
      message: 'Usuario creado exitosamente.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/auth/me — Requiere token válido ────────────────────────────────
router.get('/me', requireAuth, (req: any, res) => {
  // Devuelve el usuario extraído del JWT, sin consultar la BD de nuevo
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

// ─── POST /api/auth/firebase-sync ────────────────────────────────────────────
// DESACTIVADO (V-01): Aceptaba cualquier email sin verificar el ID token de
// Firebase — auth bypass crítico. Requiere firebase-admin + verifyIdToken.
// TODO: Reactivar solo tras implementar: admin.auth().verifyIdToken(req.body.idToken)
router.post('/firebase-sync', authRateLimiter, (_req, res) => {
  res.status(503).json({
    error: 'Endpoint desactivado. Verificación de token Firebase no implementada.',
  });
});

export const authConfig = router;
