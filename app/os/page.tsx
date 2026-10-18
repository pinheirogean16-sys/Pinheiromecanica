'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Plus, FileText, 
  Eye, Edit, Printer, 
  Clock, Package, CheckCircle, List,
  AlertTriangle, AlertCircle, Trash2, Inbox
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { Pagination } from '@/components/Pagination';
import { toast } from 'sonner';

// Componente de Linha Memoizado
const OSRow = memo(({ os, formatCurrency, handlePrint, handleDelete }: { os: any, formatCurrency: any, handlePrint: any, handleDelete: any }) => (
  <tr className="border-zinc-800 hover:bg-zinc-900/50 transition-all group">
    <td className="p-4 text-sm">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-orange-500 font-mono text-base">#{os.numero}</span>
          {os.tipoOS === 'CAMPO' ? (
            <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              🌾 CAMPO
            </span>
          ) : (
            <span className="text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              🏭 OFICINA
            </span>
          )}
        </div>
        <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em]">{os.id.slice(-8)}</span>
      </div>
    </td>
    <td className="p-4 text-sm">
      <div className="flex flex-col">
        <p className="font-black text-white group-hover:text-orange-500 transition-colors uppercase tracking-tight italic truncate max-w-[200px]">{os.cliente.nome}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] bg-zinc-950 border border-zinc-800 py-0.5 px-2 rounded-full font-mono font-bold text-zinc-400">{os.veiculo.placa}</span>
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest truncate max-w-[150px]">{os.veiculo.modelo}</span>
        </div>
      </div>
    </td>
    <td className="p-4 text-sm">
      <p className="text-[11px] font-medium text-zinc-400 line-clamp-2 max-w-[250px] leading-relaxed uppercase italic">
        {os.diagnostico || '— SEM RELATO DE TRIAGEM —'}
      </p>
    </td>
    <td className="p-4 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
          {os.mecanico?.name?.split(' ')[0] || 'NÃO ATRIBUÍDO'}
        </span>
      </div>
    </td>
    <td className="p-4 text-sm text-center">
      <div className="flex flex-col gap-2 items-center">
        <StatusBadge status={os.status} />
        <div className="text-[8px] font-black uppercase tracking-tighter text-zinc-600">
          {new Date(os.data_entrada).toLocaleDateString('pt-BR')}
        </div>
      </div>
    </td>
    <td className="p-4 text-sm text-right">
      <div className="flex flex-col">
        <span className="font-bold text-white font-mono tracking-tighter text-base">{formatCurrency(os.valor_total)}</span>
        <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest italic">{os._count?.pecas || 0} PEÇAS</span>
      </div>
    </td>
    <td className="p-4 text-sm text-center">
      <div className="flex items-center justify-center gap-1">
         <Link 
            href={`/os/${os.id}`}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title="Visualizar OS"
          >
            <Eye size={14} />
          </Link>
          <Link 
            href={`/os/${os.id}/editar`}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title="Editar OS"
          >
            <Edit size={14} />
          </Link>
          <button 
            onClick={() => handlePrint(os.id)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
            title="Imprimir OS"
          >
            <Printer size={14} />
          </button>
          <button 
            onClick={() => handleDelete(os.id, os.numero)}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition"
            title="Excluir OS"
          >
            <Trash2 size={14} />
          </button>
      </div>
    </td>
  </tr>
));

OSRow.displayName = 'OSRow';

