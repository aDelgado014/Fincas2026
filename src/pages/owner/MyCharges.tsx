import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { CreditCard, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MyCharges() {
  const [charges, setCharges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharges = async () => {
      try {
        // Necesitamos el ownerId. En una app real vendría del AuthContext.
        const meRes = await fetch('/api/owner/me');
        const ownerData = await meRes.json();
        
        const res = await fetch(`/api/owner/charges?ownerId=${ownerData.id}`);
        const data = await res.json();
        setCharges(data);
      } catch (error) {
        console.error('Error fetching charges:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCharges();
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Recibos y Cargos</h1>
          <p className="text-muted-foreground">Historial detallado de tus obligaciones financieras.</p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.length > 0 ? (
                charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">{charge.concept}</TableCell>
                    <TableCell>{new Date(charge.issueDate || charge.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(charge.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(charge.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={charge.status === 'paid' ? 'success' : 'destructive'} className="capitalize">
                        {charge.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No hay recibos registrados en tu cuenta.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
