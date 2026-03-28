import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  FileText,
  Download,
  Calendar,
  Tag,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        // 1. Get owner profile
        const meRes = await fetch('/api/owner/me');
        if (!meRes.ok) throw new Error('No se pudo cargar el perfil');
        const ownerData = await meRes.json();

        // 2. Get owner units to find communities
        const unitsRes = await fetch(`/api/owner/units?ownerId=${ownerData.id}`);
        const unitsData = await unitsRes.json();
        
        const communityIds = Array.from(new Set(unitsData.map((u: any) => u.community.id)));
        
        // 3. Fetch documents for each community
        const allDocs = [];
        for (const communityId of communityIds) {
          const docsRes = await fetch(`/api/documents/community/${communityId}`);
          if (docsRes.ok) {
            const communityDocs = await docsRes.json();
            // Add community name to each doc for clarity
            const communityName = unitsData.find((u: any) => u.community.id === communityId)?.community.name;
            allDocs.push(...communityDocs.map((d: any) => ({ ...d, communityName })));
          }
        }
        
        setDocuments(allDocs);
      } catch (error) {
        console.error('Error fetching documents:', error);
        toast.error('Error al cargar los documentos');
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.communityName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'minutes': return 'bg-blue-100 text-blue-700';
      case 'statutes': return 'bg-purple-100 text-purple-700';
      case 'financial': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'minutes': return 'Actas';
      case 'statutes': return 'Estatutos';
      case 'financial': return 'Presupuestos/Cuentas';
      default: return 'Otros';
    }
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Documentos</h1>
        <p className="text-muted-foreground">Accede a las actas, estatutos y otros documentos de tu comunidad.</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar documentos..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredDocs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-medium">No se encontraron documentos</h3>
            <p className="text-sm text-muted-foreground">No hay archivos disponibles en este momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc) => (
            <Card key={doc.id} className="group hover:shadow-md transition-all border-none shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${getCategoryColor(doc.category)}`}>
                    {getCategoryLabel(doc.category)}
                  </span>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">{doc.title}</CardTitle>
                <CardDescription className="line-clamp-2">{doc.description || 'Sin descripción disponible.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <Tag className="h-3.3 w-3" />
                    <span className="font-medium truncate">{doc.communityName}</span>
                  </div>
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
