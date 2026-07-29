import React from 'react';
import { History, DollarSign, ListChecks } from 'lucide-react';

interface ClienteHistoricoProps {
  historico: {
    ultimaOS?: { numero: number; data: string };
    totalOS: number;
    totalGasto: number;
  } | null;
}

export const ClienteHistorico = ({ historico }: ClienteHistoricoProps) => {
  if (!historico) return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center justify-center min-h-[160px]">
      <p className="text-xs text-zinc-600 font-medium">Selecione um cliente para ver o histórico.</p>
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <History size={16} className="text-orange-500" />
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-mono">Histórico do Cliente</h3>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <ListChecks size={14} className="text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Última OS</span>
          </div>
          <span className="text-xs font-bold text-white">
            {historico.ultimaOS ? `#${historico.ultimaOS.numero} em ${new Date(historico.ultimaOS.data).toLocaleDateString()}` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <History size={14} className="text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Total de OS</span>
          </div>
          <span className="text-xs font-bold text-white">{historico.totalOS}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <div className="flex items-center gap-3">
            <DollarSign size={14} className="text-zinc-500" />
            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Total Gasto</span>
          </div>
          <span className="text-xs font-black text-green-500">
            {historico.totalGasto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>
    </div>
  );
};
