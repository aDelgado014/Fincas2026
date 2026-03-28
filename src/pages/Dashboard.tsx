import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card';
import {
  Building2, Users, CircleAlert, TrendingUp, ArrowUpRight,
  FileText, BarChart as BarChartIcon, Banknote, Sparkles,
  CreditCard, Loader2, Upload, AlertCircle, Send
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { TaskBoard } from '@/src/components/TaskBoard';
import { ShortcutCard } from '@/src/components/ShortcutCard';
import { IncidentDashboardList } from '@/src/components/IncidentDashboardList';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [debtChart, setDebtChart] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  // Quick incident form
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentCommunity, setIncidentCommunity] = useState('');
  const [submittingIncident, setSubmittingIncident] = useState(false);
  
  // Modular dashboard settings
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : ['shortcuts', 'debtHero', 'stats', 'debtChart', 'ranking', 'incidents', 'tasks', 'activities', 'quickIncident'];
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(visibleWidgets));
  }, [visibleWidgets]);

  const toggleWidget = (id: string) => {
    setVisibleWidgets(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  // Dashboard Incidents logic
  const [dashboardIncidents, setDashboardIncidents] = useState<any[]>([]);
  const [incidentFilter, setIncidentFilter] = useState('all');
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, debtRes, commRes] = await Promise.all([
          fetch('/api/stats'),
          fetch('/api/stats/debt-by-community'),
          fetch('/api/communities'),
        ]);
        setStats(statsRes.ok ? await statsRes.json() : null);
        setDebtChart(debtRes.ok ? await debtRes.json() : []);
        setCommunities(commRes.ok ? await commRes.json() : []);
        
        // Fetch incidents for the list
        fetchIncidents();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const fetchIncidents = async (communityId?: string) => {
    try {
      setLoadingIncidents(true);
      const url = communityId && communityId !== 'all'
        ? `/api/admin/incidents?communityId=${communityId}`
        : '/api/admin/incidents';
      const res = await fetch(url);
      if (res.ok) setDashboardIncidents(await res.json());
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoadingIncidents(false);
    }
  };

  const handleUpdateIncidentStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Estado actualizado');
        fetchIncidents(incidentFilter);
      }
    } catch (error) {
      toast.error('Error al actualizar estado');
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/export-excel');
      if (!res.ok) throw new Error('Error al generar el Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_adminfincas_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleSubmitIncident = async () => {
    if (!incidentDesc.trim() || !incidentCommunity) {
      toast.error('Completa la descripción y selecciona la comunidad');
      return;
    }
    try {
      setSubmittingIncident(true);
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communityId: incidentCommunity,
          title: incidentDesc.trim().slice(0, 80),
          description: incidentDesc.trim(),
          priority: 'medium',
          status: 'open',
        }),
      });
      if (!res.ok) throw new Error('Error al crear incidencia');
      toast.success('Incidencia registrada correctamente');
      setIncidentDesc('');
      setIncidentCommunity('');
    } catch (error) {
      toast.error('Error al registrar la incidencia');
    } finally {
      setSubmittingIncident(false);
    }
  };

  const statConfig = [
    { name: 'Comunidades', value: stats?.communities || '0', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Viviendas', value: stats?.units || '0', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Recaudado', value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.totalCollected || 0), icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Pendiente', value: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(stats?.pendingDebt || 0), icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const ranking = [...debtChart].sort((a, b) => b.debt - a.debt);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Cargando datos maestros...</p>
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
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Resumen Ejecutivo
          </h2>
          <p className="text-muted-foreground">Bienvenido al centro de mando de AdminFincas.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowSettings(!showSettings)} 
            className={cn("shadow-sm transition-all", showSettings && "bg-primary text-white hover:bg-primary/90")}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Personalizar
          </Button>
          <Button variant="outline" onClick={() => navigate('/chatbot')} className="shadow-sm border-primary/20 text-primary hover:bg-primary/5">
            <MessageSquare className="mr-2 h-4 w-4" />
            Asistente Virtual
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="shadow-lg hover:shadow-primary/20 transition-all">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            Exportar Informe Global
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-dashed border-primary/20 grid grid-cols-2 md:grid-cols-5 gap-3"
        >
          {[
            { id: 'shortcuts', label: 'Accesos Rápidos' },
            { id: 'debtHero', label: 'Resumen Deuda' },
            { id: 'stats', label: 'Estadísticas' },
            { id: 'debtChart', label: 'Gráfico Deuda' },
            { id: 'ranking', label: 'Ranking' },
            { id: 'incidents', label: 'Incidencias' },
            { id: 'tasks', label: 'Tareas' },
            { id: 'activities', label: 'Actividad' },
            { id: 'quickIncident', label: 'Nueva Incidencia' },
          ].map(w => (
            <div key={w.id} className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                id={`check-${w.id}`}
                checked={visibleWidgets.includes(w.id)}
                onChange={() => toggleWidget(w.id)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <label htmlFor={`check-${w.id}`} className="text-xs font-medium cursor-pointer">{w.label}</label>
            </div>
          ))}
        </motion.div>
      )}

      {/* Shortcuts */}
      {visibleWidgets.includes('shortcuts') && (
        <div className="grid gap-4 md:grid-cols-3">
          <ShortcutCard 
            icon={FileText} 
            title="Generar Actas" 
            description="Crea actas de reuniones automáticamente"
            onClick={() => navigate('/actas')}
            color="text-blue-600"
          />
          <ShortcutCard 
            icon={Upload} 
            title="Carga de Documentos" 
            description="Sube facturas y contratos para procesamiento OCR"
            onClick={() => navigate('/importar')}
            color="text-purple-600"
          />
          <ShortcutCard 
            icon={MessageSquare} 
            title="Chatbot de Consultas" 
            description="Resuelve dudas sobre comunidades y normativa"
            onClick={() => navigate('/chatbot')}
            color="text-emerald-600"
          />
        </div>
      )}

      {/* Hero: Top debt communities */}
      {visibleWidgets.includes('debtHero') && debtChart.length > 0 && (() => {
        const top5 = [...debtChart].sort((a, b) => b.debt - a.debt).slice(0, 5);
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-rose-500" />
              <h3 className="text-lg font-semibold text-slate-700">Comunidades con Mayor Deuda</h3>
            </div>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
              {top5.map((c, i) => (
                <motion.div
                  key={c.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="border-none shadow-md overflow-hidden group hover:shadow-lg transition-all duration-300">
                    <div className={cn(
                      "h-1.5 w-full",
                      i === 0 ? "bg-rose-500" :
                      i === 1 ? "bg-rose-400" :
                      i === 2 ? "bg-orange-400" :
                      i === 3 ? "bg-amber-400" :
                      "bg-yellow-400"
                    )} />
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          i === 0 ? "bg-rose-100 text-rose-600" :
                          i === 1 ? "bg-rose-50 text-rose-500" :
                          i === 2 ? "bg-orange-100 text-orange-500" :
                          i === 3 ? "bg-amber-100 text-amber-600" :
                          "bg-yellow-100 text-yellow-600"
                        )}>{i + 1}</span>
                        <p className="text-xs font-medium text-slate-600 truncate leading-tight">{c.name}</p>
                      </div>
                      <p className={cn(
                        "text-2xl font-black tracking-tight leading-none",
                        i === 0 ? "text-rose-600" :
                        i === 1 ? "text-rose-500" :
                        i === 2 ? "text-orange-500" :
                        "text-amber-600"
                      )}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.debt)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">deuda pendiente</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      {visibleWidgets.includes('stats') && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statConfig.map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 duration-300", stat.bg, stat.color)}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Gráfico deuda + Ranking */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {visibleWidgets.includes('debtChart') && (
          <Card className={cn("border-none shadow-sm", visibleWidgets.includes('ranking') ? "lg:col-span-4" : "lg:col-span-7")}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChartIcon className="h-5 w-5 text-primary" />
                Deuda por Comunidad
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] w-full pt-4">
              {debtChart && debtChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={debtChart} margin={{ top: 24, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(v: any) => [`€${Number(v).toLocaleString('es-ES')}`, 'Deuda']}
                    />
                    <Bar dataKey="debt" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={40}>
                      <LabelList
                        dataKey="debt"
                        position="top"
                        formatter={(v: number) => `€${Number(v).toLocaleString('es-ES')}`}
                        style={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <CircleAlert className="h-12 w-12 mb-2" />
                  <p>No hay deudas registradas actualmente</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ranking de deuda */}
        {visibleWidgets.includes('ranking') && (
          <Card className={cn("border-none shadow-sm", visibleWidgets.includes('debtChart') ? "lg:col-span-3" : "lg:col-span-7")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ranking de Deuda
              </CardTitle>
              <Badge variant="secondary" className="bg-rose-50 text-rose-600 border-rose-100 uppercase text-[10px] font-bold">Crítico</Badge>
            </CardHeader>
            <CardContent>
              {ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin datos de deuda.</p>
              ) : (
                <div className="space-y-3">
                  {ranking.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className={cn(
                        "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        i === 0 ? "bg-rose-100 text-rose-600" :
                        i === 1 ? "bg-orange-100 text-orange-600" :
                        i === 2 ? "bg-amber-100 text-amber-600" :
                        "bg-slate-100 text-slate-500"
                      )}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1">
                          <div
                            className="bg-rose-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${ranking[0]?.debt > 0 ? (c.debt / ranking[0].debt) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-rose-600 shrink-0">
                        €{Number(c.debt).toLocaleString('es-ES')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incidencia rápida + TaskBoard + Últimas actividades */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Incidencias por comunidad */}
        {visibleWidgets.includes('incidents') && (
          <Card className="lg:col-span-3 border-none shadow-sm flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CircleAlert className="h-5 w-5 text-amber-500" />
                Incidencias por Comunidad
              </CardTitle>
              <Select 
                value={incidentFilter} 
                onValueChange={(val) => {
                  setIncidentFilter(val);
                  fetchIncidents(val);
                }}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs bg-slate-50 border-none">
                  <SelectValue placeholder="Filtrar comunidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las comunidades</SelectItem>
                  {communities.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
              {loadingIncidents ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/30" /></div>
              ) : (
                  <IncidentDashboardList 
                      incidents={dashboardIncidents}
                      onUpdateStatus={handleUpdateIncidentStatus}
                      onViewDetails={(id) => navigate(`/incidencias`)}
                  />
              )}
            </CardContent>
          </Card>
        )}

        {/* TaskBoard */}
        {visibleWidgets.includes('tasks') && (
          <div className={cn(
            visibleWidgets.includes('incidents') ? "lg:col-span-2" : "lg:col-span-4"
          )}>
            <TaskBoard />
          </div>
        )}

        {/* Últimas Actividades */}
        {visibleWidgets.includes('activities') && (
          <Card className={cn(
            "border-none shadow-sm",
            visibleWidgets.includes('incidents') && visibleWidgets.includes('tasks') ? "lg:col-span-2" : "lg:col-span-3"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                Últimas Actividades
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate('/comunidades')}>
                Historial
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.recentActivities?.length > 0 ? (
                  stats.recentActivities.map((log: any) => (
                    <div key={log.id} className="flex items-center gap-4 group">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium leading-none capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{log.entityType}: {log.entityId}</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ratio de Cobro</span>
                      <span className="font-bold">{stats?.collectionRatio || 0}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${stats?.collectionRatio || 0}%` }} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Incidencias Críticas</span>
                      <span className="font-bold">{stats?.criticalIncidents || 0}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full" style={{ width: stats?.criticalIncidents ? '100%' : '0%' }} />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Access Sidebar Action (Floating or combined) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleWidgets.includes('quickIncident') && (
          <Card className="border-none shadow-sm p-4 bg-white">
              <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Nueva Incidencia Rápida
              </h4>
              <div className="space-y-3">
                  <Select value={incidentCommunity} onValueChange={setIncidentCommunity}>
                      <SelectTrigger className="text-sm bg-slate-50 border-none">
                          <SelectValue placeholder="Selecciona comunidad" />
                      </SelectTrigger>
                      <SelectContent>
                          {communities.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  <Textarea
                      placeholder="Describe la incidencia..."
                      className="min-h-[80px] text-sm bg-slate-50 border-none resize-none"
                      value={incidentDesc}
                      onChange={(e) => setIncidentDesc(e.target.value)}
                  />
                  <Button
                      className="w-full shadow-md"
                      onClick={handleSubmitIncident}
                      disabled={submittingIncident}
                      size="sm"
                  >
                      {submittingIncident ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Send className="mr-2 h-3 w-3" />}
                      Registrar Incidencia
                  </Button>
              </div>
          </Card>
        )}

        <Card className="border-none shadow-sm bg-gradient-to-br from-primary to-blue-700 text-primary-foreground p-6 flex flex-col justify-between overflow-hidden relative group">
            <div className="relative z-10">
                <Sparkles className="h-8 w-8 mb-4 text-blue-200 animate-pulse" />
                <h3 className="text-xl font-bold mb-2">Potencia tu Gestión</h3>
                <p className="text-sm opacity-80 mb-6 max-w-[280px]">
                    Optimiza la carga de documentos y la redacción de actas con nuestras herramientas inteligentes integradas.
                </p>
                <div className="flex gap-3">
                    <Button variant="secondary" size="sm" onClick={() => navigate('/importar')} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                        Ir a OCR
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => navigate('/actas')} className="bg-white text-primary hover:bg-white/90">
                        Crear Acta
                    </Button>
                </div>
            </div>
            {/* Background decoration */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
        </Card>
      </div>
    </motion.div>
  );
}
