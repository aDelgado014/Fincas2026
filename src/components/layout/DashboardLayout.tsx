import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';
import { AIAssistant } from '../common/AIAssistant';
import { SearchPalette } from '../common/SearchPalette';
import { useAuth } from '@/src/hooks/useAuth';

export function DashboardLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onSearchOpen={() => setSearchOpen(true)} />
        <main className="flex-1 overflow-y-auto relative">
          <Outlet />
          <AIAssistant />
        </main>
      </div>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

