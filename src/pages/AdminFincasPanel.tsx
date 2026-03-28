import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { motion } from 'framer-motion';
import { Briefcase, Download, Upload, Euro, Users, FileText, Loader2, AlertCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CommunitySummary {
  id: string;
  displayId: string;
  nombre: string;
  units: number;
  adminFeeRate: number;
  adminFeeFixed: number;
  honorariosCalculados: number;
  totalDebt: number;
}

export function AdminFincasPanel() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFees, setEditingFees] = useState<Record<string, { rate: string; fixed: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin-fincas/summary');
      if (!res.ok) throw new Error('Error al cargar datos');
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      toast.error('Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  };

  const handleFeeEdit = (id: string, field: 'rate' | 'fixed', value: string) => {
    setEditingFees(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleFeeSave = async (community: CommunitySummary) => {
    const edits = editingFees[community.id];
    if (!edits) return;
    try {
      setSavingId(community.id);
      const body: Record<string, number> = {};
      if (edits.rate !== undefined) body.adminFeeRate = parseFloat(edits.rate);
      if (edits.fixed !== undefined) body.adminFeeFixed = parseFloat(edits.fixed);
      const res = await fetch(`/api/communities/${community.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar');
      toast.success('Honorarios actualizados');
      setEditingFees(prev => { const next = { ...prev }; delete next[community.id]; return next; });
      fetchSummary();
    } catch {
      toast.error('Error al guardar los honorarios');
    } finally {
      setSavingId(null);
    }
  };

  const handleExportDB = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/admin-fincas/export-db');
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `adminfincas_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Base de datos exportada correctamente');
    } catch {
      toast.error('Error al exportar la base de datos');
    } finally {
      setExporting(false);
    }
  };

  const handleImportDB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin-fincas/import-db', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Error al importar');
      toast.success('Base de datos importada correctamente');
      fetchSummary();
    } catch {
      toast.error('Error al importar la base de datos');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const totalHonorarios = summary.reduce((acc, c) => acc + (c.honorariosCalculados || 0), 0);
  const totalDeuda = summary.reduce((acc, c) => acc + (c.totalDebt || 0), 0);
  const deudoresSorted = [...summary].sort((a, b) => b.totalDebt - a.totalDebt);

  const modelCards = [
    { label: 'Convocatoria', icon: FileText, path: '/premium/convocatorias' },
    { label: 'Circular', icon: FileText, path: '/comunicaciones' },
    { label: 'Acta de Junta', icon: FileText, path: '/actas' },
    { label: 'Certificado de Deuda', icon: FileText, path: '/premium/convocatorias' },
    { label: 'Informe Anual', icon: FileText, path: '/auditoria' },
  ];

  const toggleSection = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando panel del administrador...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-8 bg-slate-50/50 min-h-full"
    >
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Briefcase className="h-7 w-7 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Panel del Administrador
          </h2>
        </div>
        <p className="text-muted-foreground">Gestiona honorarios, deudas y herramientas profesionales de tu cartera.</p>
      </div>

      {/* Section 1: Honorarios */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="h-5 w-5 text-emerald-600" />
            Honorarios por Comunidad
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => toggleSection('honorarios')}>
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed['honorarios'] ? '-rotate-90' : ''}`} />
          </Button>
        </CardHeader>
        {!collapsed['honorarios'] && (<CardContent>
          {summary.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground opacity-50">
              <AlertCircle className="h-10 w-10 mb-2" />
              <p>No hay comunidades registradas.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Comunidad</TableHead>
                  <TableHead className="text-right">N.° Unidades</TableHead>
                  <TableHead className="text-right">Tarifa (%)</TableHead>
                  <TableHead className="text-right">Cuota Fija (€)</TableHead>
                  <TableHead className="text-right">Honorarios (€)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map(c => {
                  const edit = editingFees[c.id];
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs text-muted-foreground">{c.displayId}</TableCell>
                      <TableCell className="font-medium">{c.nombre}</TableCell>
                      <TableCell className="text-right">{c.units}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-20 h-8 text-right text-sm"
                          value={edit?.rate ?? c.adminFeeRate ?? ''}
                          onChange={e => handleFeeEdit(c.id, 'rate', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="w-24 h-8 text-right text-sm"
                          value={edit?.fixed ?? c.adminFeeFixed ?? ''}
                          onChange={e => handleFeeEdit(c.id, 'fixed', e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">
                        {fmt(c.honorariosCalculados || 0)}
                      </TableCell>
                      <TableCell>
                        {edit && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={savingId === c.id}
                            onClick={() => handleFeeSave(c)}
                          >
                            {savingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell colSpan={5} className="text-right">Total honorarios:</TableCell>
                  <TableCell className="text-right text-emerald-700">{fmt(totalHonorarios)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
        )}
      </Card>

      {/* Section 2: Deudores por Comunidad */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-500" />
            Deudores por Comunidad
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => toggleSection('deudores')}>
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed['deudores'] ? '-rotate-90' : ''}`} />
          </Button>
        </CardHeader>
        {!collapsed['deudores'] && (<CardContent>
          {deudoresSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos de deuda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comunidad</TableHead>
                  <TableHead className="text-right">Total Deuda</TableHead>
                  <TableHead className="text-right">N.° Unidades</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deudoresSorted.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nombre}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.totalDebt > 0 ? 'destructive' : 'secondary'}>
                        {fmt(c.totalDebt || 0)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{c.units}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold">
                  <TableCell>Total:</TableCell>
                  <TableCell className="text-right text-rose-600">{fmt(totalDeuda)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
        )}
      </Card>

      {/* Section 3: Modelos y Plantillas */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Modelos y Plantillas
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => toggleSection('modelos')}>
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed['modelos'] ? '-rotate-90' : ''}`} />
          </Button>
        </CardHeader>
        {!collapsed['modelos'] && (<CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {modelCards.map((m) => (
              <motion.div
                key={m.label}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-all border hover:border-primary/30 bg-white"
                  onClick={() => navigate(m.path)}
                >
                  <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
                    <div className="bg-blue-50 p-3 rounded-xl">
                      <m.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium leading-tight">{m.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </CardContent>
        )}
      </Card>

      {/* Section 4: Exportar / Importar */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-slate-600" />
            Exportar / Importar Base de Datos
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => toggleSection('exportar')}>
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed['exportar'] ? '-rotate-90' : ''}`} />
          </Button>
        </CardHeader>
        {!collapsed['exportar'] && (<CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Button
              onClick={handleExportDB}
              disabled={exporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar BD
            </Button>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportDB}
                  disabled={importing}
                />
                <Button
                  asChild
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={importing}
                >
                  <span>
                    {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Importar BD
                  </span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground">Solo archivos .json exportados previamente</p>
            </div>
          </div>
        </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
