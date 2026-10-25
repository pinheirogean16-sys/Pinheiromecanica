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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-orange-500/30 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/20 text-orange-400">
          <Sparkles className="h-6 w-6" />
        </div>

        <h2 id="upgrade-title" className="text-xl font-semibold text-white">
          Faça upgrade para o PRO
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          {info.message ||
            'Você atingiu o limite do plano Básico. Faça upgrade para continuar sem restrições.'}
        </p>

        {(info.planoAtual || info.feature) && (
          <p className="mt-2 text-xs text-zinc-500">
            {info.planoAtual && (
              <>
                Plano atual:{' '}
                <strong className="text-zinc-300">{info.planoAtual}</strong>
              </>
            )}
            {info.feature && (
              <>
                {info.planoAtual ? ' · ' : ''}
                Recurso: <strong className="text-zinc-300">{info.feature}</strong>
              </>
            )}
          </p>
        )}

        <div className="mt-5 space-y-2 rounded-xl bg-zinc-950/60 p-4 text-sm text-zinc-300">
          <p className="mb-2 font-medium text-white">O que você ganha no PRO:</p>
          {[
            'Usuários ilimitados',
            'Portal do Cliente',
            'Relatórios avançados',
            'Financeiro completo (DRE, Curva ABC)',
            'Suporte prioritário',
          ].map((item) => (
            <div key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => setOpen(false)}
            className="flex-1 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
          >
            Agora não
          </button>
          <button
            onClick={() => {
              setOpen(false);
              router.push('/configuracoes/plano');
            }}
            className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500"
          >
            Ver planos
          </button>
        </div>
      </div>
    </div>
  );
}
