'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import {
  Activity, AlertCircle, Search, ChevronRight, ArrowLeft,
  Sliders, HelpCircle, CircleUser, ShoppingBag, TrendingUp, Cpu,
  Gauge, DollarSign, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

interface PageProps {
  params: Promise<{ id: string }>;
}

// ============================================================
// HELPERS (fora do componente — evita recriação a cada render)
// ============================================================
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '---';
  return d.toLocaleDateString('pt-BR');
}

function formatCurrency(val: number | null | undefined): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getStatusBadgeOS(status: string): string {
  switch ((status || '').toUpperCase()) {
    case 'FINALIZADA':
    case 'ENTREGUE':
      return 'border-green-500/20 text-green-400 bg-green-500/5';
    case 'ABERTA':
      return 'border-blue-500/20 text-blue-400 bg-blue-500/5';
    case 'ORCAMENTO':
      return 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5';
    case 'EM_ANDAMENTO':
    case 'EM_EXECUCAO':
    case 'EM_DIAGNOSTICO':
    case 'AGUARDANDO_PECAS':
      return 'border-purple-500/20 text-purple-400 bg-purple-500/5';
    case 'CANCELADA':
      return 'border-zinc-700 text-zinc-500 bg-zinc-950';
    default:
      return 'border-zinc-800 text-zinc-400 bg-zinc-950';
  }
}

function getStatusBadgePreventiva(status: string): string {
  switch ((status || '').toUpperCase()) {
    case 'VENCIDO':
      return 'border-red-500/20 text-red-400 bg-red-500/10 animate-pulse';
    case 'PROXIMO':
      return 'border-amber-500/20 text-amber-400 bg-amber-500/5';
    case 'SAUDAVEL':
      return 'border-green-500/20 text-green-400 bg-green-500/5';
    case 'DESATIVADO':
      return 'border-zinc-700 text-zinc-500 bg-zinc-950';
    default:
      return 'border-zinc-800 text-zinc-400 bg-zinc-950';
  }
}

