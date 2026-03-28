import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, Send, CheckCircle2, Loader2, AlertCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export function Communications() {
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState('email');
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/communities').then(res => res.json()).then(data => {
      setCommunities(Array.isArray(data) ? data : []);
    });
    apiFetch('/api/communications/history').then(res => res.json()).then(data => {
      setHistory(Array.isArray(data) ? data : []);
    });
  }, []);

  // Check if a similar communication was already sent to this community
  const recentDuplicate = history.find(h => {
    if (selectedCommunity !== 'all' && h.communityId && h.communityId !== selectedCommunity) return false;
    return h.subject?.toLowerCase().trim() === subject.toLowerCase().trim() && h.subject.trim() !== '';
  });

  const handleSend = async () => {
    if (channel === 'call') {
      toast.info('Servicio de llamadas próximamente disponible');
      return;
    }

    if (!subject || !body) {
      toast.error('Asunto y mensaje son obligatorios');
      return;
    }

    try {
      setSending(true);
      const res = await apiFetch('/api/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: selectedCommunity === 'all' ? null : selectedCommunity,
          channel,
          subject,
          body
        }),
      });

      if (!res.ok) throw new Error('Error al enviar');

      toast.success(`Comunicación enviada correctamente`);
      setSubject('');
      setBody('');
      // Refrescar historial
      apiFetch('/api/communications/history').then(r => r.json()).then(data => {
        setHistory(Array.isArray(data) ? data : []);
      });
    } catch (error) {
      toast.error('Error al enviar la comunicación');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comunicaciones</h2>
          <p className="text-muted-foreground">
            Envíos masivos y notificaciones a propietarios.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Redactar Mensaje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email (Resend)</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp (Simulado AI)</SelectItem>
                    <SelectItem value="sms">SMS (Simulado AI)</SelectItem>
                    <SelectItem value="call">Llamada IA (próximamente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Comunidad destino</label>
                <div className="flex gap-2">
                  <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Todas las comunidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las comunidades</SelectItem>
                      {communities.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedCommunity !== 'all' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                      onClick={async () => {
                        const res = await apiFetch(`/api/communities/${selectedCommunity}/units-full`);
                        const data = await res.json();
                        const debtors = data.filter((u: any) => u.pendingDebt > 0);
                        if (debtors.length === 0) {
                          toast.info('No hay deudores en esta comunidad');
                          return;
                        }
                        setSubject(`Recordatorio de Deuda Pendiente - ${communities.find(c => c.id === selectedCommunity)?.name}`);
                        setBody(`Estimado propietario,\n\nLe informamos que según nuestros registros dispone de una deuda pendiente de pago. Por favor, regularice su situación a la mayor brevedad posible.\n\nAtentamente,\nLa Administración.`);
                        toast.success(`Cargados ${debtors.length} deudores`);
                      }}
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Deudores
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Asunto</label>
              <Input
                placeholder="Ej: Convocatoria Junta General 2024"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              {recentDuplicate && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  Ya se envió una comunicación con este asunto el{' '}
                  {new Date(recentDuplicate.sentAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje</label>
              <Textarea
                placeholder="Escribe aquí el contenido del mensaje..."
                className="min-h-[200px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <Button className="w-full h-12 shadow-lg" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {sending ? 'Enviando mensajes...' : 'Lanzar Comunicación'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historial Reciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No hay envíos recientes.</p>
              ) : (
                history.slice(0, 5).map((h, i) => (
                  <div key={i} className="p-3 border rounded-md space-y-1 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-semibold truncate">{h.subject}</p>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold">
                        {h.channel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(h.sentAt).toLocaleString('es-ES')}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <p className="text-[10px] text-emerald-600 font-medium">Enviado a {h.recipientCount} propietarios</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estado de Servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Email (Resend)</p>
                    <p className="text-xs text-emerald-600">Activo</p>
                  </div>
                </div>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md opacity-50">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">WhatsApp</p>
                    <p className="text-xs text-amber-600">Configuración requerida</p>
                  </div>
                </div>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md opacity-50">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium">Llamadas IA</p>
                    <p className="text-xs text-amber-600">Configuración requerida</p>
                  </div>
                </div>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {channel === 'call' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>Llamadas IA (preparado):</strong> El sistema está preparado para integrar llamadas automáticas mediante VAPI o Twilio.
          Configura tu proveedor en Configuración → Integraciones para activar este canal.
        </div>
      )}
    </div>
  );
}
