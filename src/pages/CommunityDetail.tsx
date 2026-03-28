import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  CreditCard,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  LayoutGrid,
  Save,
} from 'lucide-react';
import { AIAnalysis } from '@/src/components/analytics/AIAnalysis';
import { toast } from 'sonner';

const formatEUR = (value: number | undefined | null) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value ?? 0);

export function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [statement, setStatement] = useState<any[]>([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // monthlyFee editing state: { [unitId]: { value: string, saving: boolean } }
  const [feeEdits, setFeeEdits] = useState<Record<string, { value: string; saving: boolean }>>({});

  const getFeeValue = (unitId: string, defaultFee: number | undefined) => {
    return feeEdits[unitId]?.value ?? String(defaultFee ?? '');
  };

  const handleFeeChange = (unitId: string, value: string) => {
    setFeeEdits((prev) => ({
      ...prev,
      [unitId]: { value, saving: false },
    }));
  };

  const handleFeeSave = async (unitId: string) => {
    const raw = feeEdits[unitId]?.value;
    const parsed = parseFloat(String(raw).replace(',', '.'));
    if (isNaN(parsed)) {
      toast.error('Introduce un importe válido');
      return;
    }
    setFeeEdits((prev) => ({ ...prev, [unitId]: { ...prev[unitId], saving: true } }));
    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyFee: parsed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar la cuota');
      }
      setUnits((prev) =>
        prev.map((u) => (u.id === unitId ? { ...u, monthlyFee: parsed } : u))
      );
      setFeeEdits((prev) => {
        const next = { ...prev };
        delete next[unitId];
        return next;
      });
      toast.success('Cuota mensual actualizada');
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar la cuota');
      setFeeEdits((prev) => ({ ...prev, [unitId]: { ...prev[unitId], saving: false } }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [commRes, unitsRes] = await Promise.all([
          fetch(`/api/communities/${id}`),
          fetch(`/api/communities/${id}/units-full`)
        ]);

        if (!commRes.ok || !unitsRes.ok) {
          throw new Error('No se pudo obtener la información de la comunidad');
        }
        
        const commData = await commRes.json();
        const unitsData = await unitsRes.json();

        setCommunity(commData);
        setUnits(unitsData);
      } catch (error: any) {
        toast.error('Error: ' + (error.message || 'Error desconocido'));
        navigate('/comunidades');
      }
 finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const fetchStatement = async (unitId: string) => {
    try {
      setLoadingStatement(true);
      const res = await fetch(`/api/units/${unitId}/statement`);
      if (!res.ok) throw new Error('Error en la respuesta del servidor');
      const data = await res.json();
      setStatement(data);
      const unit = units.find(u => u.id === unitId);
      setSelectedUnit(unit);
    } catch (error) {
      console.error('Fetch Statement Error:', error);
      toast.error('Error al cargar el extracto');
    } finally {
      setLoadingStatement(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalDebt = units.reduce((acc, u) => acc + (u.pendingDebt || 0), 0);
  const debtorsCount = units.filter(u => (u.pendingDebt || 0) > 0).length;

  return (
    <div className="p-6 space-y-6">
      {selectedUnit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle>Extracto: {selectedUnit.floor}º {selectedUnit.door}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedUnit.ownerName}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedUnit(null)}>Cerrar</Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-4">
              <div className="space-y-4">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left pb-2 font-medium">Fecha</th>
                      <th className="text-left pb-2 font-medium">Concepto</th>
                      <th className="text-right pb-2 font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statement.map((m, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">{new Date(m.date).toLocaleDateString()}</td>
                        <td className="py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded mr-2 ${m.type === 'charge' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                            {m.type === 'charge' ? 'CARGO' : 'PAGO'}
                          </span>
                          {m.concept || 'Pago recibido'}
                        </td>
                        <td className={`py-2 text-right font-medium ${m.type === 'charge' ? 'text-destructive' : 'text-green-600'}`}>
                          {m.type === 'charge' ? '-' : '+'}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(m.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Button variant="ghost" onClick={() => navigate('/comunidades')} className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Comunidades
      </Button>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{community.name}</h2>
          <p className="text-muted-foreground">{community.address}</p>
          <div className="flex gap-4 mt-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium">
              NIF: {community.nif}
            </span>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-medium">
              Código: {community.code}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Viviendas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deuda Pendiente</CardTitle>
            <CreditCard className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalDebt)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{debtorsCount} deudores activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuenta Bancaria</CardTitle>
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono truncate">{community.bankAccountRef || 'No configurada'}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="units" className="w-full">
        <TabsList>
          <TabsTrigger value="units">Unidades y Propietarios</TabsTrigger>
          <TabsTrigger value="tenants">Inquilinos</TabsTrigger>
          <TabsTrigger value="debts">Estado de Cobros</TabsTrigger>
          <TabsTrigger value="ai">Análisis IA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="units" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => (
              <Card key={u.id} className={u.pendingDebt > 0 ? "border-destructive/30" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex justify-between items-center">
                    <span>{u.floor}º {u.door}</span>
                    <span className="text-xs font-normal text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded">
                      {u.type}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{u.ownerName || 'Sin propietario'}</span>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" /> {u.ownerEmail || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" /> {u.ownerPhone || 'N/A'}
                    </div>
                  </div>
                  {u.tenantName && (
                    <div className="p-2 bg-blue-50/50 rounded-md border border-blue-100 mt-2">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Inquilino</p>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-3 w-3 text-blue-500" />
                        <span className="font-semibold text-xs">{u.tenantName}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{u.tenantEmail}</p>
                    </div>
                  )}
                  {u.pendingDebt > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <span className="text-destructive font-bold">
                        Deuda: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(u.pendingDebt)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 border-t mt-2">
                    <p className="text-xs text-muted-foreground mb-1 font-medium">Cuota mensual</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        value={getFeeValue(u.id, u.monthlyFee)}
                        onChange={(e) => handleFeeChange(u.id, e.target.value)}
                        placeholder="0,00"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleFeeSave(u.id)}
                        disabled={feeEdits[u.id]?.saving}
                        title="Guardar cuota mensual"
                      >
                        {feeEdits[u.id]?.saving
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Save className="h-4 w-4" />}
                      </Button>
                    </div>
                    {(u.monthlyFee != null) && !feeEdits[u.id] && (
                      <p className="text-xs text-muted-foreground mt-1">{formatEUR(u.monthlyFee)}</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => fetchStatement(u.id)}
                    disabled={loadingStatement}
                  >
                    {loadingStatement ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Ver Cuenta
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Listado de Inquilinos</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Inquilino</th>
                    <th className="pb-3 font-medium">Unidad</th>
                    <th className="pb-3 font-medium">Contacto</th>
                    <th className="pb-3 font-medium text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {units.filter(u => u.tenantName).map(u => (
                    <tr key={`tenant-${u.id}`} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-4 font-medium">{u.tenantName}</td>
                      <td className="py-4">{u.floor}º {u.door}</td>
                      <td className="py-4">
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span>{u.tenantEmail}</span>
                          <span>{u.tenantPhone}</span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => fetchStatement(u.id)}>
                          Ver Cuenta
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debts" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Listado de Deudores</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Unidad</th>
                    <th className="pb-3 font-medium">Propietario</th>
                    <th className="pb-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {units.filter(u => u.pendingDebt > 0).map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-4">{u.floor}º {u.door}</td>
                      <td className="py-4">{u.ownerName}</td>
                      <td className="py-4 text-right text-destructive font-semibold">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(u.pendingDebt)}
                      </td>
                    </tr>
                  ))}
                  {debtorsCount === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground italic">
                        No hay deudas pendientes en esta comunidad.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="pt-4">
          <AIAnalysis communityId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
