import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Filter, Search, Clock, Loader2, FileDown } from 'lucide-react';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

export function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [reportYear, setReportYear] = useState<string>(String(currentYear));
  const [reportCommunityId, setReportCommunityId] = useState<string>('all');
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetch('/api/communities')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => setCommunities([]));
  }, []);

  const handleGenerateAnnualReport = async () => {
    try {
      setGeneratingReport(true);
      const params = new URLSearchParams({ type: 'annual', year: reportYear });
      if (reportCommunityId !== 'all') {
        params.set('communityId', reportCommunityId);
      }
      const res = await fetch(`/api/export-excel?${params.toString()}`);
      if (!res.ok) throw new Error('Error al generar el informe');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe-anual-${reportYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error generating annual report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    // Simulando logs por ahora ya que la tabla está vacía hasta que haya acciones
    setLogs([
      { id: 1, action: 'LOGIN', entityType: 'USER', timestamp: '2026-03-12 11:30:00', details: 'Admin accedió al sistema' },
      { id: 2, action: 'SEED', entityType: 'DATABASE', timestamp: '2026-03-12 12:05:00', details: 'Generación de 25 comunidades' },
      { id: 3, action: 'IMPORT', entityType: 'DOCUMENT', timestamp: '2026-03-12 12:10:00', details: 'Procesamiento de acta_junta.pdf' },
    ]);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registro de Auditoría</h2>
        <p className="text-muted-foreground">
          Seguimiento de todas las acciones realizadas en la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Informe Anual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Año</label>
              <Select value={reportYear} onValueChange={setReportYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_OPTIONS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Comunidad</label>
              <Select value={reportCommunityId} onValueChange={setReportCommunityId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Todas las comunidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las comunidades</SelectItem>
                  {communities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerateAnnualReport} disabled={generatingReport}>
              {generatingReport
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <FileDown className="mr-2 h-4 w-4" />}
              {generatingReport ? 'Generando...' : 'Generar Informe Anual'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {log.timestamp}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{log.entityType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                      Éxito
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
