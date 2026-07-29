import React from 'react';
import { CreditCard, Calendar, Truck, AlertCircle } from 'lucide-react';

interface ResumoOSProps {
  valServicos: number;
  valPecas: number;
  desconto: number;
  total: number;
  previsao: string;
  onPrevisaoChange: (val: string) => void;
  onDescontoChange: (val: number) => void;
  onSubmit: () => void;
  loading?: boolean;
}

export const ResumoOS = ({ 
  valServicos, valPecas, desconto, total, previsao,
  onPrevisaoChange, onDescontoChange, onSubmit, loading 
}: ResumoOSProps) => {
  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <CreditCard size={120} className="text-white" />
        </div>

        <h2 className="text-sm font-black text-white uppercase tracking-widest font-mono border-b border-zinc-800 pb-4">Resumo da OS</h2>
        
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-widest">Previsão de Entrega</label>
            <input 
                type="datetime-local" 
                value={previsao}
                onChange={(e) => onPrevisaoChange(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-orange-500 outline-none font-mono" 
            />
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-medium">Mão de Obra</span>
              <span className="text-xs font-bold text-white">{formatCurrency(valServicos)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-medium">Peças</span>
              <span className="text-xs font-bold text-white">{formatCurrency(valPecas)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-500 font-medium">Subtotal</span>
              <span className="text-xs font-bold text-white">{formatCurrency(valServicos + valPecas)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-xs text-zinc-500 font-medium">Desconto</span>
              <input 
                type="number" 
                value={desconto}
                onChange={(e) => onDescontoChange(parseFloat(e.target.value) || 0)}
                className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-right text-xs font-mono text-orange-500"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] font-mono text-zinc-500 uppercase font-black tracking-widest mb-1">Total Geral</p>
                <h3 className="text-3xl font-black text-white tracking-tighter">{formatCurrency(total)}</h3>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">
                   A receber
                </span>
              </div>
            </div>
          </div>

          <button 
            disabled={loading}
            onClick={onSubmit}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 transition-all mt-4"
          >
            {loading ? 'Processando...' : 'Gerar Ordem de Serviço'}
          </button>
        </div>
      </div>

      {/* Stock Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
        <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
          <Truck size={20} />
        </div>
        <div>
          <p className="text-[11px] font-bold text-white">Status do Estoque</p>
          <p className="text-[10px] text-green-500/80 font-medium">Todas as peças estão disponíveis.</p>
        </div>
      </div>
    </div>
  );
};