export default function OSListingPage() {
  const [stats, setStats] = useState<any>(null);
  const [osData, setOsData] = useState<any>({ items: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tipo = params.get('tipo');
      if (tipo === 'OFICINA' || tipo === 'CAMPO') {
        setTipoFilter(tipo);
      }
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tipoFilter]);

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/ordens/stats', { signal });
      if (res.ok) setStats(await res.json());
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error(err);
    }
  }, []);

  const fetchOS = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const query = new URLSearchParams({
        q: debouncedSearch,
        page: page.toString(),
        limit: '10'
      });
      if (statusFilter !== 'all') query.append('status', statusFilter);
      if (tipoFilter !== 'all') query.append('tipoOS', tipoFilter);
      
      const res = await fetch(`/api/ordens?${query.toString()}`, { signal });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (data.items || []);
        const total = data.total || items.length;
        const totalPages = data.totalPages || 1;
        setOsData({ items, total, totalPages });
      } else {
        setError(true);
      }
    } catch (err: any) { 
      if (err.name !== 'AbortError') {
        console.error(err);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, tipoFilter, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchStats]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOS(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchOS]);

  const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleDelete = async (id: string, numero: number) => {
    if (!confirm(`Tem certeza que deseja excluir a OS #${numero}? Esta ação é irreversível.`)) return;
    
    try {
      const res = await fetch(`/api/ordens/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`OS #${numero} excluída com sucesso.`);
        fetchOS();
        fetchStats();
      } else {
        toast.error('Erro ao excluir OS');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir OS');
    }
  };

  const handlePrint = (id: string) => {
    window.open(`/os/${id}/imprimir`, '_blank');
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight italic truncate">Ordens de Serviço</h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1 truncate">Gestão de Manutenção e Fluxo Técnico</p>
        </div>
        <Link href="/os/nova" className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-8 py-4 font-black text-xs uppercase tracking-widest transition shadow-xl active:scale-95 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova Ordem de Serviço
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
        {[
          { label: 'Abertas', key: 'ABERTA', icon: FileText, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Diagnóstico', key: 'EM_DIAGNOSTICO', icon: Search, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Ag. Peças', key: 'AGUARDANDO_PECAS', icon: Package, color: 'text-orange-500', bg: 'bg-orange-600/10' },
          { label: 'Execução', key: 'EM_EXECUCAO', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Fin. Hoje', key: 'concluidasHoje', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'Total Base', key: 'total', icon: List, color: 'text-zinc-500', bg: 'bg-zinc-500/10' }
        ].map((item, idx) => (
          <div 
            key={idx}
            className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl relative overflow-hidden group shadow-lg min-w-0"
          >
            <div className={`absolute -top-6 -right-6 w-16 h-16 ${item.bg} blur-2xl group-hover:scale-150 transition-transform`} />
            <div className="flex items-center gap-2 mb-3">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest truncate">{item.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-black text-white italic tracking-tighter truncate">
                {item.key === 'total' ? stats?.total : (stats?.[item.key]?.count || 0)}
              </p>
              {stats?.[item.key]?.total !== undefined && (
                <span className="text-[8px] font-mono text-zinc-700 font-bold truncate">{formatCurrency(stats?.[item.key]?.total)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Listing */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              type="text" 
              placeholder="BUSCAR POR Nº DA OS, CLIENTE, PLACA OU SERVIÇO..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pl-12 text-sm text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-700 min-h-[48px]"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <select 
              className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] font-mono uppercase tracking-widest text-zinc-300 outline-none focus:border-orange-500 min-h-[48px] cursor-pointer appearance-none"
              value={tipoFilter}
              onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
            >
              <option value="all">Filtro de Tipo</option>
              <option value="OFICINA">🏭 OFICINA</option>
              <option value="CAMPO">🌾 CAMPO OS</option>
            </select>

            <select 
              className="w-full sm:w-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] font-mono uppercase tracking-widest text-zinc-300 outline-none focus:border-orange-500 min-h-[48px] cursor-pointer appearance-none"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="all">Todos os Status</option>
              <option value="ABERTA">Abertas</option>
              <option value="EM_DIAGNOSTICO">Diagnóstico</option>
              <option value="AGUARDANDO_PECAS">Ag. Peças</option>
              <option value="EM_EXECUCAO">Em Execução</option>
              <option value="AGUARDANDO_APROVACAO">Ag. Aprovação</option>
              <option value="FINALIZADA">Finalizadas</option>
              <option value="ENTREGUE">Entregues</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>
        </div>

        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
                <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest backdrop-blur-sm sticky top-0 z-10">
                  <th className="p-4 italic">Ref. Protocolo</th>
                  <th className="p-4 italic">Proprietário / Ativo</th>
                  <th className="p-4 italic">Triagem e Diagnóstico</th>
                  <th className="p-4 italic">Operador</th>
                  <th className="p-4 italic text-center">Status</th>
                  <th className="p-4 italic text-right">Liquidação</th>
                  <th className="p-4 italic text-center">Gestão</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Sincronizando protocolos...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-zinc-700 italic font-black uppercase tracking-widest text-[10px]">
                    Erro de Comunicação Tática
                  </td>
                </tr>
              ) : osData.items.length > 0 ? osData.items.map((os: any) => (
                <OSRow key={os.id} os={os} formatCurrency={formatCurrency} handlePrint={handlePrint} handleDelete={handleDelete} />
              )) : (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <FileText className="w-8 h-8 text-zinc-800 mx-auto mb-4 opacity-50" />
                    <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest italic">Nenhuma ordem de serviço localizada</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE GRID CARDS CONTAINER */}
        <div className="block lg:hidden divide-y divide-zinc-800/40 w-full max-w-full overflow-hidden min-w-0">
          {loading ? (
            <div className="p-20 text-center">
              <div className="w-8 h-8 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">Sincronizando protocolos...</p>
            </div>
          ) : error ? (
            <div className="p-20 text-center text-zinc-700 italic font-black uppercase tracking-widest text-[10px]">
              Erro de Comunicação Tática
            </div>
          ) : osData.items.length > 0 ? osData.items.map((os: any) => (
            <div key={os.id} className="p-5 space-y-4 hover:bg-zinc-900/20 transition-all group min-w-0">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-orange-500 font-mono text-sm">#{os.numero}</span>
                    {os.tipoOS === 'CAMPO' ? (
                      <span className="text-[7px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                        🌾 CAMPO
                      </span>
                    ) : (
                      <span className="text-[7px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                        🏭 OFICINA
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] block truncate">{os.id}</span>
                </div>
                <StatusBadge status={os.status} />
              </div>

              <div className="space-y-3.5 border-t border-zinc-900/40 pt-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-sans">Cliente</p>
                    <p className="text-white font-black uppercase italic tracking-tight truncate group-hover:text-orange-500 transition-colors" title={os.cliente.nome}>
                      {os.cliente.nome}
                    </p>
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-sans">Veículo</p>
                    <p className="text-zinc-300 font-bold uppercase truncate" title={`${os.veiculo.modelo} [${os.veiculo.placa}]`}>
                      {os.veiculo.modelo} <span className="text-[9px] text-zinc-500 font-bold font-sans">[{os.veiculo.placa}]</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-sans">Mecânico / Operador</p>
                    <p className="text-zinc-400 font-bold uppercase truncate">
                      {os.mecanico?.name?.split(' ')[0] || 'NÃO ATRIBUÍDO'}
                    </p>
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-sans">Valor Total</p>
                    <p className="text-orange-500 font-black italic tracking-tighter text-sm">
                      {formatCurrency(os.valor_total)}
                    </p>
                  </div>
                </div>

                <div className="space-y-0.5 min-w-0">
                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-sans">Diagnóstico Inicial</p>
                  <p className="text-zinc-400 italic line-clamp-2 uppercase leading-relaxed text-[11px]" title={os.diagnostico || undefined}>
                    {os.diagnostico || '— SEM RELATO DE TRIAGEM —'}
                  </p>
                </div>
              </div>

              {/* Botões Mobile com Toque 44px */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <Link href={`/os/${os.id}`} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition" title="Visualizar">
                  <Eye size={12} /> Visualizar
                </Link>
                <Link href={`/os/${os.id}/editar`} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition" title="Editar">
                  <Edit size={12} /> Editar
                </Link>
                <button onClick={() => handlePrint(os.id)} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition cursor-pointer" title="Imprimir">
                  <Printer size={12} /> Imprimir
                </button>
                <button onClick={() => handleDelete(os.id, os.numero)} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-red-500 text-[9px] font-black uppercase tracking-widest transition cursor-pointer" title="Excluir">
                  <Trash2 size={12} /> Excluir
                </button>
              </div>
            </div>
          )) : (
            <div className="p-20 text-center">
              <FileText className="w-8 h-8 text-zinc-800 mx-auto mb-4 opacity-50" />
              <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest italic">Nenhuma ordem de serviço localizada</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <p className="text-[10px] font-mono text-zinc-500 uppercase font-bold tracking-widest">
              Mostrando {osData.items.length > 0 ? (page - 1) * 10 + 1 : 0} a {Math.min(page * 10, osData.total)} de {osData.total} registros
            </p>
          </div>
          <Pagination 
            page={page} 
            totalPages={osData.totalPages} 
            onPageChange={setPage} 
          />
        </div>
      </div>
    </div>
  );
}
