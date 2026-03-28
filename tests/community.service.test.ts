import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock drizzle db ──────────────────────────────────────────────────────────
vi.mock('../backend/db/index.ts', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    query: {
      communities: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    },
  },
}));

// ─── Mock uuid ───────────────────────────────────────────────────────────────
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-community-uuid'),
}));

import { db } from '../backend/db/index.ts';
import { CommunityService } from '../backend/services/community.service.ts';

describe('CommunityService.getAll()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve un array de comunidades activas', async () => {
    const mockCommunities = [
      { id: 'c1', name: 'Comunidad A', status: 'active', code: 'COM-001' },
      { id: 'c2', name: 'Comunidad B', status: 'active', code: 'COM-002' },
    ];

    (db.query.communities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommunities);

    const result = await CommunityService.getAll();

    expect(result).toEqual(mockCommunities);
    expect(result).toHaveLength(2);
    expect(db.query.communities.findMany).toHaveBeenCalledOnce();
  });

  it('devuelve array vacío cuando no hay comunidades', async () => {
    (db.query.communities.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await CommunityService.getAll();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('CommunityService.getById()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve la comunidad correcta por ID', async () => {
    const mockCommunity = {
      id: 'c1',
      name: 'Comunidad A',
      status: 'active',
      code: 'COM-001',
      nif: 'B12345678',
      address: 'Calle Mayor 1',
    };

    (db.query.communities.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommunity);

    const result = await CommunityService.getById('c1');

    expect(result).toEqual(mockCommunity);
    expect(result?.id).toBe('c1');
    expect(db.query.communities.findFirst).toHaveBeenCalledOnce();
  });

  it('devuelve undefined cuando no existe la comunidad', async () => {
    (db.query.communities.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const result = await CommunityService.getById('nonexistent-id');

    expect(result).toBeUndefined();
  });
});

describe('CommunityService.createCommunity()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserta una comunidad y devuelve el ID generado', async () => {
    const insertValuesFn = vi.fn().mockResolvedValue(undefined);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: insertValuesFn });

    const data = {
      name: 'Nueva Comunidad',
      nif: 'B98765432',
      address: 'Avenida Principal 10',
    };

    const result = await CommunityService.createCommunity(data);

    expect(result).toBe('mocked-community-uuid');
    expect(db.insert).toHaveBeenCalledOnce();
    expect(insertValuesFn).toHaveBeenCalledOnce();

    const insertedValues = insertValuesFn.mock.calls[0][0];
    expect(insertedValues.name).toBe('Nueva Comunidad');
    expect(insertedValues.id).toBe('mocked-community-uuid');
  });

  it('genera código automático cuando no se proporciona', async () => {
    const insertValuesFn = vi.fn().mockResolvedValue(undefined);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: insertValuesFn });

    await CommunityService.createCommunity({ name: 'Sin Código' });

    const insertedValues = insertValuesFn.mock.calls[0][0];
    expect(insertedValues.code).toMatch(/^COM-/);
  });

  it('usa el código proporcionado cuando se especifica', async () => {
    const insertValuesFn = vi.fn().mockResolvedValue(undefined);
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: insertValuesFn });

    await CommunityService.createCommunity({ name: 'Con Código', code: 'CUSTOM-001' });

    const insertedValues = insertValuesFn.mock.calls[0][0];
    expect(insertedValues.code).toBe('CUSTOM-001');
  });
});

describe('CommunityService.getGlobalStats()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve objeto con communities, units y tenants', async () => {
    let selectCallCount = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCallCount++;
      const counts: Record<number, number> = { 1: 5, 2: 42, 3: 18 };
      const fromFn = vi.fn().mockResolvedValue([{ value: counts[selectCallCount] }]);
      return { from: fromFn };
    });

    const result = await CommunityService.getGlobalStats();

    expect(result).toHaveProperty('communities');
    expect(result).toHaveProperty('units');
    expect(result).toHaveProperty('tenants');
    expect(typeof result.communities).toBe('number');
    expect(typeof result.units).toBe('number');
    expect(typeof result.tenants).toBe('number');
  });

  it('devuelve 0 cuando las tablas están vacías', async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const fromFn = vi.fn().mockResolvedValue([{ value: 0 }]);
      return { from: fromFn };
    });

    const result = await CommunityService.getGlobalStats();

    expect(result.communities).toBe(0);
    expect(result.units).toBe(0);
    expect(result.tenants).toBe(0);
  });

  it('maneja respuesta vacía de la DB con valor por defecto 0', async () => {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const fromFn = vi.fn().mockResolvedValue([]);
      return { from: fromFn };
    });

    const result = await CommunityService.getGlobalStats();

    expect(result.communities).toBe(0);
    expect(result.units).toBe(0);
    expect(result.tenants).toBe(0);
  });
});
