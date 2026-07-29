'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    console.log(`🌐 [LayoutWrapper] CARREGADO - Rota atual: ${pathname}`);
  }, [pathname]);

  if (isLoginPage) {
    console.log('🖥️ [LayoutWrapper] Renderizando rota pública de LOGIN sem estrutura de Dashboard');
    return <>{children}</>;
  }

  console.log('📊 [LayoutWrapper] Renderizando estrutura de DASHBOARD (Sidebar + Header)');
  return (
    <div className="flex w-full h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
