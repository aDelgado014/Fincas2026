import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bot, X, Send, Loader2, Sparkles, Download, ExternalLink,
  Minimize2, Maximize2, Mic, MicOff, RotateCcw, Copy, Check, FileDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AIAction =
  | { type: 'download'; filename: string; data: string; mimeType: string }
  | { type: 'navigate'; path: string; label: string };

interface Message {
  role: 'user' | 'assistant';
  content: string;
  action?: AIAction;
  ts: number;
}

// ─── Sugerencias contextuales por sección ────────────────────────────────────

const CONTEXTUAL: Record<string, { label: string; text: string }[]> = {
  '/comunidades':     [{ label: '📊 Estadísticas', text: 'Lista comunidades con estadísticas' }, { label: '💶 Deuda', text: 'Informe Excel de deudas' }, { label: '📄 Circular', text: 'Genera una circular para la primera comunidad' }],
  '/incidencias':     [{ label: '🔧 Abiertas', text: 'Incidencias pendientes o en progreso' }, { label: '➕ Nueva', text: 'Crea una incidencia de prueba' }, { label: '📊 Excel', text: 'Exportar incidencias a Excel' }],
  '/deuda':           [{ label: '💶 Deuda total', text: 'Muestra todas las deudas pendientes' }, { label: '📥 Excel', text: 'Genera informe Excel de deudas' }, { label: '✅ Marcar pagado', text: '¿Cómo marco un cargo como pagado?' }],
  '/actas':           [{ label: '📋 Últimas actas', text: 'Lista las actas recientes' }, { label: '📊 Excel', text: 'Exportar actas a Excel' }],
  '/comunicaciones':  [{ label: '📧 Enviar aviso', text: '¿Cómo envío un aviso a una comunidad?' }, { label: '📄 Circular PDF', text: 'Genera una circular de prueba' }],
  '/conciliacion':    [{ label: '🏦 Pendientes', text: 'Transacciones pendientes de conciliar' }],
  '/':                [{ label: '📊 Comunidades', text: 'Lista todas las comunidades con estadísticas' }, { label: '💶 Deudas', text: 'Informe Excel de deudas pendientes' }, { label: '🔧 Incidencias', text: 'Ver incidencias abiertas' }, { label: '🗂️ Comunidades', text: 'Llévame a Comunidades' }],
};

const DEFAULT_SUGGESTIONS = CONTEXTUAL['/'];

// ─── Utilidades ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'adminfincas_chat';

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(msgs: Message[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-60))); } catch {}
}

