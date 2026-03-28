import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock drizzle db ──────────────────────────────────────────────────────────
vi.mock('../backend/db/index.ts', () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(),
  },
}));

// ─── Mock uuid ───────────────────────────────────────────────────────────────
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-uuid'),
}));

import { ImportService } from '../backend/services/import.service.ts';

describe('ImportService.extractStructuredData() - parseo de JSON', () => {
  const originalEnv = process.env.GROQ_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GROQ_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.GROQ_API_KEY = originalEnv;
    vi.unstubAllGlobals();
  });

  it('parsea correctamente JSON en bloque markdown ```json', async () => {
    const validJson = {
      community: { name: 'Residencial Los Pinos', nif: 'B12345678', address: 'Calle Mayor 1' },
      units: [
        { code: '1A', coefficient: 5.0, ownerName: 'Juan García', ownerEmail: 'juan@test.com', ownerPhone: '600000001', pendingDebt: 0 },
      ],
    };

    const markdownResponse = `Aquí está el JSON extraído:\n\`\`\`json\n${JSON.stringify(validJson, null, 2)}\n\`\`\``;

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: markdownResponse } }],
      }),
    }));

    const result = await ImportService.extractStructuredData('texto de ejemplo');

    expect(result).toEqual(validJson);
    expect(result.community.name).toBe('Residencial Los Pinos');
    expect(result.units).toHaveLength(1);
  });

  it('parsea JSON sin markdown fences', async () => {
    const validJson = {
      community: { name: 'Comunidad Centro', nif: 'G87654321', address: 'Plaza Mayor 5' },
      units: [
        { code: '2B', coefficient: 3.5, ownerName: 'Ana López', ownerEmail: 'ana@test.com', ownerPhone: '600000002', pendingDebt: 150 },
        { code: '3C', coefficient: 4.0, ownerName: 'Pedro Ruiz', ownerEmail: 'pedro@test.com', ownerPhone: '600000003', pendingDebt: 0 },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(validJson) } }],
      }),
    }));

    const result = await ImportService.extractStructuredData('otro texto');

    expect(result).toEqual(validJson);
    expect(result.units).toHaveLength(2);
  });

  it('lanza error si la respuesta no tiene estructura válida (falta community)', async () => {
    const invalidJson = {
      data: 'sin estructura correcta',
      items: [],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(invalidJson) } }],
      }),
    }));

    await expect(ImportService.extractStructuredData('texto')).rejects.toThrow(
      'Estructura de datos inválida en la respuesta de IA.'
    );
  });

  it('lanza error si la respuesta no tiene estructura válida (units no es array)', async () => {
    const invalidJson = {
      community: { name: 'Test' },
      units: 'not-an-array',
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(invalidJson) } }],
      }),
    }));

    await expect(ImportService.extractStructuredData('texto')).rejects.toThrow(
      'Estructura de datos inválida en la respuesta de IA.'
    );
  });

  it('lanza error si el modelo devuelve JSON malformado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: '{ invalid json content' } }],
      }),
    }));

    await expect(ImportService.extractStructuredData('texto')).rejects.toThrow(
      'El modelo de IA no devolvió un JSON válido.'
    );
  });

  it('lanza error si GROQ_API_KEY no está configurada', async () => {
    delete process.env.GROQ_API_KEY;

    await expect(ImportService.extractStructuredData('texto')).rejects.toThrow(
      'GROQ_API_KEY no configurada'
    );
  });

  it('lanza error si la respuesta del modelo está vacía', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: null } }],
      }),
    }));

    await expect(ImportService.extractStructuredData('texto')).rejects.toThrow(
      'Respuesta vacía del modelo de IA.'
    );
  });

  it('lanza error si choices está vacío', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [],
      }),
    }));

    await expect(ImportService.extractStructuredData('texto')).rejects.toThrow(
      'Respuesta vacía del modelo de IA.'
    );
  });
});
