import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Users, Clock, AlertCircle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DebtOverview {
  totalDebt: number;
  collectionRate: number;
  delinquentOwners: number;
  debtOver90Days: number;
  topDebtors: TopDebtor[];
  debtByCommunity: DebtByCommunity[];
  agingBuckets: AgingBucket[];
}

interface TopDebtor {
  id: string;
  name: string;
  community: string;
  unit: string;
  totalDebt: number;
}

interface DebtByCommunity {
  name: string;
  debt: number;
}

interface AgingBucket {
  range: string;
  amount: number;
  count: number;
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-8 bg-muted rounded w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

export function Morosidad() {
  const [data, setData] = useState<DebtOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiFetch('/api/debt-analytics/overview');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Error fetching debt analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fmt = (val: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);

  const kpis = data
    ? [
        {
          label: 'Total Deuda',
          value: fmt(data.totalDebt),
          icon: TrendingDown,
          color: 'text-rose-600',
          bg: 'bg-rose-50',
        },
        {
          label: 'Tasa de Cobro',
          value: `${data.collectionRate.toFixed(1)}%`,
          icon: AlertCircle,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        },
        {
          label: 'Propietarios Morosos',
          value: data.delinquentOwners,
          icon: Users,
          color: 'text-orange-600',
          bg: 'bg-orange-50',
        },
        {
          label: 'Deuda >90 días',
          value: fmt(data.debtOver90Days),
          icon: Clock,
          color: 'text-red-700',
          bg: 'bg-red-50',
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Morosidad</h2>
            <p className="text-muted-foreground mt-1">Análisis de deuda y cobros pendientes</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir Reporte
          </Button>
        </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map((kpi) => (
              <Card key={kpi.label} className="border-none shadow-sm">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  </div>
                  <div className={`p-4 rounded-2xl ${kpi.bg} ${kpi.color}`}>
                    <kpi.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top 10 deudores */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Top 10 Deudores</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-8 bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="text-left py-2 font-medium">Nombre</th>
                      <th className="text-left py-2 font-medium">Comunidad</th>
                      <th className="text-left py-2 font-medium">Unidad</th>
                      <th className="text-right py-2 font-medium">Deuda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.topDebtors?.length ? (
                      data.topDebtors.slice(0, 10).map((debtor) => (
                        <tr key={debtor.id} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="py-2 font-medium">{debtor.name}</td>
                          <td className="py-2 text-muted-foreground">{debtor.community}</td>
                          <td className="py-2 text-muted-foreground">{debtor.unit}</td>
                          <td className="py-2 text-right text-rose-600 font-semibold">
                            {fmt(debtor.totalDebt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No hay datos disponibles
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deuda por comunidad */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Deuda por Comunidad</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="animate-pulse h-full bg-muted rounded" />
            ) : data?.debtByCommunity?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.debtByCommunity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="debt" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No hay datos de deuda por comunidad
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Antigüedad de deuda */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Antigüedad de Deuda</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse h-24 bg-muted rounded" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left py-2 font-medium">Período</th>
                    <th className="text-right py-2 font-medium">Importe</th>
                    <th className="text-right py-2 font-medium">N.º Casos</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.agingBuckets?.length ? (
                    data.agingBuckets.map((bucket) => (
                      <tr key={bucket.range} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-2 font-medium">{bucket.range}</td>
                        <td className="py-2 text-right text-rose-600 font-semibold">
                          {fmt(bucket.amount)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">{bucket.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-muted-foreground">
                        No hay datos de antigüedad de deuda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