function triggerDownload(data: string, filename: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function exportChat(messages: Message[]) {
  const lines = messages.map(m => {
    const time = new Date(m.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const who = m.role === 'user' ? 'Tú' : 'Asistente';
    return `[${time}] ${who}:\n${m.content}\n`;
  }).join('\n---\n\n');
  triggerDownload(btoa(unescape(encodeURIComponent(lines))), `chat_${new Date().toISOString().split('T')[0]}.txt`, 'text/plain;charset=utf-8');
}

// ─── Renderizado de contenido (markdown básico + tablas) ─────────────────────

function renderContent(text: string) {
  const lines = text.split('\n');
  const tableLines = lines.filter(l => l.trim().startsWith('|'));

  // Detectar tabla markdown
  if (tableLines.length >= 2) {
    const headers = tableLines[0].split('|').filter(Boolean).map(c => c.trim());
    const rows = tableLines.slice(2).map(l => l.split('|').filter(Boolean).map(c => c.trim()));
    if (headers.length && rows.length) {
      const nonTable = lines.filter(l => !l.trim().startsWith('|'));
      return (
        <>
          {nonTable.length > 0 && <span>{renderLine(nonTable.join('\n'))}</span>}
          <div className="overflow-x-auto mt-1">
            <table className="text-[10px] border-collapse w-full">
              <thead><tr>{headers.map((h, i) => <th key={i} className="border px-2 py-1 bg-muted font-semibold text-left">{h}</th>)}</tr></thead>
              <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="border px-2 py-1">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </>
      );
    }
  }

  return <>{renderLine(text)}</>;
}

function renderLine(text: string) {
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>
      {line.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={j}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`')) return <code key={j} className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[10px] font-mono">{part.slice(1, -1)}</code>;
        if (part.startsWith('_') && part.endsWith('_')) return <em key={j}>{part.slice(1, -1)}</em>;
        return <span key={j}>{part}</span>;
      })}
      {i < arr.length - 1 && <br />}
    </span>
  ));
}

// ─── Componente ───────────────────────────────────────────────────────────────

const WELCOME: Message = { role: 'assistant', content: '¡Hola! Soy tu asistente de **AdminFincas** 👋\n\nPuedo consultar datos, **generar informes Excel**, crear cargos e incidencias, enviar avisos y **navegar por la app**. ¿En qué te ayudo?', ts: Date.now() };

export function AIAssistant() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const saved = loadHistory();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>(saved.length ? saved : [WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [unread, setUnread] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [typingIdx, setTypingIdx] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Focus on open
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 80); } }, [open]);

  // Persist history
  useEffect(() => { saveHistory(messages); }, [messages]);

  // Cleanup typewriter on unmount
  useEffect(() => () => { if (typeTimerRef.current) clearInterval(typeTimerRef.current); }, []);

  const typewriterAppend = useCallback((fullContent: string, action?: AIAction) => {
    const msg: Message = { role: 'assistant', content: '', action, ts: Date.now() };
    setMessages(prev => { const next = [...prev, msg]; setTypingIdx(next.length - 1); return next; });
    let i = 0;
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    typeTimerRef.current = setInterval(() => {
      i = Math.min(i + 6, fullContent.length);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: fullContent.slice(0, i) };
        return updated;
      });
      if (i >= fullContent.length) {
        clearInterval(typeTimerRef.current!);
        setTypingIdx(null);
        if (!open) setUnread(n => n + 1);
      }
    }, 18);
  }, [open]);

  const sendMessage = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    const userMsg: Message = { role: 'user', content: t, ts: Date.now() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error del servidor'); }
      const data = await res.json();
      setLoading(false);
      typewriterAppend(data.content || 'Sin respuesta.', data.action);
    } catch (err: any) {
      setLoading(false);
      typewriterAppend(`⚠️ ${err.message}`);
    }
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    });
  };

  const resetChat = () => {
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    setMessages([WELCOME]);
    setUnread(0);
    setTypingIdx(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Tu navegador no soporta reconocimiento de voz.'); return; }
    const rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = false;
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.start(); setIsListening(true);
  };

  const suggestions = CONTEXTUAL[pathname] || DEFAULT_SUGGESTIONS;
  const showSuggestions = messages.length === 1 && !loading;
  const windowH = expanded ? 'h-[780px]' : 'h-[640px]';
  const windowW = expanded ? 'w-[540px]' : 'w-[430px]';

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center z-40 hover:scale-110 transition-transform"
          onClick={() => setOpen(true)} title="Abrir asistente IA"
        >
          <Bot className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* Ventana de chat */}
      {open && (
        <div className={cn('fixed bottom-6 right-6 shadow-2xl flex flex-col z-50 bg-background border rounded-xl animate-in slide-in-from-bottom-4 transition-all duration-200', windowW, windowH)}>

          {/* Header */}
          <div className="p-3 border-b bg-primary text-primary-foreground rounded-t-xl flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-bold">Asistente AdminFincas</span>
              {typingIdx !== null && <span className="text-[10px] opacity-70 animate-pulse">escribiendo…</span>}
            </div>
            <div className="flex items-center gap-0.5">
              <button className="p-1.5 rounded hover:bg-primary/20 transition-colors" onClick={() => exportChat(messages)} title="Exportar conversación"><FileDown className="h-3.5 w-3.5" /></button>
              <button className="p-1.5 rounded hover:bg-primary/20 transition-colors" onClick={resetChat} title="Nueva conversación"><RotateCcw className="h-3.5 w-3.5" /></button>
              <button className="p-1.5 rounded hover:bg-primary/20 transition-colors" onClick={() => setExpanded(e => !e)} title={expanded ? 'Reducir' : 'Ampliar'}>{expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}</button>
              <button className="p-1.5 rounded hover:bg-primary/20 transition-colors" onClick={() => setOpen(false)} title="Cerrar"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-1 group', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div className="flex items-start gap-1">
                  {/* Copy button para mensajes del asistente */}
                  {m.role === 'assistant' && (
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-1 rounded hover:bg-muted shrink-0"
                      onClick={() => copyMessage(i, m.content)} title="Copiar"
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  )}
                  <div className={cn('max-w-[90%] p-2.5 rounded-xl text-xs leading-relaxed', m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none')}>
                    {renderContent(m.content)}
                    {/* Timestamp */}
                    <div className={cn('text-[10px] mt-1 opacity-50', m.role === 'user' ? 'text-right' : 'text-left')}>
                      {new Date(m.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Acción: descarga */}
                {m.action?.type === 'download' && (
                  <button
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted transition-colors"
                    onClick={() => triggerDownload((m.action as any).data, (m.action as any).filename, (m.action as any).mimeType)}
                  >
                    <Download className="h-3 w-3 text-green-600" />
                    Descargar {(m.action as any).filename}
                  </button>
                )}

                {/* Acción: navegar */}
                {m.action?.type === 'navigate' && (
                  <button
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted transition-colors"
                    onClick={() => { navigate((m.action as any).path); setOpen(false); }}
                  >
                    <ExternalLink className="h-3 w-3 text-blue-600" />
                    Ir a {(m.action as any).label}
                  </button>
                )}
              </div>
            ))}

            {/* Loader */}
            {loading && (
              <div className="bg-muted self-start p-2.5 rounded-xl text-xs flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-primary" /> Procesando...
              </div>
            )}

            {/* Sugerencias contextuales */}
            {showSuggestions && (
              <div className="flex flex-col gap-1.5 mt-1">
                <p className="text-xs text-muted-foreground font-medium">Acciones rápidas:</p>
                {suggestions.map(s => (
                  <button key={s.text} className="text-left text-xs px-2.5 py-2 rounded-lg border hover:bg-muted transition-colors" onClick={() => sendMessage(s.text)}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t flex gap-1.5 bg-background rounded-b-xl shrink-0">
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe o habla tu consulta..."
              className="flex-1 h-8 px-3 text-xs rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              disabled={loading}
            />
            {/* Micrófono */}
            <button
              className={cn('h-8 w-8 shrink-0 flex items-center justify-center rounded-md border transition-colors', isListening ? 'bg-red-100 border-red-400 text-red-600 animate-pulse' : 'hover:bg-muted')}
              onClick={startVoice} disabled={loading} title="Entrada de voz"
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => sendMessage(input)} disabled={loading || !input.trim()} title="Enviar">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
