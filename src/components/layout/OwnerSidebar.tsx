import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Wrench,
  FileText,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Mi Portal', href: '/owner', icon: LayoutDashboard },
  { name: 'Mis Recibos', href: '/owner/recibos', icon: CreditCard },
  { name: 'Incidencias', href: '/owner/incidencias', icon: Wrench },
  { name: 'Documentos', href: '/owner/documentos', icon: FileText },
  { name: 'Perfil', href: '/owner/perfil', icon: User },
];

export function OwnerSidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Building2 className="mr-2 h-6 w-6 text-primary" />
        <span className="font-semibold tracking-tight">AdminFincas Portal</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
