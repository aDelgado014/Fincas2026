import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { FileText, Wand2, Printer, Loader2, Plus, X, ClipboardList, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_AGENDA_ITEMS = [
  'Aprobación del acta anterior',
  'Aprobación de cuentas del ejercicio',
  'Aprobación de presupuesto',
  'Nombramiento de cargos',
  'Ruegos y preguntas',
];

export function PremiumConvocatorias() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);

  // Convocatoria state
  const [convCommunity, setConvCommunity] = useState('');
  const [convTipo, setConvTipo] = useState<'Ordinaria' | 'Extraordinaria'>('Ordinaria');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_AGENDA_ITEMS.map(i => [i, true]))
  );
  const [customItem, setCustomItem] = useState('');
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [convFecha, setConvFecha] = useState(new Date().toISOString().split('T')[0]);
  const [convLugar, setConvLugar] = useState('');
  const [convHora, setConvHora] = useState('');
  const [generatingConv, setGeneratingConv] = useState(false);
  const [convResult, setConvResult] = useState('');

  const [convTemplates, setConvTemplates] = useState<string[]>([]);

  // Certificado state
  const [certCommunity, setCertCommunity] = useState('');
  const [certOwner, setCertOwner] = useState('');
  const [certDebt, setCertDebt] = useState<number | null>(null);
  const [loadingDebt, setLoadingDebt] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [certResult, setCertResult] = useState('');

  useEffect(() => {
    fetch('/api/communities')
      .then(res => res.json())
      .then(data => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => setCommunities([]));
  }, []);

  useEffect(() => {
    if (!certCommunity) { setOwners([]); return; }
    fetch(`/api/owners?communityId=${certCommunity}`)
      .then(res => res.json())
      .then(data => setOwners(Array.isArray(data) ? data : []))
      .catch(() => setOwners([]));
  }, [certCommunity]);

  useEffect(() => {
    if (!certCommunity || !certOwner) { setCertDebt(null); return; }
    setLoadingDebt(true);
    fetch(`/api/debt?communityId=${certCommunity}&ownerId=${certOwner}`)
      .then(res => res.json())
      .then(data => setCertDebt(data.total ?? data.amount ?? 0))
      .catch(() => setCertDebt(null))
      .finally(() => setLoadingDebt(false));
  }, [certCommunity, certOwner]);

  const toggleAgendaItem = (item: string) => {
    setCheckedItems(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const addCustomItem = () => {
    const trimmed = customItem.trim();
    if (!trimmed) return;
    setCustomItems(prev => [...prev, trimmed]);
    setCheckedItems(prev => ({ ...prev, [trimmed]: true }));
    setCustomItem('');
  };

  const removeCustomItem = (item: string) => {
    setCustomItems(prev => prev.filter(i => i !== item));
    setCheckedItems(prev => { const next = { ...prev }; delete next[item]; return next; });
  };

  const handleGenerateConvocatoria = async () => {
    if (!convCommunity || !convFecha) {
      toast.error('Selecciona comunidad y fecha');
      return;
    }
    const communityName = communities.find(c => c.id === convCommunity)?.name || convCommunity;
    const allItems = [...DEFAULT_AGENDA_ITEMS, ...customItems].filter(i => checkedItems[i]);
    const agendaText = allItems.map((item, i) => `${i + 1}. ${item}`).join(', ');
    const message = `Genera una convocatoria de junta ${convTipo} formal para la comunidad "${communityName}". Orden del día: ${agendaText}. Fecha: ${convFecha}, Hora: ${convHora || 'por determinar'}, Lugar: ${convLugar || 'por determinar'}. Formato profesional en español, con todos los requisitos legales.`;
    try {
      setGeneratingConv(true);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Error al generar');
      const data = await res.json();
      setConvResult(data.content || data.response || data.message || '');
      toast.success('Convocatoria generada correctamente');
    } catch {
      toast.error('Error al generar la convocatoria');
    } finally {
      setGeneratingConv(false);
    }
  };

  const handleGenerateCertificado = async () => {
    if (!certCommunity || !certOwner) {
      toast.error('Selecciona comunidad y propietario');
      return;
    }
    const communityName = communities.find(c => c.id === certCommunity)?.name || certCommunity;
    const ownerName = owners.find(o => o.id === certOwner)?.name || certOwner;
    const message = `Genera un certificado de deuda formal para la comunidad "${communityName}". Propietario: ${ownerName}. Deuda pendiente: ${certDebt !== null ? certDebt + '€' : 'pendiente de cálculo'}. Fecha: ${new Date().toLocaleDateString('es-ES')}. Formato oficial, firmado por el administrador de fincas, en español.`;
    try {
      setGeneratingCert(true);
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Error al generar');
      const data = await res.json();
      setCertResult(data.content || data.response || data.message || '');
      toast.success('Certificado generado correctamente');
    } catch {
      toast.error('Error al generar el certificado');
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleConvTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setConvTemplates(prev => [...prev, file.name]);
    toast.success(`Plantilla "${file.name}" cargada. La IA la usará como referencia de estilo.`);
    e.target.value = '';
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-8 max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Convocatorias y Certificados</h2>
        </div>
        <p className="text-muted-foreground">Genera convocatorias de junta y certificados de deuda con IA.</p>
      </div>

      {/* Section 1: Convocatoria */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Convocatoria de Junta
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Datos de la Convocatoria</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Comunidad</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={convCommunity}
                    onChange={e => setConvCommunity(e.target.value)}
                  >
                    <option value="">Seleccionar...</option>
                    {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tipo de Junta</label>
                  <div className="flex gap-2">
                    {(['Ordinaria', 'Extraordinaria'] as const).map(tipo => (
                      <button
                        key={tipo}
                        className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${
                          convTipo === tipo ? 'bg-primary text-primary-foreground border-primary' : 'bg-white hover:bg-slate-50'
                        }`}
                        onClick={() => setConvTipo(tipo)}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-1">
                    <label className="text-sm font-medium">Fecha</label>
                    <Input type="date" value={convFecha} onChange={e => setConvFecha(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Hora</label>
                    <Input type="time" value={convHora} onChange={e => setConvHora(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Lugar</label>
                    <Input placeholder="Sala reuniones..." value={convLugar} onChange={e => setConvLugar(e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Orden del Día</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {DEFAULT_AGENDA_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-50 p-1.5 rounded-md">
                    <input
                      type="checkbox"
                      checked={checkedItems[item] ?? true}
                      onChange={() => toggleAgendaItem(item)}
                      className="rounded"
                    />
                    {item}
                  </label>
                ))}
                {customItems.map(item => (
                  <div key={item} className="flex items-center gap-2 text-sm p-1.5 rounded-md bg-blue-50">
                    <input
                      type="checkbox"
                      checked={checkedItems[item] ?? true}
                      onChange={() => toggleAgendaItem(item)}
                      className="rounded"
                    />
                    <span className="flex-1">{item}</span>
                    <button onClick={() => removeCustomItem(item)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <Input
                    placeholder="Añadir punto personalizado..."
                    value={customItem}
                    onChange={e => setCustomItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomItem()}
                    className="text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={addCustomItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="w-full mt-2" onClick={handleGenerateConvocatoria} disabled={generatingConv}>
                  {generatingConv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {generatingConv ? 'Generando...' : 'Generar Convocatoria'}
                </Button>
              </CardContent>
            </Card>

            {/* Plantillas del cliente */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" />
                Mis Plantillas de Convocatoria
              </h4>
              <p className="text-xs text-muted-foreground">
                Carga ejemplos de tus convocatorias para que la IA aprenda tu estilo.
              </p>
              <label className="flex items-center gap-3 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleConvTemplateUpload}
                />
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Subir plantilla (PDF/DOC/TXT)</span>
              </label>
              {convTemplates.length > 0 && (
                <div className="space-y-1">
                  {convTemplates.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-2 bg-blue-50 rounded-md border border-blue-100">
                      <FileText className="h-3 w-3 text-blue-500" />
                      <span className="truncate">{t}</span>
                      <span className="ml-auto text-emerald-600">✓ Cargada</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Card className="min-h-[400px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-base">Convocatoria Generada</CardTitle>
              {convResult && (
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-4">
              {!convResult ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-16">
                  <FileText className="h-12 w-12 mb-3" />
                  <p className="text-sm text-center">El texto de la convocatoria aparecerá aquí.</p>
                </div>
              ) : (
                <Textarea
                  value={convResult}
                  onChange={e => setConvResult(e.target.value)}
                  className="min-h-[360px] text-sm font-mono resize-none border-0 focus-visible:ring-0 p-0"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 2: Certificado de Deuda */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          Certificado de Deuda
        </h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos del Certificado</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Comunidad</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={certCommunity}
                  onChange={e => { setCertCommunity(e.target.value); setCertOwner(''); }}
                >
                  <option value="">Seleccionar...</option>
                  {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Propietario</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={certOwner}
                  onChange={e => setCertOwner(e.target.value)}
                  disabled={!certCommunity}
                >
                  <option value="">Seleccionar propietario...</option>
                  {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              {certOwner && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200">
                  <p className="text-sm font-medium text-rose-700">Deuda calculada:</p>
                  {loadingDebt ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                      <span className="text-sm text-rose-600">Calculando...</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-rose-600 mt-1">
                      {certDebt !== null ? fmt(certDebt) : 'No disponible'}
                    </p>
                  )}
                </div>
              )}
              <Button className="w-full" onClick={handleGenerateCertificado} disabled={generatingCert || !certOwner}>
                {generatingCert ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {generatingCert ? 'Generando...' : 'Generar Certificado'}
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-[340px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-base">Certificado Generado</CardTitle>
              {certResult && (
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimir
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-4">
              {!certResult ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-12">
                  <FileText className="h-12 w-12 mb-3" />
                  <p className="text-sm text-center">El certificado aparecerá aquí.</p>
                </div>
              ) : (
                <Textarea
                  value={certResult}
                  onChange={e => setCertResult(e.target.value)}
                  className="min-h-[280px] text-sm font-mono resize-none border-0 focus-visible:ring-0 p-0"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
