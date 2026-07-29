'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { 
  Wrench, Activity, AlertCircle, Search, Calendar, Landmark, 
  ChevronRight, ArrowLeft, Fuel, Sparkles, Sliders, CheckCircle2, 
  HelpCircle, CircleUser, ShoppingBag, TrendingUp, Cpu, Gauge, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function VeiculoHistoricoPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchPeca, setSearchPeca] = useState('');

  const fetchHistorico = useCallback(async (silent = false, query = '') => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/veiculos/${id}/historico?q_peca=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Erro ao buscar timeline do veículo');
      const json = await response.json();
      setData(json);
    } catch (error: any) {
      toast.error('Erro ao conectar com o banco de telemetria');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await Promise.resolve();
      if (active) {
        fetchHistorico();
      }
    };
    trigger();
    return () => {
      active = false;
    };
  }, [fetchHistorico]);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchHistorico(true, searchPeca);
    }
  };

  const getStatusBadgeOS = (status: string) => {
    switch (status.toUpperCase()) {
      case 'FINALIZADA':
        return 'border-green-500/20 text-green-400 bg-green-500/5';
      case 'ABERTA':
        return 'border-blue-500/20 text-blue-400 bg-blue-500/5';
      case 'ORCAMENTO':
        return 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5';
      case 'EM_ANDAMENTO':
        return 'border-purple-500/20 text-purple-400 bg-purple-500/5';
      default:
        return 'border-zinc-800 text-zinc-400 bg-zinc-950';
    }
  };

  const getStatusBadgePreventiva = (status: string) => {
    switch (status.toUpperCase()) {
      case 'VENCIDO':
        return 'border-red-500/20 text-red-400 bg-red-500/10 animate-pulse';
      case 'PROXIMO':
        return 'border-amber-500/20 text-amber-400 bg-amber-500/5';
      case 'SAUDAVEL':
        return 'border-green-500/20 text-green-400 bg-green-500/5';
      default:
        return 'border-zinc-800 text-zinc-400 bg-zinc-950';
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Cpu className="w-8 h-8 animate-spin text-orange-500" />
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">Processando Histórico de Telemetria...</span>
      </div>
    );
  }

  const veiculo = data?.veiculo || {};
  const stats = data?.stats || {
    kmMedioPorMes: 0,
    totalOS: 0,
    totalPecasTrocadas: 0,
    totalInvestido: 0,
    preventivasAtivasCount: 0,
    preventivasVencidasCount: 0
  };
  const timeline = data?.timeline || [];
  const pecasTrocadas = data?.pecasTrocadas || [];
  const preventivas = data?.preventivas || [];

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-8" id="veiculo-timeline-root">
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
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-orange-600 font-extrabold text-sm rounded shadow-lg shadow-orange-950/20 italic tracking-tight uppercase">
              {veiculo.placa}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Linha do Tempo
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-medium font-mono uppercase">
            {veiculo.marca} {veiculo.modelo} — Proprietário: <strong className="text-white">{veiculo.cliente?.nome || 'Não definido'}</strong>
          </p>
        </div>

        <Link
          href={`/os/nova?veiculo_id=${veiculo.id}`}
          className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center cursor-pointer shadow-lg shadow-orange-950/20"
        >
          Criar OS para Veículo
        </Link>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Quilometragem Atual */}
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
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
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Acumulado do painel</span>
          </div>
        </div>

        {/* KM Médio por Mês */}
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Média KM/Mês</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-orange-400 truncate block">
              {stats.kmMedioPorMes > 0 ? `~${stats.kmMedioPorMes.toLocaleString('pt-BR')} KM` : 'Calculando...'}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Consumo real de rodagem</span>
          </div>
        </div>

        {/* Total OS */}
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total de Ordens</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <Wrench size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {stats.totalOS} OS
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Intervenções de manutenção</span>
          </div>
        </div>

        {/* Total Investido */}
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Investido</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 truncate block">
              {formatCurrency(stats.totalInvestido || 0)}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Peças e serviços acumulados</span>
          </div>
        </div>

        {/* Alertas de Preventiva */}
        <div className="bg-zinc-950 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Preventivas</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stats.preventivasVencidasCount > 0 ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
              <AlertCircle size={14} />
            </div>
          </div>
          <div>
            <span className={`text-xl md:text-2xl font-black font-mono truncate block ${stats.preventivasVencidasCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {stats.preventivasVencidasCount} Vencidas
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">{stats.preventivasAtivasCount} regras cadastradas</span>
          </div>
        </div>
      </div>

      {/* CORE TIMELINE & PARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TIMELINE DE ADIANTAMENTOS / OS */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-850 p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2">
            <Activity className="text-orange-500 w-5 h-5" />
            <h2 className="text-lg font-black tracking-tight text-white uppercase italic">Histórico Cronológico Geral</h2>
          </div>

          {timeline.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs uppercase border border-dashed border-zinc-850 rounded-xl space-y-2">
              <HelpCircle className="mx-auto w-8 h-8 text-zinc-600 block" />
              <span>Nenhuma Ordem de Serviço cadastrada para este veículo.</span>
            </div>
          ) : (
            <div className="relative border-l-2 border-zinc-900 ml-4 pl-6 space-y-8">
              {timeline.map((os: any) => (
                <div key={os.id} className="relative group">
                  {/* Dot */}
                  <span className="absolute -left-10 top-1.5 w-6 h-6 rounded-full border border-zinc-800 bg-black flex items-center justify-center group-hover:border-orange-500 transition-all">
                    <span className="w-2 h-2 rounded-full bg-zinc-800 group-hover:bg-orange-500 transition-all" />
                  </span>
                  
                  {/* Card content */}
                  <div className="bg-black/50 border border-zinc-900 group-hover:border-zinc-800 p-5 rounded-xl space-y-3 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black font-mono text-zinc-500 bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded">
                          {new Date(os.data).toLocaleDateString('pt-BR')}
                        </span>
                        <h3 className="text-sm font-black text-white uppercase tracking-tight group-hover:text-orange-400 transition-all">
                          Ordem de Serviço #{os.numero}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {os.comprovante && (
                          <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-[8px] font-black rounded uppercase tracking-widest text-green-400">
                            Assinatura Ativa
                          </span>
                        )}
                        <span className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase tracking-widest ${getStatusBadgeOS(os.status)}`}>
                          {os.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 font-medium">
                      {os.diagnostico}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-[10px] font-mono font-bold text-zinc-500 border-t border-zinc-950 pt-2.5">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <CircleUser size={12} className="opacity-50" />
                          Téc: {os.mecanico}
                        </span>
                        <span>•</span>
                        <span>{os.servicos_count} serviços</span>
                        <span>•</span>
                        <span>{os.pecas_count} peças</span>
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

        {/* ALERTA PREVENTIVAS ATIVAS */}
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="text-orange-500 w-5 h-5 animate-pulse" />
              <h2 className="text-md font-black tracking-tight text-white uppercase italic">Alertas de Preventiva</h2>
            </div>
            
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Inspeções automáticas e substituições planejadas por quilometragem ou período máximo de rodagem.</p>

            <div className="space-y-3 pt-2">
              {preventivas.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 font-mono text-xs uppercase border border-dashed border-zinc-900 rounded-lg">
                  Sem regras ativas.
                </div>
              ) : (
                preventivas.map((p: any) => (
                  <div key={p.id} className="bg-black/60 border border-zinc-900 p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-white hover:text-orange-500 tracking-tight block uppercase">
                        {p.componente}
                      </span>
                      <span className={`px-2 py-0.5 border text-[9px] font-black rounded uppercase tracking-widest ${getStatusBadgePreventiva(p.status)}`}>
                        {p.status}
                      </span>
                    </div>

                    {p.descricao && (
                      <p className="text-[10px] text-zinc-400 font-medium">{p.descricao}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-zinc-950/80 pt-2 font-mono text-zinc-500 font-bold">
                      <div>
                        <span className="block text-[8px] uppercase tracking-widest text-zinc-500">KM Limite</span>
                        <span className="text-zinc-300 block">{p.km_limite ? `${p.km_limite.toLocaleString('pt-BR')} KM` : 'Sem limite'}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] uppercase tracking-widest text-zinc-500">Data Limite</span>
                        <span className="text-zinc-300 block">{p.data_limite ? new Date(p.data_limite).toLocaleDateString('pt-BR') : 'Sem data'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* HISTÓRICO RÁPIDO DE PEÇAS TROCADAS */}
          <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-orange-500 w-5 h-5" />
              <h2 className="text-md font-black tracking-tight text-white uppercase italic">Análise de Peças Aplicadas</h2>
            </div>

            {/* SEARCH BOX */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 text-zinc-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="PROCURAR EX. FILTRO, PASTILHA..."
                value={searchPeca}
                onChange={(e) => setSearchPeca(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                className="w-full bg-black/50 border border-zinc-850 rounded-xl py-3 pl-10 pr-4 text-xs font-mono font-bold text-white uppercase tracking-tight focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-3 pt-2 max-h-[350px] overflow-y-auto pr-1">
              {pecasTrocadas.length === 0 ? (
                <div className="text-center py-6 text-zinc-500 font-mono text-xs uppercase border border-dashed border-zinc-900 rounded-lg">
                  Nenhuma peça encontrada.
                </div>
              ) : (
                pecasTrocadas.map((pt: any) => (
                  <div key={pt.id} className="bg-black/60 border border-zinc-900 p-3 rounded-lg space-y-1.5 hover:border-zinc-800 transition-all font-mono">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>OS #{pt.os_numero}</span>
                      <span>{new Date(pt.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-tight block">
                      {pt.descricao}
                    </span>
                    <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                      <span>Qtd: {pt.quantidade} {pt.unidade}</span>
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
