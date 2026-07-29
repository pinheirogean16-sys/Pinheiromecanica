'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft, 
  Calendar, FileText, Loader2, Download
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function FinanceiroHistorico() {
  const [loading, setLoading] = useState(true);
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  useEffect(() => {
    const fetchMovimentacoes = async () => {
      try {
        const res = await fetch('/api/financeiro', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setMovimentacoes(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    };

    fetchMovimentacoes();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const filteredMovimentacoes = (movimentacoes || []).filter(m => {
    const matchesSearch = (m.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (m.os?.cliente?.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (m.numero_documento || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === 'TODOS' || m.tipo === filterTipo;
    const matchesStatus = filterStatus === 'TODOS' || m.status === filterStatus;
    return matchesSearch && matchesTipo && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Carregando Histórico Financeiro...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white min-h-screen pb-20">
      <header className="p-8 md:p-12 border-b border-zinc-900 bg-zinc-950 sticky top-0 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <Link 
              href="/financeiro"
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">HISTÓRICO COMPLETO</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mt-1">Todos os lançamentos registrados no sistema</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
             <button className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-700 transition">
               <Download className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      <main className="p-8 md:p-12 max-w-6xl mx-auto w-full space-y-8">
        {/* Filtros */}
        <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="md:col-span-2">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3 block px-1">Buscar por descrição ou cliente</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" size={16} />
              <input 
                type="text" 
                placeholder="PROCURAR..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3 block px-1">Tipo</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="ENTRADA">ENTRADAS</option>
              <option value="SAIDA">SAÍDAS</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-3 block px-1">Status</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="TODOS">TODOS</option>
              <option value="PAGO">PAGO</option>
              <option value="PENDENTE">PENDENTE</option>
              <option value="ATRASADO">ATRASADO</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="space-y-4">
          {filteredMovimentacoes.length > 0 ? (
            filteredMovimentacoes.map((item) => (
              <Link 
                key={item.id}
                href={`/financeiro/${item.id}`}
                className="flex flex-col md:flex-row md:items-center p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-orange-600/30 transition-all group shadow-xl active:scale-95 gap-6"
              >
                <div className={`p-4 rounded-2xl border flex-shrink-0 ${item.tipo === 'ENTRADA' ? 'bg-green-600/5 border-green-600/20 text-green-500' : 'bg-red-600/5 border-red-600/20 text-red-500'}`}>
                  {item.tipo === 'ENTRADA' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[8px] font-black px-3 py-0.5 rounded-full uppercase tracking-tighter border ${
                      (item.status || 'PENDENTE') === 'PAGO' ? 'bg-green-600/10 border-green-600/20 text-green-500' : 
                      (item.status || 'PENDENTE') === 'PENDENTE' ? 'bg-orange-600/10 border-orange-600/20 text-orange-500' :
                      'bg-red-600/10 border-red-600/20 text-red-500'
                    }`}>
                      {item.status || 'PENDENTE'}
                    </span>
                    <span className="text-[9px] text-zinc-700 font-mono font-black uppercase tracking-widest italic">
                      {item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : '---'}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-orange-500 transition-colors uppercase italic">
                    {item.descricao || '---'}
                  </h4>
                  <p className="text-[9px] text-zinc-500 font-mono font-black uppercase tracking-widest mt-1">
                    {item.os ? `OS #${item.os.numero || '---'} — ${item.os.cliente?.nome || '---'}` : item.cliente?.nome || item.descricao || 'Movimento Avulso'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 pr-4">
                  <span className={`text-2xl font-black font-mono italic ${item.tipo === 'ENTRADA' ? 'text-green-500' : 'text-red-500'}`}>
                    {item.tipo === 'SAIDA' ? '—' : '+'}{formatCurrency(item.valor || 0)}
                  </span>
                  <div className="flex gap-2">
                    {item.forma_pagamento && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        {item.forma_pagamento}
                      </span>
                    )}
                    {item.categoria && (
                      <span className="text-[8px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        {item.categoria}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="p-20 border-2 border-dashed border-zinc-900 rounded-3xl flex flex-col items-center justify-center text-zinc-800">
              <FileText className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700">Nenhum lançamento encontrado para os filtros aplicados</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
