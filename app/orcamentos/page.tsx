'use client';

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, Plus, Search, Filter, ArrowRight, 
  Clock, CheckCircle2, XCircle, Send, FileCode2,
  MoreVertical, Edit, Trash2, Printer, FileDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';

// Componente de Linha Memoizado
const OrcamentoRow = memo(({ 
  o, 
  getStatusColor, 
  getStatusIcon 
}: { 
  o: any, 
  getStatusColor: any, 
  getStatusIcon: any 
}) => {
  return (
    <tr className="border-zinc-800 hover:bg-zinc-900/50 transition-all group">
      <td className="p-4 text-sm font-black italic text-white group-hover:text-orange-500">
        <Link href={`/orcamentos/${o.id}`}>{o.numero}</Link>
      </td>
      <td className="p-4 text-sm uppercase font-black text-white truncate max-w-[200px]">{o.cliente.nome}</td>
      <td className="p-4 text-sm">
         {o.veiculo ? (
           <div className="flex flex-col uppercase min-w-0">
             <span className="text-[10px] font-black text-white truncate">{o.veiculo.modelo}</span>
             <span className="text-[9px] font-mono font-bold text-zinc-500 truncate">{o.veiculo.placa}</span>
           </div>
         ) : <span className="text-[9px] text-zinc-600 font-bold uppercase italic truncate">N/A</span>}
      </td>
      <td className="p-4 text-sm uppercase text-[10px] font-bold text-zinc-400">{formatDate(o.created_at)}</td>
      <td className="p-4 text-sm font-mono font-bold text-orange-500">{formatCurrency(o.valor_total)}</td>
      <td className="p-4 text-sm text-center">
         <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest ${getStatusColor(o.status)}`}>
           {getStatusIcon(o.status)} {o.status}
         </span>
      </td>
      <td className="p-4 text-sm text-right">
         <div className="flex items-center justify-end gap-2">
            <Link href={`/orcamentos/${o.id}`} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"><ArrowRight size={16} /></Link>
            {o.status === 'RASCUNHO' && <Link href={`/orcamentos/${o.id}/editar`} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-orange-500 transition"><Edit size={16} /></Link>}
         </div>
      </td>
    </tr>
  );
});

OrcamentoRow.displayName = 'OrcamentoRow';

export default function OrcamentosPage() {
  const [data, setData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchOrcamentos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orcamentos?q=${search}&status=${statusFilter}&page=${page}&limit=10`);
      const result = await res.json();
      const items = Array.isArray(result) ? result : (result.items || []);
      const total = result.total || items.length;
      const totalPages = result.totalPages || 1;
      setData({ items, total, totalPages });
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      setData({ items: [], total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrcamentos();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchOrcamentos]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RASCUNHO': return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      case 'ENVIADO': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'APROVADO': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'REPROVADO': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'CONVERTIDO': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RASCUNHO': return <Clock size={12} />;
      case 'ENVIADO': return <Send size={12} />;
      case 'APROVADO': return <CheckCircle2 size={12} />;
      case 'REPROVADO': return <XCircle size={12} />;
      case 'CONVERTIDO': return <FileCode2 size={12} />;
      default: return <Clock size={12} />;
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <FileText className="text-orange-600 w-8 h-8" /> Gestão de Orçamentos
          </h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] ml-11">
            Propostas Comerciais e Orçamentos
          </p>
        </div>
        <Link 
          href="/orcamentos/novo"
          className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center gap-2 active:scale-95 whitespace-nowrap justify-center"
        >
          <Plus size={16} /> Novo Orçamento
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR POR NÚMERO, CLIENTE OU PLACA..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pl-14 text-sm text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-800 shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
          />
        </div>
        <div className="md:col-span-4">
          <select 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500 outline-none focus:border-orange-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">TODOS STATUS</option>
            <option value="RASCUNHO">RASCUNHO</option>
            <option value="ENVIADO">ENVIADO</option>
            <option value="APROVADO">APROVADO</option>
            <option value="REPROVADO">REPROVADO</option>
            <option value="CONVERTIDO">CONVERTIDO</option>
          </select>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                    <th className="p-4 italic">Nº Proposta</th>
                    <th className="p-4 italic">Cliente</th>
                    <th className="p-4 italic">Veículo</th>
                    <th className="p-4 italic">Data</th>
                    <th className="p-4 italic">Total</th>
                    <th className="p-4 italic">Status</th>
                    <th className="p-4 italic text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-20 text-center">
                        <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : data.items.length > 0 ? (
                    data.items.map((o) => (
                      <OrcamentoRow 
                        key={o.id} 
                        o={o} 
                        getStatusColor={getStatusColor} 
                        getStatusIcon={getStatusIcon} 
                      />
                    ))
                  ) : (
                    <tr><td colSpan={7} className="p-20 text-center uppercase text-[10px] font-black text-zinc-700 italic tracking-widest">Nenhum orçamento encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
              <Pagination 
                page={page} 
                totalPages={data.totalPages} 
                onPageChange={setPage} 
              />
            </div>
          </div>
      </div>
  );
}
