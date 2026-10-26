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
    /* 
      ✅ CONTAINER PRINCIPAL:
      - print:block: desliga o flex para o Safari não bugar a paginação
      - print:h-auto / print:overflow-visible: permite o documento passar para a página 2
    */
    <div className="flex w-full h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      
      {/* ✅ ESCONDE A SIDEBAR NA IMPRESSÃO */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      {/* ✅ CONTAINER DO CONTEÚDO: também forçado a block */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:block print:overflow-visible print:h-auto">
        
        {/* ✅ ESCONDE O HEADER NA IMPRESSÃO */}
        <div className="print:hidden">
          <Header />
        </div>
        
        {/* 
          ✅ MAIN: 
          - print:block: desliga o flex
          - print:bg-white / print:p-0: remove o fundo escuro e as margens
        */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950 print:bg-white print:p-0 print:overflow-visible print:h-auto print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
