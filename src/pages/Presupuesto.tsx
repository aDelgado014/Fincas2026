import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank, Plus, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
}

interface BudgetData {
  items: BudgetItem[];
  totalBudgeted: number;
  totalSpent: number;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

function SkeletonRow() {
  return (
    <tr>
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="animate-pulse h-4 bg-muted rounded" />
        </td>
      ))}
    </tr>
  );
}

export function Presupuesto() {
  const [communityId, setCommunityId] = useState('');
  const [year, setYear] = useState(CURRENT_YEAR);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newBudgeted, setNewBudgeted] = useState('');
  const [budgetFile, setBudgetFile] = useState<File | null>(null);

  useEffect(() => {
    if (!communityId) return;
    const fetchBudget = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/budgets?communityId=${encodeURIComponent(communityId)}&year=${year}`);
        if (res.ok) {
          const json = await res.json();
          setBudgetData(json);
        }
      } catch (error) {
        console.error('Error fetching budget:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBudget();
  }, [communityId, year]);

  const fmt = (val: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const getDeviationColor = (budgeted: number, spent: number) => {
    const ratio = spent / budgeted;
    if (ratio > 1) return 'text-rose-600';
    if (ratio > 0.85) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const handleAddItem = async () => {
    if (!newCategory.trim() || !newBudgeted) return;
    const item: BudgetItem = {
      id: Date.now().toString(),
      category: newCategory.trim(),
      budgeted: parseFloat(newBudgeted),
      spent: 0,
    };
    if (budgetFile) {
      try {
        const fd = new FormData();
        fd.append('file', budgetFile);
        fd.append('communityId', communityId);
        fd.append('type', 'budget');
        const uploadRes = await fetch('/api/documents/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) throw new Error('Upload failed');
      } catch {
        toast.warning('La partida se guardó pero no se pudo subir el documento adjunto');
      }
    }
    setBudgetData((prev) => {
      if (!prev) return { items: [item], totalBudgeted: item.budgeted, totalSpent: 0 };
      return {
        items: [...prev.items, item],
        totalBudgeted: prev.totalBudgeted + item.budgeted,
        totalSpent: prev.totalSpent,
      };
    });
    setNewCategory('');
    setNewBudgeted('');
    setBudgetFile(null);
    setShowModal(false);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Presupuestos</h2>
          <p className="text-muted-foreground mt-1">Control de partidas presupuestarias por comunidad</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Selectors */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-6 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <Label htmlFor="community">Comunidad</Label>
            <Input
              id="community"
              placeholder="ID o nombre de comunidad"
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="year">Año</Label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="flex h-9 w-32 items-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {budgetData && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Presupuestado</p>
                <p className="text-2xl font-bold">{fmt(budgetData.totalBudgeted)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 text-blue-600">
                <PiggyBank className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gastado</p>
                <p className="text-2xl font-bold">{fmt(budgetData.totalSpent)}</p>
              </div>
              <div className={`p-4 rounded-2xl ${budgetData.totalSpent > budgetData.totalBudgeted ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <PiggyBank className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Table */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Partidas Presupuestarias</CardTitle>
        </CardHeader>
        <CardContent>
          {!communityId && !loading && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Selecciona una comunidad para ver su presupuesto
            </div>
          )}
          {communityId && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-3 px-4 font-medium">Categoría</th>
                    <th className="text-right py-3 px-4 font-medium">Presupuestado (€)</th>
                    <th className="text-right py-3 px-4 font-medium">Gastado (€)</th>
                    <th className="text-right py-3 px-4 font-medium">Desviación</th>
                    <th className="text-left py-3 px-4 font-medium w-40">Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    : budgetData?.items?.length
                    ? budgetData.items.map((item) => {
                        const deviation = item.spent - item.budgeted;
                        const pct = Math.min((item.spent / item.budgeted) * 100, 100);
                        return (
                          <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="py-3 px-4 font-medium">{item.category}</td>
                            <td className="py-3 px-4 text-right">{fmt(item.budgeted)}</td>
                            <td className="py-3 px-4 text-right">{fmt(item.spent)}</td>
                            <td className={`py-3 px-4 text-right font-semibold ${getDeviationColor(item.budgeted, item.spent)}`}>
                              {deviation >= 0 ? '+' : ''}{fmt(deviation)} ({((deviation / item.budgeted) * 100).toFixed(1)}%)
                            </td>
                            <td className="py-3 px-4">
                              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : !loading && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-muted-foreground">
                            No hay partidas presupuestarias para este período
                          </td>
                        </tr>
                      )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Nuevo Presupuesto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-background rounded-xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Añadir Partida Presupuestaria</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cat">Categoría</Label>
                <Input
                  id="cat"
                  placeholder="Ej: Mantenimiento, Limpieza..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="budg">Importe Presupuestado (€)</Label>
                <Input
                  id="budg"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={newBudgeted}
                  onChange={(e) => setNewBudgeted(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="budgetFile" className="flex items-center gap-1">
                  <Upload className="h-3.5 w-3.5" /> Documento adjunto (opcional)
                </Label>
                <Input
                  id="budgetFile"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setBudgetFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                {budgetFile && (
                  <p className="text-xs text-muted-foreground mt-1">{budgetFile.name}</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleAddItem} disabled={!newCategory.trim() || !newBudgeted}>
                Añadir Partida
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
