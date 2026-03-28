import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Profile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });
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
      const response = await fetch('/api/owner/me');
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/owner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
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
      // Usamos el mismo endpoint de change-password o el de profile si soporta ambos
      // Vemos que en OwnerService.updateUserProfile se maneja el password
      const response = await fetch('/api/owner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: passwords.current, // El backend deberá verificar esto si lo implementamos, por ahora OwnerService solo hashea la nueva
          password: passwords.new 
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
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi Perfil</h1>
        <p className="text-slate-500 text-sm">Gestiona tu información personal y seguridad.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {/* Información Personal */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Información Personal
              </h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>

          {/* Seguridad */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                Seguridad y Contraseña
              </h2>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Contraseña Actual</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900"
                    placeholder="Tu contraseña actual"
                  />
                </div>
                <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900"
                  placeholder="Dejar en blanco para no cambiar"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-slate-900"
                  placeholder="Repite la nueva contraseña"
                />
              </div>
            </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !passwords.new}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  Cambiar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar Informativo */}
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h3 className="font-semibold text-blue-900 mb-2">Seguridad de la Cuenta</h3>
            <p className="text-sm text-blue-800/80 leading-relaxed">
              Te recomendamos usar una contraseña fuerte que no utilices en otros sitios. 
              AdminFincas nunca te pedirá tu contraseña por email.
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-2">Tus Datos</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tu información es utilizada únicamente para las gestiones de la comunidad y comunicaciones oficiales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
