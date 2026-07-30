'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/login', '/register', '/cadastro', '/esqueci-senha', '/trial', '/offline.html'];
  if (publicRoutes.includes(pathname)) return true;
  if (pathname === '/' || pathname === '') return true;
  return false;
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = isPublicRoute(pathname);

  useEffect(() => {
    console.log(`🌐 [LayoutWrapper] CARREGADO - Rota atual: ${pathname} (Pública: ${isPublic})`);
  }, [pathname, isPublic]);

  if (isPublic) {
    console.log(`🖥️ [LayoutWrapper] Renderizando rota pública (${pathname}) sem estrutura de Dashboard`);
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

