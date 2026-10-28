'use client';

import { useState } from 'react';
import { ShieldAlert, Zap, Lock, Loader2, ArrowRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BlockedScreen() {
  const [loadingPlano, setLoadingPlano] = useState<'BASICO' | 'PRO' | null>(null);
  const router = useRouter();

  const handleAssinar = async (plano: 'BASICO' | 'PRO') => {
    setLoadingPlano(plano);
    try {
      const res = await apiFetch<{ paymentId: string }>('/api/pagamento/assinar', {
        method: 'POST',
        body: { plano },
      });

      if (res.paymentId) {
        router.push(`/checkout/${res.paymentId}`);
      } else {
        toast.error('Erro ao gerar pagamento. Tente novamente.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar assinatura.');
    } finally {
      setLoadingPlano(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-zinc-900 border border-red-500/30 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-8 text-center">
        
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight italic">Acesso Bloqueado</h1>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">
            Seu período de testes expirou ou sua conta está pendente. Escolha um dos planos abaixo para desbloquear o acesso imediatamente.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {/* Card Básico */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
            <div>
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">Plano Básico</p>
              <p className="text-2xl font-black text-white">R$ 89,90<span className="text-xs text-zinc-500 font-bold">/mês</span></p>
              <ul className="text-left text-[11px] text-zinc-400 space-y-1.5 mt-3">
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-orange-500" /> Até 3 usuários</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-orange-500" /> OS ilimitadas</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-orange-500" /> Estoque básico</li>
              </ul>
            </div>
            <button
              onClick={() => handleAssinar('BASICO')}
              disabled={loadingPlano !== null}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition disabled:opacity-50"
            >
              {loadingPlano === 'BASICO' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Assinar Básico'}
            </button>
          </div>

          {/* Card PRO */}
          <div className="bg-zinc-900 border-2 border-orange-500 p-6 rounded-2xl space-y-4 relative overflow-hidden flex flex-col justify-between shadow-lg">
            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl">
              Recomendado
            </div>
            <div>
              <p className="text-xs font-black text-orange-500 uppercase tracking-widest mb-1">Plano PRO</p>
              <p className="text-2xl font-black text-white">R$ 149,90<span className="text-xs text-zinc-400 font-bold">/mês</span></p>
              <ul className="text-left text-[11px] text-zinc-300 space-y-1.5 mt-3">
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-orange-500" /> Usuários ilimitados</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-orange-500" /> Portal do Cliente</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-orange-500" /> Financeiro e DRE completo</li>
              </ul>
            </div>
            <button
              onClick={() => handleAssinar('PRO')}
              disabled={loadingPlano !== null}
              className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg disabled:opacity-50"
            >
              {loadingPlano === 'PRO' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Assinar PRO'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <Link href="/login" className="text-xs font-bold text-zinc-500 hover:text-white transition">
            Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Ícone auxiliar (se não estiver importado)
import { CheckCircle2 } from 'lucide-react';
