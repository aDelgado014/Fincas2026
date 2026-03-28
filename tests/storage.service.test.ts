import { describe, it, expect, vi } from 'vitest';

// ─── Mock fs to avoid creating directories on import ─────────────────────────
vi.mock('fs', () => ({
  default: {
    mkdirSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mocked-file-uuid'),
}));

/**
 * sanitizeFolder extracted for unit testing.
 * This mirrors the implementation in backend/services/storage.service.ts
 */
function sanitizeFolder(folder: string): string {
  const safe = folder.replace(/\.\./g, '').replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  return safe || 'general';
}

describe('sanitizeFolder()', () => {
  it('elimina ".." del path (path traversal)', () => {
    const result = sanitizeFolder('../../etc/passwd');
    expect(result).not.toContain('..');
    expect(result).not.toContain('/');
  });

  it('elimina ".." en diferentes posiciones', () => {
    expect(sanitizeFolder('../secret')).not.toContain('..');
    expect(sanitizeFolder('folder/../other')).not.toContain('..');
    expect(sanitizeFolder('../../deep/path')).not.toContain('..');
  });

  it('elimina "/" del path', () => {
    const result = sanitizeFolder('uploads/documents');
    expect(result).not.toContain('/');
  });

  it('reemplaza "/" con guión bajo', () => {
    const result = sanitizeFolder('folder/subfolder');
    expect(result).toBe('folder_subfolder');
  });

  it('elimina "\\" del path (backslash de Windows)', () => {
    const result = sanitizeFolder('folder\\subfolder');
    expect(result).not.toContain('\\');
  });

  it('reemplaza "\\" con guión bajo', () => {
    const result = sanitizeFolder('folder\\subfolder');
    expect(result).toBe('folder_subfolder');
  });

  it('solo permite caracteres alfanuméricos, guiones y guiones bajos', () => {
    const result = sanitizeFolder('my-folder_name123');
    expect(result).toBe('my-folder_name123');
  });

  it('elimina caracteres especiales no permitidos', () => {
    const result = sanitizeFolder('folder!@#$%^&*()name');
    expect(result).toMatch(/^[a-zA-Z0-9_-]*$/);
    expect(result).toBe('foldername');
  });

  it('devuelve "general" para string vacío', () => {
    const result = sanitizeFolder('');
    expect(result).toBe('general');
  });

  it('devuelve "general" cuando el input es solo caracteres especiales', () => {
    const result = sanitizeFolder('!@#$%^&*()');
    expect(result).toBe('general');
  });

  it('devuelve "general" cuando el input es solo ".."', () => {
    const result = sanitizeFolder('..');
    expect(result).toBe('general');
  });

  it('devuelve "general" cuando el input es solo "/"', () => {
    const result = sanitizeFolder('/');
    expect(result).toBe('general');
  });

  it('preserva guiones en el nombre', () => {
    const result = sanitizeFolder('my-folder');
    expect(result).toBe('my-folder');
  });

  it('preserva guiones bajos en el nombre', () => {
    const result = sanitizeFolder('my_folder');
    expect(result).toBe('my_folder');
  });

  it('maneja path traversal combinado con nombre válido', () => {
    const result = sanitizeFolder('../valid-folder');
    expect(result).not.toContain('..');
    expect(result).toBe('valid-folder');
  });

  it('maneja nombres con letras mayúsculas y minúsculas', () => {
    const result = sanitizeFolder('MyFolder123');
    expect(result).toBe('MyFolder123');
  });
});
