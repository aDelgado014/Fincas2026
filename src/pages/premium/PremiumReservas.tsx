import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, Clock, Users, ShieldCheck, ChevronRight, Plus, Smartphone, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const FACILITIES = [
  { id: 1, name: 'Pista de Pádel 1', icon: '🎾', status: 'available', price: '0,00€', capacity: 4 },
  { id: 2, name: 'Piscina Comunitaria', icon: '🏊‍♂️', status: 'maintenance', price: '0,00€', capacity: 50 },
  { id: 3, name: 'Sala de Eventos', icon: '🎉', status: 'available', price: '25,00€', capacity: 30 },
  { id: 4, name: 'Gimnasio', icon: '🏋️‍♀️', status: 'available', price: '0,00€', capacity: 10 },
];

interface NewFacilityForm {
  name: string;
  icon: string;
  capacity: number;
  price: string;
  status: 'available' | 'maintenance';
}

export function PremiumReservas() {
  const [facilities, setFacilities] = useState(FACILITIES);
  const [showModal, setShowModal] = useState(false);
  const [newFacility, setNewFacility] = useState<NewFacilityForm>({
    name: '',
    icon: '🏢',
    capacity: 0,
    price: '0,00€',
    status: 'available',
  });

  const handleAddFacility = () => {
    const facility = {
      id: Date.now(),
      name: newFacility.name,
      icon: newFacility.icon,
      status: newFacility.status,
      price: newFacility.price,
      capacity: newFacility.capacity,
    };
    setFacilities((prev) => [...prev, facility]);
    setShowModal(false);
    setNewFacility({ name: '', icon: '🏢', capacity: 0, price: '0,00€', status: 'available' });
    toast.success('Instalación añadida correctamente');
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Nueva Instalación</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  placeholder="Ej: Sala de Reuniones"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Emoji / Icono</label>
                <Input
                  placeholder="🏢"
                  value={newFacility.icon}
                  onChange={(e) => setNewFacility((p) => ({ ...p, icon: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Capacidad (personas)</label>
                <Input
                  type="number"
                  placeholder="10"
                  value={newFacility.capacity}
                  onChange={(e) => setNewFacility((p) => ({ ...p, capacity: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Precio</label>
                <Input
                  placeholder="0,00€"
                  value={newFacility.price}
                  onChange={(e) => setNewFacility((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select
                  value={newFacility.status}
                  onValueChange={(v) => setNewFacility((p) => ({ ...p, status: v as 'available' | 'maintenance' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleAddFacility} disabled={!newFacility.name.trim()}>Añadir</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Reserva de Instalaciones
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Premium</Badge>
          </h2>
          <p className="text-slate-500">Gestión inteligente de espacios comunes y control de aforo.</p>
        </div>
        <Button className="shadow-lg hover:shadow-primary/20" onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Instalación
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {facilities.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
              <div className="h-32 bg-slate-100 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform cursor-default">
                {f.icon}
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">{f.name}</CardTitle>
                  <Badge variant={f.status === 'available' ? 'default' : 'secondary'} className={f.status === 'available' ? 'bg-emerald-500' : 'bg-slate-200'}>
                    {f.status === 'available' ? 'Libre' : 'Mantenimiento'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Aforo: {f.capacity}</span>
                    <span className="font-semibold text-slate-900">{f.price}</span>
                  </div>
                  <Button className="w-full" variant={f.status === 'available' ? 'outline' : 'ghost'} disabled={f.status !== 'available'}>
                    Ver disponibilidad
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Próximas Reservas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(id => (
                <div key={id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Pista Pádel 1 - Juan Pérez</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Clock className="h-3 w-3" /> Hoy, 18:00 - 19:30
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-100 bg-emerald-50">Confirmado</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary text-primary-foreground border-none shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck className="h-24 w-24" />
          </div>
          <CardHeader>
            <CardTitle>Control de Acceso AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm opacity-90">
              Activa el escaneo de códigos QR para la apertura automática de puertas tras confirmación de reserva.
            </p>
            <div className="pt-4">
              <Button variant="secondary" className="w-full font-bold">
                Activar SmartLock
              </Button>
            </div>
            <ul className="text-xs space-y-2 opacity-80 pt-4">
              <li className="flex items-center gap-2">✓ Integración con cerraduras inteligentes</li>
              <li className="flex items-center gap-2">✓ Historial de accesos en tiempo real</li>
              <li className="flex items-center gap-2">✓ Gestión automática de códigos temporales</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Integración App Móvil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Conecta AdminFincas con una app móvil externa para que los propietarios puedan gestionar sus reservas desde el teléfono.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded-lg bg-white space-y-1">
              <p className="text-sm font-medium">API REST</p>
              <p className="text-xs text-muted-foreground font-mono">/api/reservas/*</p>
              <Badge variant="outline" className="text-emerald-600 border-emerald-200">Preparado</Badge>
            </div>
            <div className="p-3 border rounded-lg bg-white space-y-1">
              <p className="text-sm font-medium">Webhook</p>
              <p className="text-xs text-muted-foreground">Notificaciones en tiempo real</p>
              <Badge variant="outline" className="text-amber-600 border-amber-200">Config. requerida</Badge>
            </div>
          </div>
          <Button variant="outline" className="w-full" disabled>
            <QrCode className="mr-2 h-4 w-4" /> Generar QR de Descarga (próximamente)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
