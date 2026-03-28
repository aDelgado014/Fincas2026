import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RemesaRow {
  fecha: string;
  descripcion: string;
  importe: number | string;
  comunidad: string;
}

export function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Remesas tab state
  const [remesaFile, setRemesaFile] = useState<File | null>(null);
  const [remesaData, setRemesaData] = useState<RemesaRow[]>([]);
  const [processingRemesa, setProcessingRemesa] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      const formData = new FormData();
      formData.append('file', file);

      // El backend ahora maneja la extracción de texto (OCR si es necesario) 
      // y la estructuración con IA en un solo paso para PDFs.
      const endpoint = file.name.endsWith('.pdf') ? '/api/import/parse-pdf' : '/api/import/parse-xls';
      const parseRes = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!parseRes.ok) {
        const error = await parseRes.json();
        throw new Error(error.error || 'Error al procesar el archivo');
      }

      const structuredData = await parseRes.json();
      setResults(structuredData);
      toast.success('Documento procesado y estructurado con éxito');
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!results) return;
    try {
      setProcessing(true);
      
      const res = await fetch('/api/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results),
      });

      if (res.ok) {
        toast.success('Comunidad y propietarios importados correctamente');
        setResults(null);
        setFile(null);
      } else {
        const err = await res.json();
        toast.error(`Error al guardar: ${err.error}`);
      }
    } catch (error) {
      toast.error('Error al procesar la solicitud de guardado');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemesaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setRemesaFile(selected);
    
    const formData = new FormData();
    formData.append('file', selected);
    setProcessingRemesa(true);

    try {
      const res = await fetch(`/api/bank/bank-statement/${localStorage.getItem('selectedCommunityId') || '1'}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Error al procesar el extracto bancario');
      
      const data = await res.json();
      toast.success(`Extracto procesado: ${data.count} movimientos detectados`);
      // Redirigir a conciliación para ver los detalles
      window.location.href = '/bancos';
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar el archivo');
    } finally {
      setProcessingRemesa(false);
    }
  };

  const handleAceptarRemesas = async () => {
    if (remesaData.length === 0) return;
    try {
      setProcessingRemesa(true);
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: remesaData, source: 'remesa' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al procesar las remesas');
      }
      toast.success('Remesas aceptadas y reconciliadas correctamente');
      setRemesaData([]);
      setRemesaFile(null);
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setProcessingRemesa(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Importador Inteligente</h2>
        <p className="text-muted-foreground">
          Carga PDFs, XLS o CSV para extraer datos automáticamente usando IA.
        </p>
      </div>

      <Tabs defaultValue="documentos" className="w-full">
        <TabsList>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="remesas">Remesas</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cargar Archivo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept=".pdf,.xls,.xlsx,.csv"
                  />
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">
                    {file ? file.name : 'Arrastra un archivo o haz clic para buscar'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, Excel o CSV (Máx. 10MB)
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={!file || processing}
                  onClick={handleUpload}
                >
                  {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {processing ? 'Procesando...' : 'Comenzar Importación'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resultados del Análisis</CardTitle>
              </CardHeader>
              <CardContent>
                {!results ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm">Los datos extraídos aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-medium">
                      <CheckCircle2 className="h-5 w-5" />
                      Datos extraídos correctamente
                    </div>
                    <pre className="bg-slate-950 text-slate-50 p-4 rounded-md text-xs overflow-auto max-h-[300px]">
                      {typeof results === 'string' ? results : JSON.stringify(results, null, 2)}
                    </pre>
                    <Button variant="default" className="w-full" onClick={handleSaveToDb} disabled={processing}>
                      {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Confirmar y Guardar en Base de Datos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="remesas" className="pt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cargar Archivo de Remesa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleRemesaFileChange}
                    accept=".xls,.xlsx,.xml"
                  />
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm font-medium">
                    {remesaFile ? remesaFile.name : 'Arrastra un archivo o haz clic para buscar'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    XLS / SEPA XML (Máx. 10MB)
                  </p>
                </div>
                {processingRemesa && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando archivo...
                  </div>
                )}
              </CardContent>
            </Card>

            {remesaData.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">Vista Previa ({remesaData.length} registros)</CardTitle>
                  <Button onClick={handleAceptarRemesas} disabled={processingRemesa}>
                    {processingRemesa
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Aceptar Remesas
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-right">Importe</TableHead>
                          <TableHead>Comunidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {remesaData.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-xs font-mono">{row.fecha}</TableCell>
                            <TableCell className="text-sm">{row.descripcion}</TableCell>
                            <TableCell className="text-right text-sm font-medium">
                              {typeof row.importe === 'number'
                                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.importe)
                                : row.importe}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{row.comunidad}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
