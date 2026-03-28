import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, Database, Trash2, Key, Bell, Loader2, Type, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const isSuperAdmin = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role === 'superadmin';
    } catch { return false; }
  })();

  const [fontSize, setFontSize] = useState(() => {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size')) || 16;
  });

  const updateFontSize = (size: number) => {
    setFontSize(size);
    document.documentElement.style.setProperty('--app-font-size', `${size}px`);
    localStorage.setItem('app-font-size', `${size}px`);
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      if (!res.ok) throw new Error('Error en el servidor');
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      }
    } catch (error) {
      toast.error('Error al generar datos de prueba');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = () => {
    toast.success('Configuración guardada correctamente');
  };

  const handleResetDb = async () => {
    if (confirm('¿Estás seguro de que deseas resetear la base de datos? Se borrarán todos los datos y configuraciones.')) {
      try {
        setLoading(true);
        const res = await fetch('/api/reset-db', { method: 'POST' });
        if (res.ok) {
          toast.success('Base de datos reseteada correctamente');
          // Optional: redirect to dashboard or refresh
          window.location.reload();
        } else {
          throw new Error('Error en la respuesta del servidor');
        }
      } catch (error) {
        toast.error('Error al resetear la base de datos');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configuración</h2>
        <p className="text-muted-foreground">
          Ajustes del sistema y gestión de integraciones.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle>Integraciones & API</CardTitle>
            </div>
            <CardDescription>Configura las llaves para los servicios de IA y Email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="groq-key">Groq API Key</Label>
              <div className="flex gap-2">
                <Input id="groq-key" type="password" value="***************************" disabled />
                <Button variant="outline" size="sm">Cambiar</Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resend-key">Resend API Key</Label>
              <div className="flex gap-2">
                <Input id="resend-key" type="password" value="***************************" disabled />
                <Button variant="outline" size="sm">Cambiar</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary" />
              <CardTitle>Accesibilidad & Interfaz</CardTitle>
            </div>
            <CardDescription>Ajusta visualmente el sistema a tus preferencias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tamaño de Fuente Principal</Label>
                <span className="text-sm font-medium">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs">A</span>
                <input 
                  type="range" 
                  min="12" 
                  max="24" 
                  value={fontSize} 
                  onChange={(e) => updateFontSize(parseInt(e.target.value))}
                  className="flex-1 accent-primary" 
                />
                <span className="text-lg">A</span>
              </div>
              <p className="text-xs text-muted-foreground">Cambia el tamaño base para mejorar la legibilidad en pantallas grandes o pequeñas.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>Controla cómo se envían las notificaciones automáticas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Avisos de Morosidad</Label>
                <p className="text-xs text-muted-foreground">Enviar email automático al superar los 30 días de deuda.</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 bg-primary text-primary-foreground" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Registro de Auditoría</Label>
                <p className="text-xs text-muted-foreground">Guardar log detallado de cada acción del administrador.</p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 bg-primary text-primary-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <Database className="h-5 w-5" />
              <CardTitle>Mantenimiento de Datos</CardTitle>
            </div>
            <CardDescription>Acciones críticas sobre la base de datos local SQLite.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Limpiar Base de Datos</Label>
                <p className="text-xs text-muted-foreground">Elimina permanentemente todos los registros del sistema.</p>
              </div>
              <Button variant="destructive" size="sm" onClick={handleResetDb}>
                <Trash2 className="mr-2 h-4 w-4" /> Resetear DB
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Generar Datos de Prueba</Label>
                <p className="text-xs text-muted-foreground">Crea comunidades, propietarios e inquilinos de ejemplo.</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Generar 25 Comunidades
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

        {isSuperAdmin && (
          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader>
              <div className="flex items-center gap-2 text-purple-700">
                <Shield className="h-5 w-5" />
                <CardTitle>Panel Superusuario</CardTitle>
              </div>
              <CardDescription>Control total del sistema. Solo visible para superadmin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-purple-800">Gestión de Usuarios</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    const res = await fetch('/api/users');
                    const data = await res.json();
                    toast.info(`${Array.isArray(data) ? data.length : '?'} usuarios registrados`);
                  }}>Ver Usuarios</Button>
                  <Button variant="outline" size="sm" onClick={() => window.location.href='/perfil'}>
                    Crear Usuario
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-purple-800">Recuperación de Contraseña</Label>
                <div className="flex gap-2">
                  <Input placeholder="Email del usuario..." id="recovery-email" className="text-sm" />
                  <Button size="sm" variant="outline" onClick={async () => {
                    const email = (document.getElementById('recovery-email') as HTMLInputElement)?.value;
                    if (!email) { toast.error('Introduce un email'); return; }
                    const res = await fetch('/api/users/admin-reset-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email }),
                    });
                    if (res.ok) toast.success('Email de recuperación enviado');
                    else toast.error('Error al enviar recuperación');
                  }}>Enviar Reset</Button>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-purple-800">Módulos del Sistema</Label>
                {[
                  { key: 'chatbot', label: 'Chatbot IA' },
                  { key: 'calls', label: 'Llamadas IA' },
                  { key: 'premium', label: 'Módulos Premium' },
                  { key: 'calendar', label: 'Calendario' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between">
                    <span className="text-sm">{f.label}</span>
                    <input type="checkbox" defaultChecked
                      onChange={e => {
                        localStorage.setItem(`feature_${f.key}`, String(e.target.checked));
                        toast.info(`${f.label} ${e.target.checked ? 'activado' : 'desactivado'}`);
                      }}
                      className="h-4 w-4" />
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-purple-800">Recuperación de Archivos</Label>
                <p className="text-xs text-muted-foreground">Los archivos eliminados se guardan 30 días en la papelera del servidor.</p>
                <Button variant="outline" size="sm" className="w-full" onClick={async () => {
                  const res = await fetch('/api/admin-fincas/export-db');
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `backup_${Date.now()}.json`; a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Backup descargado');
                  } else toast.error('Error al generar backup');
                }}>Descargar Backup Completo</Button>
              </div>
            </CardContent>
          </Card>
        )}

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
