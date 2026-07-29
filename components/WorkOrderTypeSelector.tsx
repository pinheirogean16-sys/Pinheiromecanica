'use client';

import { ChevronLeft, Hammer, Milestone } from 'lucide-react';
import Link from 'next/link';

interface WorkOrderTypeSelectorProps {
  onSelect: (type: 'OFICINA' | 'CAMPO') => void;
}

export default function WorkOrderTypeSelector({ onSelect }: WorkOrderTypeSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-xl">
        <Link href="/os" className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">
            PINHEIRO DIESEL PRO <span className="text-zinc-700">|</span> <span className="text-orange-500">NOVA OS</span>
          </h1>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em] leading-none mt-1">
            Selecione o Tipo de Atendimento correspondente
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* OPÇÃO 1: OFICINA */}
        <button
          onClick={() => onSelect('OFICINA')}
          className="group relative text-left bg-gradient-to-br from-zinc-900 to-zinc-950 hover:from-zinc-850 hover:to-zinc-900 border border-zinc-800 hover:border-blue-500/50 rounded-[2.5rem] p-8 md:p-10 shadow-xl hover:shadow-blue-500/5 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          {/* Luz de destaque Azul */}
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 transition-all group-hover:h-1.5" />
          <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Hammer size={120} className="text-blue-500" />
          </div>

          <div className="space-y-6">
            <div className="inline-flex p-5 bg-blue-600/10 text-blue-500 rounded-[1.5rem] border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <Hammer size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                🏭 Oficina / Interno
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                Ideal para reparos no pátio e boxes da oficina. Focado no controle de boxes/elevadores, mão de obra agendada, peças do almoxarifado local e checklists de entrada.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-blue-500 group-hover:text-blue-400">
              <span>Acessar Fluxo Oficina</span>
              <span>→</span>
            </div>
          </div>
        </button>

        {/* OPÇÃO 2: CAMPO */}
        <button
          onClick={() => onSelect('CAMPO')}
          className="group relative text-left bg-gradient-to-br from-zinc-900 to-zinc-950 hover:from-zinc-850 hover:to-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-[2.5rem] p-8 md:p-10 shadow-xl hover:shadow-amber-500/5 transition-all duration-300 overflow-hidden cursor-pointer"
        >
          {/* Luz de destaque Âmbar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 transition-all group-hover:h-1.5" />
          <div className="absolute top-10 right-10 opacity-5 group-hover:opacity-10 transition-opacity">
            <Milestone size={120} className="text-amber-500" />
          </div>

          <div className="space-y-6">
            <div className="inline-flex p-5 bg-amber-500/10 text-amber-500 rounded-[1.5rem] border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-300">
              <Milestone size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                🌾 Campo / Externo
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                Para suporte móvel, resgates em rodovias ou fazendas. Focado em quilometragem (KM) percorrida, passagens de pedágio, alimentação, diárias técnicas, fotos de evidência e assinatura eletrônica do cliente.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono font-black uppercase tracking-wider text-amber-500 group-hover:text-amber-400">
              <span>Acessar Fluxo de Campo</span>
              <span>→</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
