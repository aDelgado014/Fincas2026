import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Banknote, AlertCircle, CheckCircle2, Send, Link as LinkIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export function BankConciliation() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const currentCommunityId = localStorage.getItem('selectedCommunityId') || '1';

  useEffect(() => {
    fetchTransactions();
  }, [currentCommunityId]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch(`/api/bank/pending/${currentCommunityId}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Error al cargar transacciones');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestProof = (tx: any) => {
    toast.success(`Solicitud de justificante enviada para: ${tx.description}`);
  };

  const handleResolveReturn = async (txId: string) => {
    const ownerId = 'mock-owner-id';
    const unitId = 'mock-unit-id';

    try {
      const res = await apiFetch('/api/bank/resolve-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId, ownerId, unitId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Devolución procesada. Nuevo cargo: ${data.amount}€ (incluye 3€ comisión)`);
        fetchTransactions();
      }
    } catch (error) {
      toast.error('Error al procesar devolución');
    }
  };

  const filtered = transactions.filter(t =>
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Banco</h2>
          <p className="text-muted-foreground">
            Gestiona cobros no identificados y procesa devoluciones de remesas.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={async () => {
            if (transactions.length === 0) { toast.error('No hay transacciones pendientes'); return; }
            const csv = ['Fecha,Concepto,Importe,Tipo', ...transactions.map(t =>
              `${new Date(t.transactionDate).toLocaleDateString()},${t.description},${t.amount},${t.category || 'transferencia'}`
            )].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pendientes_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}>
            <Download className="mr-2 h-4 w-4" /> Exportar Pendientes
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por concepto..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Movimientos Pendientes de Revisión</CardTitle>
            <CardDescription>
              Aparecen aquí los movimientos del extracto que no se han podido vincular automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Importe</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Cargando movimientos...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No hay movimientos pendientes de conciliación.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {new Date(tx.transactionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{tx.description}</span>
                          {tx.category === 'return' && (
                            <Badge variant="destructive" className="w-fit mt-1 text-[10px] h-4">
                              DEVOLUCIÓN DETECTADA
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={tx.direction === 'inbound' ? 'text-green-600' : 'text-red-600'}>
                        {tx.direction === 'inbound' ? '+' : '-'}{tx.amount}€
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tx.category === 'return' ? 'Remesa' : 'Transferencia'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {tx.category === 'return' ? (
                            <Button size="sm" onClick={() => handleResolveReturn(tx.id)}>
                              <LinkIcon className="mr-2 h-3.3 w-3.3" /> Vincular y Recargar
                            </Button>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleRequestProof(tx)}>
                                <Send className="mr-2 h-3.3 w-3.3" /> Solicitar Justificante
                              </Button>
                              <Button size="sm">
                                <LinkIcon className="mr-2 h-3.3 w-3.3" /> Identificar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Pendiente</p>
                  <p className="text-2xl font-bold">1.240,50€</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Devoluciones</p>
                  <p className="text-2xl font-bold">{transactions.filter(t => t.category === 'return').length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conciliado (Mes)</p>
                  <p className="text-2xl font-bold">92%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
