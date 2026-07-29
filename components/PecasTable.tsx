'use client';

import React from 'react';
import { Plus, Trash2, Package } from 'lucide-react';

interface PecaItem {
  id: string;
  peca_id: string;
  descricao: string;
  quantidade: number;
  valor_unit: number;
  valor_total: number;
}

interface PecasTableProps {
  pecas: PecaItem[];
  availablePecas: any[];
  onAdd: (peca: any) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, field: string, value: any) => void;
}

export const PecasTable = ({ pecas, availablePecas, onAdd, onRemove, onUpdate }: PecasTableProps) => {
  const total = pecas.reduce((acc, p) => acc + p.valor_total, 0);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden mt-6">
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-tight font-mono">Peças</h3>
          <p className="text-[10px] text-zinc-500 font-medium">Peças utilizadas no serviço</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-400 outline-none focus:border-orange-500 w-48"
            onChange={(e) => {
              const p = availablePecas.find(item => item.id === e.target.value);
              if (p) {
                onAdd(p);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>Buscar peça...</option>
            {availablePecas.map(p => (
              <option key={p.id} value={p.id}>{p.descricao} - {p.codigo}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-zinc-950/50 border-b border-zinc-800">
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black">Peça</th>
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black text-center">Qtde</th>
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black text-right">Preço Un.</th>
              <th className="p-4 text-[10px] font-mono text-zinc-500 uppercase font-black text-right">Total</th>
              <th className="p-4 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/40">
            {pecas.length > 0 ? pecas.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-800/10">
                <td className="p-4">
                  <p className="text-xs font-bold text-white uppercase">{p.descricao}</p>
                </td>
                <td className="p-4 text-center">
                  <input 
                    type="number" 
                    value={p.quantidade}
                    onChange={(e) => onUpdate(p.id, 'quantidade', parseInt(e.target.value))}
                    className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-center text-xs font-mono text-zinc-400"
                  />
                </td>
                <td className="p-4 text-right">
                  <p className="text-xs text-zinc-400 font-mono">
                    {p.valor_unit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </td>
                <td className="p-4 text-right text-xs font-black text-white">
                  {p.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => onRemove(p.id)} className="text-zinc-600 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="p-10 text-center text-xs text-zinc-600 italic">Nenhuma peça adicionada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-zinc-950/40 flex justify-between items-center px-8 border-t border-zinc-800">
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] font-mono">Total Peças</span>
        <span className="text-sm font-black text-white">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
      </div>
    </div>
  );
};
