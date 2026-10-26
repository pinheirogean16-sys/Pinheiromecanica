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
      ✅ ALTERAÇÕES DE IMPRESSÃO NO CONTAINER PRINCIPAL:
      - print:block e print:h-auto: impedem que o sistema force a página a ter apenas 1 tela de altura.
      - print:overflow-visible: permite que o conteúdo vaze para a página 2, 3, etc.
    */
    <div className="flex w-full h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      
      {/* ✅ ESCONDE A SIDEBAR NA IMPRESSÃO ENVOLVENDO ELA */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:overflow-visible print:h-auto">
        
        {/* ✅ ESCONDE O HEADER (notificações, sair) NA IMPRESSÃO ENVOLVENDO ELE */}
        <div className="print:hidden">
          <Header />
        </div>
        
        {/* 
          ✅ ALTERAÇÕES NO MAIN:
          - print:bg-white / print:bg-transparent: remove o fundo escuro.
          - print:p-0: remove o preenchimento (padding) para o papel não ter margens duplas.
          - print:overflow-visible / print:h-auto: permite o documento fluir.
        */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950 print:bg-white print:p-0 print:overflow-visible print:h-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
