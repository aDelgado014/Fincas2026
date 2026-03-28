import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { FileText, Wand2, Printer, Loader2, ShieldCheck, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';

const MODEL_TYPES = [
  'Carta de reclamación de deuda',
  'Escrito a administración pública',
  'Requerimiento de pago',
  'Comunicado a propietarios morosos',
  'Recurso ante junta directiva',
];

export function PremiumLegal() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [form, setForm] = useState({
    comunidad: '',
    propietario: '',
    importe: '',
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [uploadedTemplates, setUploadedTemplates] = useState<{name: string, status: 'checking'|'ok'|'error'}[]>([]);

  useEffect(() => {
    fetch('/api/communities')
      .then(res => res.json())
      .then(data => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => setCommunities([]));
  }, []);

  const handleFieldChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (!selectedModel || !form.comunidad || !form.propietario) {
      toast.error('Selecciona un modelo y completa los campos obligatorios');
      return;
    }
    try {
      setGenerating(true);
      const communityName = communities.find(c => c.id === form.comunidad)?.name || form.comunidad;
      const message = `Genera un ${selectedModel} formal con estos datos: comunidad: ${communityName}, propietario: ${form.propietario}, importe: ${form.importe}€, fecha: ${form.fecha}, concepto: ${form.concepto}. Formato profesional en español.`;
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error('Error al generar el documento');
      const data = await res.json();
      setResult(data.content || data.response || data.message || '');
      toast.success('Documento generado correctamente');
    } catch {
      toast.error('Error al generar el documento');
    } finally {
      setGenerating(false);
    }
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const entry = { name: file.name, status: 'checking' as const };
    setUploadedTemplates(prev => [...prev, entry]);
    try {
      const msg = `Analiza esta plantilla de documento legal: "${file.name}". Indica si tiene algún error legal, cláusula incorrecta o falta de requisitos formales según la legislación española de comunidades de propietarios. Responde brevemente.`;
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const aiResponse = data.content || data.response || '';
      const hasIssues = /error|fallo|incorrecto|falta|problema|inválido/i.test(aiResponse);
      setUploadedTemplates(prev => prev.map(t => t.name === file.name ? { ...t, status: hasIssues ? 'error' : 'ok' } : t));
      if (hasIssues) {
        toast.error(`La IA detectó posibles problemas en "${file.name}". Revisa el documento.`);
      } else {
        toast.success(`Plantilla "${file.name}" revisada y aprobada.`);
      }
    } catch {
      setUploadedTemplates(prev => prev.map(t => t.name === file.name ? { ...t, status: 'error' } : t));
      toast.error('Error al revisar la plantilla');
    }
    e.target.value = '';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6 max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Documentos Legales</h2>
        </div>
        <p className="text-muted-foreground">Genera documentos legales profesionales con inteligencia artificial.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-5">
          {/* Model selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipo de Documento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {MODEL_TYPES.map(type => (
                <div
                  key={type}
                  className={`p-3 rounded-md border cursor-pointer transition-all text-sm font-medium ${
                    selectedModel === type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => setSelectedModel(type)}
                >
                  {type}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Form fields */}
          {selectedModel && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Datos del Documento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Comunidad *</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={form.comunidad}
                    onChange={e => handleFieldChange('comunidad', e.target.value)}
                  >
                    <option value="">Seleccionar comunidad...</option>
                    {communities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Propietario *</label>
                  <Input
                    placeholder="Nombre completo del propietario"
                    value={form.propietario}
                    onChange={e => handleFieldChange('propietario', e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Importe (€)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={form.importe}
                      onChange={e => handleFieldChange('importe', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Fecha</label>
                    <Input
                      type="date"
                      value={form.fecha}
                      onChange={e => handleFieldChange('fecha', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Concepto</label>
                  <Input
                    placeholder="Cuotas de comunidad impagadas, etc."
                    value={form.concepto}
                    onChange={e => handleFieldChange('concepto', e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <Wand2 className="mr-2 h-4 w-4" />}
                  {generating ? 'Generando...' : 'Generar Documento'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Firma electrónica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                Firma Electrónica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Token de firma</label>
              <Input
                readOnly
                value=""
                placeholder="Pendiente de integración con proveedor de firma digital"
                className="text-muted-foreground bg-slate-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3 shrink-0" />
                La integración con firma digital estará disponible próximamente.
              </p>
            </CardContent>
          </Card>

          {/* Plantillas personalizadas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" />
                Mis Plantillas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Carga tus propias plantillas. La IA las revisará para detectar posibles fallos legales antes de usarlas.
              </p>
              <label className="flex flex-col items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleTemplateUpload}
                />
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">PDF, DOC o TXT — máx. 5MB</span>
              </label>
              {uploadedTemplates.length > 0 && (
                <div className="space-y-2">
                  {uploadedTemplates.map((t, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded-md border text-xs ${t.status === 'ok' ? 'bg-emerald-50 border-emerald-200' : t.status === 'error' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50'}`}>
                      <span className="truncate font-medium">{t.name}</span>
                      <span className={t.status === 'ok' ? 'text-emerald-600' : t.status === 'error' ? 'text-rose-600' : 'text-slate-400'}>
                        {t.status === 'ok' ? '✓ Revisada' : t.status === 'error' ? '⚠ Revisar' : '…'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Result */}
        <div>
          <Card className="min-h-[500px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-base">Documento Generado</CardTitle>
              {result && (
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimir / PDF
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-4">
              {!result ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-20">
                  <FileText className="h-14 w-14 mb-3" />
                  <p className="text-sm text-center">Selecciona un modelo, completa los datos y pulsa "Generar".</p>
                </div>
              ) : (
                <Textarea
                  value={result}
                  onChange={e => setResult(e.target.value)}
                  className="min-h-[420px] text-sm font-mono resize-none border-0 focus-visible:ring-0 p-0"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
