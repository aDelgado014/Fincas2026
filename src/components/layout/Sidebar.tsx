import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Upload,
  CircleAlert,
  Mail,
  History,
  Settings,
  Banknote,
  Wrench,
  FileText,
  User,
  TrendingDown,
  PiggyBank,
  CalendarDays,
  Briefcase,
  Star,
  Scale,
  Bell,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Plus,
  Receipt,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Comunidades', href: '/comunidades', icon: Building2 },
  { name: 'Importar', href: '/importar', icon: Upload },
  { name: 'Deuda', href: '/deuda', icon: CircleAlert },
  { name: 'Morosidad', href: '/morosidad', icon: TrendingDown },
  { name: 'Presupuesto', href: '/presupuesto', icon: PiggyBank },
  { name: 'Gastos', href: '/gastos', icon: Receipt },
  { name: 'Conciliación', href: '/conciliacion', icon: Banknote },
  { name: 'Bancos', href: '/bancos', icon: Banknote },
  { name: 'Incidencias', href: '/incidencias', icon: Wrench },
  { name: 'Actas', href: '/actas', icon: FileText },
  { name: 'Calendario', href: '/calendario', icon: CalendarDays },
  { name: 'Comunicaciones', href: '/comunicaciones', icon: Mail },
  { name: 'Auditoría', href: '/auditoria', icon: History },
  { name: 'Chatbot', href: '/chatbot', icon: Bot },
];

const premiumNavigation = [
  { name: 'Legal', href: '/premium/legal', icon: Scale },
  { name: 'Convocatorias', href: '/premium/convocatorias', icon: Bell },
  { name: 'Reservas', href: '/premium/reservas', icon: CalendarCheck },
];

const bottomNavigation = [
  { name: 'Admin Fincas', href: '/admin-fincas', icon: Briefcase },
  { name: 'Perfil', href: '/perfil', icon: User },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPresident = user.role === 'president';

  const [premiumOpen, setPremiumOpen] = useState(
    location.pathname.startsWith('/premium')
  );

  const filterNav = (nav: typeof mainNavigation) => {
    if (!isPresident) return nav;
    const allowed = ['Dashboard', 'Comunidades', 'Deuda', 'Morosidad', 'Actas', 'Calendario', 'Bancos'];
    return nav.filter(item => allowed.includes(item.name));
  };

  const filterBottom = (nav: typeof bottomNavigation) => {
    if (!isPresident) return nav;
    return nav.filter(item => item.name !== 'Admin Fincas');
  };

  const isActive = (href: string) =>
    location.pathname === href || (href !== '/' && location.pathname.startsWith(href));

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200/50 bg-white/70 backdrop-blur-xl transition-all duration-300">
      <div className="flex h-14 items-center border-b border-slate-200/50 px-4 bg-white/40 justify-between">
        <div className="flex items-center">
          <Building2 className="mr-2 h-6 w-6 text-primary" />
          <span className="font-semibold tracking-tight">AdminFincas</span>
        </div>
        <Link to="/comunidades/nueva" title="Alta de comunidad" className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
          <Plus className="h-4 w-4" />
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
        {filterNav(mainNavigation).map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
              isActive(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon
              className={cn(
                'mr-3 h-5 w-5 flex-shrink-0',
                isActive(item.href) ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            {item.name}
          </Link>
        ))}

        {/* Premium submenu */}
        <div>
          <button
            onClick={() => setPremiumOpen(!premiumOpen)}
            className={cn(
              'w-full group flex items-center rounded-md px-3 py-2 text-sm font-medium',
              location.pathname.startsWith('/premium')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Star className="mr-3 h-5 w-5 flex-shrink-0" />
            Premium
            {premiumOpen
              ? <ChevronDown className="ml-auto h-4 w-4" />
              : <ChevronRight className="ml-auto h-4 w-4" />}
          </button>
          {premiumOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-3">
              {premiumNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center rounded-md px-3 py-1.5 text-sm font-medium',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn('mr-2 h-4 w-4 flex-shrink-0', isActive(item.href) ? 'text-primary-foreground' : 'text-muted-foreground')} />
                  {item.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200/50 pt-2 mt-2 space-y-1">
          {filterBottom(bottomNavigation).map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive(item.href) ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
              />
              {item.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
