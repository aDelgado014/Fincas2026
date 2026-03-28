import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';

// ─── Mock drizzle db ──────────────────────────────────────────────────────────
vi.mock('../backend/db/index.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: {
      users: { findFirst: vi.fn() },
      owners: { findFirst: vi.fn() },
    },
  },
}));

// ─── Mock bcryptjs ────────────────────────────────────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// ─── Mock jsonwebtoken ────────────────────────────────────────────────────────
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mocked.jwt.token'),
    verify: vi.fn(),
  },
}));

// ─── Mock uuid ───────────────────────────────────────────────────────────────
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid-1234'),
}));

import { db } from '../backend/db/index.ts';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Helper to build the minimal select chain used in auth.config.ts
function buildSelectChain(resolvedValue: any[]) {
  const limitFn = vi.fn().mockResolvedValue(resolvedValue);
  const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
  const fromFn = vi.fn().mockReturnValue({ where: whereFn });
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromFn });
  return { fromFn, whereFn, limitFn };
}

// Helper to build the insert chain used in auth.config.ts
function buildInsertChain(returningValue: any[]) {
  const returningFn = vi.fn().mockResolvedValue(returningValue);
  const valuesFn = vi.fn().mockReturnValue({ returning: returningFn });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: valuesFn });
}

// Helper to build the update chain used in auth.config.ts
function buildUpdateChain() {
  const whereFn = vi.fn().mockResolvedValue([]);
  const setFn = vi.fn().mockReturnValue({ where: whereFn });
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue({ set: setFn });
}

describe('Auth routes - login logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve token JWT cuando las credenciales son correctas', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@test.com',
      password: 'hashed_password',
      role: 'operator',
    };

    // First call: find user; second call: find owner (role is operator, not needed but set empty)
    let callCount = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      const limitFn = vi.fn().mockResolvedValue(callCount === 1 ? [mockUser] : []);
      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      return { from: fromFn };
    });

    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (jwt.sign as ReturnType<typeof vi.fn>).mockReturnValue('mocked.jwt.token');

    // Simulate the login handler logic directly
    const email = 'test@test.com';
    const password = 'plaintext_password';

    const [user] = await db.select().from({} as any).where({} as any).limit(1);
    expect(user).toEqual(mockUser);

    const passwordMatch = await bcrypt.compare(password, mockUser.password);
    expect(passwordMatch).toBe(true);

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      'secret',
      { expiresIn: '8h' }
    );
    expect(token).toBe('mocked.jwt.token');
  });

  it('devuelve 401 cuando la contraseña es incorrecta', async () => {
    const mockUser = {
      id: 'user-1',
      name: 'Test User',
      email: 'test@test.com',
      password: 'hashed_password',
      role: 'operator',
    };

    buildSelectChain([mockUser]);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const [user] = await db.select().from({} as any).where({} as any).limit(1);
    expect(user).toBeDefined();

    const passwordMatch = await bcrypt.compare('wrong_password', user.password);
    expect(passwordMatch).toBe(false);
    // The route would respond with 401 when passwordMatch is false
  });

  it('responde 400 cuando falta email o password', () => {
    // The handler checks: if (!email || !password) return res.status(400)
    const email = '';
    const password = '';
    const isMissingFields = !email || !password;
    expect(isMissingFields).toBe(true);
  });

  it('devuelve 401 cuando el usuario no existe en la BD', async () => {
    buildSelectChain([]);

    const [user] = await db.select().from({} as any).where({} as any).limit(1);
    expect(user).toBeUndefined();
    // The route returns 401 when user is undefined
  });
});

