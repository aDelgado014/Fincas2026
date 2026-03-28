import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Save, Loader2, Lock, Camera, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function AdminProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'operator' });
  const [newUserAvatar, setNewUserAvatar] = useState<File | null>(null);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || '',
          email: data.email || '',
          role: data.role || '',
        });
        setAvatarUrl(data.avatar || '');
      }
    } catch (error) {
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Nombre, email y contraseña son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        toast.success('Usuario creado correctamente');
        setNewUser({ name: '', email: '', password: '', role: 'operator' });
        setNewUserAvatar(null);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al crear usuario');
      }
    } catch { toast.error('Error de conexión'); }
    finally { setSaving(false); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        await fetch('/api/users/avatar', { method: 'POST', body: formData });
      }
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
        }),
      });

      if (response.ok) {
        toast.success('Perfil actualizado correctamente');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar perfil');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error('Las contraseñas no coinciden');
    }

    setSaving(true);
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: passwords.current,
          newPassword: passwords.new 
        }),
      });

      if (response.ok) {
        toast.success('Contraseña actualizada correctamente');
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Error al actualizar contraseña');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información de administrador y seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Información de Cuenta */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/50">
              <h2 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Información de Cuenta
              </h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="flex justify-center mb-4">
                <label className="relative cursor-pointer group">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors">
                    {avatarUrl
                      ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      : <User className="h-10 w-10 text-primary/50" />}
                  </div>
                  <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-1">
                    <Camera className="h-3 w-3" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) { setAvatarFile(f); setAvatarUrl(URL.createObjectURL(f)); }
                  }} />
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol del Sistema</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={profile.role.toUpperCase()}
                      disabled
                      className="w-full pl-10 pr-4 py-2 bg-muted border rounded-lg cursor-not-allowed text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Para cambiar el rol, contacta con el superadministrador.</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Administrativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>

          {/* Seguridad */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/50">
              <h2 className="font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-orange-500" />
                Seguridad
              </h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-0">
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contraseña Actual</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Tu contraseña actual"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nueva Contraseña</label>
                    <input
                      type="password"
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Min. 8 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Confirmar Contraseña</label>
                    <input
                      type="password"
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      className="w-full px-4 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      placeholder="Repite la contraseña"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t bg-muted/20 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !passwords.new}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>

          {(profile.role === 'superadmin' || profile.role === 'admin') && (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-muted/50">
                <h2 className="font-semibold flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Crear Nuevo Usuario
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">
                    {newUserAvatar
                      ? <img src={URL.createObjectURL(newUserAvatar)} alt="" className="h-full w-full object-cover" />
                      : <User className="h-7 w-7 text-slate-400" />}
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={e => setNewUserAvatar(e.target.files?.[0] || null)} />
                    <Button type="button" variant="outline" size="sm" asChild><span>Subir foto</span></Button>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nombre</label>
                    <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                      className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                      className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contraseña</label>
                    <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Min. 8 caracteres"
                      className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rol</label>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                      className="w-full px-3 py-2 bg-background border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm h-10">
                      <option value="operator">Operador</option>
                      <option value="admin">Administrador</option>
                      {profile.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={handleCreateUser} disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 text-sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Crear Usuario
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
            <h3 className="font-semibold text-primary mb-2">Acceso Administrativo</h3>
            <p className="text-sm text-balance leading-relaxed text-muted-foreground">
              Como administrador, tus cambios en el perfil afectan a cómo te ven otros miembros del equipo en el registro de auditoría.
            </p>
          </div>
          <div className="bg-muted rounded-xl p-6 border">
            <h3 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Sesión Actual</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IP:</span>
                <span className="font-mono">127.0.0.1</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Navegador:</span>
                <span>Google Chrome</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
