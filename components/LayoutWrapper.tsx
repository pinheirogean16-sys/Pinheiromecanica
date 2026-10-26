'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMasterAdmin = pathname.startsWith('/master-admin');

  if (isMasterAdmin) {
    return <>{children}</>;
  }

  return (
    /* ✅ max-w-[100vw] e overflow-hidden garantem que nada vaze para os lados */
    <div className="flex w-full max-w-[100vw] h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      
      <div className="contents print:hidden">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:block print:overflow-visible print:h-auto">
        
        <div className="contents print:hidden">
          <Header />
        </div>
        
        {/* ✅ O main também ganha max-w-full para não esticar */}
        <main className="flex-1 w-full max-w-full min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950 print:bg-white print:p-0 print:overflow-visible print:h-auto print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
