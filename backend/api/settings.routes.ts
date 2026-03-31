import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const CONFIG_FILE = path.resolve('./config/api-keys.json');

const ALLOWED_KEYS = [
  'GROQ_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'AI_PROVIDER', // active provider: 'groq' | 'openai' | 'anthropic'
];

function loadConfig(): Record<string, string> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveConfig(config: Record<string, string>) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/** Apply saved config to process.env (call at startup) */
export function applyConfigToEnv() {
  const config = loadConfig();
  for (const [key, value] of Object.entries(config)) {
    if (value && ALLOWED_KEYS.includes(key)) {
      process.env[key] = value;
    }
  }
}

// GET /api/settings/keys — which keys are configured (never returns actual values)
router.get('/keys', (req, res) => {
  const config = loadConfig();
  const status: Record<string, boolean | string> = {};
  for (const key of ALLOWED_KEYS) {
    if (key === 'AI_PROVIDER') {
      status[key] = config[key] || process.env[key] || 'groq';
    } else {
      status[key] = !!(config[key] || process.env[key]);
    }
  }
  res.json(status);
});

// POST /api/settings/keys — set a key value
router.post('/keys', (req, res) => {
  try {
    console.log('[Settings] POST /keys — body:', req.body ? `key=${req.body.key}` : 'NO BODY');
    const { key, value } = req.body || {};
    if (!key || !ALLOWED_KEYS.includes(key)) {
      return res.status(400).json({ error: 'Clave no permitida' });
    }
    if (value === undefined || value === null || String(value).trim() === '') {
      return res.status(400).json({ error: 'El valor no puede estar vacío' });
    }
    const trimmed = String(value).trim();
    const config = loadConfig();
    config[key] = trimmed;
    saveConfig(config);
    // Apply immediately to process.env so it takes effect without restart
    process.env[key] = trimmed;
    console.log(`[Settings] Clave '${key}' guardada en ${CONFIG_FILE} y process.env`);
    res.json({ success: true, key });
  } catch (err: any) {
    console.error('[Settings] Error guardando clave:', err.message);
    res.status(500).json({ error: err.message || 'Error al guardar la configuración' });
  }
});

// DELETE /api/settings/keys/:key — remove a key
router.delete('/keys/:key', (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.includes(key)) {
    return res.status(400).json({ error: 'Clave no permitida' });
  }
  const config = loadConfig();
  delete config[key];
  saveConfig(config);
  res.json({ success: true });
});

export default router;
