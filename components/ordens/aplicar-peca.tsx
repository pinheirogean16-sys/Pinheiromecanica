'use client';

import { useState } from 'react';
import { Package, Search, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Peca {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
  preco_venda: number;
}

export default function AplicarPeca({ 
  osId, 
  disponiveis, 
  onSuccess 
}: { 
  osId: string; 
  disponiveis: Peca[]; 
  onSuccess: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedPeca, setSelectedPeca] = useState<Peca | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = disponiveis.filter(p => 
    p.descricao.toLowerCase().includes(search.toLowerCase()) || 
    p.codigo.toLowerCase().includes(search.toLowerCase())
  );

  const handleApply = async () => {
    if (!selectedPeca) return;
    if (quantidade > selectedPeca.quantidade) {
      setError('Quantidade superior ao saldo em estoque');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/ordens/${osId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pecas: [{
            pecaId: selectedPeca.id,
            quantidade: quantidade,
            valorUnit: selectedPeca.preco_venda
          }]
        }),
      });

      if (res.ok) {
        setSelectedPeca(null);
        setQuantidade(1);
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.message || 'Erro ao aplicar peça');
      }
    } catch (err) {
      setError('Falha na comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-4 bg-zinc-800/50 border-b border-zinc-800 flex items-center gap-2">
        <Package className="w-4 h-4 text-orange-500" />
        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Requisição de Peças</h3>
      </div>

      <div className="p-4 space-y-4">
        {!selectedPeca ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar componente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeca(p)}
                  disabled={p.quantidade <= 0}
                  className="w-full text-left p-3 rounded-lg hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700 flex items-center justify-between group disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <div>
                    <p className="text-xs font-bold text-zinc-200 uppercase truncate">{p.descricao}</p>
                    <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{p.codigo} • Saldo: {p.quantidade} un</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-orange-500">{formatCurrency(p.preco_venda)}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl relative">
              <button 
                onClick={() => setSelectedPeca(null)}
                className="absolute top-2 right-2 text-zinc-500 hover:text-white text-[10px] font-mono uppercase"
              >
                Trocar
              </button>
              <p className="text-[10px] font-mono text-orange-500 font-bold uppercase">{selectedPeca.codigo}</p>
              <h4 className="text-sm font-bold text-white uppercase mt-1">{selectedPeca.descricao}</h4>
              <p className="text-xs text-zinc-400 mt-1 font-mono">Disponível: {selectedPeca.quantidade} unidades</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">QTD Requerida</label>
                <input
                  type="number"
                  min={1}
                  max={selectedPeca.quantidade}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-center text-sm font-mono focus:ring-1 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Total Líquido</label>
                <div className="bg-zinc-950 flex items-center justify-center border border-zinc-800 rounded-lg p-2 text-sm font-mono text-white text-center">
                  {formatCurrency(quantidade * selectedPeca.preco_venda)}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-500 text-[10px] font-mono bg-rose-500/5 p-2 rounded border border-rose-500/20">
                <AlertCircle className="w-3 h-3" /> {error}
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={loading || quantidade <= 0 || quantidade > selectedPeca.quantidade}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest text-[10px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Confirmar Baixa <Plus className="w-3 h-3" /></>}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
