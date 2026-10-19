'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// A14: essa rota era uma duplicata desatualizada da tela /importar-nfe.
// Redirecionamos para a tela oficial, que é a única que envia o XML bruto
// ao servidor (A03) e mantém consistência no parser.
export default function EstoqueImportarNFeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/importar-nfe');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
      <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] italic">
        Redirecionando para a central de importação...
      </p>
    </div>
  );
}
