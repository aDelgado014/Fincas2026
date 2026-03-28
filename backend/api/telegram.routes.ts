import { Router } from 'express';
import { db } from '../db/index.ts';
import { telegramBots } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { TelegramService, handleTelegramUpdate } from '../services/telegram.service.ts';
import { operatorAllowed } from './role.middleware.ts';

const router = Router();

// ─── Webhook (público, llamado por Telegram) ──────────────────────────────────
router.post('/webhook/:botId', async (req: any, res: any) => {
  try {
    const { botId } = req.params;
    const update = req.body;

    const [bot] = await db.select().from(telegramBots)
      .where(eq(telegramBots.id, botId)).limit(1);

    if (!bot || !bot.active) return res.sendStatus(200); // Silent ignore

    await handleTelegramUpdate(bot.id, bot.botToken, update);
    res.sendStatus(200);
  } catch (err: any) {
    console.error('[Telegram webhook error]', err.message);
    res.sendStatus(200); // Always 200 to Telegram to avoid retries
  }
});

// ─── Rutas protegidas (gestión de bots por el admin) ─────────────────────────

// Listar bots del usuario
router.get('/bots', operatorAllowed, async (req: any, res: any) => {
  try {
    const bots = await TelegramService.listBots(req.user.id);
    res.json(bots);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar nuevo bot
router.post('/bots', operatorAllowed, async (req: any, res: any) => {
  try {
    const { botToken, communityId } = req.body;
    if (!botToken) return res.status(400).json({ error: 'botToken requerido' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await TelegramService.registerBot(
      req.user.id,
      communityId || null,
      botToken,
      baseUrl
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Eliminar bot
router.delete('/bots/:botId', operatorAllowed, async (req: any, res: any) => {
  try {
    await TelegramService.deleteBot(req.params.botId, req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Toggle activo/inactivo
router.patch('/bots/:botId/toggle', operatorAllowed, async (req: any, res: any) => {
  try {
    const [bot] = await db.select().from(telegramBots)
      .where(eq(telegramBots.id, req.params.botId)).limit(1);
    if (!bot) return res.status(404).json({ error: 'Bot no encontrado' });
    const newActive = bot.active ? 0 : 1;
    await db.update(telegramBots).set({ active: newActive }).where(eq(telegramBots.id, req.params.botId));
    res.json({ success: true, active: newActive });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
