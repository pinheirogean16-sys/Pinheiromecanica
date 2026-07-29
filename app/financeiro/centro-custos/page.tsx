'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Building2, TrendingUp, TrendingDown, DollarSign, Wallet, 
  Percent, RefreshCw, BarChart3, ChevronRight, FileText, Calendar, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { toast } from 'sonner';

export default function CentroCustosPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch('/api/centro-custos');
      if (!response.ok) throw new Error('Erro ao obter dados do centro de custos');
      const json = await response.ok ? await response.json() : null;
      setData(json);
      if (json?.cached) {
        toast.info('Dados carregados do cache de aggregates (SWR)');
      }
    } catch (error: any) {
      toast.error('Erro ao conectar com o motor financeiro');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await Promise.resolve();
      if (active) {
        fetchData();
      }
    };
    trigger();
    return () => {
      active = false;
    };
  }, [fetchData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getSectorColor = (sector: string) => {
    switch (sector.toUpperCase()) {
      case 'OFICINA': return 'from-blue-600 to-cyan-500';
      case 'CAMPO': return 'from-emerald-600 to-green-500';
      case 'RESGATE': return 'from-red-600 to-orange-500';
      case 'MOTOR': return 'from-amber-600 to-yellow-500';
      case 'CAIXA': return 'from-purple-600 to-pink-500';
      case 'DIFERENCIAL': return 'from-indigo-600 to-violet-500';
      case 'ELETRICA': return 'from-teal-600 to-emerald-500';
      case 'INJECAO': return 'from-orange-600 to-amber-500';
      case 'BORRACHARIA': return 'from-zinc-600 to-slate-400';
      default: return 'from-zinc-700 to-zinc-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">Processando motor financeiro da OS...</span>
      </div>
    );
  }

  const geral = data?.geral || {
    faturamentoBruto: 0,
    custoOperacionalTotal: 0,
    lucroBrutoTotal: 0,
    impostosSimulados: 0,
    faturamentoLiquido: 0,
    margemGeral: 0
  };

  const setores = data?.setores || [];
  const evolucaoMensal = data?.evolucaoMensal || [];

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-8" id="centro-custor-view">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-2xl w-fit">
            <Building2 size={12} />
            MÓDULO ENTERPRISE — INTELIGÊNCIA FINANCEIRA
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase italic">
            CENTROS DE CUSTO
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Ranking de rentabilidade por setor, lucratividade líquida de OS, despesas operacionais detalhadas e SWR aggregates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-orange-500' : ''} />
            Atualizar Consolidado
          </button>
          
          <Link
            href="/financeiro"
            className="bg-white text-black hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center cursor-pointer"
          >
            Ir para Caixa
          </Link>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Faturamento Bruto */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fat. Bruto Geral</span>
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
              <DollarSign size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {formatCurrency(geral.faturamentoBruto)}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Soma bruta de todas OS</span>
          </div>
        </div>

        {/* Custo Operacional */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Custo Operacional</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <TrendingDown size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {formatCurrency(geral.custoOperacionalTotal)}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Peças + MO + Deslocamento</span>
          </div>
        </div>

        {/* Lucro Bruto */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Lucro Bruto</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Wallet size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {formatCurrency(geral.lucroBrutoTotal)}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Faturamento - Custo Real</span>
          </div>
        </div>

        {/* Impostos Simulados */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Impostos (Simulado 6%)</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Percent size={14} />
            </div>
          </div>
          <div>
            <span className="text-xl md:text-2xl font-black font-mono text-white truncate block">
              {formatCurrency(geral.impostosSimulados)}
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Simples Nacional padrão</span>
          </div>
        </div>

        {/* Margem Bruta Geral */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Margem Consolidada</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp size={14} />
            </div>
          </div>
          <div>
            <span className={`text-xl md:text-2xl font-black font-mono truncate block ${geral.margemGeral >= 30 ? 'text-green-400' : 'text-yellow-400'}`}>
              {geral.margemGeral}%
            </span>
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">Eficiência média do negócio</span>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHART SECTION */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-orange-500 w-5 h-5" />
            <h2 className="text-md font-black tracking-widest text-white uppercase italic">Evolução de Rentabilidade por Mês</h2>
          </div>
          {evolucaoMensal.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center font-mono text-xs text-zinc-500 uppercase">
              Sem dados operacionais para gerar histórico.
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucaoMensal} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="label" stroke="#71717a" fontSize={11} style={{ fontFamily: 'monospace' }} />
                  <YAxis stroke="#71717a" fontSize={11} style={{ fontFamily: 'monospace' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }} 
                    labelStyle={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace', textTransform: 'uppercase' }} />
                  <Bar name="Faturamento Bruto" dataKey="faturamento" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar name="Custo Operacional" dataKey="custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar name="Lucro Bruto" dataKey="lucro" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* SHARE OF RENTABILIDADE */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-md font-black tracking-widest text-white uppercase italic">Share de Lucratividade</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Contribuição de cada setor no lucro global</p>
          </div>

          <div className="space-y-4">
            {setores.map((setor: any) => (
              <div key={setor.setor} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-black text-zinc-300 uppercase tracking-tight">{setor.setor}</span>
                  <span className="font-mono font-bold text-zinc-500">{setor.porcentagemRentabilidade}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${getSectorColor(setor.setor)} transition-all duration-500`}
                    style={{ width: `${Math.max(2, sector.porcentagemRentabilidade || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED SECTOR LIST */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-lg font-black tracking-tight uppercase italic text-white">Resultados de Performance por Centro de Custo</h2>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mt-1">Estatísticas fiscais e operacionais detalhadas</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/30 text-zinc-400">
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono">Centro de Custo</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono text-center">Volume OS</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono text-right">Fat. Bruto</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono text-right">Custos Operacionais</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono text-right">Margem de Lucro</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono text-right">Sobra Líquida</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest font-mono text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {setores.map((setor: any) => (
                <tr key={setor.setor} className="border-b border-zinc-800/60 hover:bg-zinc-900/40 transition-all font-mono">
                  <td className="p-4 text-sm font-bold">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getSectorColor(setor.setor)}`} />
                      <span className="text-white uppercase font-black">{setor.setor}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-sm font-bold text-zinc-300">
                    {setor.totalOS}
                  </td>
                  <td className="p-4 text-right text-sm text-zinc-400">
                    {formatCurrency(setor.faturamentoBruto)}
                  </td>
                  <td className="p-4 text-right text-sm text-red-400">
                    {formatCurrency(setor.custoTotal)}
                  </td>
                  <td className="p-4 text-right text-sm font-bold">
                    <span className={`px-2 py-0.5 rounded text-xs font-black bg-zinc-950 border ${setor.margemMedia >= 35 ? 'border-green-500/20 text-green-400' : 'border-yellow-500/20 text-yellow-500'}`}>
                      {setor.margemMedia}%
                    </span>
                  </td>
                  <td className="p-4 text-right text-sm font-black text-emerald-400">
                    {formatCurrency(setor.faturamentoLiquido)}
                  </td>
                  <td className="p-4 text-center">
                    <Link
                      href={`/os?centro_custo=${setor.setor}`}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-300 inline-flex items-center gap-1.5 transition-all"
                    >
                      Filtrar OS
                      <ChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
