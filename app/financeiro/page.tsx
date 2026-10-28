'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  DollarSign, TrendingUp, TrendingDown, Clock, Plus, 
  Search, ArrowUpRight, ArrowDownLeft, Calendar,
  FileText, Wallet, CreditCard, PieChart, BarChart3,
  Download, CheckCircle, AlertTriangle, XCircle, Loader2,
  RefreshCw, Check, Upload, Printer, X, LineChart
} from 'lucide-react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';
import ProFeature from '@/components/ProFeature'; // ✅ IMPORT DO CADEADO

type TabType = 'resumo' | 'pagar_receber' | 'dre' | 'previsao' | 'conciliacao';

// ... (Seus helpers e funções de formatação continuam aqui)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const getStatusBadge = (status: string) => {
  const s = (status || 'PENDENTE').toUpperCase();
  switch (s) {
    case 'PAGO': return { label: 'PAGO', className: 'bg-green-500/20 text-green-400 border border-green-500/20', icon: <CheckCircle className="w-3 h-3" /> };
    case 'ATRASADO': return { label: 'ATRASADO', className: 'bg-red-500/20 text-red-400 border border-red-500/20', icon: <AlertTriangle className="w-3 h-3 animate-pulse" /> };
    case 'CANCELADO': return { label: 'CANCELADO', className: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/20', icon: <XCircle className="w-3 h-3" /> };
    default: return { label: 'PENDENTE', className: 'bg-amber-500/20 text-amber-400 border border-amber-500/20', icon: <Clock className="w-3 h-3" /> };
  }
};

const isParcelado = (desc: string) => /Parcela\s+\d+\/\d+/i.test(desc || '');

function ParcelaHighlight({ desc }: { desc: string }) {
  if (!desc) return <>---</>;
  const match = desc.match(/Parcela\s+\d+\/\d+/i);
  if (match) {
    const parts = desc.split(match[0]);
    return (
      <>
        {parts[0]}
        <span className="text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20 mx-1">{match[0]}</span>
        {parts[1]}
      </>
    );
  }
  return <>{desc}</>;
}

