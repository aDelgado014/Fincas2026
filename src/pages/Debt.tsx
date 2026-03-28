import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Mail, Download, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export function Debt() {
  const [debts, setDebts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [debtsRes, commRes] = await Promise.all([
          apiFetch('/api/debts'),
          apiFetch('/api/communities'),
        ]);
        const debtsData = await debtsRes.json();
        setDebts(Array.isArray(debtsData) ? debtsData : []);
        setCommunities(commRes.ok ? await commRes.json() : []);
      } catch (error) {
        toast.error('Error al cargar deudas');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredDebts = debts.filter(d => {
    const matchesSearch = !searchTerm ||
      d.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.communityName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCommunity = selectedCommunity === 'all' || d.communityId === selectedCommunity;
    return matchesSearch && matchesCommunity;
  });

  const handleSendReminder = async (debtId: string) => {
    try {
      const res = await apiFetch(`/api/communications/remind-debt/${debtId}`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success('Recordatorio enviado correctamente');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al enviar recordatorio');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const totalFiltered = filteredDebts.reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Deuda</h2>
          <p className="text-muted-foreground">
            Seguimiento de cuotas pendientes y gestión de cobros.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const res = await apiFetch('/api/export-excel');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'adminfincas_export.xlsx';
              a.click();
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button variant="destructive" onClick={async () => {
            if (filteredDebts.length === 0) { toast.error('No hay deudas para notificar'); return; }
            let ok = 0;
            for (const d of filteredDebts) {
              try {
                const res = await apiFetch(`/api/communications/remind-debt/${d.id}`, { method: 'POST' });
                if (res.ok) ok++;
              } catch {}
            }
            toast.success(`Recordatorios enviados: ${ok}/${filteredDebts.length}`);
          }}>
            <Mail className="mr-2 h-4 w-4" /> Enviar Recordatorios
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              €{debts.reduce((acc, d) => acc + d.amount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Casos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{debts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {selectedCommunity !== 'all' ? 'Deuda Comunidad Seleccionada' : 'Recuperado (Mes)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {selectedCommunity !== 'all'
                ? `€${totalFiltered.toLocaleString()}`
                : '€0'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por propietario o comunidad..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todas las comunidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las comunidades</SelectItem>
              {communities.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando datos...
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron deudas.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comunidad</TableHead>
                  <TableHead>Propietario / Unidad</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.map((debt) => (
                  <TableRow key={debt.id}>
                    <TableCell className="font-medium text-xs">{debt.communityName}</TableCell>
                    <TableCell>
                      <div className="text-sm">{debt.ownerName}</div>
                      <div className="text-xs text-muted-foreground">Unidad: {debt.unitId.slice(0, 4)}</div>
                    </TableCell>
                    <TableCell className="text-sm">{debt.concept}</TableCell>
                    <TableCell className="text-sm">{debt.dueDate}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">
                      €{debt.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={debt.status === 'overdue' ? 'destructive' : 'outline'}>
                        {debt.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSendReminder(debt.id)}
                        title="Enviar recordatorio"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
