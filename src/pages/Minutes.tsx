import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Wand2, FileText, Download, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface AgendaItem { topic: string; discussion: string; resolution: string; }
interface Attendee { name: string; unit: string; present: boolean; represented?: boolean; }
export function Minutes() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendees, setAttendees] = useState<Attendee[]>([{ name: '', unit: '', present: true }]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([{ topic: '', discussion: '', resolution: '' }]);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/communities').then(res => res.json()).then(data => {
      setCommunities(Array.isArray(data) ? data : []);
    });
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const res = await apiFetch('/api/minutes');
    const data = await res.json();
    setHistory(Array.isArray(data) ? data : []);
  };

  const addAttendee = () => setAttendees([...attendees, { name: '', unit: '', present: true, represented: false }]);
  const addAgendaItem = () => setAgendaItems([...agendaItems, { topic: '', discussion: '', resolution: '' }]);

  useEffect(() => {
    if (selectedCommunity) loadCommunityOwners(selectedCommunity);
  }, [selectedCommunity]);

  const loadCommunityOwners = async (id: string) => {
    try {
      const res = await apiFetch(`/api/communities/${id}/units-full`);
      const data = await res.json();
      setAttendees(data.map((u: any) => ({
        name: u.ownerName || 'Sin propietario',
        unit: (u.floor || '') + (u.door || '') || u.unitCode,
        present: true, represented: false
      })));
    } catch { toast.error('Error al cargar propietarios'); }
  };
  const handleGenerate = async () => {
    if (!selectedCommunity || !meetingDate) { toast.error('Selecciona una comunidad y fecha'); return; }
    try {
      setGenerating(true);
      const communityName = communities.find(c => c.id === selectedCommunity)?.name;
      const res = await apiFetch('/api/minutes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: selectedCommunity, communityName, meetingDate, attendees, agendaItems }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedContent(data.content);
      toast.success('Acta generada con exito');
      loadHistory();
    } catch (error: any) { toast.error(error.message); }
    finally { setGenerating(false); }
  };

  const handleSyncNotion = async (minute: any) => {
    try {
      toast.info('Sincronizando Acta con Notion...');
      const res = await apiFetch(`/api/minutes/${minute.id}/sync-notion`, { method: 'POST' });
      if (res.ok) toast.success('Acta sincronizada con Notion');
      else throw new Error('Error al sincronizar');
    } catch { toast.error('Error de sincronizacion'); }
  };
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion de Actas</h2>
          <p className="text-muted-foreground">Genera actas formales de juntas de propietarios en segundos.</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Configuracion de la Junta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Comunidad</label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={selectedCommunity} onChange={(e) => setSelectedCommunity(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha</label>
                  <Input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Asistencia</CardTitle>
              <Button variant="outline" size="sm" onClick={addAttendee}><Plus className="h-4 w-4 mr-1"/> Anadir</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {attendees.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Nombre" value={a.name} onChange={(e) => { const n=[...attendees]; n[i].name=e.target.value; setAttendees(n); }} />
                  <Input className="w-24" placeholder="Piso" value={a.unit} onChange={(e) => { const n=[...attendees]; n[i].unit=e.target.value; setAttendees(n); }} />
                  <Button variant={a.present && !a.represented ? "default" : "outline"} size="sm" className="w-20"
                    onClick={() => { const n=[...attendees]; n[i].present=true; n[i].represented=false; setAttendees(n); }}>Presente</Button>
                  <Button variant={a.represented ? "default" : "outline"} size="sm" className="w-24"
                    onClick={() => { const n=[...attendees]; n[i].present=true; n[i].represented=true; setAttendees(n); }}>Represent.</Button>
                  <Button variant={!a.present ? "destructive" : "outline"} size="sm" className="w-20"
                    onClick={() => { const n=[...attendees]; n[i].present=false; n[i].represented=false; setAttendees(n); }}>Ausente</Button>
                </div>
              ))}
            </CardContent>
          </Card>          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Orden del Dia y Acuerdos</CardTitle>
              <Button variant="outline" size="sm" onClick={addAgendaItem}><Plus className="h-4 w-4 mr-1"/> Anadir Punto</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {agendaItems.map((item, i) => (
                <div key={i} className="p-3 border rounded-md space-y-2 bg-slate-50">
                  <Input placeholder="Punto del orden del dia" value={item.topic} onChange={(e) => { const n=[...agendaItems]; n[i].topic=e.target.value; setAgendaItems(n); }} className="font-medium" />
                  <Textarea placeholder="Resumen del debate" value={item.discussion} onChange={(e) => { const n=[...agendaItems]; n[i].discussion=e.target.value; setAgendaItems(n); }} />
                  <Textarea placeholder="Acuerdo final" value={item.resolution} onChange={(e) => { const n=[...agendaItems]; n[i].resolution=e.target.value; setAgendaItems(n); }} className="bg-emerald-50" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4 text-blue-600" /> Firma Digital (FNMT)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground pr-4">Envia el acta para firma electronica certificada una vez generada.</p>
                <Button variant="outline" size="sm" disabled className="bg-white">Configurar Firma</Button>
              </div>
            </CardContent>
          </Card>
          <Button className="w-full h-12 text-lg shadow-lg" disabled={generating} onClick={handleGenerate}>
            {generating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
            {generating ? 'Generando...' : 'Generar Acta Profesional'}
          </Button>
        </div>
        <div className="space-y-6">
          <Card className="min-h-[600px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-lg">Acta Generada</CardTitle>
              {generatedContent && (<Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4 mr-1"/> PDF</Button>)}
            </CardHeader>
            <CardContent className="flex-1 p-6">
              {!generatedContent ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-24">
                  <FileText className="h-16 w-16 mb-4" />
                  <p>Configura la junta y pulsa Generar para ver el resultado aqui.</p>
                </div>
              ) : (<div className="whitespace-pre-wrap font-serif text-sm">{generatedContent}</div>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Ultimas Actas</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-md cursor-pointer border" onClick={() => setGeneratedContent(h.content)}>
                    <div className="flex gap-3 items-center">
                      <div className="bg-blue-100 p-2 rounded-full"><FileText className="h-4 w-4 text-blue-600"/></div>
                      <div>
                        <p className="text-sm font-medium">{h.communityName}</p>
                        <p className="text-xs text-muted-foreground">{h.meetingDate}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleSyncNotion(h); }}>
                        <Share2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm"><Download className="h-4 w-4"/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}