// ============================================================
// COMPONENTE
// ============================================================
export default function VeiculoHistoricoPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchPeca, setSearchPeca] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce da busca de peças (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchPeca);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchPeca]);

  // ============================================================
  // ✅ CORRIGIDO: apiFetch + AbortController + estado de erro
  // ============================================================
  const fetchHistorico = useCallback(
    async (signal?: AbortSignal, silent = false) => {
      if (!silent) setLoading(true);
      setError(false);
      try {
        const url = `/api/veiculos/${id}/historico?q_peca=${encodeURIComponent(debouncedSearch || '')}`;
        const json = await apiFetch<any>(url, { signal });
        setData(json);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(true);
        setData(null);
        handleApiError(err, { defaultMessage: 'Erro ao buscar histórico de telemetria do veículo' });
      } finally {
        setLoading(false);
      }
    },
    [id, debouncedSearch]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchHistorico(controller.signal);
    return () => controller.abort();
  }, [fetchHistorico]);

  // ============================================================
  // MEMOIZAÇÕES
  // ============================================================
  const veiculo = useMemo(() => data?.veiculo || {}, [data]);
  const stats = useMemo(
    () =>
      data?.stats || {
        kmMedioPorMes: 0,
        totalOS: 0,
        totalPecasTrocadas: 0,
        totalInvestido: 0,
        preventivasAtivasCount: 0,
        preventivasVencidasCount: 0,
      },
    [data]
  );
  const timeline = useMemo(() => data?.timeline || [], [data]);
  const pecasTrocadas = useMemo(() => data?.pecasTrocadas || [], [data]);
  const preventivas = useMemo(() => data?.preventivas || [], [data]);

  // ============================================================
  // RENDER — LOADING
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          Processando Histórico de Telemetria...
        </p>
      </div>
    );
  }

  // ============================================================
  // RENDER — ERRO
  // ============================================================
  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4 p-6">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-black uppercase tracking-tight">Falha ao carregar histórico</h2>
        <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest text-center max-w-md">
          Não foi possível obter os dados de telemetria do veículo. Verifique sua conexão ou tente novamente.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => fetchHistorico()}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2"
          >
            <RefreshCw size={14} /> Tentar novamente
          </button>
          <Link
            href="/veiculos"
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Voltar para Frota
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-8" id="veiculo-timeline-root">

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-2">
          <Link
            href="/veiculos"
            className="text-zinc-500 hover:text-zinc-300 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-all w-fit"
          >
            <ArrowLeft size={12} />
            Voltar para Frota
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="px-3 py-1 bg-orange-600 font-extrabold text-sm rounded shadow-lg shadow-orange-950/20 italic tracking-tight uppercase">
              {veiculo.placa || '---'}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Linha do Tempo
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium font-mono uppercase">
            {veiculo.marca || '---'} {veiculo.modelo || '---'} — Proprietário:{' '}
            <strong className="text-white">{veiculo.cliente?.nome || 'Não definido'}</strong>
          </p>
        </div>

        <Link
          href={`/os/nova?veiculo_id=${veiculo.id || id}`}
          className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center cursor-pointer shadow-lg shadow-orange-950/20"
        >
          Criar OS para Veículo
        </Link>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Quilometragem Atual */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Quilometragem</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Gauge size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {veiculo.quilometragem ? `${veiculo.quilometragem.toLocaleString('pt-BR')} KM` : '---'}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
              Acumulado do painel
            </span>
          </div>
        </div>

        {/* KM Médio por Mês */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Média KM/Mês</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-orange-400 truncate block">
              {stats.kmMedioPorMes > 0
                ? `~${stats.kmMedioPorMes.toLocaleString('pt-BR')} KM`
                : '—'}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
              Consumo real de rodagem
            </span>
          </div>
        </div>

        {/* Total OS */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total de Ordens</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Activity size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {stats.totalOS} OS
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
              Intervenções de manutenção
            </span>
          </div>
        </div>

        {/* Total Investido */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Investido</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 truncate block">
              {formatCurrency(stats.totalInvestido)}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
              Peças e serviços acumulados
            </span>
          </div>
        </div>

        {/* Preventivas */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Preventivas</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.preventivasVencidasCount > 0
                  ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                  : 'bg-green-500/10 border border-green-500/20 text-green-400'
              }`}
            >
              <AlertCircle size={14} />
            </div>
          </div>
          <div>
            <span
              className={`text-xl md:text-2xl font-black font-mono truncate block ${
                stats.preventivasVencidasCount > 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {stats.preventivasVencidasCount} Vencidas
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
              {stats.preventivasAtivasCount} regras cadastradas
            </span>
          </div>
        </div>
      </div>

      {/* TIMELINE & PEÇAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* TIMELINE */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="text-orange-500 w-5 h-5" />
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic">
              Histórico Cronológico Geral
            </h2>
          </div>

          {timeline.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs uppercase border border-dashed border-zinc-800 rounded-xl space-y-2">
              <HelpCircle className="mx-auto w-8 h-8 text-zinc-600 block" />
              <span>Nenhuma Ordem de Serviço cadastrada para este veículo.</span>
            </div>
          ) : (
            <div className="relative border-l-2 border-zinc-800 ml-4 pl-6 space-y-8">
              {timeline.map((os: any) => (
                <div key={os.id} className="relative group">
                  {/* Dot */}
                  <span className="absolute -left-10 top-1.5 w-6 h-6 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center group-hover:border-orange-500 transition-all">
                    <span className="w-2 h-2 rounded-full bg-zinc-800 group-hover:bg-orange-500 transition-all" />
                  </span>

                  {/* Card */}
                  <div className="bg-zinc-950/60 border border-zinc-900 group-hover:border-zinc-800 p-5 rounded-xl space-y-3 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black font-mono text-zinc-500 bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded">
                          {formatDate(os.data)}
                        </span>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-orange-400 transition-all">
                          Ordem de Serviço #{os.numero || '---'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {os.comprovante && (
                          <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-[8px] font-black rounded uppercase tracking-widest text-green-400">
                            Assinatura Ativa
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase tracking-widest ${getStatusBadgeOS(
                            os.status
                          )}`}
                        >
                          {os.status || '---'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 font-medium">
                      {os.diagnostico || 'Sem diagnóstico registrado.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-[10px] font-mono font-bold text-zinc-500 border-t border-zinc-900 pt-2.5 gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CircleUser size={12} className="opacity-50" />
                          Téc: {os.mecanico || 'Não atribuído'}
                        </span>
                        <span>•</span>
                        <span>{os.servicos_count || 0} serviços</span>
                        <span>•</span>
                        <span>{os.pecas_count || 0} peças</span>
                      </div>
                      <span className="text-sm font-extrabold text-white">
                        {formatCurrency(os.valor_total)}
                      </span>
                    </div>

                    <div className="text-right pt-2">
                      <Link
                        href={`/os/${os.id}`}
                        className="text-[9px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 inline-flex items-center gap-1 transition-all"
                      >
                        Visualizar OS Completa
                        <ChevronRight size={10} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PREVENTIVAS + PEÇAS */}
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="text-orange-500 w-5 h-5" />
                <h2 className="text-md font-black tracking-tight text-white uppercase italic">
                  Plano de Manutenção
                </h2>
              </div>
              <Link
                href="/preventivas"
                className="text-[10px] text-orange-500 hover:text-orange-400 font-bold uppercase tracking-wider"
              >
                Gerenciar →
              </Link>
            </div>

            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
              Inspeções automáticas e substituições planejadas por KM, horímetro ou data.
            </p>

            <div className="space-y-3 pt-2 max-h-[400px] overflow-y-auto pr-1">
              {preventivas.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 font-mono text-xs uppercase border border-dashed border-zinc-900 rounded-lg">
                  Sem regras ativas para este veículo.
                </div>
              ) : (
                preventivas.map((p: any) => {
                  const proximoKm = p.proximo_km ?? p.km_limite;
                  const proximaData = p.proxima_data ?? p.data_limite;
                  return (
                    <div key={p.id} className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-white tracking-tight block uppercase truncate">
                          {p.nome || p.servico || p.componente || 'Plano'}
                        </span>
                        <span
                          className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase tracking-widest ${getStatusBadgePreventiva(
                            p.status
                          )}`}
                        >
                          {p.status || '---'}
                        </span>
                      </div>

                      {p.descricao && (
                        <p className="text-[10px] text-zinc-400 font-medium">{p.descricao}</p>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-zinc-900 pt-2 font-mono text-zinc-500 font-bold">
                        <div>
                          <span className="block text-[8px] uppercase tracking-widest text-zinc-500">KM Alvo</span>
                          <span className="text-zinc-300 block">
                            {proximoKm ? `${proximoKm.toLocaleString('pt-BR')} KM` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-widest text-zinc-500">Horímetro</span>
                          <span className="text-zinc-300 block">
                            {p.proximo_horimetro ? `${p.proximo_horimetro} h` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-widest text-zinc-500">Data</span>
                          <span className="text-zinc-300 block">
                            {proximaData ? formatDate(proximaData) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PEÇAS APLICADAS */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-orange-500 w-5 h-5" />
              <h2 className="text-md font-black tracking-tight text-white uppercase italic">
                Análise de Peças Aplicadas
              </h2>
            </div>

            {/* SEARCH BOX */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-zinc-500 w-4 h-4" />
              <input
                type="text"
                placeholder="PROCURAR EX. FILTRO, PASTILHA..."
                value={searchPeca}
                onChange={(e) => setSearchPeca(e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-xs font-mono font-bold text-white uppercase tracking-tight focus:outline-none focus:border-orange-500 placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
              {pecasTrocadas.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 font-mono text-xs uppercase border border-dashed border-zinc-900 rounded-lg">
                  {searchPeca ? 'Nenhuma peça encontrada para o filtro.' : 'Nenhuma peça aplicada registrada.'}
                </div>
              ) : (
                pecasTrocadas.map((pt: any) => (
                  <div
                    key={pt.id}
                    className="bg-zinc-950/60 border border-zinc-900 p-3 rounded-lg space-y-1.5 hover:border-zinc-800 transition-all font-mono"
                  >
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>OS #{pt.os_numero || '---'}</span>
                      <span>{formatDate(pt.data)}</span>
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-tight block truncate">
                      {pt.descricao || 'Sem descrição'}
                    </span>
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                      <span>
                        Qtd: {pt.quantidade} {pt.unidade || 'un'}
                      </span>
                      <span className="text-white font-extrabold">{formatCurrency(pt.valor_total)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
