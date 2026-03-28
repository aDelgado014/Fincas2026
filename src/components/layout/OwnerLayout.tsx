import { OwnerSidebar } from './OwnerSidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';

export function OwnerLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <OwnerSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto relative bg-slate-50/50 p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
