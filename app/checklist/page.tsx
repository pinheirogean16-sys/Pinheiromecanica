'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ClipboardCheck, Plus, Search, Eye, Play, Pencil, Trash2, 
  CheckCircle2, XCircle, ChevronRight, Loader2, AlertCircle,
  FileText, Calendar, ListTodo
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  descricao: string;
  tipo: string;
  ordem: number;
}

interface Checklist {
  id: string;
  nome: string;
  categoria: string;
  ativo: boolean;
  created_at: string;
  itens: ChecklistItem[];
  _count: { execucoes: number };
}

// C10: normaliza o retorno da API.
// A API pode devolver `itens` ou `ChecklistItem` dependendo da rota.
// Esta função garante que o front sempre trabalhe com `itens`.
function normalizarChecklist(raw: any): Checklist {
  const itensBrutos = raw?.itens ?? raw?.ChecklistItem ?? [];
  const itens = Array.isArray(itensBrutos) ? itensBrutos : [];

  // Contagem de execuções: aceita _count.execucoes ou um array Execucoes
  const totalExecucoes =
    raw?._count?.execucoes ??
    (Array.isArray(raw?.ChecklistExecucao) ? raw.ChecklistExecucao.length : 0);

  return {
    id: String(raw?.id ?? ''),
    nome: String(raw?.nome ?? '—'),
    categoria: String(raw?.categoria ?? ''),
    ativo: raw?.ativo !== false,
    created_at: raw?.created_at ?? '',
    itens,
    _count: { execucoes: totalExecucoes },
  };
}

