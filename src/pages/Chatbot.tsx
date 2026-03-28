import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente inteligente de AdminFincas. ¿En qué puedo ayudarte hoy con la gestión de tus comunidades?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) throw new Error('Error en la comunicación con la IA');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ha ocurrido un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-120px)] flex flex-col max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Asistente IA</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Potenciado por AdminFincas Intelligence
            </p>
          </div>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden border-none shadow-xl bg-white/50 backdrop-blur-md flex flex-col relative">
        <CardContent className="flex-1 p-0 flex flex-col h-full bg-transparent overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
            <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex items-start gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                      m.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      m.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white border border-slate-100 text-slate-600"
                    )}>
                      {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={cn(
                      "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                      m.role === 'user' 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-white border border-slate-50 text-slate-700 rounded-tl-none"
                    )}>
                      {m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                    <Bot className="h-4 w-4 text-slate-400 animate-bounce" />
                  </div>
                  <div className="p-4 bg-white border border-slate-50 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  </div>
                </div>
            )}
          </div>

          <div className="p-4 bg-white/80 border-t border-slate-100 backdrop-blur-sm">
            <div className="flex gap-2 relative">
              <Input
                placeholder="Pregunta sobre normativas, deudas, actas..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="pr-12 bg-white border-slate-200 focus-visible:ring-primary h-12 rounded-xl text-sm shadow-sm"
              />
              <Button 
                size="icon" 
                onClick={handleSend} 
                disabled={!input.trim() || loading}
                className="absolute right-1 top-1 h-10 w-10 rounded-lg shadow-lg hover:shadow-primary/20 transition-all"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-center text-muted-foreground mt-3">
              AdminFincas AI puede cometer errores. Verifica siempre la información legal crítica.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
