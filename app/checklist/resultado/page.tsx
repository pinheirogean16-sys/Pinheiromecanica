'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  ClipboardCheck, Search, Eye, Filter, Loader2, AlertCircle, 
  ChevronRight, Calendar, User, Truck, FileText, ArrowLeft,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Pagination } from '@/components/Pagination';

function ResultadoContent() {
  const searchParams = useSearchParams();
  const checklistIdFilter = searchParams.get('checklistId');

  const [execucoes, setExecucoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchExecucoes = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (checklistIdFilter) params.set('checklistId', checklistIdFilter);

      const res = await fetch(`/api/checklist/execucoes?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();

        let list: any[] = [];
        if (Array.isArray(data)) {
          list = data;
          setTotal(data.length);
          setTotalPages(1);
        } else if (data && Array.isArray(data.items)) {
          list = data.items;
          setTotal(data.total ?? list.length);
          setTotalPages(data.totalPages ?? 1);
        }

        const mapped = list.map((e: any) => {
          const checklistObj = e.Checklist || e.checklist;
          const osObj = e.OrdemServico || e.os;
          return {
            ...e,
            checklist: checklistObj
              ? { ...checklistObj, nome: checklistObj.nome || 'Checklist sem nome' }
              : null,
            os: osObj ? { ...osObj, numero: osObj.numero || '—' } : null,
            veiculo:
              e.Veiculo ||
              e.veiculo ||
              (osObj ? osObj.Veiculo || osObj.veiculo : null),
          };
        });

        setExecucoes(mapped);
      } else {
        setError(true);
        setExecucoes([]);
      }
    } catch {
      setError(true);
      setExecucoes([]);
      toast.error('Erro ao buscar histórico de execuções.');
    } finally {
      setLoading(false);
    }
  }, [page, checklistIdFilter]);

  useEffect(() => {
    fetchExecucoes();
  }, [fetchExecucoes]);

  const filteredExecucoes = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return execucoes;
    return execucoes.filter(
      (e) =>
        e.checklist?.nome?.toLowerCase().includes(termo) ||
        e.os?.numero?.toString().includes(termo) ||
        e.veiculo?.placa?.toLowerCase().includes(termo) ||
        e.veiculo?.modelo?.toLowerCase().includes(termo)
    );
  }, [execucoes, search]);

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (date: string) => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 pb-10 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <Link href="/checklist">
               <button className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white">
                 <ArrowLeft size={18} />
               </button>
             </Link>
             <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
             <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">HISTÓRICO DE INSPEÇÕES</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] leading-none ml-14">
            RESULTADOS E LAUDOS TÉCNICOS ARQUIVADOS
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-2xl">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CHECKLIST, OS OU PLACA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-16 pr-6 text-xs text-white outline-none focus:border-blue-500/50 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-700"
          />
        </div>
      </div>

      {/* TABELA DESKTOP */}
      <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Data</th>
                <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Checklist</th>
                <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Veículo / OS</th>
                <th className="p-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] italic text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Buscando histórico...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-sm font-black text-white uppercase italic tracking-tighter">Falha na Sincronização</p>
                  </td>
                </tr>
              ) : filteredExecucoes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center opacity-60">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
                    <p className="font-black uppercase tracking-widest text-xs italic text-zinc-500">Nenhuma execução encontrada</p>
                  </td>
                </tr>
              ) : (
                filteredExecucoes.map((exec) => (
                  <tr key={exec.id} className="group hover:bg-zinc-800/30 transition-all border-l-4 border-l-transparent hover:border-l-blue-600">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-zinc-500" />
                        <div>
                          <p className="text-xs font-black text-white">{formatDate(exec.created_at)}</p>
                          <p className="text-[9px] text-zinc-500 font-mono uppercase">
                            {formatTime(exec.created_at)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <p className="text-sm font-black text-white uppercase italic tracking-tight">{exec.checklist?.nome}</p>
                      <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">
                        ID: {exec.id.slice(-6).toUpperCase()}
                      </p>
                    </td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Truck size={12} className="text-orange-500" />
                          <span className="text-[10px] font-bold text-white uppercase">
                            {exec.veiculo?.placa || '—'} {exec.veiculo?.modelo || ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText size={12} className="text-blue-500" />
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            OS #{exec.os?.numero || '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <Link 
                        href={`/checklist/resultado/${exec.id}`}
                        className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-400 font-black text-[10px] uppercase tracking-widest italic bg-blue-500/10 px-4 py-2 rounded-xl transition-all"
                      >
                        Ver Laudo
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error && totalPages > 1 && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
            <Pagination 
              page={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          </div>
        )}
      </div>

      {/* CARDS MOBILE */}
      <div className="block md:hidden space-y-4">
        {loading ? (
          <div className="p-20 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em] italic">Buscando histórico...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center bg-zinc-900 border border-zinc-800 rounded-2xl">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm font-black text-white uppercase italic tracking-tighter">Falha na Sincronização</p>
          </div>
        ) : filteredExecucoes.length === 0 ? (
          <div className="p-20 text-center bg-zinc-900 border border-zinc-800 rounded-2xl opacity-60">
            <FileText className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
            <p className="font-black uppercase tracking-widest text-xs italic text-zinc-500">Nenhuma execução encontrada</p>
          </div>
        ) : (
          filteredExecucoes.map((exec) => (
            <div key={exec.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-black text-white uppercase italic tracking-tight">{exec.checklist?.nome}</p>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                    ID: {exec.id.slice(-6).toUpperCase()}
                  </p>
                </div>
                <Link 
                  href={`/checklist/resultado/${exec.id}`}
                  className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 font-black text-[9px] uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-lg transition-all shrink-0"
                >
                  Ver
                  <ChevronRight size={12} />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-zinc-500" />
                  <div>
                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Data</p>
                    <p className="text-[10px] font-bold text-white">{formatDate(exec.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Truck size={12} className="text-orange-500" />
                  <div>
                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Veículo</p>
                    <p className="text-[10px] font-bold text-white truncate">{exec.veiculo?.placa || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <FileText size={12} className="text-blue-500" />
                  <div>
                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">OS</p>
                    <p className="text-[10px] font-bold text-zinc-400">#{exec.os?.numero || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {!loading && !error && totalPages > 1 && (
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
            <Pagination 
              page={page} 
              totalPages={totalPages} 
              onPageChange={setPage} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-12 h-12 text-zinc-800 animate-spin" />
      </div>
    }>
      <ResultadoContent />
    </Suspense>
  );
}
