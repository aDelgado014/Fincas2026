import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Wand2, Printer, Loader2, FileText, AlertTriangle, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

interface AgendaItem { texto: string; }
interface Moroso { propiedad: string; deuda: number; }
interface PresupuestoItem { codigo: string; titulo: string; importe: number; }
interface GastoItem { concepto: string; importe: number; }

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

const DEFAULT_AGENDA: AgendaItem[] = [
  { texto: 'Exposición y aprobación, en su caso, del estado de cuentas del año anterior.' },
  { texto: 'Exposición y aprobación, en su caso, del presupuesto de ingresos y gastos para el año siguiente.' },
  { texto: 'Acuerdos a tomar en relación con la liquidación de la deuda a los comuneros morosos y autorización al administrador para reclamar dichas deudas.' },
  { texto: 'Cambio o renovación de junta directiva.' },
  { texto: 'Información sobre saneamientos comunitarios.' },
  { texto: 'Ruegos y preguntas.' },
];

function getDiaSemana(iso: string) {
  if (!iso) return '';
  return DIAS[new Date(iso + 'T12:00:00').getDay()];
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

const today = new Date().toISOString().split('T')[0];
const thisYear = new Date().getFullYear();

export function PremiumConvocatorias() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [newAgenda, setNewAgenda] = useState('');

  const [form, setForm] = useState({
    communityId: '', tipo: 'Ordinaria' as 'Ordinaria' | 'Extraordinaria',
    ciudad: '', fechaCarta: today, fechaJunta: today,
    horasPrimera: '18:30', horasSegunda: '19:00',
    lugar: 'Portal del edificio', presidenteNombre: '',
    incluirDelegacion: true, incluirMorosos: true,
    incluirPresupuesto: false, incluirEstadoCuentas: false,
  });
  const upd = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(DEFAULT_AGENDA);
  const [morosos, setMorosos] = useState<Moroso[]>([]);
  const [morososFecha, setMorososFecha] = useState(today);
  const [presItems, setPresItems] = useState<PresupuestoItem[]>([]);
  const [presDesde, setPresDesde] = useState(`01/01/${thisYear}`);
  const [presHasta, setPresHasta] = useState(`31/12/${thisYear}`);
  const [gastosItems, setGastosItems] = useState<GastoItem[]>([]);
  const [gastosIngreso, setGastosIngreso] = useState(0);
  const [gastosDesde, setGastosDesde] = useState(`01/01/${thisYear - 1}`);
  const [gastosHasta, setGastosHasta] = useState(`31/12/${thisYear - 1}`);

  // Certificado state
  const [certCommunity, setCertCommunity] = useState('');
  const [certOwner, setCertOwner] = useState('');
  const [certDebt, setCertDebt] = useState<number | null>(null);
  const [certResult, setCertResult] = useState('');
  const [generatingCert, setGeneratingCert] = useState(false);

  useEffect(() => {
    apiFetch('/api/communities').then(r => r.json()).then(d => setCommunities(Array.isArray(d) ? d : []));
    apiFetch('/api/convocatorias').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!certCommunity) { setOwners([]); return; }
    apiFetch(`/api/owners?communityId=${certCommunity}`).then(r => r.json()).then(d => setOwners(Array.isArray(d) ? d : []));
  }, [certCommunity]);

  useEffect(() => {
    if (!certCommunity || !certOwner) { setCertDebt(null); return; }
    apiFetch(`/api/debt?communityId=${certCommunity}&ownerId=${certOwner}`)
      .then(r => r.json()).then(d => setCertDebt(d.total ?? d.amount ?? 0)).catch(() => setCertDebt(null));
  }, [certCommunity, certOwner]);

  useEffect(() => {
    if (!form.communityId) return;
    const comm = communities.find(c => c.id === form.communityId);
    if (comm?.address) {
      const parts = comm.address.split(',');
      upd('ciudad', parts[parts.length - 1]?.trim() || comm.address);
    }
  }, [form.communityId]);

  const addMoroso = () => setMorosos(p => [...p, { propiedad: '', deuda: 0 }]);
  const updMoroso = (i: number, f: keyof Moroso, v: any) =>
    setMorosos(p => p.map((m, idx) => idx === i ? { ...m, [f]: v } : m));
  const removeMoroso = (i: number) => setMorosos(p => p.filter((_, idx) => idx !== i));

  const addPresItem = () => setPresItems(p => [...p, { codigo: '', titulo: '', importe: 0 }]);
  const updPresItem = (i: number, f: keyof PresupuestoItem, v: any) =>
    setPresItems(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x));
  const removePresItem = (i: number) => setPresItems(p => p.filter((_, idx) => idx !== i));

  const addGasto = () => setGastosItems(p => [...p, { concepto: '', importe: 0 }]);
  const updGasto = (i: number, f: keyof GastoItem, v: any) =>
    setGastosItems(p => p.map((x, idx) => idx === i ? { ...x, [f]: v } : x));
  const removeGasto = (i: number) => setGastosItems(p => p.filter((_, idx) => idx !== i));

  const addAgendaItem = () => {
    if (!newAgenda.trim()) return;
    setAgendaItems(p => [...p, { texto: newAgenda.trim() }]);
    setNewAgenda('');
  };

  const handleGenerate = async () => {
    if (!form.communityId || !form.fechaJunta) {
      toast.error('Selecciona comunidad y fecha de junta'); return;
    }
    try {
      setGenerating(true);
      const communityName = communities.find(c => c.id === form.communityId)?.name || '';
      const payload = {
        ...form,
        communityName,
        agendaItems: JSON.stringify(agendaItems),
        morososList: JSON.stringify(morosos),
        morososFecha,
        presupuesto: form.incluirPresupuesto
          ? JSON.stringify({ desde: presDesde, hasta: presHasta, items: presItems }) : null,
        estadoCuentas: form.incluirEstadoCuentas
          ? JSON.stringify({ periodoDesde: gastosDesde, periodoHasta: gastosHasta, ingreso: gastosIngreso, gastos: gastosItems }) : null,
      };
      const res = await apiFetch('/api/convocatorias/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPreview(data.content);
      toast.success('Convocatoria generada');
      apiFetch('/api/convocatorias').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []));
    } catch (e: any) { toast.error(e.message); }
    finally { setGenerating(false); }
  };

  const handleGenerateCert = async () => {
    if (!certCommunity || !certOwner) { toast.error('Selecciona comunidad y propietario'); return; }
    const communityName = communities.find(c => c.id === certCommunity)?.name || certCommunity;
    const ownerName = owners.find(o => o.id === certOwner)?.name || owners.find(o => o.id === certOwner)?.fullName || certOwner;
    const message = `Genera un certificado de deuda oficial. Comunidad: "${communityName}". Propietario: ${ownerName}. Deuda pendiente: ${certDebt !== null ? fmt(certDebt) : 'por calcular'}. Fecha: ${new Date().toLocaleDateString('es-ES')}. Formato oficial con membrete del administrador, en español.`;
    try {
      setGeneratingCert(true);
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setCertResult(data.content || data.response || data.message || '');
      toast.success('Certificado generado');
    } catch { toast.error('Error al generar certificado'); }
    finally { setGeneratingCert(false); }
  };

  const diaSemana = getDiaSemana(form.fechaJunta);

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Juntas — Convocatorias</h2>
          <p className="text-muted-foreground text-sm">Genera convocatorias legales (Art. 16.2 LPH) con todos los documentos adjuntos.</p>
        </div>
      </div>

      <Tabs defaultValue="convocatoria">
        <TabsList>
          <TabsTrigger value="convocatoria">Convocatoria de Junta</TabsTrigger>
          <TabsTrigger value="certificado">Certificado de Deuda</TabsTrigger>
        </TabsList>

        {/* ── TAB: CONVOCATORIA ───────────────────────────────────────── */}
        <TabsContent value="convocatoria">
          <div className="grid gap-6 lg:grid-cols-2 pt-4">

            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <div className="space-y-4">

              {/* Datos de la Junta */}
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Datos de la Junta</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Comunidad</label>
                    <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                      value={form.communityId} onChange={e => upd('communityId', e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    {(['Ordinaria', 'Extraordinaria'] as const).map(t => (
                      <button key={t} onClick={() => upd('tipo', t)}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${form.tipo === t ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}>
                        Junta {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded px-2 py-1">
                    Base legal: Art. 16.2 Ley de Propiedad Horizontal
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Fecha de la carta</label>
                      <Input type="date" value={form.fechaCarta} onChange={e => upd('fechaCarta', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Ciudad</label>
                      <Input placeholder="Las Palmas de G.C." value={form.ciudad} onChange={e => upd('ciudad', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Fecha de la junta</label>
                      <Input type="date" value={form.fechaJunta} onChange={e => upd('fechaJunta', e.target.value)} />
                      {diaSemana && <p className="text-xs text-primary mt-0.5 capitalize font-medium">{diaSemana}</p>}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">1ª convocatoria</label>
                      <Input type="time" value={form.horasPrimera} onChange={e => upd('horasPrimera', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">2ª convocatoria</label>
                      <Input type="time" value={form.horasSegunda} onChange={e => upd('horasSegunda', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Lugar de celebración</label>
                      <Input placeholder="Portal del edificio" value={form.lugar} onChange={e => upd('lugar', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Nombre del Presidente</label>
                      <Input placeholder="Nombre completo" value={form.presidenteNombre} onChange={e => upd('presidenteNombre', e.target.value)} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" checked={form.incluirDelegacion} onChange={e => upd('incluirDelegacion', e.target.checked)} />
                    Incluir talón de delegación de voto
                  </label>
                </CardContent>
              </Card>

              {/* Orden del Día */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Orden del Día</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {agendaItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-6 pt-2.5">{String(i+1).padStart(2,'0')}.</span>
                      <Input className="text-sm flex-1" value={item.texto}
                        onChange={e => setAgendaItems(p => p.map((x, idx) => idx === i ? { ...x, texto: e.target.value } : x))} />
                      <Button variant="ghost" size="sm" className="mt-0.5 h-8 w-8 p-0" onClick={() => setAgendaItems(p => p.filter((_, idx) => idx !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <Input className="text-sm" placeholder="Añadir punto personalizado..." value={newAgenda}
                      onChange={e => setNewAgenda(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAgendaItem()} />
                    <Button size="sm" variant="outline" onClick={addAgendaItem}><Plus className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>

              {/* Documentos Adjuntos */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Documentos Adjuntos</CardTitle></CardHeader>
                <CardContent className="space-y-4">

                  {/* Morosos */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-2 select-none">
                      <input type="checkbox" checked={form.incluirMorosos} onChange={e => upd('incluirMorosos', e.target.checked)} />
                      Listado de propietarios sin derecho a voto (morosos)
                    </label>
                    {form.incluirMorosos && (
                      <div className="pl-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Fecha de corte:</span>
                          <Input type="date" className="h-7 text-xs w-36" value={morososFecha} onChange={e => setMorososFecha(e.target.value)} />
                        </div>
                        {morosos.map((m, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input className="text-xs h-7 flex-1" placeholder="Ej: 2ºderecha" value={m.propiedad} onChange={e => updMoroso(i, 'propiedad', e.target.value)} />
                            <Input className="text-xs h-7 w-28" type="number" placeholder="Deuda €" value={m.deuda || ''} onChange={e => updMoroso(i, 'deuda', parseFloat(e.target.value) || 0)} />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeMoroso(i)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addMoroso}>
                          <Plus className="h-3 w-3 mr-1" />Añadir moroso
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Presupuesto */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-2 select-none">
                      <input type="checkbox" checked={form.incluirPresupuesto} onChange={e => upd('incluirPresupuesto', e.target.checked)} />
                      Presupuesto del ejercicio
                    </label>
                    {form.incluirPresupuesto && (
                      <div className="pl-6 space-y-2">
                        <div className="flex gap-2">
                          <Input className="text-xs h-7" placeholder="Desde: 01/01/2026" value={presDesde} onChange={e => setPresDesde(e.target.value)} />
                          <Input className="text-xs h-7" placeholder="Hasta: 31/12/2026" value={presHasta} onChange={e => setPresHasta(e.target.value)} />
                        </div>
                        {presItems.map((p, i) => (
                          <div key={i} className="flex gap-1 items-center">
                            <Input className="text-xs h-7 w-20" placeholder="Código" value={p.codigo} onChange={e => updPresItem(i, 'codigo', e.target.value)} />
                            <Input className="text-xs h-7 flex-1" placeholder="Título (ej: LIMPIEZA)" value={p.titulo} onChange={e => updPresItem(i, 'titulo', e.target.value)} />
                            <Input className="text-xs h-7 w-24" type="number" placeholder="Importe" value={p.importe || ''} onChange={e => updPresItem(i, 'importe', parseFloat(e.target.value) || 0)} />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removePresItem(i)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addPresItem}><Plus className="h-3 w-3 mr-1" />Añadir partida</Button>
                          {presItems.length > 0 && <span className="text-xs font-semibold">Total: {fmt(presItems.reduce((s, x) => s + x.importe, 0))}</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Estado de Cuentas */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer mb-2 select-none">
                      <input type="checkbox" checked={form.incluirEstadoCuentas} onChange={e => upd('incluirEstadoCuentas', e.target.checked)} />
                      Estado de cuentas (ejercicio anterior)
                    </label>
                    {form.incluirEstadoCuentas && (
                      <div className="pl-6 space-y-2">
                        <div className="flex gap-2">
                          <Input className="text-xs h-7" placeholder="Desde: 01/01/2025" value={gastosDesde} onChange={e => setGastosDesde(e.target.value)} />
                          <Input className="text-xs h-7" placeholder="Hasta: 31/12/2025" value={gastosHasta} onChange={e => setGastosHasta(e.target.value)} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Ingreso anual (€):</span>
                          <Input className="text-xs h-7 w-32" type="number" placeholder="8364.00" value={gastosIngreso || ''} onChange={e => setGastosIngreso(parseFloat(e.target.value) || 0)} />
                        </div>
                        {gastosItems.map((g, i) => (
                          <div key={i} className="flex gap-1 items-center">
                            <Input className="text-xs h-7 flex-1" placeholder="Concepto (ej: LIMPIEZA)" value={g.concepto} onChange={e => updGasto(i, 'concepto', e.target.value)} />
                            <Input className="text-xs h-7 w-24" type="number" placeholder="Importe" value={g.importe || ''} onChange={e => updGasto(i, 'importe', parseFloat(e.target.value) || 0)} />
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeGasto(i)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between">
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addGasto}><Plus className="h-3 w-3 mr-1" />Añadir gasto</Button>
                          {gastosItems.length > 0 && <span className="text-xs font-semibold">Total: {fmt(gastosItems.reduce((s, x) => s + x.importe, 0))}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button className="w-full h-11 text-base" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {generating ? 'Generando convocatoria...' : 'Generar Convocatoria'}
              </Button>
            </div>

            {/* COLUMNA DERECHA: VISTA PREVIA + HISTORIAL */}
            <div className="space-y-4">
              <Card className="flex flex-col" style={{ minHeight: 600 }}>
                <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                  <CardTitle className="text-base">Vista Previa del Documento</CardTitle>
                  {preview && (
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-1" />Imprimir / PDF
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="flex-1 p-4 overflow-hidden">
                  {!preview ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-24">
                      <FileText className="h-16 w-16 mb-4" />
                      <p className="text-sm text-center">Configura la junta y pulsa Generar</p>
                      <p className="text-xs text-center mt-1">El documento seguirá el modelo de convocatoria oficial</p>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed overflow-y-auto" style={{ maxHeight: 560 }}>{preview}</pre>
                  )}
                </CardContent>
              </Card>

              {history.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Historial de Convocatorias</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {history.slice(0, 5).map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-md border hover:bg-muted cursor-pointer text-sm"
                          onClick={() => setPreview(h.content || '')}>
                          <div>
                            <p className="font-medium text-sm">{h.communityName} — Junta {h.tipo}</p>
                            <p className="text-xs text-muted-foreground">{h.fechaJunta} · {h.ciudad}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={e => { e.stopPropagation(); setPreview(h.content || ''); setTimeout(() => window.print(), 100); }}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: CERTIFICADO DE DEUDA ────────────────────────────────── */}
        <TabsContent value="certificado">
          <div className="grid gap-6 lg:grid-cols-2 pt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Datos del Certificado de Deuda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Comunidad</label>
                  <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                    value={certCommunity} onChange={e => { setCertCommunity(e.target.value); setCertOwner(''); }}>
                    <option value="">Seleccionar...</option>
                    {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Propietario</label>
                  <select className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background text-sm"
                    value={certOwner} onChange={e => setCertOwner(e.target.value)} disabled={!certCommunity}>
                    <option value="">Seleccionar propietario...</option>
                    {owners.map(o => <option key={o.id} value={o.id}>{o.name || o.fullName}</option>)}
                  </select>
                </div>
                {certOwner && certDebt !== null && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-md">
                    <p className="text-sm text-rose-700">Deuda calculada:</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">{fmt(certDebt)}</p>
                  </div>
                )}
                <Button className="w-full" onClick={handleGenerateCert} disabled={generatingCert || !certOwner}>
                  {generatingCert ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {generatingCert ? 'Generando...' : 'Generar Certificado'}
                </Button>
              </CardContent>
            </Card>

            <Card className="flex flex-col" style={{ minHeight: 340 }}>
              <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
                <CardTitle className="text-base">Certificado Generado</CardTitle>
                {certResult && (
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-1" />Imprimir
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 p-4">
                {!certResult ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground opacity-40 py-12">
                    <FileText className="h-12 w-12" />
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs overflow-y-auto" style={{ maxHeight: 300 }}>{certResult}</pre>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
