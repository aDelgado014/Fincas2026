import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Wrench, AlertCircle } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ReportIncident() {
  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [owner, setOwner] = useState<any>(null);
  const [formData, setFormData] = useState({
    unitId: '',
    title: '',
    description: '',
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const meRes = await fetch('/api/owner/me');
        const ownerData = await meRes.json();
        setOwner(ownerData);

        const unitsRes = await fetch(`/api/owner/units?ownerId=${ownerData.id}`);
        const unitsData = await unitsRes.json();
        setUnits(unitsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    fetchInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitId || !formData.title) {
       return toast.error('Por favor completa los campos obligatorios');
    }

    setLoading(true);
    try {
      const selectedUnit = units.find(u => u.unit.id === formData.unitId);
      
      const res = await fetch('/api/owner/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          ownerId: owner.id,
          communityId: selectedUnit.community.id
        }),
      });

      if (res.ok) {
        toast.success('Incidencia reportada correctamente');
        setFormData({ unitId: '', title: '', description: '' });
      } else {
        throw new Error('Error al enviar el reporte');
      }
    } catch (error) {
      toast.error('Ocurrió un error al reportar la incidencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Reportar Incidencia</h1>
        <p className="text-muted-foreground">Informa sobre averías o problemas en la comunidad.</p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Nueva Incidencia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Propiedad afectada</Label>
              <Select onValueChange={(v) => setFormData({...formData, unitId: v})} value={formData.unitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la propiedad" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.unit.id} value={u.unit.id}>
                      {u.community.name} - {u.unit.unitCode} ({u.unit.floor}{u.unit.door})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título / Asunto</Label>
              <Input 
                id="title" 
                placeholder="Ej: Bombilla fundida en portal, Humedad en techo..." 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción detallada</Label>
              <Textarea 
                id="description" 
                rows={5} 
                placeholder="Describe qué sucede, dónde y desde cuándo..." 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertCircle className="mr-2 h-4 w-4" />}
              Enviar Reporte
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
