// components/ProFeature.tsx
'use client';

import { Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlan } from '@/lib/use-plan';

interface ProFeatureProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function ProFeature({ 
  children, 
  title = 'Recurso Exclusivo PRO', 
  description = 'Faça o upgrade para o plano PRO para liberar este módulo.'
}: ProFeatureProps) {
  const { isPro, loading } = usePlan();
  const router = useRouter();

  // Enquanto verifica o plano, mostra um loading
  if (loading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center bg-zinc-900/50 rounded-3xl border border-zinc-800 animate-pulse">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Validando permissões...</p>
      </div>
    );
  }

  // Se for PRO, mostra o conteúdo real
  if (isPro) {
    return <>{children}</>;
  }

  // Se for Básico, bloqueia com o cadeado
  return (
    <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
      {/* Fundo do conteúdo borrado (opacity baixa e blur) */}
      <div className="opacity-20 grayscale pointer-events-none blur-[2px] select-none p-8">
        {children}
      </div>

      {/* Overlay com o Cadeado */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-6 text-center">
        <div className="w-20 h-20 bg-zinc-900 border border-orange-500/30 text-orange-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-orange-900/40">
          <Lock size={36} />
        </div>
        <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
        <p className="text-xs text-zinc-400 max-w-md mt-2 mb-8 leading-relaxed font-medium">
          {description}
        </p>
        <button
          onClick={() => router.push('/configuracoes/plano')}
          className="px-10 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-950/40 active:scale-95"
        >
          Fazer Upgrade Agora
        </button>
      </div>
    </div>
  );
}
