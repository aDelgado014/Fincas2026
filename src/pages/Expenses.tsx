import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Filter, TrendingDown, Calendar, Receipt, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

export function Expenses() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    communityId: '',
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [registerFile, setRegisterFile] = useState<File | null>(null);

  useEffect(() => {
    fetch('/api/communities').then(res => res.json()).then(data => setCommunities(Array.isArray(data) ? data : []));
  }, []);

  const fetchExpenses = async () => {
    if (!selectedCommunity) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const res = await fetch(`/api/expenses/${selectedCommunity}?${params.toString()}`);
      const result = await res.json();
      setData(result);
    } catch (error) {
      toast.error('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCommunity) fetchExpenses();
  }, [selectedCommunity, startDate, endDate]);

  const handleRegisterExpense = async () => {
    if (!registerForm.communityId || !registerForm.description.trim() || !registerForm.amount) {
      toast.error('Comunidad, descripción e importe son obligatorios');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('communityId', registerForm.communityId);
      formData.append('description', registerForm.description);
      formData.append('amount', registerForm.amount);
      formData.append('category', registerForm.category);
      formData.append('date', registerForm.date);
      if (registerFile) formData.append('file', registerFile);
      const res = await fetch('/api/expenses', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Error en el servidor');
      toast.success('Gasto registrado correctamente');
      setShowRegisterModal(false);
      setRegisterForm({ communityId: '', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
      setRegisterFile(null);
    } catch (error) {
      toast.error('Error al registrar el gasto');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Hojas de Gastos</h2>
          <p className="text-slate-500">Control de pagos, facturas y flujo de caja saliente.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="shadow-sm">
            <Download className="h-4 w-4 mr-2" /> Exportar informe
          </Button>
          <Button className="shadow-lg hover:shadow-primary/20" onClick={() => setShowRegisterModal(true)}>
            <Receipt className="h-4 w-4 mr-2" /> Registrar Gasto Manual
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm bg-slate-50/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comunidad</label>
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Seleccionar comunidad..." />
                </SelectTrigger>
                <SelectContent>
                  {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Desde</label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border-slate-200" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hasta</label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border-slate-200" />
            </div>
            <Button variant="secondary" onClick={fetchExpenses} className="bg-white border-slate-200">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Gastos</p>
                    <h3 className="text-2xl font-bold text-slate-900">{data.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</h3>
                  </div>
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <TrendingDown className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {Object.entries(data.summary).map(([cat, amount]: any, i) => (
              <Card key={cat} className="border-none shadow-sm bg-white">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-slate-500">{cat}</p>
                  <h3 className="text-xl font-bold text-slate-800">{amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</h3>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-400 h-full rounded-full" 
                      style={{ width: `${Math.min(100, (amount / data.total) * 100)}%` }} 
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Desglose de Facturas y Pagos</CardTitle>
              <p className="text-xs text-slate-400">{data.expenses.length} transacciones encontradas</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto / Proveedor</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.expenses.map((e: any) => (
                    <TableRow key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="font-medium text-slate-600">
                        {new Date(e.transactionDate).toLocaleDateString('es-ES')}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{e.description}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">{e.id.slice(0, 8)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {e.category || 'Sin categoría'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {Math.abs(e.amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4 text-slate-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {!data && !loading && (
        <Card className="border-dashed border-2 bg-slate-50">
          <CardContent className="p-20 text-center flex flex-col items-center gap-4">
            <Receipt className="h-12 w-12 text-slate-300" />
            <div>
              <p className="text-slate-500 font-medium">Selecciona una comunidad para ver sus hojas de gastos.</p>
              <p className="text-xs text-slate-400 mt-1">Los datos se sincronizan automáticamente con los extractos bancarios cargados.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowRegisterModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-background rounded-xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Registrar Gasto Manual</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Comunidad</label>
                <Select value={registerForm.communityId} onValueChange={val => setRegisterForm(f => ({ ...f, communityId: val }))}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Seleccionar comunidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Descripción</label>
                <Input
                  placeholder="Concepto o proveedor"
                  value={registerForm.description}
                  onChange={e => setRegisterForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Importe (€)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={registerForm.amount}
                  onChange={e => setRegisterForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha</label>
                <Input
                  type="date"
                  value={registerForm.date}
                  onChange={e => setRegisterForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categoría</label>
                <Select value={registerForm.category} onValueChange={val => setRegisterForm(f => ({ ...f, category: val }))}>
                  <SelectTrigger className="bg-white border-slate-200">
                    <SelectValue placeholder="Seleccionar categoría..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="Limpieza">Limpieza</SelectItem>
                    <SelectItem value="Seguros">Seguros</SelectItem>
                    <SelectItem value="Suministros">Suministros</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documento / Imagen (opcional)</label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={e => setRegisterFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                {registerFile && (
                  <p className="text-xs text-slate-500 mt-1">{registerFile.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRegisterModal(false)}>Cancelar</Button>
              <Button
                onClick={handleRegisterExpense}
                disabled={!registerForm.communityId || !registerForm.description.trim() || !registerForm.amount}
              >
                Registrar Gasto
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
