import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Info, Loader2, BrainCircuit, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAnalysisProps {
  communityId: string;
}

export function AIAnalysis({ communityId }: AIAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/analytics/predictive-budget/${communityId}`);
      if (!res.ok) throw new Error('Error al generar el análisis');
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Análisis Predictivo IA</h3>
        </div>
        <Button 
          onClick={fetchAnalysis} 
          disabled={loading}
          className="bg-gradient-to-r from-primary to-blue-600 hover:opacity-90 transition-all font-semibold"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generar Proyección 2026
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-4 bg-slate-50"
          >
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
            </div>
            <p className="text-muted-foreground font-medium">Gemini está analizando tus patrones financieros...</p>
          </motion.div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3 border border-destructive/20"
          >
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </motion.div>
        ) : analysis ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-2"
          >
            <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm overflow-hidden border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  Presupuesto Proyectado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysis.projections}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11}} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="estimatedAnnual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Cuota Mensual Sugerida</p>
                  <p className="text-3xl font-bold text-primary">€{analysis.suggestedMonthlyQuota?.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-md bg-slate-900 text-slate-50">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-400" />
                    Insights de la IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {analysis.trends?.map((trend: string, i: number) => (
                      <div key={i} className="flex gap-2 text-sm">
                        <div className="h-5 w-5 rounded bg-white/10 flex items-center justify-center shrink-0">
                          {i + 1}
                        </div>
                        <p className="opacity-90">{trend}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Info className="h-4 w-4" /> Recomendaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.recommendations}</p>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground bg-slate-50 p-2 rounded">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Confianza del análisis: {(analysis.confidence * 100).toFixed(0)}%
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="p-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-3"
          >
            <Sparkles className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground">Presiona el botón para iniciar el análisis inteligente de esta comunidad.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
