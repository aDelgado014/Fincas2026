import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Database, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Communities() {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/communities');
      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      setCommunities(data);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error('Error al cargar comunidades. Verifique su sesión.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string, e: any) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleExport = () => {
    const url = selectedIds.length > 0 
      ? `/api/export-excel?communityIds=${selectedIds.join(',')}`
      : '/api/export-excel';
    window.open(url, '_blank');
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Comunidades</h2>
          <p className="text-muted-foreground">
            Gestión de fincas y edificios administrados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Database className="mr-2 h-4 w-4" /> 
            {selectedIds.length > 0 ? `Exportar (${selectedIds.length})` : 'Exportar Todo'}
          </Button>
          <Button onClick={() => navigate('/comunidades/nueva')}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Comunidad
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : communities.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay comunidades</p>
            <p className="text-sm text-muted-foreground mb-4">Usa el botón superior para generar datos de prueba o añade una manualmente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((c) => (
            <Card 
              key={c.id} 
              className={`hover:shadow-md transition-all cursor-pointer border-2 ${selectedIds.includes(c.id) ? 'border-primary shadow-blue-100' : 'border-transparent'}`}
              onClick={() => navigate(`/comunidades/${c.id}`)}
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {c.displayId && (
                    <span className="text-xs text-muted-foreground mr-2">#{c.displayId}</span>
                  )}
                  {c.name}
                </CardTitle>
                <div 
                  onClick={(e) => toggleSelection(c.id, e)}
                  className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.includes(c.id) ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}`}
                >
                  {selectedIds.includes(c.id) && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <p><span className="font-semibold">NIF:</span> {c.nif}</p>
                  <p className="text-muted-foreground truncate">{c.address}</p>
                  <p className="text-xs text-primary mt-2 font-medium">Código: {c.code}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
