import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, Plus, Clock, CheckCircle2, AlertTriangle, Hammer, Building2, Loader2, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

export function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    communityId: '',
    title: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    fetchIncidents();
    fetch('/api/communities')
      .then(res => res.json())
      .then(data => setCommunities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/incidents');
      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      setIncidents(data);
    } catch (error) {
      toast.error('Error al cargar incidencias');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNotion = async (incident: any) => {
    try {
      toast.info('Sincronizando con Notion...');
      const res = await fetch(`/api/admin/incidents/${incident.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: incident.status }) // Re-triggering status update triggers Notion sync
      });
      if (res.ok) {
        toast.success('Sincronizado con Notion');
      } else {
        throw new Error('Error al sincronizar');
      }
    } catch (error) {
      toast.error('Error de sincronización');
    }
  };

  const handleNewIncident = () => {
    setForm({ communityId: '', title: '', description: '', priority: 'medium' });
    setShowModal(true);
  };

  const handleSubmitIncident = async () => {
    if (!form.communityId || !form.title.trim()) {
      toast.error('Comunidad y título son obligatorios');
      return;
    }
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Error en el servidor');
      toast.success('Incidencia registrada');
      fetchIncidents();
      setShowModal(false);
    } catch (error) {
      toast.error('Error al crear incidencia');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Incidencias</h2>
          <p className="text-muted-foreground">
            Seguimiento de reparaciones, averías y mantenimiento preventivo.
          </p>
        </div>
        <Button onClick={handleNewIncident}>
          <Plus className="mr-2 h-4 w-4" /> Nueva Incidencia
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {/* Stats can be derived from incidents state */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents.filter(i => i.status === 'pending').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {incidents.filter(i => i.priority === 'high').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Curso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {incidents.filter(i => i.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {incidents.filter(i => i.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : incidents.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground italic">No hay incidencias registradas</div>
        ) : incidents.map(inc => (
          <Card key={inc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                   "p-2 rounded-full",
                   inc.priority === 'high' ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                )}>
                  {inc.priority === 'high' ? <AlertTriangle className="h-5 w-5" /> : <Hammer className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-semibold">{inc.title}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Building2 className="h-3 w-3" /> {inc.communityName || 'Comunidad Desconocida'}
                    <Clock className="h-3 w-3 ml-2" /> {new Date(inc.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={inc.status === 'in_progress' ? 'secondary' : inc.status === 'resolved' ? 'outline' : 'default'}>
                    {inc.status === 'in_progress' ? 'En Curso' : inc.status === 'resolved' ? 'Resuelta' : 'Pendiente'}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleSyncNotion(inc)} title="Sincronizar con Notion">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm">Detalles</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-background rounded-xl shadow-2xl border border-border w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nueva Incidencia</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Comunidad</Label>
                <Select value={form.communityId} onValueChange={val => setForm(f => ({ ...f, communityId: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar comunidad..." />
                  </SelectTrigger>
                  <SelectContent>
                    {communities.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Título</Label>
                <Input
                  placeholder="Ej: Fuga de agua en portal"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Descripción</Label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
                  placeholder="Descripción detallada de la incidencia..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={val => setForm(f => ({ ...f, priority: val }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleSubmitIncident} disabled={!form.communityId || !form.title.trim()}>
                Crear Incidencia
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
