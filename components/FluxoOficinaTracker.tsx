'use client';

import React from 'react';
import { 
  ClipboardCheck, Eye, Package, Wrench, 
  ShieldCheck, Check, Truck, AlertTriangle 
} from 'lucide-react';

interface FluxoOficinaTrackerProps {
  currentStatus: string;
}

const STEPS = [
  { id: 'ABERTA', label: 'Aberta', icon: ClipboardCheck },
  { id: 'EM_DIAGNOSTICO', label: 'Diagnóstico', icon: Eye },
  { id: 'AGUARDANDO_PECAS', label: 'Aguardando Peças', icon: Package },
  { id: 'EM_EXECUCAO', label: 'Execução', icon: Wrench },
  { id: 'AGUARDANDO_APROVACAO', label: 'Aprovação', icon: ShieldCheck },
  { id: 'FINALIZADA', label: 'Finalizada', icon: Check },
  { id: 'ENTREGUE', label: 'Entregue', icon: Truck },
];

export function FluxoOficinaTracker({ currentStatus = 'ABERTA' }: FluxoOficinaTrackerProps) {
  const isCancelled = currentStatus === 'CANCELADA';
  const activeIdx = STEPS.findIndex(step => step.id === currentStatus);

  if (isCancelled) {
    return (
      <div id="fluxo-oficina-cancelado" className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 flex items-center gap-4 shadow-xl">
        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-950/35">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-white font-black text-sm uppercase tracking-wider">Ordem de Serviço Cancelada</h4>
          <p className="text-zinc-500 text-xs mt-1 uppercase font-mono tracking-wide">
            Esta ordem de serviço foi interrompida e nenhum fluxo mecânico adicional está planejado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="fluxo-oficina-rastreador" className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 lg:p-8 shadow-xl">
      <h3 className="text-[11px] font-black text-zinc-600 uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
        <span>●</span> Status do Fluxo da Oficina
      </h3>
      
      {/* Timeline container */}
      <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-2">
        {/* Progress bar line (only visible on md+) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-zinc-900/60 hidden md:block" />
        
        {/* Dynamic active line */}
        {activeIdx > 0 && (
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-orange-600/80 transition-all duration-500 ease-in-out hidden md:block"
            style={{ width: `${(activeIdx / (STEPS.length - 1)) * 100}%` }}
          />
        )}

        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIdx;
          const isActive = idx === activeIdx;
          const isUpcoming = idx > activeIdx;
          const IconComponent = step.icon;

          return (
            <div 
              key={step.id} 
              className="relative z-10 flex md:flex-col items-center gap-4 md:gap-3 w-full md:w-auto"
            >
              {/* Process line for mobile */}
              {idx < STEPS.length - 1 && (
                <div 
                  className={`absolute left-6 top-12 bottom-0 w-[2px] -z-10 md:hidden ${
                    isCompleted ? 'bg-orange-600' : 'bg-zinc-900'
                  }`}
                  style={{ height: 'calc(100% + 1.5rem)' }}
                />
              )}

              {/* Status Indicator Icon Circle */}
              <div 
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 relative shadow-md ${
                  isCompleted 
                    ? 'bg-orange-600/10 border-2 border-orange-600 text-orange-500 scale-100 shadow-orange-950/20' 
                    : isActive 
                    ? 'bg-orange-600 text-white scale-110 shadow-lg shadow-orange-950/40 border-2 border-orange-500 ring-4 ring-orange-950/30' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-600 scale-95'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                {isCompleted && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center border border-zinc-950 text-white text-[8px] font-black">
                    ✓
                  </span>
                )}
              </div>

              {/* Text labels */}
              <div className="text-left md:text-center flex flex-col">
                <span 
                  className={`text-xs uppercase tracking-wider font-extrabold transition-colors duration-300 ${
                    isActive 
                      ? 'text-orange-500 scale-105' 
                      : isCompleted 
                      ? 'text-zinc-300' 
                      : 'text-zinc-600 font-bold'
                  }`}
                >
                  {step.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5 md:hidden">
                  {isCompleted ? 'concluído' : isActive ? 'em andamento' : 'pendente'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
