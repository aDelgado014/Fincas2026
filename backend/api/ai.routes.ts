import { Router } from 'express';
import { AIService } from '../services/ai.service.ts';

const router = Router();

// POST /api/ai/chat
// Body: { messages: [{role: 'user'|'assistant', content: string}] }
// Response: { content: string, action?: AIAction }
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'Se requiere un array de messages no vacío.' });
    }

    // Sanitizar mensajes: solo role y content
    const sanitized = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20); // Limitar historial a los últimos 20 mensajes

    if (!sanitized.length) {
      return res.status(400).json({ error: 'No se encontraron mensajes válidos.' });
    }

    const result = await AIService.getChatResponse(sanitized);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
