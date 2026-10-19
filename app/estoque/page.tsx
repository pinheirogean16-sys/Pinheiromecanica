'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Package, Search, Plus, AlertTriangle, 
  Edit, Trash2, Eye, ArrowRightLeft,
  PlusCircle, MinusCircle, LayoutGrid, List as ListIcon,
  Warehouse, BarChart3, TrendingUp, X, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import { BRANDING } from '@/lib/branding';

interface Peca {
  id: string;
  codigo: string;
  descricao: string;
  fabricante: string | null;
  categoria: string;
  quantidade: number;
  estoque_minimo: number;
  localizacao: string | null;
  preco_custo: number;
  preco_venda: number;
  unidadeMedida?: string;
}

// Função de status do estoque movida para fora do componente (evita recriação)
const getEstoqueStatus = (qnt: number, min: number) => {
  if (qnt <= 0) return { label: 'CRÍTICO', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  if (qnt <= min) return { label: 'BAIXO', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
  return { label: 'OK', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
};

// Componente de Linha Memoizado
const PecaRow = memo(({ 
  peca, 
  handleQuickAdjust, 
  handleDelete 
}: { 
  peca: Peca, 
  handleQuickAdjust: any, 
  handleDelete: any 
}) => {
  const status = getEstoqueStatus(peca.quantidade, peca.estoque_minimo);
  
  return (
    <tr className="border-b border-zinc-800/40 hover:bg-zinc-900/50 transition-all group">
      <td className="p-4 max-w-[120px]"><p className="text-xs font-bold font-mono text-orange-500 italic tracking-tighter uppercase truncate" title={peca.codigo}>{peca.codigo}</p></td>
      <td className="p-4 overflow-hidden max-w-[240px]">
         <div className="space-y-1 min-w-0">
            <p className="text-sm font-black text-white uppercase tracking-tight leading-none group-hover:text-orange-500 transition-colors italic truncate" title={peca.descricao}>{peca.descricao}</p>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest leading-none truncate">REF: {peca.id.slice(-6).toUpperCase()}</p>
         </div>
      </td>
      <td className="p-4 max-w-[140px]"><span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-full truncate block" title={peca.categoria.replace(/_/g, ' ')}>{peca.categoria.replace(/_/g, ' ')}</span></td>
      <td className="p-4 text-center">
         <div className="flex flex-col items-center justify-center">
            <span className={`text-xl font-black font-mono italic tracking-tighter ${status.color}`}>{peca.quantidade} <span className="text-[10px] font-bold text-zinc-500 uppercase">{peca.unidadeMedida || 'un'}</span></span>
            <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => handleQuickAdjust(peca.id, peca.quantidade, 'add')} className="text-zinc-500 hover:text-green-500 cursor-pointer" title="Adicionar 1"><PlusCircle size={14} /></button>
               <button onClick={() => handleQuickAdjust(peca.id, peca.quantidade, 'remove')} className="text-zinc-500 hover:text-red-500 cursor-pointer" title="Remover 1"><MinusCircle size={14} /></button>
            </div>
         </div>
      </td>
      <td className="p-4 text-center"><span className="text-[10px] font-black text-zinc-600 font-mono italic">{peca.estoque_minimo}</span></td>
      <td className="p-4 text-right"><span className="text-xs font-black text-white font-mono italic tracking-tighter">{peca.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
      <td className="p-4 text-right"><span className="text-xs font-black text-orange-500/80 font-mono italic tracking-tighter">{(peca.quantidade * peca.preco_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></td>
      <td className="p-4 text-center">
         <div className="flex items-center justify-center gap-2">
            <Link href={`/estoque/${peca.id}`} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition" title="Visualizar"><Eye size={14} /></Link>
            <Link href={`/estoque/${peca.id}/editar`} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition" title="Editar"><Edit size={14} /></Link>
            <button onClick={() => handleDelete(peca.id, peca.descricao)} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition cursor-pointer" title="Excluir"><Trash2 size={14} /></button>
         </div>
      </td>
    </tr>
  );
});

PecaRow.displayName = 'PecaRow';

export default function EstoquePage() {
  const [activeSection, setActiveSection] = useState<'inventario' | 'analise'>('inventario');
  const [analiseData, setAnaliseData] = useState<any>(null);
  const [analiseLoading, setAnaliseLoading] = useState(false);
  
  // ✅ CORRIGIDO: totalPages inicia em 1
  const [data, setData] = useState<{ items: Peca[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Estado para o modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ id: string, descricao: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [metrics, setMetrics] = useState({
    totalSkus: 0,
    valorEstoque: 0,
    potencialVenda: 0,
    estoqueBaixo: 0,
    foraEstoque: 0,
  });

  const fetchAnalise = useCallback(async () => {
    setAnaliseLoading(true);
    try {
      const d = await apiFetch('/api/estoque/analise');
      setAnaliseData(d);
    } catch (e) {
      // Silencioso: o erro é tratado no estado de análise
    } finally {
      setAnaliseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'analise') {
      fetchAnalise();
    }
  }, [activeSection, fetchAnalise]);

  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [categoria, setCategoria] = useState('TODAS');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchValue]);

  const fetchPecas = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const cleanSearch = encodeURIComponent(debouncedSearch.trim());
      const result = await apiFetch(`/api/pecas?q=${cleanSearch}&categoria=${categoria}&page=${page}&limit=10`, { signal });
      
      const items = Array.isArray(result) ? result : (result.items || []);
      const total = typeof result.total === 'number' ? result.total : items.length;
      const totalPages = Math.max(1, result.totalPages || 1); // ✅ mínimo 1
      
      setData({ items, total, totalPages });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar almoxarifado' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoria, page]);

  const fetchMetrics = useCallback(async () => {
    try {
      const m = await apiFetch('/api/estoque/metricas');
      setMetrics({
        totalSkus: m.totalSkus || 0,
        valorEstoque: m.valorEstoque || 0,
        potencialVenda: m.potencialVenda || 0,
        estoqueBaixo: m.estoqueBaixo || 0,
        foraEstoque: m.foraEstoque || 0,
      });
    } catch (e) {
      // Silencioso: as métricas são atualizadas periodicamente
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    
    const runAsyncFetch = async () => {
      await fetchPecas(controller.signal);
      await fetchMetrics();
    };
    runAsyncFetch();

    return () => {
      controller.abort();
    };
  }, [fetchPecas, fetchMetrics]);

  useEffect(() => {
    apiFetch('/api/pecas/categorias')
      .then(data => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => setCategorias([]));
  }, []);

  // ✅ CRÍTICO: Corrigido para usar o endpoint de movimentação ao invés de PUT de peça
  const handleQuickAdjust = async (id: string, quantidade: number, operacao: 'add' | 'remove') => {
    try {
      await apiFetch('/api/estoque/movimentacao', {
        method: 'POST',
        body: {
          peca_id: id,
          tipo: operacao === 'add' ? 'ENTRADA' : 'SAIDA',
          quantidade: 1,
          motivo: 'AJUSTE',
          observacao: 'Ajuste rápido via listagem de estoque'
        }
      });
      
      toast.success(`Estoque ${operacao === 'add' ? 'adicionado' : 'removido'} com sucesso!`);
      
      // Atualiza localmente para feedback instantâneo, mas busca do banco em background para garantir sync
      setData(prev => ({
        ...prev,
        items: prev.items.map(p => p.id === id ? { 
          ...p, 
          quantidade: operacao === 'add' ? p.quantidade + 1 : Math.max(0, p.quantidade - 1) 
        } : p)
      }));
      
      fetchPecas();
      fetchMetrics();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao ajustar estoque' });
    }
  };

  const handleDeleteClick = (id: string, descricao: string) => {
    setDeletingItem({ id, descricao });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);

    try {
      await apiFetch(`/api/pecas/${deletingItem.id}`, { method: 'DELETE' });
      toast.success('Item removido do almoxarifado');
      setShowDeleteModal(false);
      setDeletingItem(null);
      fetchPecas();
      fetchMetrics();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro ao excluir item' });
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = useMemo(() => ({
    totalItens: metrics.totalSkus,
    valorTotal: metrics.valorEstoque,
    itensBaixos: metrics.estoqueBaixo,
    valorVenda: metrics.potencialVenda,
    foraEstoque: metrics.foraEstoque,
  }), [metrics]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3 truncate">
             <Warehouse className="text-orange-600 w-8 h-8 flex-shrink-0" />
             ALMOXARIFADO
          </h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] truncate">Controle de Insumos e Peças</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/estoque/movimentacao">
            <button className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
              <ArrowRightLeft size={16} />
              Movimentação
            </button>
          </Link>
          <Link href="/estoque/novo" className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center gap-2">
            <Plus size={16} /> NOVO ITEM
          </Link>
        </div>
      </div>

      {/* Abas de Navegação */}
      <div className="flex border-b border-zinc-800 pb-px gap-6">
        <button
          onClick={() => setActiveSection('inventario')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${
            activeSection === 'inventario' ? 'text-orange-500 italic font-black' : 'text-zinc-500 hover:text-white'
          }`}
        >
          {activeSection === 'inventario' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
          )}
          Estoque Geral
        </button>
        <button
          onClick={() => setActiveSection('analise')}
          className={`pb-4 text-xs font-black uppercase tracking-widest relative transition-all ${
            activeSection === 'analise' ? 'text-orange-500 italic font-black' : 'text-zinc-500 hover:text-white'
          }`}
        >
          {activeSection === 'analise' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full" />
          )}
          Giro, Curva ABC & Reposição
        </button>
      </div>

      {activeSection === 'inventario' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition hover:border-orange-500/30 group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-orange-600"><Package size={20} /></div>
                <span className="text-[10px] font-black text-green-500 px-2 py-1 bg-green-500/10 rounded-lg">ATIVO</span>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">TOTAL DE ITENS</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{stats.totalItens} <span className="text-zinc-600 text-sm">SKUs</span></h3>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition hover:border-orange-500/30 group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-blue-500"><TrendingUp size={20} /></div>
                <span className="text-[10px] font-black text-blue-400 px-2 py-1 bg-blue-500/10 rounded-lg">CUSTO</span>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">VALOR EM ESTOQUE</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition hover:border-orange-500/30 group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-red-500"><AlertTriangle size={20} /></div>
                {stats.itensBaixos > 0 && <span className="text-[10px] font-black text-red-400 px-2 py-1 bg-red-500/10 rounded-lg animate-pulse">URGENTE</span>}
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">ESTOQUE BAIXO</p>
              <h3 className={`text-3xl font-black ${stats.itensBaixos > 0 ? 'text-red-500' : 'text-white'} tracking-tight`}>{stats.itensBaixos} <span className="text-zinc-600 text-sm">ALERTAS</span></h3>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition hover:border-orange-500/30 group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-green-500"><BarChart3 size={20} /></div>
                <span className="text-[10px] font-black text-green-400 px-2 py-1 bg-green-500/10 rounded-lg">PROJEÇÃO</span>
              </div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">POTENCIAL DE VENDA</p>
              <h3 className="text-3xl font-black text-white tracking-tight">{stats.valorVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl shadow-xl animate-fadeIn w-full max-w-full overflow-hidden">
            <div className="relative w-full lg:flex-1 group min-w-0">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors"><Search size={18} /></div>
              <input type="text" id="campo-de-busca-estoque" placeholder="LOCALIZAR NO ALMOXARIFADO..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-14 pr-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-700 truncate min-h-[44px]" value={searchValue} onChange={(e) => { setSearchValue(e.target.value); setPage(1); }} />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full lg:w-64 min-w-0">
                <select className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-6 text-[10px] text-zinc-500 focus:border-orange-500 outline-none transition font-black uppercase tracking-widest cursor-pointer min-h-[44px] appearance-none" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }}>
                  <option value="TODAS">TODAS AS CATEGORIAS</option>
                  {categorias.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              
              <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 shadow-inner justify-center min-h-[44px] items-center">
                 <button onClick={() => setViewMode('list')} className={`flex-1 sm:flex-initial p-3 rounded-lg transition ${viewMode === 'list' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-600 hover:text-white'} min-h-[36px] flex items-center justify-center`}><ListIcon size={18} /></button>
                 <button onClick={() => setViewMode('grid')} className={`flex-1 sm:flex-initial p-3 rounded-lg transition ${viewMode === 'grid' ? 'bg-orange-600 text-white shadow-lg' : 'text-zinc-600 hover:text-white'} min-h-[36px] flex items-center justify-center`}><LayoutGrid size={18} /></button>
              </div>
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8 animate-fadeIn w-full max-w-full overflow-hidden">
            <div className="flex-1 xl:flex-[3] w-full min-w-0 space-y-6 overflow-hidden">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden min-h-[600px] flex flex-col w-full max-w-full">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                     <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
                     <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Sincronizando inventário...</p>
                  </div>
                ) : error ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Falha de Protocolo no Almoxarifado</p>
                  </div>
                ) : data.items.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-60">
                     <Package size={60} className="text-zinc-600" />
                     <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Nenhum Insumo Localizado na Base</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden lg:block w-full overflow-x-auto rounded-xl">
                      <table className="w-full min-w-[850px] text-left">
                        <thead>
                          <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                            <th className="p-4">Código / REF</th>
                            <th className="p-4">Descrição Item</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4 text-center">Quant (Un)</th>
                            <th className="p-4 text-center">Crítico</th>
                            <th className="p-4 text-right">Vlr Unit</th>
                            <th className="p-4 text-right text-orange-500/50">Vlr Total</th>
                            <th className="p-4 text-center">Gestão</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {data.items.map((peca) => (
                              <PecaRow 
                                key={peca.id} 
                                peca={peca} 
                                handleQuickAdjust={handleQuickAdjust} 
                                handleDelete={handleDeleteClick} 
                              />
                            ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="block lg:hidden divide-y divide-zinc-800/40 w-full max-w-full overflow-hidden min-w-0">
                      {data.items.map((peca) => {
                        const status = getEstoqueStatus(peca.quantidade, peca.estoque_minimo);
                        return (
                          <div key={peca.id} className="p-5 space-y-4 hover:bg-zinc-900/20 transition-all group min-w-0">
                            <div className="flex justify-between items-start gap-4 flex-nowrap">
                              <div className="space-y-1 min-w-0 flex-1">
                                <h4 className="text-sm font-black text-white uppercase italic leading-tight break-words truncate group-hover:text-orange-500 transition-colors" title={peca.descricao}>
                                  {peca.descricao}
                                </h4>
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[10px] font-bold font-mono text-orange-500 uppercase tracking-tighter">
                                    {peca.codigo}
                                  </span>
                                  <span className="text-[8px] text-zinc-500 font-mono font-bold">
                                    REF: {peca.id.slice(-6).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${status.color} bg-zinc-950 border ${status.border} shrink-0`}>
                                {status.label}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-zinc-900/40 pt-3">
                              <div className="space-y-1 min-w-0">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Categoria</p>
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-wider bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-full truncate block" title={peca.categoria}>{peca.categoria.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="space-y-1 min-w-0">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Quantidade</p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-black italic ${status.color}`}>
                                    {peca.quantidade} <span className="text-[9px] font-bold text-zinc-500 uppercase not-italic font-sans">{peca.unidadeMedida || 'un'}</span>
                                  </span>
                                  <div className="flex gap-1">
                                    <button onClick={() => handleQuickAdjust(peca.id, peca.quantidade, 'add')} className="p-1 bg-zinc-950 border border-zinc-900 rounded-md text-zinc-500 hover:text-green-500 cursor-pointer" title="Adicionar 1"><PlusCircle size={12} /></button>
                                    <button onClick={() => handleQuickAdjust(peca.id, peca.quantidade, 'remove')} className="p-1 bg-zinc-950 border border-zinc-900 rounded-md text-zinc-500 hover:text-red-500 cursor-pointer" title="Remover 1"><MinusCircle size={12} /></button>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1 min-w-0">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Preço Un.</p>
                                <p className="text-white font-black italic tracking-tighter text-xs">{peca.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                              </div>
                              <div className="space-y-1 min-w-0">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Fornecedor / Fab</p>
                                <p className="text-zinc-300 font-bold uppercase truncate" title={peca.fabricante || undefined}>{peca.fabricante || 'N/A'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-1">
                              <Link href={`/estoque/${peca.id}`} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition" title="Visualizar">
                                <Eye size={12} /> Visualizar
                              </Link>
                              <Link href={`/estoque/${peca.id}/editar`} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white text-[9px] font-black uppercase tracking-widest transition" title="Editar">
                                <Edit size={12} /> Editar
                              </Link>
                              <button onClick={() => handleDeleteClick(peca.id, peca.descricao)} className="min-h-[44px] flex items-center justify-center gap-1.5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition cursor-pointer" title="Excluir">
                                <Trash2 size={12} /> Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
                      <Pagination 
                        page={page} 
                        totalPages={data.totalPages} 
                        onPageChange={setPage} 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-8">
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                     <div><h3 className="text-lg font-black text-white uppercase">Análise de Ativos</h3><p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Resumo do Inventário</p></div>
                     <div className="space-y-4">
                        {[
                           { label: 'Valor Total em Estoque', value: stats.valorVenda, color: 'text-orange-600', format: true },
                           { label: 'Itens em Estoque', value: stats.totalItens, sub: 'SKUs Catalogados' },
                           { label: 'Estoque Baixo', value: stats.itensBaixos, color: 'text-yellow-500', sub: 'Requisição Urgente' },
                           { label: 'Fora de Estoque', value: stats.foraEstoque, color: 'text-red-500', sub: 'Reposição Necessária' }
                        ].map((item, idx) => (
                           <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 group hover:border-zinc-700 transition-colors">
                              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">{item.label}</p>
                              <div className="flex items-baseline justify-between">
                                 <span className={`text-xl font-black font-mono italic tracking-tighter ${item.color || 'text-white'}`}>{item.format ? item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : item.value}</span>
                                 {item.sub && <span className="text-[8px] text-zinc-600 font-black uppercase">{item.sub}</span>}
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Distribuição por Categoria</h4>
                        <div className="space-y-3">
                           {categorias.slice(0, 5).map(cat => (
                              <div key={cat} className="space-y-1.5">
                                 <div className="flex justify-between text-[9px] font-black uppercase tracking-widest"><span className="text-zinc-600">{cat.replace(/_/g, ' ')}</span><span className="text-white italic">{data.items.filter(p => p.categoria === cat).length}</span></div>
                                 <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800"><div className="h-full bg-orange-600" style={{ width: `${(data.items.filter(p => p.categoria === cat).length / (data.items.length || 1)) * 100}%` }} /></div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
               <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 px-1">Atividades Recentes</h4>
                  <div className="space-y-6">
                     {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-4 group">
                           <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center text-orange-500/50 group-hover:text-orange-500 transition-colors"><Package size={16} /></div>
                           <div className="flex-1 space-y-1"><p className="text-[10px] font-black text-white uppercase tracking-tight italic">Entrada de Insumo #0293</p><p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Procedimento Padrão • 2h atrás</p></div>
                        </div>
                     ))}
                  </div>
                  <button className="w-full mt-8 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-[9px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition group">Ver Log Completo <ChevronRight size={10} className="inline ml-2 group-hover:translate-x-1 transition-transform" /></button>
               </div>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {analiseLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">Processando Inteligência de Ativos...</p>
            </div>
          ) : !analiseData ? (
            <div className="text-center py-32 text-zinc-600 text-xs tracking-widest uppercase bg-zinc-900/30 rounded-2xl border border-zinc-800">Falha ao processar análise técnica do almoxarifado</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">VALUATION GLOBAL</p>
                  <h3 className="text-2xl font-black text-white tracking-tight">{analiseData.meta.totalValorGlobal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h3>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-1">Valor potencial de venda</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">CURVA ABC (CLASSE A)</p>
                  <h3 className="text-2xl font-black text-orange-500 tracking-tight">{analiseData.meta.itensClasseA} <span className="text-zinc-600 text-xs">SKUS</span></h3>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-1">Garantem 75% da receita potencial</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">SUGESTÕES DE COMPRA</p>
                  <h3 className="text-2xl font-black text-blue-400 tracking-tight">{analiseData.meta.sugestoesPendentes} <span className="text-zinc-600 text-xs">REPOSIÇÕES</span></h3>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-1">Sugerido por giro de estoque</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-all">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">RUPTURAS DETECTADAS</p>
                  <h3 className="text-2xl font-black text-red-500 tracking-tight">{analiseData.meta.alertasCriticos} <span className="text-zinc-600 text-xs text-red-400/50">ZERADOS</span></h3>
                  <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-1">Itens esgotados em estoque</p>
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase">Giro dinâmico de Insumos</h3>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.4em]">Classificações analíticas de giro e curva abc</p>
                  </div>
                </div>

                <div className="w-full overflow-x-auto rounded-xl">
                  <table className="w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest border-b border-zinc-800">
                        <th className="p-4">Peça / Código</th>
                        <th className="p-4">Preço Custo / Venda</th>
                        <th className="p-4 text-center">Curva ABC</th>
                        <th className="p-4 text-center">Nível Giro</th>
                        <th className="p-4 text-center">Alerta Status</th>
                        <th className="p-4 text-right">Sugestão Reposição</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {analiseData.rows.map((row: any) => (
                        <tr key={row.id} className="hover:bg-zinc-800/10 transition-all border-l-4 border-l-transparent hover:border-l-orange-600">
                          <td className="p-4 max-w-[250px]">
                            <p className="text-sm font-black text-white uppercase tracking-tight italic truncate" title={row.descricao}>{row.descricao}</p>
                            <p className="text-[9px] text-orange-500 font-bold font-mono uppercase tracking-wider truncate">CÓD: {row.codigo}</p>
                          </td>
                          <td className="p-4 font-mono text-xs">
                            <div className="text-zinc-500">Custo: {row.preco_custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                            <div className="text-white font-black">Venda: {row.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest border ${
                              row.curvaABC === 'A' 
                                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                                : row.curvaABC === 'B' 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                : 'bg-zinc-950 text-zinc-500 border-zinc-800'
                            }`}>
                              Classe {row.curvaABC}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              row.giroStatus === 'ALTO_GIRO' 
                                ? 'bg-green-500/20 text-green-400' 
                                : row.giroStatus === 'MEDIO_GIRO' 
                                ? 'bg-yellow-500/20 text-yellow-400' 
                                : 'bg-zinc-950 text-zinc-600'
                            }`}>
                              {row.giroStatus.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                              row.alertaStatus === 'CRITICO' 
                                ? 'bg-red-500/20 text-red-500 animate-pulse' 
                                : row.alertaStatus === 'ALERTA' 
                                ? 'bg-yellow-500/20 text-yellow-400' 
                                : 'bg-zinc-950 text-green-400'
                            }`}>
                              {row.alertaStatus}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {row.sugestaoReposicao > 0 ? (
                              <span className="text-xs font-black text-red-500 font-mono italic bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                                Comprar {row.sugestaoReposicao} un
                              </span>
                            ) : (
                              <span className="text-xs font-medium text-zinc-600 font-mono uppercase tracking-widest">Estável</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-10 mt-8 pt-8 border-t border-zinc-900">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" /><p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Sistema Operacional</p></div>
            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 bg-zinc-800 rounded-full" /><p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Database: Master_DB_Pinheiro</p></div>
         </div>
         <p className="text-[9px] text-zinc-600 font-mono uppercase font-black">{BRANDING.name} v2.4.9 • {new Date().getFullYear()} All Rights Reserved</p>
      </div>

      {/* MODAL DE EXCLUSÃO */}
      {showDeleteModal && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Excluir Item</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Ação irreversível</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setShowDeleteModal(false); setDeletingItem(null); }}
                className="p-2 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o item <strong className="text-white">{deletingItem.descricao}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteModal(false); setDeletingItem(null); }}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-900/30 disabled:text-zinc-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirmar Exclusão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
