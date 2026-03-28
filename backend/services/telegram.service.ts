import { db } from '../db/index.ts';
import { telegramBots, telegramSessions } from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AIService } from './ai.service.ts';

const TELEGRAM_API = 'https://api.telegram.org/bot';

// ─── Telegram API helpers ─────────────────────────────────────────────────────

async function telegramCall(token: string, method: string, body: object = {}) {
  const res = await fetch(`${TELEGRAM_API}${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function sendMessage(token: string, chatId: string | number, text: string) {
  return telegramCall(token, 'sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  });
}

async function sendTyping(token: string, chatId: string | number) {
  return telegramCall(token, 'sendChatAction', {
    chat_id: chatId,
    action: 'typing',
  });
}

// ─── Session management ───────────────────────────────────────────────────────

async function getOrCreateSession(botId: string, chatId: string, from: any) {
  const [existing] = await db.select().from(telegramSessions)
    .where(and(eq(telegramSessions.botId, botId), eq(telegramSessions.chatId, chatId)))
    .limit(1);

  if (existing) return existing;

  const session = {
    id: uuidv4(),
    botId,
    chatId,
    username: from?.username || null,
    firstName: from?.first_name || null,
    history: '[]',
  };
  await db.insert(telegramSessions).values(session);
  return session;
}

async function updateHistory(sessionId: string, history: any[]) {
  await db.update(telegramSessions)
    .set({ history: JSON.stringify(history), updatedAt: new Date().toISOString() })
    .where(eq(telegramSessions.id, sessionId));
}

// ─── Main message handler ─────────────────────────────────────────────────────

export async function handleTelegramUpdate(botId: string, token: string, update: any) {
  const message = update.message || update.edited_message;
  if (!message?.text) return;

  const chatId = String(message.chat.id);
  const from = message.from;
  const text = message.text.trim();

  // Handle /start command
  if (text === '/start') {
    await sendMessage(token, chatId,
      `👋 Hola${from?.first_name ? ` *${from.first_name}*` : ''}\\!\n\nSoy *FINCA*, tu asistente de administración de comunidades\\. Puedo ayudarte a:\n\n• Consultar deudas y morosos\n• Gestionar incidencias\n• Enviar comunicaciones\n• Generar documentos e informes\n• Responder dudas legales\n\n¿En qué te puedo ayudar?`
    );
    return;
  }

  // Handle /reset command
  if (text === '/reset') {
    const session = await getOrCreateSession(botId, chatId, from);
    await updateHistory(session.id, []);
    await sendMessage(token, chatId, '🔄 Conversación reiniciada. ¿En qué te puedo ayudar?');
    return;
  }

  // Handle /ayuda command
  if (text === '/ayuda' || text === '/help') {
    await sendMessage(token, chatId,
      `*Comandos disponibles:*\n\n/start \\- Iniciar conversación\n/reset \\- Limpiar historial\n/ayuda \\- Ver esta ayuda\n\n*Ejemplos de lo que puedo hacer:*\n• "¿Cuánto debe la Comunidad Las Flores?"\n• "Lista las incidencias pendientes"\n• "Genera un informe de deudas"\n• "¿Cuántos votos necesito para cambiar los estatutos?"`
    );
    return;
  }

  await sendTyping(token, chatId);

  const session = await getOrCreateSession(botId, chatId, from);
  const history: any[] = JSON.parse(session.history || '[]');

  // Keep last 20 messages for context
  const recentHistory = history.slice(-20);
  recentHistory.push({ role: 'user', content: text });

  try {
    const aiResponse = await AIService.getChatResponse(recentHistory);
    const responseText = aiResponse.content || 'No pude procesar tu consulta.';

    // Handle navigation actions (not applicable in Telegram, just describe)
    let finalText = responseText;
    if (aiResponse.action?.type === 'navigate') {
      finalText += `\n\n📱 _Acción disponible en la app: ${aiResponse.action.label}_`;
    }
    if (aiResponse.action?.type === 'download') {
      finalText += `\n\n📎 _Informe generado: ${aiResponse.action.filename} — disponible en la app_`;
    }

    // Telegram message limit is 4096 chars
    const chunks = splitMessage(finalText, 4000);
    for (const chunk of chunks) {
      await sendMessage(token, chatId, chunk);
    }

    recentHistory.push({ role: 'assistant', content: responseText });
    await updateHistory(session.id, recentHistory);
  } catch (err: any) {
    await sendMessage(token, chatId, '❌ Error al procesar tu consulta. Inténtalo de nuevo.');
    console.error('[Telegram] AI error:', err.message);
  }
}

function splitMessage(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + limit));
    i += limit;
  }
  return chunks;
}

// ─── Bot management ───────────────────────────────────────────────────────────

export async function registerWebhook(token: string, webhookUrl: string) {
  const result = await telegramCall(token, 'setWebhook', {
    url: webhookUrl,
    allowed_updates: ['message', 'edited_message'],
    drop_pending_updates: true,
  });
  return result;
}

export async function deleteWebhook(token: string) {
  return telegramCall(token, 'deleteWebhook', { drop_pending_updates: true });
}

export async function getBotInfo(token: string) {
  return fetch(`${TELEGRAM_API}${token}/getMe`).then(r => r.json());
}

export class TelegramService {
  static async registerBot(userId: string, communityId: string | null, botToken: string, baseUrl: string) {
    // Verify token is valid
    const info = await getBotInfo(botToken);
    if (!info.ok) throw new Error(`Token inválido: ${info.description}`);

    const botId = uuidv4();
    const webhookUrl = `${baseUrl}/api/telegram/webhook/${botId}`;

    // Set webhook
    const webhookResult = await registerWebhook(botToken, webhookUrl);
    if (!webhookResult.ok) throw new Error(`Error configurando webhook: ${webhookResult.description}`);

    // Save to DB
    await db.insert(telegramBots).values({
      id: botId,
      userId,
      communityId: communityId || null,
      botToken,
      botUsername: info.result.username,
      botName: info.result.first_name,
      webhookSet: 1,
      active: 1,
    });

    return {
      botId,
      botUsername: info.result.username,
      botName: info.result.first_name,
      webhookUrl,
    };
  }

  static async listBots(userId: string) {
    return db.select({
      id: telegramBots.id,
      botUsername: telegramBots.botUsername,
      botName: telegramBots.botName,
      communityId: telegramBots.communityId,
      active: telegramBots.active,
      createdAt: telegramBots.createdAt,
    }).from(telegramBots).where(eq(telegramBots.userId, userId));
  }

  static async deleteBot(botId: string, userId: string) {
    const [bot] = await db.select().from(telegramBots)
      .where(and(eq(telegramBots.id, botId), eq(telegramBots.userId, userId)));
    if (!bot) throw new Error('Bot no encontrado');
    await deleteWebhook(bot.botToken);
    await db.delete(telegramBots).where(eq(telegramBots.id, botId));
  }
}
