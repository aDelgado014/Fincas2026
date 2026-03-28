import { Router } from 'express';
import { db } from '../db/index.ts';
import { notifications } from '../db/schema.ts';
import { eq, and, gt } from 'drizzle-orm';
import { requireAuth } from '../auth.config.ts';

const router = Router();

const SSE_POLL_INTERVAL_MS = 10 * 1000; // 10 seconds

// GET /api/notifications/stream — SSE endpoint
router.get('/stream', requireAuth, (req: any, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const userId: string = req.user?.id;
  if (!userId) {
    res.write('event: error\ndata: {"error":"No autenticado"}\n\n');
    res.end();
    return;
  }

  // Send initial heartbeat
  res.write(': heartbeat\n\n');

  let lastChecked = new Date().toISOString();

  async function poll() {
    try {
      const newNotifications = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), gt(notifications.createdAt, lastChecked)))
        .execute();

      if (newNotifications.length > 0) {
        lastChecked = new Date().toISOString();
        res.write(`event: notifications\ndata: ${JSON.stringify(newNotifications)}\n\n`);
      } else {
        // Keep connection alive
        res.write(': ping\n\n');
      }
    } catch (error) {
      console.error('[SSE] Error polling notifications:', error);
    }
  }

  const intervalId = setInterval(poll, SSE_POLL_INTERVAL_MS);

  req.on('close', () => {
    clearInterval(intervalId);
  });
});

export default router;