const MovimentoRow = memo(({ 
  item, 
  onReconcile 
}: { 
  item: any, 
  onReconcile: (item: any) => void
}) => {
  const router = useRouter();
  const badge = getStatusBadge(item.status);
  const parcelado = isParcelado(item.descricao);

  return (
    <tr 
      className="border-zinc-800 border-b hover:bg-zinc-900/50 transition-all cursor-pointer" 
      onClick={() => router.push(`/financeiro/${item.id}`)}
    >
      <td className="p-4 text-sm whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${item.tipo === 'ENTRADA' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
            {item.tipo === 'ENTRADA' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
          </div>
          <span className="font-mono font-bold text-zinc-400">
            {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '---'}
          </span>
        </div>
      </td>
      <td className="p-4 text-sm max-w-[300px]">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-white uppercase italic tracking-tight group-hover:text-orange-500 transition-colors truncate">
              <ParcelaHighlight desc={item.descricao} />
            </span>
            {parcelado && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded uppercase tracking-widest shadow-lg shadow-blue-900/20 flex-shrink-0">
                PARCELADO
              </span>
            )}
          </div>
          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider truncate">
            {item.os ? `OS #${item.os.numero || '---'} — ${item.os.cliente?.nome || '---'}` : (item.cliente?.nome || 'MOVIMENTO AVULSO')}
          </span>
        </div>
      </td>
      <td className="p-4 text-sm">
        <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-3 py-1 rounded-lg font-black text-zinc-400 uppercase tracking-widest truncate block max-w-[120px]">
          {item.categoria || '---'}
        </span>
      </td>
      <td className="p-4 text-sm text-center">
         <div className="flex items-center gap-2 text-zinc-500 justify-center">
           <CreditCard size={14} className="opacity-50 flex-shrink-0" />
           <span className="text-[10px] font-black uppercase tracking-widest truncate">{item.forma_pagamento || '---'}</span>
         </div>
      </td>
      <td className="p-4 text-sm whitespace-nowrap">
        <div className="flex items-center gap-2 text-zinc-400">
          <Calendar size={14} className="opacity-50" />
          <span className="text-[10px] font-mono font-bold">
            {item.data_vencimento ? new Date(item.data_vencimento).toLocaleDateString('pt-BR') : '---'}
          </span>
        </div>
      </td>
      <td className="p-4 text-sm text-right">
        <span className={`font-black font-mono font-bold italic ${item.tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400'}`}>
          {item.tipo === 'SAIDA' ? '—' : '+'}{formatCurrency(item.valor || 0)}
        </span>
      </td>
      <td className="p-4 text-sm text-center" onClick={(e) => { e.stopPropagation(); onReconcile(item); }}>
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-2xl text-[10px] font-black uppercase tracking-widest ${badge.className} hover:scale-105 transition-transform cursor-pointer`}>
          {badge.icon}
          {badge.label}
        </div>
      </td>
    </tr>
  );
});

MovimentoRow.displayName = 'MovimentoRow';

// ✅ SEPARAMOS O CONTEÚDO EM UM COMPONENTE INTERNO
function FinanceiroContent() {
  // ... (Todo o código da função original: const [activeTab], useEffect, return ( ... ) )
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('resumo');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [analise, setAnalise] = useState<any>(null);
  const [analiseLoading, setAnaliseLoading] = useState(false);
  
  const [data, setData] = useState<{ items: any[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 1 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [page, setPage] = useState(1);
  const [filterQuick, setFilterQuick] = useState('TODOS');
  const [reconcilingItem, setReconcilingItem] = useState<any>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(searchTerm); }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: debouncedSearch, tipo: filterTipo, status: filterStatus, page: String(page), limit: '10' });
      const [summaryData, listData] = await Promise.all([
        apiFetch<any>('/api/financeiro/resumo', { signal }),
        apiFetch<any>(`/api/financeiro?${params.toString()}`, { signal })
      ]);
      setSummary(summaryData);
      const items = Array.isArray(listData) ? listData : (listData.items || []);
      const total = typeof listData.total === 'number' ? listData.total : items.length;
      const totalPages = Math.max(1, listData.totalPages || 1);
      setData({ items, total, totalPages });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      handleApiError(err, { defaultMessage: 'Erro ao carregar dados financeiros' });
    } finally { setLoading(false); }
  }, [debouncedSearch, filterTipo, filterStatus, page]);

  const fetchAnaliseData = useCallback(async (signal?: AbortSignal) => {
    setAnaliseLoading(true);
    try {
      const result = await apiFetch<any>('/api/financeiro/analise', { signal });
      setAnalise(result);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
    } finally { setAnaliseLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'dre' || activeTab === 'previsao' || activeTab === 'conciliacao') {
      const controller = new AbortController();
      fetchAnaliseData(controller.signal);
      return () => controller.abort();
    }
  }, [activeTab, fetchAnaliseData]);

  useEffect(() => {
    if (filterQuick === 'TODOS') { setFilterTipo('TODOS'); setFilterStatus('TODOS'); setDebouncedSearch(searchTerm); }
    else if (filterQuick === 'PENDENTES') { setFilterTipo('TODOS'); setFilterStatus('PENDENTE'); }
    else if (filterQuick === 'PAGOS') { setFilterTipo('TODOS'); setFilterStatus('PAGO'); }
    else if (filterQuick === 'ATRASADOS') { setFilterTipo('TODOS'); setFilterStatus('ATRASADO'); }
    else if (filterQuick === 'PARCELADOS') { setFilterTipo('TODOS'); setFilterStatus('TODOS'); setDebouncedSearch('Parcela'); }
    setPage(1);
  }, [filterQuick, searchTerm]);

  const handleStatusReconcile = async (id: string, newStatus: string, receipt?: string) => {
    try {
      if (newStatus === 'PAGO') {
        await apiFetch(`/api/financeiro/${id}/pagar`, { method: 'POST', body: { comprovante_url: receipt || undefined } });
      } else {
        await apiFetch(`/api/financeiro/${id}`, { method: 'PUT', body: { status: newStatus, comprovante_url: receipt || undefined } });
      }
      toast.success(newStatus === 'PAGO' ? 'Pagamento conciliado com sucesso' : `Lançamento marcado como ${newStatus}`);
      setReconcilingItem(null);
      setReceiptUrl('');
      fetchDashboardData();
      fetchAnaliseData();
    } catch (err: any) { handleApiError(err, { defaultMessage: 'Erro ao atualizar lançamento' }); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
      if (res.ok) { const d = await res.json(); setReceiptUrl(d.url); toast.success('Comprovante anexado!'); }
      else { toast.error('Erro ao realizar upload'); }
    } catch { toast.error('Falha de comunicação no upload'); } finally { setUploadingReceipt(false); }
  };

  const printReport = (reportType: string) => { window.open(`/financeiro/relatorio-print?report=${reportType}`, '_blank'); };

  if (loading && !summary) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 min-h-screen">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Sincronizando Plataforma Financeira...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8 py-6 md:py-10 pb-20 overflow-x-hidden bg-zinc-950 min-h-screen text-white">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-zinc-900">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-7 bg-orange-600 rounded-full shadow-[0_0_15px_rgba(249,115,22,0.4)]" />
            <h1 className="text-3xl font-black uppercase tracking-tight italic">Central Financeira Enterprise</h1>
          </div>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em] mt-1 ml-5">VEHLOX Management Terminal</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/financeiro/lancamento" className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-4 min-h-[44px] flex items-center justify-center font-black text-xs uppercase tracking-widest transition shadow-xl shadow-orange-950/20 gap-2 active:scale-95">
            <Plus className="w-4 h-4" /> Novo Lançamento
          </Link>
          <button onClick={() => printReport(activeTab)} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-2xl px-6 py-4 min-h-[44px] flex items-center justify-center font-black text-xs uppercase tracking-widest transition gap-2">
            <Printer className="w-4 h-4 text-orange-500" /> Relatório {activeTab.toUpperCase()}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&-::-webkit-scrollbar]:hidden snap-x snap-mandatory border-b border-zinc-900 gap-2 p-1 bg-zinc-950 rounded-2xl">
        {[
          { id: 'resumo', label: 'Fluxo de Caixa', icon: Wallet },
          { id: 'pagar_receber', label: 'Contas a Pagar/Receber', icon: CreditCard },
          { id: 'dre', label: 'DRE Demonstrativo', icon: PieChart },
          { id: 'previsao', label: 'Previsão & Custos', icon: LineChart },
          { id: 'conciliacao', label: 'Conciliação Manual', icon: RefreshCw }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition snap-center shrink-0 min-h-[44px] flex items-center justify-center min-w-[130px] sm:min-w-0 ${
              activeTab === tab.id ? 'bg-zinc-900 text-orange-500 italic border border-zinc-800 shadow-xl' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <tab.icon className="inline w-4 h-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW: FLUXO DE CAIXA */}
      {activeTab === 'resumo' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden group hover:border-zinc-700 transition shadow-2xl">
              <div className="relative z-10">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-500 mb-2">Saldo Realizado</p>
                <h3 className={`text-3xl sm:text-4xl font-black italic tracking-tight ${summary?.saldo >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(summary?.saldo || 0)}</h3>
              </div>
              <Wallet className="absolute -right-4 -bottom-4 w-32 h-32 text-zinc-800/10 group-hover:scale-110 transition-transform" />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden group hover:border-green-500/20 transition shadow-2xl">
              <div className="relative z-10">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-500 mb-2">Entradas Realizadas</p>
                <h3 className="text-3xl sm:text-4xl font-black italic tracking-tight text-green-500">{formatCurrency(summary?.entradas || 0)}</h3>
              </div>
              <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 text-green-500/5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden group hover:border-red-500/20 transition shadow-2xl">
              <div className="relative z-10">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-500 mb-2">Saídas Realizadas</p>
                <h3 className="text-3xl sm:text-4xl font-black italic tracking-tight text-red-500">{formatCurrency(summary?.saidas || 0)}</h3>
              </div>
              <TrendingDown className="absolute -right-4 -bottom-4 w-32 h-32 text-red-500/5 group-hover:scale-110 transition-transform" />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl relative overflow-hidden group hover:border-orange-500/20 transition shadow-2xl">
              <div className="relative z-10">
                <p className="text-[10px] font-mono font-black uppercase tracking-widest text-zinc-500 mb-2">Pendente (À Liquidar)</p>
                <h3 className={`text-3xl sm:text-4xl font-black italic tracking-tight ${summary?.previsto >= 0 ? 'text-orange-500' : 'text-red-400'}`}>{formatCurrency(summary?.previsto || 0)}</h3>
              </div>
              <Clock className="absolute -right-4 -bottom-4 w-32 h-32 text-orange-500/5 group-hover:scale-110 transition-transform" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6 bg-zinc-900/30 border border-zinc-900 p-6 sm:p-8 rounded-3xl shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="text-orange-500 w-5 h-5" />
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest leading-normal">Gráfico de Caixa Recorrente (6 Meses)</h2>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span> Entradas</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span> Saídas</span>
                </div>
              </div>
              <div className="h-[240px] sm:h-[340px] w-full min-w-0 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.chartData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
                    <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} />
                    <YAxis stroke="#4b5563" fontSize={10} tickLine={false} tickFormatter={(value) => `R$${(value/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: '1px solid #1f2937', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: '900' }} />
                    <Bar dataKey="entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800 p-6 sm:p-8 rounded-3xl space-y-6">
              <div>
                <h3 className="text-sm font-black uppercase text-white">Análise Operacional</h3>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Controles internos e auditoria</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase">Previsões Pendentes</p>
                    <p className="text-lg font-black text-orange-500 italic mt-1">{formatCurrency(summary?.previsto || 0)}</p>
                  </div>
                  <Clock className="text-zinc-600" size={20} />
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase">Categorias Ativas</p>
                    <p className="text-lg font-black text-white italic mt-1">12 Centros</p>
                  </div>
                  <PieChart className="text-zinc-600" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TABELA */}
      {(activeTab === 'resumo' || activeTab === 'pagar_receber') && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center bg-zinc-900/50 border border-zinc-800 p-4 rounded-3xl shadow-xl w-full max-w-full">
            <div className="relative flex-1 group w-full">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors"><Search size={18} /></div>
              <input 
                type="text" placeholder="PROCURAR POR LANÇAMENTO, DOCUMENTO, CLIENTE OU OS..." 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-6 text-xs text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-700" 
                value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} 
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto h-auto">
              <select className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-[10px] text-zinc-500 focus:border-orange-500 outline-none transition font-black uppercase tracking-widest cursor-pointer min-h-[44px]" value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setPage(1); }}>
                <option value="TODOS">TODOS OS TIPOS</option>
                <option value="ENTRADA">RECEITAS (ENTRADA)</option>
                <option value="SAIDA">DESPESAS (SAIDA)</option>
              </select>
              <select className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-[10px] text-zinc-500 focus:border-orange-500 outline-none transition font-black uppercase tracking-widest cursor-pointer min-h-[44px]" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
                <option value="TODOS">TODOS STATUS</option>
                <option value="PAGO">LIQUIDADOS / PAGOS</option>
                <option value="PENDENTE">A VENCER / PENDENTES</option>
                <option value="ATRASADO">INADIMPLENTES / ATRASADOS</option>
                <option value="CANCELADO">REJEITADOS / CANCELADO</option>
              </select>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/20 flex gap-4 items-center">
              <span className="w-2.5 h-2.5 bg-orange-600 rounded-full" />
              <h3 className="text-xs font-black uppercase tracking-widest">Painel Operacional Automotivo ({data.total} LANÇAMENTOS)</h3>
            </div>
            <div className="relative w-full overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-500 text-[10px] font-mono uppercase tracking-widest border-b border-zinc-800">
                    <th className="p-4 text-left font-bold">Data Fato</th>
                    <th className="p-4 text-left font-bold">Lançamento / Histórico</th>
                    <th className="p-4 text-left font-bold">Categoria</th>
                    <th className="p-4 text-center font-bold">Forma Pgto</th>
                    <th className="p-4 text-left font-bold">Vencimento</th>
                    <th className="p-4 text-right font-bold">Valor</th>
                    <th className="p-4 text-center font-bold">Sincronia / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {data.items.length > 0 ? data.items.map((item) => (
                    <MovimentoRow key={item.id} item={item} onReconcile={(it) => setReconcilingItem(it)} />
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-20 text-center text-zinc-700 italic">
                        <div className="flex flex-col items-center justify-center opacity-30">
                          <PieChart size={60} className="mb-4 text-zinc-500" />
                          <p className="font-black uppercase tracking-widest text-[9px] text-zinc-500">Nenhum lançamento catalogado com os critérios de consulta</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-zinc-900 bg-zinc-950/20">
              <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DRE */}
      {activeTab === 'dre' && (
        <div className="space-y-8">
          {analiseLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Processando DRE e Margem Diesel...</p>
            </div>
          ) : !analise?.dre ? (
            <div className="bg-zinc-900/30 p-12 text-center text-zinc-500 font-bold uppercase tracking-widest rounded-3xl border border-zinc-800">Não existem registros para o DRE este ano</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl space-y-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-orange-500">DRE Simplificado</h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">Resultado do Exercício Fiscal corrente</p>
                </div>
                <div className="space-y-4 font-mono">
                  <div className="flex justify-between items-baseline border-b border-zinc-800/60 pb-3"><span className="text-[10px] text-zinc-400 font-bold uppercase">(+) RECEITAS OPERACIONAIS BRUTAS:</span><span className="text-lg font-black text-green-400">{formatCurrency(analise.dre.totalReceitas)}</span></div>
                  <div className="flex justify-between items-baseline border-b border-zinc-800/60 pb-3"><span className="text-[10px] text-zinc-400 font-bold uppercase">(-) CUSTOS / DESPESAS OPERACIONAIS:</span><span className="text-lg font-black text-red-400">{formatCurrency(analise.dre.totalDespesas)}</span></div>
                  <div className="flex justify-between items-baseline border-b border-zinc-800/60 pb-3"><span className="text-[10px] text-zinc-500 font-black uppercase">(=) RESULTADO LÍQUIDO DO PERÍODO:</span><span className={`text-xl font-black italic ${analise.dre.lucroLiquido >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(analise.dre.lucroLiquido)}</span></div>
                </div>
                <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl flex items-center justify-between">
                  <div><p className="text-[9px] text-zinc-500 font-black uppercase">Margem Operacional:</p><p className="text-2xl font-black text-white italic mt-1">{analise.dre.margemOperacional}%</p></div>
                  <PieChart className="text-orange-500" size={24} />
                </div>
              </div>
              <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <div><h3 className="text-sm font-black uppercase">Resultado por Categoria de Operação</h3><p className="text-[9px] text-zinc-600 font-bold uppercase">Valores agregados e liquidados</p></div>
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-left font-mono">
                    <thead><tr className="bg-zinc-950 text-zinc-500 text-[9px] uppercase tracking-wider"><th className="p-3">Categoria Financeira</th><th className="p-3 text-right">Inflow (Entradas)</th><th className="p-3 text-right">Outflow (Saídas)</th><th className="p-3 text-right">Aproveitamento</th></tr></thead>
                    <tbody className="divide-y divide-zinc-900">
                      {analise.dre.categorias.map((cat: any, idx: number) => (
                        <tr key={idx} className="hover:bg-zinc-900/50"><td className="p-3 text-sm font-black text-white uppercase tracking-tight italic">{cat.categoria}</td><td className="p-3 text-right text-xs text-green-400">+{formatCurrency(cat.receitas)}</td><td className="p-3 text-right text-xs text-red-400">-{formatCurrency(cat.despesas)}</td><td className={`p-3 text-right text-xs font-black ${cat.saldo >= 0 ? 'text-white' : 'text-red-500'}`}>{formatCurrency(cat.saldo)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: PREVISÃO */}
      {activeTab === 'previsao' && (
        <div className="space-y-8">
          {analiseLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /><p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Coletando estimativas de faturamento e custos...</p></div>
          ) : !analise ? (
            <div className="bg-zinc-900/30 p-12 text-center text-zinc-500 font-bold uppercase tracking-widest rounded-3xl border border-zinc-800">Não existem previsões calculadas</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <div><h3 className="text-sm font-black uppercase">Previsão de Caixa (Próximos 4 Meses)</h3><p className="text-[9px] text-zinc-600 font-bold uppercase">Baseado em contas a pagar/receber pendentes</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {analise.previsao.map((p: any, idx: number) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-3 hover:border-zinc-800 transition-colors"><div><p className="text-sm font-black text-orange-500 font-mono italic">{p.mes}</p><p className="text-[8px] text-zinc-600 font-bold tracking-widest">{p.ano}</p></div><div className="space-y-1.5 font-mono text-[10px]"><div className="flex justify-between"><span className="text-zinc-500">Rec:</span><span className="text-green-400">+{p.entradas ? (p.entradas / 1000).toFixed(1) : '0'}k</span></div><div className="flex justify-between"><span className="text-zinc-500">Pag:</span><span className="text-red-400">-{p.saidas ? (p.saidas / 1000).toFixed(1) : '0'}k</span></div><div className="border-t border-zinc-900 pt-1.5 flex justify-between font-bold"><span className="text-zinc-500">Est:</span><span className={p.saldoEstimado >= 0 ? 'text-white' : 'text-red-500'}>{(p.saldoEstimado / 1000).toFixed(1)}k</span></div></div></div>
                  ))}
                </div>
                <div className="pt-6 border-t border-zinc-900">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Investimentos / Rateio por Centro de Custos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {analise.centroCustos?.map((cc: any, idx: number) => (
                      <div key={idx} className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-900 flex justify-between items-center font-mono"><div><p className="text-[9px] font-black text-zinc-400 uppercase tracking-tight">{cc.centro_custo}</p><p className="text-xs font-black text-white mt-1">{formatCurrency(cc.total)}</p></div><span className="text-[9px] text-zinc-600 bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5">{cc.lançamentos} lanç</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl space-y-6">
                <div className="flex justify-between items-start"><div><h3 className="text-sm font-black uppercase text-red-500">Inadimplência</h3><p className="text-[9px] text-zinc-600 font-bold uppercase">Contas a receber expiradas</p></div><AlertTriangle className="text-red-500 animate-pulse" size={20} /></div>
                <div className="p-5 bg-red-950/20 border border-red-500/10 rounded-2xl"><p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-1">Total Negativado/Atrasado</p><p className="text-3xl font-black text-red-500 font-mono italic tracking-tighter">{formatCurrency(analise.inadimplencia?.total || 0)}</p></div>
                <div className="space-y-3 custom-scrollbar max-h-[220px] overflow-y-auto">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Sacados em Atraso</p>
                  {analise.inadimplencia?.lista?.length === 0 ? (<p className="text-[10px] text-zinc-500 italic uppercase">Sem dívidas atrasadas! Fluxo saudável.</p>) : (analise.inadimplencia?.lista?.slice(0, 5).map((ln: any, idx: number) => (<div key={idx} className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl flex items-center justify-between font-mono text-[10px] hover:border-zinc-800 transition"><div className="min-w-0"><p className="text-white font-black uppercase truncate italic">{ln.cliente?.nome || 'Cliente não identificado'}</p><p className="text-zinc-600 text-[8px] truncate">Ref: {ln.descricao}</p></div><span className="text-red-400 font-black ml-2 whitespace-nowrap">{formatCurrency(ln.valor)}</span></div>)))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: CONCILIAÇÃO */}
      {activeTab === 'conciliacao' && (
        <div className="space-y-8">
          {analiseLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-10 h-10 text-orange-500 animate-spin" /><p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Coletando lançamentos de conciliação...</p></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <div><h3 className="text-sm font-black uppercase">Fila de Recorrências & Parcelamentos</h3><p className="text-[9px] text-zinc-600 font-bold uppercase">Estudo e conciliação de parcelas geradas automáticas</p></div>
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-left font-mono">
                    <thead><tr className="bg-zinc-950 text-zinc-500 text-[9px] uppercase tracking-wider"><th className="p-3">Referência Parcela</th><th className="p-3">Vencimento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-center">Gestão</th></tr></thead>
                    <tbody className="divide-y divide-zinc-900">
                      {analise?.recorrentes?.length === 0 ? (<tr><td colSpan={4} className="p-12 text-center text-zinc-600 italic uppercase">Sem lançamentos parcelados ou recorrentes ativos</td></tr>) : (analise?.recorrentes?.map((rec: any, idx: number) => (<tr key={idx} className="hover:bg-zinc-900/50"><td className="p-3"><p className="text-sm font-black text-white uppercase italic tracking-tight">{rec.descricao}</p><p className="text-[8px] text-zinc-600 uppercase">Categoria: {rec.categoria}</p></td><td className="p-3 text-xs text-zinc-400">{rec.data_vencimento ? new Date(rec.data_vencimento).toLocaleDateString() : 'N/A'}</td><td className="p-3 text-right text-xs font-black text-white">{formatCurrency(rec.valor)}</td><td className="p-3 text-center"><button onClick={() => setReconcilingItem(rec)} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition ${rec.status === 'PAGO' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-600 text-white border-transparent hover:bg-orange-500'}`}>{rec.status === 'PAGO' ? 'CONCILIADO' : 'CONCILIAR MANUAL'}</button></td></tr>)))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl space-y-6">
                <div><h3 className="text-sm font-black uppercase tracking-wider text-green-500">Conciliação Bancária</h3><p className="text-[9px] text-zinc-600 font-bold uppercase">Fluxo manual assistido de auditoria</p></div>
                <div className="prose text-zinc-400 text-xs leading-relaxed space-y-3"><p>A conciliação manual do VEHLOX permite:</p><ul className="list-disc pl-5 space-y-1 text-zinc-500 uppercase font-bold text-[9px]"><li>Vincular comprovantes de transferência bancária em PDF/Imagem.</li><li>Registrar datas oficiais de pagamentos (fato realizador).</li><li>Praticidade contra fraudes no fechamento de caixa diário.</li></ul><p className="text-[10px] text-orange-500/60 font-black">Selecione qualquer transação na listagem oficial ou no card de parcelas para iniciar a conciliação manual imediata.</p></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FOOTER */}
      <div className="pt-10 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-6">
         <div className="flex items-center gap-6"><div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-ping" /><span className="text-[10px] text-zinc-600 font-bold uppercase">SISTEMA FINANCEIRO SEGURO (BRL)</span></div></div>
         <p className="text-[9px] text-zinc-800 font-bold uppercase">VEHLOX Sistema de Gestão</p>
      </div>

      {/* MODAL DE CONCILIAÇÃO */}
      {reconcilingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl relative">
            <button onClick={() => { setReconcilingItem(null); setReceiptUrl(''); }} className="absolute top-6 right-6 p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white transition"><X className="w-4 h-4" /></button>
            <div><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${reconcilingItem.tipo === 'ENTRADA' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{reconcilingItem.tipo}</span><h3 className="text-xl font-black text-white uppercase italic tracking-tight mt-2">{reconcilingItem.descricao}</h3><p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">SLA Conciliação manual</p></div>
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 font-mono text-xs"><div className="flex justify-between"><span className="text-zinc-500">Valor Operacional:</span><span className="text-white font-bold">{formatCurrency(reconcilingItem.valor)}</span></div><div className="flex justify-between"><span className="text-zinc-500">Data de Vencimento:</span><span className="text-white font-bold">{reconcilingItem.data_vencimento ? new Date(reconcilingItem.data_vencimento).toLocaleDateString() : 'Sem Vencimento'}</span></div><div className="flex justify-between"><span className="text-zinc-500">Status Atual:</span><span className="text-orange-500 font-bold uppercase">{reconcilingItem.status}</span></div></div>
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Anexar Comprovante (PDF, PNG ou JPG)</label>
              <div className="flex gap-4 items-center">
                <label className="flex-1 flex flex-col justify-center items-center h-28 border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 rounded-2xl cursor-pointer transition">
                  {uploadingReceipt ? (<div className="flex flex-col items-center gap-1"><Loader2 className="w-5 h-5 text-orange-500 animate-spin" /><p className="text-[8px] text-zinc-600 font-black uppercase">Subindo arquivo...</p></div>) : receiptUrl ? (<div className="flex flex-col items-center gap-1 text-green-500"><Check className="w-5 h-5" /><p className="text-[8px] font-black uppercase">Comprovante Anexado!</p></div>) : (<div className="flex flex-col items-center gap-1.5 text-zinc-500"><Upload className="w-5 h-5 text-zinc-600" /><p className="text-[8px] font-black uppercase">Anexar imagem do recibo</p></div>)}
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={uploadingReceipt} />
                </label>
                {receiptUrl && (<Link href={receiptUrl} target="_blank" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:text-orange-500 transition text-[10px] uppercase font-black tracking-widest flex items-center gap-1"><FileText size={14} /> Ver comprovante</Link>)}
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t border-zinc-900">
              <button onClick={() => handleStatusReconcile(reconcilingItem.id, 'PAGO', receiptUrl)} className="flex-1 py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-lg shrink-0">Liquidado / Pago</button>
              <button onClick={() => handleStatusReconcile(reconcilingItem.id, 'PENDENTE')} className="py-4 px-6 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition">Manter Pendente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ EXPORTAÇÃO PADRÃO COM O CADEADO PRO
export default function FinanceiroDashboard() {
  return (
    <ProFeature 
      title="Módulo Financeiro Completo"
      description="Tenha acesso ao DRE, conciliação bancária, previsão de caixa e controle total da sua operação. Faça o upgrade para o PRO."
    >
      <FinanceiroContent />
    </ProFeature>
  );
}
