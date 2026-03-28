import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, Database, Trash2, Key, Bell, Loader2, Type, Shield, Users, Send, Bot, Plus, Trash, ToggleLeft, ToggleRight, Star, Lock } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Telegram state
  const [telegramBots, setTelegramBots] = useState<any[]>([]);
  const [newBotToken, setNewBotToken] = useState('');
  const [addingBot, setAddingBot] = useState(false);

  useEffect(() => {
    fetch('/api/telegram/bots', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTelegramBots(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleAddBot = async () => {
    if (!newBotToken.trim()) { toast.error('Introduce el token del bot'); return; }
    setAddingBot(true);
    try {
      const res = await fetch('/api/telegram/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ botToken: newBotToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Bot @${data.botUsername} conectado correctamente`);
      setNewBotToken('');
      setTelegramBots(prev => [...prev, { id: data.botId, botUsername: data.botUsername, botName: data.botName, active: 1 }]);
    } catch (err: any) {
      toast.error(err.message || 'Error al conectar el bot');
    } finally {
      setAddingBot(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!confirm('¿Eliminar este bot? Se desconectará de Telegram.')) return;
    try {
      await fetch(`/api/telegram/bots/${botId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setTelegramBots(prev => prev.filter(b => b.id !== botId));
      toast.success('Bot eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const handleToggleBot = async (botId: string) => {
    try {
      const res = await fetch(`/api/telegram/bots/${botId}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const data = await res.json();
      setTelegramBots(prev => prev.map(b => b.id === botId ? { ...b, active: data.active } : b));
      toast.success(data.active ? 'Bot activado' : 'Bot desactivado');
    } catch { toast.error('Error'); }
  };

  const { isSuperAdmin, isPremium } = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { isSuperAdmin: false, isPremium: false };
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        isSuperAdmin: payload.role === 'superadmin',
        isPremium: payload.plan === 'premium' || payload.role === 'superadmin',
      };
    } catch { return { isSuperAdmin: false, isPremium: false }; }
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

      {/* Telegram Chatbot */}
      <Card className={`border-2 ${isPremium ? 'border-blue-200 bg-blue-50/20' : 'border-amber-200 bg-amber-50/20'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700">
              <Send className="h-5 w-5" />
              <CardTitle>Chatbot Telegram — FINCA</CardTitle>
            </div>
            <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${isPremium ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              <Star className="h-3 w-3" /> PREMIUM
            </span>
          </div>
          <CardDescription>
            Bot privado de Telegram con acceso completo a tus comunidades. Uno por administrador, completamente personalizable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
        {!isPremium ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="p-4 bg-amber-100 rounded-full">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Función exclusiva del plan Premium</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Con el plan Premium puedes conectar tu propio bot privado de Telegram y gestionar todas tus comunidades desde el móvil usando FINCA como asistente personal.
              </p>
            </div>
            <div className="bg-white border rounded-lg p-4 text-left text-sm space-y-2 max-w-sm w-full">
              <p className="font-semibold text-slate-700">¿Qué incluye?</p>
              {['Bot privado exclusivo para ti','Acceso a deudas, incidencias e informes','Envío de comunicaciones desde Telegram','Historial de conversación persistente','Comandos /start, /reset, /ayuda'].map(f => (
                <p key={f} className="flex items-center gap-2 text-slate-600">
                  <Star className="h-3 w-3 text-amber-500 shrink-0" /> {f}
                </p>
              ))}
            </div>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => window.location.href = 'mailto:hola@bluecrabai.es?subject=Solicitud Plan Premium AdminFincas'}>
              <Star className="h-4 w-4 mr-2" /> Solicitar Plan Premium
            </Button>
          </div>
        ) : (
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm space-y-2">
            <p className="font-semibold text-blue-800">¿Cómo crear tu bot?</p>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Abre Telegram y busca <strong>@BotFather</strong></li>
              <li>Escribe <code className="bg-blue-100 px-1 rounded">/newbot</code></li>
              <li>Ponle un nombre (ej: <em>FINCA Las Flores</em>) y un username (ej: <em>finca_lasflores_bot</em>)</li>
              <li>Copia el token que te da BotFather y pégalo aquí abajo</li>
            </ol>
          </div>

          {/* Añadir nuevo bot */}
          <div className="flex gap-2">
            <Input
              placeholder="Token del bot (ej: 1234567890:AAF...)"
              value={newBotToken}
              onChange={e => setNewBotToken(e.target.value)}
              className="font-mono text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAddBot()}
            />
            <Button onClick={handleAddBot} disabled={addingBot} className="shrink-0">
              {addingBot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {addingBot ? 'Conectando...' : 'Conectar Bot'}
            </Button>
          </div>

          {/* Lista de bots */}
          {telegramBots.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Bots conectados</Label>
              {telegramBots.map(bot => (
                <div key={bot.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                  <div className="flex items-center gap-3">
                    <Bot className={`h-5 w-5 ${bot.active ? 'text-blue-500' : 'text-slate-300'}`} />
                    <div>
                      <p className="font-medium text-sm">{bot.botName || 'FINCA Bot'}</p>
                      <p className="text-xs text-muted-foreground">@{bot.botUsername}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${bot.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {bot.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleToggleBot(bot.id)} title={bot.active ? 'Desactivar' : 'Activar'}>
                      {bot.active ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteBot(bot.id)}>
                      <Trash className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay bots conectados todavía.</p>
          )}

          <p className="text-xs text-muted-foreground">
            Una vez conectado, abre Telegram, busca tu bot y escribe <code>/start</code> para comenzar.
            El bot tiene acceso completo a los datos de tus comunidades.
          </p>
        )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
