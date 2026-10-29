'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BlockedScreen from '@/components/BlockedScreen';

export default function LayoutWrapper({ 
  children, 
  isBlocked 
}: { 
  children: React.ReactNode; 
  isBlocked?: boolean 
}) {
  const pathname = usePathname();
  
  // Verifica se a rota atual é a do Master Admin
  const isMasterAdmin = pathname.startsWith('/master-admin');

  // ✅ SE ESTIVER BLOQUEADO:
  if (isBlocked) {
    // 1. Permite acessar o Checkout (pagar a fatura)
    if (pathname.startsWith('/checkout')) {
      return <>{children}</>;
    }

    // 2. Permite acessar Configurações da Empresa (para arrumar CNPJ e poder pagar)
    if (pathname.startsWith('/configuracoes/empresa')) {
      return (
        <div className="flex w-full h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
          <div className="contents print:hidden"><Sidebar /></div>
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:block print:overflow-visible print:h-auto">
            <div className="contents print:hidden"><Header /></div>
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950 print:bg-white print:p-0 print:overflow-visible print:h-auto print:block">
              {children}
            </main>
          </div>
        </div>
      );
    }

    // 3. Para qualquer outra rota, mostra a Tela de Bloqueio
    return <BlockedScreen />;
  }

  // Se for Master Admin, renderiza só o conteúdo
  if (isMasterAdmin) {
    return <>{children}</>;
  }

  // Layout Normal do Sistema
  return (
    <div className="flex w-full h-screen overflow-hidden print:block print:h-auto print:overflow-visible print:bg-white">
      <div className="contents print:hidden">
        <Sidebar />
      </div>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden print:block print:overflow-visible print:h-auto">
        <div className="contents print:hidden">
          <Header />
        </div>
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950 print:bg-white print:p-0 print:overflow-visible print:h-auto print:block">
          {children}
        </main>
      </div>
    </div>
  );
}