export default function ChecklistPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  const fetchChecklists = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/checklist', {
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : [];
        setChecklists(lista.map(normalizarChecklist));
      } else {
        setError(true);
        setChecklists([]);
      }
    } catch {
      setError(true);
      setChecklists([]);
      toast.error('Ocorreu uma falha ao sincronizar o banco de dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      if (active) {
        await fetchChecklists();
      }
    };
    loadData();
    return () => {
      active = false;
    };
  }, [fetchChecklists]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover permanentemente o checklist "${name}"?`)) return;

    try {
      const res = await fetch(`/api/checklist/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        toast.success('Template de checklist removido.');
        fetchChecklists();
      } else {
        const errorData = await res.json().catch(() => ({ error: null }));
        toast.error(errorData.error || 'Não foi possível excluir o checklist.');
      }
    } catch {
      toast.error('Erro ao conectar com a API');
    }
  };

  const filteredChecklists = useMemo(() => {
    const termo = search.trim().toLowerCase();
    if (!termo) return checklists;
    return checklists.filter(
      (c) =>
        c.nome.toLowerCase().includes(termo) ||
        c.id.toLowerCase().includes(termo)
    );
  }, [checklists, search]);

  const formatDate = (date: string) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  const stats = useMemo(() => {
    return {
      total: checklists.length,
      ativos: checklists.filter((c) => c.ativo).length,
      totalExecucoes: checklists.reduce(
        (acc, c) => acc + (c._count?.execucoes || 0),
        0
      ),
    };
  }, [checklists]);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-1 sm:px-6 space-y-8 pb-10 overflow-hidden">
      {/* HEADER INDUSTRIAL */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-orange-600 rounded-full" />
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">LISTAS DE INSPEÇÃO</h1>
          </div>
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.4em] leading-none ml-5">FORMULÁRIOS DE CONTROLE E QUALIDADE TÉCNICA</p>
        </div>

        <Link href="/checklist/novo" className="group">
          <div className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-orange-950/20">
            <Plus className="w-4 h-4" />
            NOVO TEMPLATE
            <ChevronRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </Link>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <ClipboardCheck size={12} className="text-orange-500" /> Total de Modelos
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-white tracking-tighter italic">{stats.total}</p>
            <span className="text-[10px] text-zinc-600 font-mono font-bold uppercase tracking-widest leading-none">Catalogados</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] space-y-3 relative overflow-hidden group shadow-xl">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <CheckCircle2 size={12} className="text-green-500" /> Modelos Ativos
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-white tracking-tighter italic">{stats.ativos}</p>
            <span className="text-[10px] text-green-600 font-mono font-bold uppercase tracking-widest leading-none">Operacionais</span>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] space-y-3 relative overflow-hidden group shadow-xl border-l-4 border-l-orange-600/30">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Loader2 size={12} className="text-orange-500" /> Total Execuções
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-5xl font-black text-white tracking-tighter italic">{stats.totalExecucoes}</p>
            <span className="text-[10px] text-zinc-600 font-mono font-bold uppercase tracking-widest leading-none">Realizadas</span>
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-zinc-900 border border-zinc-800 p-4 rounded-[2.5rem] shadow-2xl">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR POR NOME DO CHECKLIST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 pl-16 pr-6 text-xs text-white outline-none focus:border-orange-500/50 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-800"
          />
        </div>
      </div>

      {/* TABELA DESKTOP */}
      <div className="hidden lg:block bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic text-center w-20">ID</th>
                <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Checklist</th>
                <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic text-center">Itens</th>
                <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic text-center">Status</th>
                <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic text-center">Execuções</th>
                <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic text-right">Criado em</th>
                <th className="p-6 text-right text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] italic">Gestão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
                      <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] italic">Sincronizando modelos...</p>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle className="w-12 h-12 text-red-500" />
                      <p className="text-sm font-black text-white uppercase italic tracking-tighter">Erro de Carregamento</p>
                      <button 
                        onClick={fetchChecklists}
                        className="px-6 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition"
                      >
                        Recarregar
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredChecklists.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center opacity-30">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs italic">Nenhum checklist disponível no inventário</p>
                  </td>
                </tr>
              ) : filteredChecklists.map((checklist) => (
                <tr 
                  key={checklist.id} 
                  className="group hover:bg-zinc-800/30 transition-all border-l-4 border-l-transparent hover:border-l-orange-600"
                >
                  <td className="p-6 text-center">
                    <span className="text-[10px] font-mono text-zinc-700 font-bold uppercase tracking-widest">
                      {checklist.id.slice(-4).toUpperCase()}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform shadow-lg">
                        <ClipboardCheck size={18} />
                      </div>
                      <div className="text-xs">
                        <p className="text-sm font-black text-white uppercase group-hover:text-orange-500 transition-colors tracking-tight italic truncate">
                          {checklist.nome}
                        </p>
                        <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mt-0.5 truncate">
                          {checklist.categoria}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black text-white italic tracking-tighter">
                        {checklist.itens.length}
                      </span>
                      <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">Procedimentos</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center">
                      {checklist.ativo ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-500">
                          <CheckCircle2 size={10} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Operante</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-600">
                          <XCircle size={10} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">Inativo</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-black text-white italic tracking-tighter">
                        {checklist._count.execucoes}
                      </span>
                      <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">Executados</span>
                    </div>
                  </td>
                  <td className="p-6 text-right font-mono">
                    <p className="text-[10px] text-zinc-400 font-bold tracking-tighter">
                      {formatDate(checklist.created_at)}
                    </p>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link 
                        href={`/checklist/${checklist.id}`}
                        title="Visualizar Template"
                        className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition shadow-lg"
                      >
                        <Eye size={14} />
                      </Link>
                      <Link 
                        href={`/checklist/resultado?checklistId=${checklist.id}`}
                        title="Ver Execuções"
                        className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition shadow-lg"
                      >
                        <FileText size={14} />
                      </Link>
                      <Link 
                        href={`/checklist/executar/${checklist.id}`}
                        title="Executar Checklist"
                        className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-green-500 hover:text-green-400 hover:bg-green-500/10 transition shadow-lg"
                      >
                        <Play size={14} fill="currentColor" />
                      </Link>
                      <Link 
                        href={`/checklist/${checklist.id}/editar`}
                        title="Editar Formulário"
                        className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-orange-500 hover:bg-orange-500/10 rounded-xl transition shadow-lg"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(checklist.id, checklist.nome)}
                        title="Remover Registro"
                        className="p-3 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition shadow-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CARDS MOBILE */}
      <div className="block lg:hidden space-y-4">
        {loading ? (
          <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em] italic">Sincronizando modelos...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-sm font-black text-white uppercase italic tracking-tighter">Erro de Carregamento</p>
            <button 
              onClick={fetchChecklists}
              className="px-6 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition min-h-[44px]"
            >
              Recarregar
            </button>
          </div>
        ) : filteredChecklists.length === 0 ? (
          <div className="p-12 text-center bg-zinc-900 border border-zinc-800 rounded-2xl opacity-40">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p className="font-black uppercase tracking-widest text-[10px] italic">Nenhum checklist disponível no inventário</p>
          </div>
        ) : (
          filteredChecklists.map((checklist) => (
            <div 
              key={checklist.id} 
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[9px] font-mono text-zinc-600 font-black tracking-widest">
                    ID: #{checklist.id.slice(-4).toUpperCase()}
                  </span>
                  <h3 className="text-base font-black text-white uppercase italic tracking-tight break-words">
                    {checklist.nome}
                  </h3>
                  <div className="inline-block bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-[9px] text-zinc-400 font-mono font-bold tracking-wider uppercase">
                    {checklist.categoria}
                  </div>
                </div>

                <div>
                  {checklist.ativo ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-[9px] font-black uppercase">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      ATIVO
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-600 text-[9px] font-black uppercase">
                      INATIVO
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/30">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <div className="leading-tight min-w-0">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Itens</p>
                    <p className="text-xs font-bold font-mono text-zinc-300 truncate">{checklist.itens.length} Itens</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <div className="leading-tight min-w-0">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Criado em</p>
                    <p className="text-xs font-bold font-mono text-zinc-300 truncate">{formatDate(checklist.created_at)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Link 
                  href={`/checklist/executar/${checklist.id}`}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-green-950/25"
                >
                  <Play className="w-4 h-4 fill-white" />
                  EXECUTAR INSPEÇÃO
                </Link>

                <div className="grid grid-cols-4 gap-2">
                  <Link 
                    href={`/checklist/${checklist.id}`}
                    className="min-h-[44px] bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl flex items-center justify-center transition active:bg-zinc-800"
                    title="Visualizar Template"
                  >
                    <Eye size={16} />
                  </Link>

                  <Link 
                    href={`/checklist/resultado?checklistId=${checklist.id}`}
                    className="min-h-[44px] bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-blue-500 rounded-xl flex items-center justify-center transition active:bg-zinc-800"
                    title="Ver Execuções"
                  >
                    <FileText size={16} />
                  </Link>

                  <Link 
                    href={`/checklist/${checklist.id}/editar`}
                    className="min-h-[44px] bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-orange-500 rounded-xl flex items-center justify-center transition active:bg-zinc-800"
                    title="Editar Formulário"
                  >
                    <Pencil size={16} />
                  </Link>

                  <button 
                    onClick={() => handleDelete(checklist.id, checklist.nome)}
                    className="min-h-[44px] bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl flex items-center justify-center transition active:bg-red-950/20"
                    title="Remover Registro"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