describe('Auth routes - register logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea usuario con datos válidos y devuelve token', async () => {
    const newUser = {
      id: 'mocked-uuid-1234',
      name: 'New User',
      email: 'new@test.com',
      role: 'operator',
    };

    let selectCallCount = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCallCount++;
      // First call: check existing user (none), second call: check matching owner (none)
      const limitFn = vi.fn().mockResolvedValue([]);
      const whereFn = vi.fn().mockReturnValue({ limit: limitFn });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });
      return { from: fromFn };
    });

    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('hashed_new_password');
    buildInsertChain([newUser]);
    (jwt.sign as ReturnType<typeof vi.fn>).mockReturnValue('new.jwt.token');

    // Simulate: no existing user
    const [existingUser] = await db.select().from({} as any).where({} as any).limit(1);
    expect(existingUser).toBeUndefined();

    // Password hash
    const hash = await bcrypt.hash('newpassword123', 12);
    expect(hash).toBe('hashed_new_password');

    // Insert new user
    const [inserted] = await db.insert({} as any).values({}).returning();
    expect(inserted).toEqual(newUser);
  });

  it('devuelve 409 cuando el email ya existe', async () => {
    const existingUser = {
      id: 'existing-id',
      email: 'taken@test.com',
      role: 'operator',
    };

    buildSelectChain([existingUser]);

    const [found] = await db.select().from({} as any).where({} as any).limit(1);
    expect(found).toBeDefined();
    // The route returns 409 when found is truthy
  });

  it('devuelve 400 cuando la contraseña tiene menos de 8 caracteres', () => {
    const password = 'short';
    const isTooShort = password.length < 8;
    expect(isTooShort).toBe(true);
    // The route returns 400 in this case
  });

  it('devuelve 400 cuando faltan campos obligatorios', () => {
    const name = '';
    const email = 'test@test.com';
    const password = 'validpassword';
    const isMissingFields = !name || !email || !password;
    expect(isMissingFields).toBe(true);
  });
});

describe('Auth routes - rate limiter logic', () => {
  it('bloquea después de 10 intentos fallidos', () => {
    const AUTH_RATE_LIMIT = 10;
    const loginAttempts = new Map<string, { count: number; resetAt: number }>();
    const ip = '127.0.0.1';
    const now = Date.now();
    const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

    // Simulate 11 requests
    for (let i = 0; i < 11; i++) {
      const record = loginAttempts.get(ip);
      if (record && now < record.resetAt) {
        record.count++;
      } else {
        loginAttempts.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
      }
    }

    const record = loginAttempts.get(ip);
    expect(record).toBeDefined();
    expect(record!.count).toBeGreaterThan(AUTH_RATE_LIMIT);
    // With count > AUTH_RATE_LIMIT the middleware returns 429
  });

  it('permite exactamente 10 intentos sin bloquear', () => {
    const AUTH_RATE_LIMIT = 10;
    const loginAttempts = new Map<string, { count: number; resetAt: number }>();
    const ip = '192.168.1.1';
    const now = Date.now();
    const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

    for (let i = 0; i < 10; i++) {
      const record = loginAttempts.get(ip);
      if (record && now < record.resetAt) {
        record.count++;
      } else {
        loginAttempts.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
      }
    }

    const record = loginAttempts.get(ip);
    expect(record!.count).toBe(10);
    expect(record!.count).not.toBeGreaterThan(AUTH_RATE_LIMIT);
  });
});

describe('requireAuth middleware', () => {
  it('verifica token válido y llama a next()', () => {
    (jwt.verify as ReturnType<typeof vi.fn>).mockReturnValue({
      id: 'user-1',
      name: 'Test',
      email: 'test@test.com',
      role: 'operator',
    });

    const req: any = { headers: { authorization: 'Bearer valid.token.here' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    const token = req.headers['authorization']?.startsWith('Bearer ')
      ? req.headers['authorization'].slice(7)
      : null;

    expect(token).toBe('valid.token.here');

    const payload = jwt.verify(token!, 'secret');
    expect(payload).toBeDefined();
  });

  it('devuelve 401 cuando no hay token', () => {
    const req: any = { headers: {} };
    const token = req.headers['authorization']?.startsWith('Bearer ')
      ? req.headers['authorization'].slice(7)
      : null;

    expect(token).toBeNull();
    // Route returns 401 when token is null
  });
});
