import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, Banknote, CheckCircle2, AlertCircle, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface MatchRow {
  id: number;
  date: string;
  desc: string;
  amount: number;
  confidence: number;
  suggestedOwner: string;
  unit: string;
  status: 'match' | 'warning';
  manualCommunityId?: string;
  manualUnit?: string;
  manualOwner?: string;
}

export function Reconciliation() {
  const [processing, setProcessing] = useState(false);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [uploadedTransactions, setUploadedTransactions] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/communities').then(r => r.json()).then(setCommunities).catch(() => {});
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const formData = new FormData();
    formData.append('file', file);

    try {
      setProcessing(true);
      const res = await fetch('/api/import/parse-xls', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Error al parsear el archivo');

      const { data } = await res.json();
      setUploadedTransactions(data);
      toast.success(`Archivo ${file.name} cargado con ${data.length} movimientos`);
    } catch (error) {
      toast.error('Error al cargar el archivo');
      setFileName(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (uploadedTransactions.length === 0) {
      toast.error('Primero debes subir un archivo de extracto');
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: uploadedTransactions }),
      });

      if (!res.ok) throw new Error('Error en el servidor');

      const data = await res.json();
      setMatches(data.map((m: any, idx: number) => ({
        id: idx,
        date: m.date,
        desc: m.description,
        amount: m.amount,
        confidence: m.confidence,
        suggestedOwner: m.suggestedOwnerName || 'No identificado',
        unit: m.unit || '?',
        status: m.confidence > 50 ? 'match' : 'warning',
      })));

      toast.success('Conciliación completada con datos de la DB');
    } catch (error) {
      toast.error('Error al procesar la conciliación');
    } finally {
      setProcessing(false);
    }
  };

  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  const updateManualField = (id: number, field: keyof MatchRow, value: string) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSaveManual = async (m: MatchRow) => {
    if (!m.manualCommunityId) {
      toast.error('Selecciona una comunidad antes de guardar');
      return;
    }
    setSavingIds(prev => new Set(prev).add(m.id));
    try {
      const res = await fetch('/api/reconcile/manual-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: m.date,
          description: m.desc,
          amount: m.amount,
          communityId: m.manualCommunityId,
          unit: m.manualUnit || '',
          ownerName: m.manualOwner || '',
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setMatches(prev => prev.map(row =>
        row.id === m.id ? { ...row, status: 'match', suggestedOwner: m.manualOwner || 'Asignado', unit: m.manualUnit || '?' } : row
      ));
      toast.success('Movimiento asignado correctamente');
    } catch {
      toast.error('Error al guardar la asignación manual');
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(m.id); return s; });
    }
  };

  const warningCount = matches.filter(m => m.status === 'warning').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conciliación Bancaria</h2>
          <p className="text-muted-foreground">
            Sincroniza movimientos bancarios con cuotas pendientes usando IA.
          </p>
        </div>
        <Button onClick={handleProcess} disabled={processing || uploadedTransactions.length === 0}>
          {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Procesar
        </Button>
      </div>

      {/* Aviso de movimientos sin clasificar */}
      {warningCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {warningCount} movimiento{warningCount > 1 ? 's' : ''} sin clasificar automáticamente
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Asigna manualmente la comunidad, unidad y propietario para estos movimientos usando los campos en la tabla.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cargar Extracto</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors block">
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileChange} disabled={processing} />
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {fileName || 'Sube el XLS/CSV del banco'}
              </p>
            </label>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Sugerencias de Matching</CardTitle>
            <CardDescription>IA de Groq ha analizado los descriptores bancarios.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground italic">
                Sube un archivo y pulsa "Procesar" para ver las sugerencias.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Movimiento</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Sugerencia / Asignación manual</TableHead>
                    <TableHead>Confianza</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((m) => (
                    <TableRow key={m.id} className={m.status === 'warning' ? 'bg-amber-50/50' : ''}>
                      <TableCell className="text-xs">{m.date}</TableCell>
                      <TableCell className="text-xs font-mono max-w-[160px] truncate">{m.desc}</TableCell>
                      <TableCell className="font-semibold">€{m.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        {m.status === 'match' ? (
                          <div>
                            <div className="text-sm font-medium text-primary">{m.suggestedOwner}</div>
                            <div className="text-xs text-muted-foreground">Unidad: {m.unit}</div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 min-w-[200px]">
                            <Select
                              value={m.manualCommunityId || ''}
                              onValueChange={(v) => updateManualField(m.id, 'manualCommunityId', v)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Comunidad..." />
                              </SelectTrigger>
                              <SelectContent>
                                {communities.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              className="h-7 text-xs"
                              placeholder="Piso / unidad..."
                              value={m.manualUnit || ''}
                              onChange={(e) => updateManualField(m.id, 'manualUnit', e.target.value)}
                            />
                            <Input
                              className="h-7 text-xs"
                              placeholder="Nombre propietario..."
                              value={m.manualOwner || ''}
                              onChange={(e) => updateManualField(m.id, 'manualOwner', e.target.value)}
                            />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={m.confidence > 90 ? 'outline' : m.confidence > 50 ? 'secondary' : 'destructive'}
                          className={m.confidence > 90 ? 'text-emerald-600 border-emerald-200' : ''}
                        >
                          {m.confidence > 50
                            ? `${m.confidence}%`
                            : <span className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Sin clasificar</span>
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.status === 'warning' ? (
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 px-3"
                            onClick={() => handleSaveManual(m)}
                            disabled={savingIds.has(m.id)}
                          >
                            {savingIds.has(m.id)
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : 'Guardar'
                            }
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost">Confirmar</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
