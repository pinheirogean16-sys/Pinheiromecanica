'use client';

import React from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';

interface Servico {
  id: string;
  descricao: string;
  horas: number;
  valor_hora: number;
  valor_total: number;
}

interface ServicosTableProps {
  servicos: Servico[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
}

export const ServicosTable = ({ servicos, onAdd, onRemove, onUpdate }: ServicosTableProps) => {
  const total = servicos.reduce((acc, s) => acc + s.valor_total, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight font-mono">Serviços</h3>
          <p className="text-[10px] text-zinc-500 font-medium">Adicione a mão de obra necessária</p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-xl border border-zinc-700 transition"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-zinc-950/50 border-b border-zinc-800">
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black">Descrição do Serviço</th>
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black text-center">Horas</th>
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black text-right">Preço Un.</th>
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black text-right">Total</th>
              <th className="p-4 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {servicos.length > 0 ? servicos.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-800/10">
                <td className="p-4">
                  <input 
                    type="text" 
                    value={s.descricao}
                    onChange={(e) => onUpdate(s.id, 'descricao', e.target.value)}
                    placeholder="Ex: Troca de óleo"
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-zinc-700"
                  />
                </td>
                <td className="p-4 text-center">
                  <input 
                    type="number" 
                    value={s.horas}
                    onChange={(e) => onUpdate(s.id, 'horas', parseFloat(e.target.value))}
                    className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-center text-xs font-mono text-zinc-400"
                  />
                </td>
                <td className="p-4 text-right">
                  <input 
                    type="number" 
                    value={s.valor_hora}
                    onChange={(e) => onUpdate(s.id, 'valor_hora', parseFloat(e.target.value))}
                    className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-right text-xs font-mono text-zinc-400"
                  />
                </td>
                <td className="p-4 text-right text-xs font-black text-white">
                  {s.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => onRemove(s.id)} className="text-zinc-600 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-10 text-center text-xs text-zinc-600 italic">Nenhum serviço adicionado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-zinc-950/40 flex justify-between items-center px-8 border-t border-zinc-800">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-mono">Total Serviços</span>
        <span className="text-sm font-black text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
    </div>
  );
};
