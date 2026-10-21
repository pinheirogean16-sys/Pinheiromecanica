'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Verifica se a rota atual é a do Master Admin
  const isMasterAdmin = pathname.startsWith('/master-admin');

  // Se for Master Admin, renderiza só o conteúdo, sem Sidebar/Header
  if (isMasterAdmin) {
    return <>{children}</>;
  }

  // Para todas as outras telas, renderiza o layout normal
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
