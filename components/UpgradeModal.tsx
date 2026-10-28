'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Check } from 'lucide-react';

type UpgradeInfo = {
  message?: string;
  planoAtual?: string;
  limite?: number;
  total?: number;
  feature?: string;
};

const EVENT_NAME = 'vehlox:upgrade-required';

export function showUpgradeModal(info: UpgradeInfo = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: info }));
}

export function UpgradeModalHost() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<UpgradeInfo>({});
  const router = useRouter();

  useEffect(() => {
    function handler(e: Event) {
      const detail = ((e as CustomEvent).detail || {}) as UpgradeInfo;
      setInfo(detail);
      setOpen(true);
    }
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      {/* Fundo escuro com blur */}
      <div
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
        onClick={() => setOpen(false)}
      />

      {/* Card do Modal */}
      <div className="relative w-full max-w-lg rounded-[2.5rem] border border-zinc-800 bg-zinc-900 p-8 sm:p-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Efeitos de fundo */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-orange-600/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-orange-600/10 blur-3xl rounded-full pointer-events-none" />

        <button
          onClick={() => setOpen(false)}
          className="absolute right-5 top-5 z-10 rounded-xl p-2 bg-zinc-950 border border-zinc-800 text-zinc-500 transition hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-xl shadow-orange-900/40 rotate-3">
            <Sparkles className="h-8 w-8" />
          </div>

          <h2 id="upgrade-title" className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">
            Faça upgrade para o PRO
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-zinc-400 leading-relaxed font-medium">
            {info.message ||
              'Você atingiu o limite do plano Básico ou tentou acessar um recurso exclusivo. Faça upgrade para continuar sem restrições.'}
          </p>

          {(info.planoAtual || info.feature) && (
            <div className="mt-4 inline-flex flex-wrap gap-2">
              {info.planoAtual && (
                <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Plano Atual: <strong className="text-orange-500">{info.planoAtual}</strong>
                </span>
              )}
              {info.feature && (
                <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Recurso: <strong className="text-orange-500">{info.feature}</strong>
                </span>
              )}
            </div>
          )}

          <div className="mt-8 space-y-3 rounded-2xl bg-zinc-950/80 p-6 text-sm text-zinc-300 border border-zinc-800/50">
            <p className="mb-4 text-[10px] font-black uppercase tracking-widest text-white">O que você desbloqueia no PRO:</p>
            {[
              'Usuários ilimitados',
              'Portal do Cliente',
              'Relatórios e DRE Completo',
              'Assistente Inteligente (Vehly AI)',
              'Suporte prioritário'
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                <span className="font-bold uppercase tracking-wide text-[11px]">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition hover:text-white hover:bg-zinc-800"
            >
              Agora não
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push('/configuracoes/plano');
              }}
              className="flex-[2] rounded-xl bg-orange-600 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-orange-500 shadow-xl shadow-orange-950/30"
            >
              Ver planos e Fazer Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
