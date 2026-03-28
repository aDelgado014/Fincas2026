import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Upload, CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp, Loader2, X, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types (mirrors backend) ───────────────────────────────────────────────
type DocumentType = 'cif' | 'coeficientes' | 'propietarios' | 'deuda' | 'derramas' | 'movimientos' | 'unknown';

interface OnboardingFile {
  id: string;
  file: File;
  type: DocumentType;
  status: 'ready' | 'error';
}

interface ExtractedData {
  cif?: { nif: string; name: string; address: string };
  units: Array<{ type: string; coefficient: number; monthlyFee: number }>;
  owners: Array<{ code: string; name: string; email?: string; phone?: string; unitType: string }>;
  debt: Array<{ unitCode: string; ownerName: string; amount: number }>;
  derramas: Array<{ name: string; startDate: string; endDate: string; amounts: Record<string, number> }>;
  transactions: Array<{ date: string; concept: string; amount: number; direction: string }>;
  alerts: Array<{ severity: 'error' | 'warning' | 'info'; field: string; message: string }>;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const DOC_LABELS: Record<DocumentType, string> = {
  cif: 'CIF / Identif. Fiscal',
  coeficientes: 'Coeficientes y Cuotas',
  propietarios: 'Propietarios',
  deuda: 'Deuda Pendiente',
  derramas: 'Derramas',
  movimientos: 'Movimientos Bancarios',
  unknown: 'Sin clasificar',
};

const DOC_COLORS: Record<DocumentType, string> = {
  cif: 'bg-blue-100 text-blue-700',
  coeficientes: 'bg-purple-100 text-purple-700',
  propietarios: 'bg-green-100 text-green-700',
  deuda: 'bg-red-100 text-red-700',
  derramas: 'bg-orange-100 text-orange-700',
  movimientos: 'bg-teal-100 text-teal-700',
  unknown: 'bg-gray-100 text-gray-600',
};

function guessType(filename: string): DocumentType {
  const n = filename.toLowerCase();
  if (n.includes('cif')) return 'cif';
  if (n.includes('coeficiente') || n.includes('cuota')) return 'coeficientes';
  if (n.includes('propietario') || n.includes('contacto')) return 'propietarios';
  if (n.includes('deuda') || n.includes('recibo')) return 'deuda';
  if (n.includes('derrama')) return 'derramas';
  if (n.includes('movimiento') || n.includes('cuenta') || n.match(/\.xlsx?$/i)) return 'movimientos';
  return 'unknown';
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

// ─── Step indicator ────────────────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const steps = ['Subir', 'Extraer', 'Revisar', 'Confirmar'];
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold',
              done ? 'bg-primary text-white' : active ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'
            )}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={cn('text-sm', active ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{label}</span>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Alert badge ───────────────────────────────────────────────────────────
function AlertBadge({ alerts }: { alerts: ExtractedData['alerts'] }) {
  const errors = alerts.filter(a => a.severity === 'error').length;
  const warnings = alerts.filter(a => a.severity === 'warning').length;
  if (!errors && !warnings) return null;
  return (
    <div className="flex gap-2">
      {errors > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">{errors} error{errors > 1 ? 'es' : ''}</span>}
      {warnings > 0 && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{warnings} aviso{warnings > 1 ? 's' : ''}</span>}
    </div>
  );
}

// ─── Collapsible section ───────────────────────────────────────────────────
function Section({ title, count, children, defaultOpen = false }: { title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left">
        <span className="font-medium text-sm">{title}{count !== undefined && <span className="ml-2 text-muted-foreground">({count})</span>}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export function CommunityOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [files, setFiles] = useState<OnboardingFile[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editData, setEditData] = useState<ExtractedData | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File drop / add ──────────────────────────────────────────────────
  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const toAdd: OnboardingFile[] = Array.from(newFiles).map(f => ({
      id: crypto.randomUUID(),
      file: f,
      type: guessType(f.name),
      status: 'ready',
    }));
    setFiles(prev => [...prev, ...toAdd]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const changeType = (id: string, type: DocumentType) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, type } : f));
  };

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id));

  // ── Step 2: Extract ──────────────────────────────────────────────────
  const handleExtract = async () => {
    if (!files.length) return;
    setExtracting(true);
    setStep(2);

    try {
      const form = new FormData();
      const typeHints: Record<string, string> = {};
      for (const f of files) {
        form.append('files', f.file, f.file.name);
        typeHints[f.file.name] = f.type;
      }
      form.append('typeHints', JSON.stringify(typeHints));

      const token = localStorage.getItem('token');
      const res = await fetch('/api/community-onboarding/extract', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error extrayendo datos');
      }

      const data: ExtractedData = await res.json();
      setExtractedData(data);
      setEditData(JSON.parse(JSON.stringify(data))); // deep copy for editing
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Error extrayendo datos');
      setStep(1);
    } finally {
      setExtracting(false);
    }
  };

  // ── Step 4: Commit ───────────────────────────────────────────────────
  const handleCommit = async () => {
    if (!editData) return;
    setCommitting(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/community-onboarding/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(editData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error creando comunidad');
      }

      const result = await res.json();
      setCommunityId(result.communityId);
      setStep(4);
      toast.success(`Comunidad creada con ${result.unidades} unidades y ${result.propietarios} propietarios`);
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la comunidad');
    } finally {
      setCommitting(false);
    }
  };

  const hasErrors = (editData?.alerts || []).some(a => a.severity === 'error');

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Alta de Comunidad</h1>
          <p className="text-muted-foreground text-sm">Sube los documentos y la IA extraerá todos los datos automáticamente</p>
        </div>
      </div>

      <Steps current={step} />

      {/* ── STEP 1: Upload ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
              dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'
            )}
          >
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Arrastra los documentos aquí</p>
            <p className="text-sm text-muted-foreground mt-1">PDF, imágenes (JPG/PNG) o Excel (.xls/.xlsx) — sin límite de archivos</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx"
              onChange={e => e.target.files && addFiles(e.target.files)} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{files.length} archivo{files.length > 1 ? 's' : ''} seleccionado{files.length > 1 ? 's' : ''}</p>
              {files.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                  {f.file.name.match(/\.xlsx?$/i)
                    ? <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                    : <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                  <span className="text-sm flex-1 truncate">{f.file.name}</span>
                  <select
                    value={f.type}
                    onChange={e => changeType(f.id, e.target.value as DocumentType)}
                    className="text-xs border rounded px-2 py-1 bg-background"
                  >
                    {Object.entries(DOC_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', DOC_COLORS[f.type])}>
                    {DOC_LABELS[f.type]}
                  </span>
                  <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={files.length === 0}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Extraer datos →
          </button>
        </div>
      )}

      {/* ── STEP 2: Extracting ── */}
      {step === 2 && (
        <div className="flex flex-col items-center gap-6 py-16">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-semibold text-lg">Analizando documentos con IA...</p>
            <p className="text-sm text-muted-foreground mt-1">Extrayendo propietarios, cuotas, deuda y movimientos</p>
          </div>
          <div className="w-64 bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-full bg-primary animate-[progress_2s_ease-in-out_infinite]" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* ── STEP 3: Review ── */}
      {step === 3 && editData && (
        <div className="space-y-4">
          {/* Alert panel */}
          {editData.alerts.length > 0 && (
            <div className="space-y-2">
              {editData.alerts.map((a, i) => (
                <div key={i} className={cn('flex items-start gap-2 rounded-lg px-3 py-2 text-sm',
                  a.severity === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                  a.severity === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                  'bg-blue-50 text-blue-800 border border-blue-200')}>
                  {a.severity === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> :
                   a.severity === 'warning' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> :
                   <Info className="w-4 h-4 mt-0.5 shrink-0" />}
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Community */}
          <Section title="Comunidad" defaultOpen={true}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(['nif', 'name', 'address'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs text-muted-foreground capitalize">{field === 'nif' ? 'NIF' : field === 'name' ? 'Nombre' : 'Dirección'}</label>
                  <input
                    className="mt-1 w-full text-sm border rounded px-2 py-1.5 bg-background"
                    value={editData.cif?.[field] || ''}
                    onChange={e => setEditData(d => d ? { ...d, cif: { ...d.cif!, [field]: e.target.value } } : d)}
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Units */}
          <Section title="Unidades" count={editData.units.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground text-xs border-b">
                  <th className="text-left py-1 pr-3">Tipo</th>
                  <th className="text-right py-1 pr-3">Coeficiente %</th>
                  <th className="text-right py-1">Cuota €/mes</th>
                </tr></thead>
                <tbody>
                  {editData.units.map((u, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{u.type}</td>
                      <td className="py-1.5 pr-3 text-right">{u.coefficient.toFixed(2)}%</td>
                      <td className="py-1.5 text-right">{formatEur(u.monthlyFee)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Owners */}
          <Section title="Propietarios" count={editData.owners.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted-foreground text-xs border-b">
                  <th className="text-left py-1 pr-3">Nombre</th>
                  <th className="text-left py-1 pr-3">Email</th>
                  <th className="text-left py-1 pr-3">Teléfono</th>
                  <th className="text-left py-1">Unidad asignada</th>
                </tr></thead>
                <tbody>
                  {editData.owners.map((o, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{o.name}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{o.email || '—'}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{o.phone || '—'}</td>
                      <td className="py-1.5">
                        <select
                          className="text-xs border rounded px-1.5 py-1 bg-background w-36"
                          value={o.unitType}
                          onChange={e => setEditData(d => d ? { ...d, owners: d.owners.map((ow, j) => j === i ? { ...ow, unitType: e.target.value } : ow) } : d)}
                        >
                          <option value="">Sin asignar</option>
                          {editData.units.map(u => <option key={u.type} value={u.type}>{u.type}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Debt */}
          {editData.debt.length > 0 && (
            <Section title="Deuda inicial" count={editData.debt.length}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-muted-foreground text-xs border-b">
                    <th className="text-left py-1 pr-3">Propietario</th>
                    <th className="text-left py-1 pr-3">Unidad</th>
                    <th className="text-right py-1">Importe</th>
                  </tr></thead>
                  <tbody>
                    {editData.debt.map((c, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 pr-3">{c.ownerName}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{c.unitCode}</td>
                        <td className={cn('py-1.5 text-right font-medium', c.amount < 0 ? 'text-red-600' : '')}>{formatEur(c.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-semibold">
                      <td colSpan={2} className="py-1.5 pr-3">Total</td>
                      <td className="py-1.5 text-right">{formatEur(editData.debt.reduce((s, c) => s + c.amount, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Derramas */}
          {editData.derramas.length > 0 && (
            <Section title="Derramas" count={editData.derramas.length}>
              <div className="space-y-3">
                {editData.derramas.map((d, i) => (
                  <div key={i} className="border rounded-lg p-3 bg-muted/20">
                    <p className="font-semibold text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.startDate} → {d.endDate}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(d.amounts).map(([k, v]) => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded bg-background border">{k}: {formatEur(Number(v))}/mes</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Transactions */}
          {editData.transactions.length > 0 && (
            <Section title="Movimientos bancarios" count={editData.transactions.length}>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background"><tr className="text-muted-foreground text-xs border-b">
                    <th className="text-left py-1 pr-3">Fecha</th>
                    <th className="text-left py-1 pr-3">Concepto</th>
                    <th className="text-right py-1">Importe</th>
                  </tr></thead>
                  <tbody>
                    {editData.transactions.slice(0, 50).map((t, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-3 whitespace-nowrap">{t.date}</td>
                        <td className="py-1 pr-3 max-w-xs truncate">{t.concept}</td>
                        <td className={cn('py-1 text-right', t.direction === 'outbound' ? 'text-red-600' : 'text-green-600')}>
                          {t.direction === 'outbound' ? '-' : '+'}{formatEur(t.amount)}
                        </td>
                      </tr>
                    ))}
                    {editData.transactions.length > 50 && (
                      <tr><td colSpan={3} className="py-2 text-center text-xs text-muted-foreground">... y {editData.transactions.length - 50} más</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border text-sm hover:bg-muted transition-colors">
              ← Volver
            </button>
            <button
              onClick={handleCommit}
              disabled={hasErrors || committing}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {committing && <Loader2 className="w-4 h-4 animate-spin" />}
              {hasErrors ? 'Corrige los errores antes de continuar' : 'Crear comunidad →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step === 4 && editData && (
        <div className="text-center py-12 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">¡Comunidad creada!</h2>
          <p className="text-muted-foreground">
            <strong>{editData.cif?.name || 'Comunidad'}</strong> está lista con {editData.units.length} unidades, {editData.owners.length} propietarios
            {editData.debt.length > 0 && ` y ${formatEur(editData.debt.reduce((s, c) => s + c.amount, 0))} de deuda inicial`}.
          </p>
          {(editData.alerts || []).filter(a => a.severity !== 'info').length > 0 && (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 inline-block">
              ⚠️ {(editData.alerts).filter(a => a.severity !== 'info').length} aviso(s) registrados en notificaciones
            </p>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button onClick={() => navigate(`/comunidades/${communityId}`)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Ver comunidad →
            </button>
            <button onClick={() => { setStep(1); setFiles([]); setExtractedData(null); setEditData(null); setCommunityId(null); }} className="px-4 py-2.5 rounded-lg border text-sm hover:bg-muted transition-colors">
              Dar de alta otra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
