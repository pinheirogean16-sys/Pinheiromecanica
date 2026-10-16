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
      <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
        Redirecionando para a central de importação...
      </p>
    </div>
  );
}
