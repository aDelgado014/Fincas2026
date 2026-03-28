import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  CreditCard,
  Wrench,
  Building2,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function OwnerDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOwnerData = async () => {
      try {
        // Obtenemos el perfil del usuario actual (vinculado por email en el register/login)
        const meRes = await fetch('/api/owner/me');
        if (!meRes.ok) throw new Error('No se pudo cargar el perfil');
        const ownerData = await meRes.json();
        setOwner(ownerData);

        const summaryRes = await fetch(`/api/owner/summary?ownerId=${ownerData.id}`);
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        const notifRes = await fetch('/api/owner/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData);
        }
      } catch (error) {
        console.error('Error fetching owner data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerData();
  }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight gradient-text">¡Hola, {owner?.fullName}!</h1>
        <p className="text-muted-foreground">Bienvenido a tu portal de propietario en AdminFincas AI.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Saldo Pendiente</CardTitle>
            <div className="p-2 rounded-lg bg-rose-50">
              <CreditCard className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(summary?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.balance > 0 ? 'Tienes recibos pendientes de pago' : 'Tu cuenta está al día'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Incidencias Activas</CardTitle>
            <div className="p-2 rounded-lg bg-amber-50">
              <Wrench className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.openIncidents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">En proceso de resolución</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Comunidad</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Activo</div>
            <p className="text-xs text-muted-foreground mt-1">Documentación disponible</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Notificaciones</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50">
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.filter(n => !n.read).length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {notifications.filter(n => !n.read).length > 0 ? 'Tienes avisos sin leer' : 'Sin avisos pendientes'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-primary to-blue-700 text-primary-foreground border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Reportar Avería o Incidencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm opacity-90">
              ¿Ves algo que no funciona en la comunidad o tienes un problema en tu unidad? 
              Informa aquí para que podamos gestionarlo rápidamente.
            </p>
            <Button variant="secondary" onClick={() => navigate('/owner/incidencias')} className="w-full shadow-lg">
              Crear Reporte Completo
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Acceso Rápido a Recibos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Consulta el detalle de tus cuotas, derramas y servicios. Puedes descargar tus justificantes de pago.
            </p>
            <Button variant="outline" onClick={() => navigate('/owner/recibos')} className="w-full">
              Ver Historial de Recibos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
