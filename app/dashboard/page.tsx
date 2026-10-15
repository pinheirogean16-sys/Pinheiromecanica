'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Clock, CheckCircle, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, ArrowDownLeft, Wallet, Hammer,
  FileText, Package, LayoutDashboard, ChevronRight, RefreshCw,
  PlusCircle, Users, Truck, Wrench, ShieldAlert, BadgeInfo,
  Calendar, CheckSquare, Settings, Activity, Sparkles, Inbox, Play, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { BRANDING } from '@/lib/branding';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#eab308'];

// ============================================================
// SKELETON LOADERS (tema escuro fixo)
// ============================================================
const SkeletonPulse = () => (
  <div className="w-full h-full animate-pulse bg-zinc-900/40 rounded-3xl border border-zinc-800/40 p-6 flex flex-col justify-between" />
);

const StatsGridSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
    {[...Array(6)].map((_, i) => <div key={i} className="h-32"><SkeletonPulse /></div>)}
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-3xl p-6 h-80 md:h-96 animate-pulse flex flex-col justify-between">
    <div className="flex justify-between items-center mb-6">
      <div className="w-40 h-4 bg-zinc-800 rounded"></div>
      <div className="w-24 h-8 bg-zinc-800 rounded-xl"></div>
    </div>
    <div className="flex-1 flex gap-3 items-end px-2">
      {[50, 80, 45, 95, 60, 75, 40, 85, 30, 90, 50, 70].map((h, i) => (
        <div key={i} className="bg-zinc-800/50 rounded-t-lg flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
);

const WidgetErrorFallback = ({ title, onRetry }: { title: string; onRetry: () => void }) => (
  <div className="p-8 bg-zinc-950/65 border border-red-500/10 rounded-3xl text-center space-y-4 shadow-xl max-w-md mx-auto aspect-video flex flex-col justify-center items-center">
    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20">
      <AlertTriangle className="w-6 h-6 animate-bounce" />
    </div>
    <div>
      <h3 className="text-sm font-black text-white uppercase tracking-wider">{title} Indisponível</h3>
      <p className="text-xs text-zinc-500 mt-1 leading-tight">Serviço com lentidão ou offline. Tente nova tentativa.</p>
    </div>
    <button 
      onClick={onRetry} 
      className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest text-white transition flex items-center gap-2 cursor-pointer"
    >
      <RefreshCw className="w-3.5 h-3.5" />
      Recarregar Módulo
    </button>
  </div>
);

interface LazyModuleProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  onVisible: () => void;
}

const LazyModule = React.memo(({ children, fallback, onVisible }: LazyModuleProps) => {
  const [hasIntersected, setHasIntersected] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasIntersected(true);
        onVisible();
        observer.disconnect();
      }
    }, { threshold: 0.05, rootMargin: '100px' });

    const currentElem = triggerRef.current;
    if (currentElem) observer.observe(currentElem);
    return () => observer.disconnect();
  }, [onVisible]);

  return <div ref={triggerRef} className="w-full h-full">{hasIntersected ? children : fallback}</div>;
});
LazyModule.displayName = 'LazyModule';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(false);

  const [resumoFinanceiro, setResumoFinanceiro] = useState<any>(null);
  const [loadingResumo, setLoadingResumo] = useState(true);
  const [resumoError, setResumoError] = useState(false);

  const [veiculoStats, setVeiculoStats] = useState<any>(null);
  const [loadingVeiculoStats, setLoadingVeiculoStats] = useState(true);
  const [veiculoStatsError, setVeiculoStatsError] = useState(false);

  const [faturamentoData, setFaturamentoData] = useState<any[]>([]);
  const [loadingFaturamentoData, setLoadingFaturamentoData] = useState(true);
  const [faturamentoDataError, setFaturamentoDataError] = useState(false);

  const [topServices, setTopServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState(false);

  const [recentActivities, setRecentActivities] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState(false);

  const [preventivas, setPreventivas] = useState<any[]>([]);
  const [loadingPreventivas, setLoadingPreventivas] = useState(true);

  const [pecas, setPecas] = useState<any[]>([]);
  const [loadingPecas, setLoadingPecas] = useState(true);

  const [agendaEvents, setAgendaEvents] = useState<any[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);

  const [chartPeriod, setChartPeriod] = useState<'30_DIAS' | '6_MESES'>('30_DIAS');
  const [agendaFilter, setAgendaFilter] = useState<'TODOS' | 'OS' | 'ENTREGAS' | 'EXECUCAO'>('TODOS');
  const [stockTab, setStockTab] = useState<'LOW_STOCK' | 'MOST_MOVE'>('LOW_STOCK');

  const dynamicGreeting = useMemo(() => {
    if (!mounted) return 'Bom dia';
    const hours = new Date().getHours();
    if (hours >= 5 && hours < 12) return 'Bom dia';
    if (hours >= 12 && hours < 18) return 'Boa tarde';
    return 'Boa noite';
  }, [mounted]);

  const dynamicDateString = useMemo(() => {
    if (!mounted) return '';
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [mounted]);

  const loadUser = useCallback(async () => {
    setLoadingUser(true);
    try {
      const data = await apiFetch('/api/auth/session', { priority: 'high', ttl: 60000 });
      if (data) setUser(data.user || data);
    } catch {
      // silencioso
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(false);
    try {
      const data = await apiFetch('/api/dashboard/stats', { ttl: 20000 });
      if (data) setStats(data);
    } catch {
      setStatsError(true);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadResumoFinanceiro = useCallback(async () => {
    setLoadingResumo(true);
    setResumoError(false);
    try {
      const data = await apiFetch('/api/dashboard/resumo-financeiro', { ttl: 30000 });
      if (data) setResumoFinanceiro(data);
    } catch {
      setResumoError(true);
    } finally {
      setLoadingResumo(false);
    }
  }, []);

  const loadVeiculoStats = useCallback(async () => {
    setLoadingVeiculoStats(true);
    setVeiculoStatsError(false);
    try {
      const data = await apiFetch('/api/veiculos/stats', { ttl: 30000 });
      if (data) setVeiculoStats(data);
    } catch {
      setVeiculoStatsError(true);
    } finally {
      setLoadingVeiculoStats(false);
    }
  }, []);

  const loadFaturamento = useCallback(async () => {
    setLoadingFaturamentoData(true);
    setFaturamentoDataError(false);
    try {
      const data = await apiFetch('/api/dashboard/faturamento-mensal', { ttl: 60000 });
      if (data) {
        setFaturamentoData(Array.isArray(data) ? data : (data.items || []));
      }
    } catch {
      setFaturamentoDataError(true);
    } finally {
      setLoadingFaturamentoData(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    setServicesError(false);
    try {
      const data = await apiFetch('/api/dashboard/servicos-mais-realizados', { ttl: 60000 });
      if (data) {
        setTopServices(Array.isArray(data) ? data : (data.items || []));
      }
    } catch {
      setServicesError(true);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    setLoadingActivities(true);
    setActivitiesError(false);
    try {
      const data = await apiFetch('/api/dashboard/atividades', { ttl: 20000 });
      if (data) setRecentActivities(data);
    } catch {
      setActivitiesError(true);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  const loadPreventivas = useCallback(async () => {
    setLoadingPreventivas(true);
    try {
      const data = await apiFetch('/api/preventivas', { ttl: 30000 });
      if (Array.isArray(data)) setPreventivas(data);
    } catch {
      // silencioso
    } finally {
      setLoadingPreventivas(false);
    }
  }, []);

  const loadPecas = useCallback(async () => {
    setLoadingPecas(true);
    try {
      const data = await apiFetch('/api/pecas?limit=30', { ttl: 30000 });
      if (data && Array.isArray(data.items)) {
        setPecas(data.items);
      }
    } catch {
      // silencioso
    } finally {
      setLoadingPecas(false);
    }
  }, []);

  const loadAgenda = useCallback(async () => {
    setLoadingAgenda(true);
    try {
      const hoje = new Date();
      const start = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
      const end = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999).toISOString();
      const data = await apiFetch(`/api/agenda?start=${start}&end=${end}`, { ttl: 25000 });
      if (Array.isArray(data)) setAgendaEvents(data);
    } catch {
      // silencioso
    } finally {
      setLoadingAgenda(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadUser();
    loadStats();
    loadResumoFinanceiro();
    loadVeiculoStats();
    loadAgenda();
  }, [loadUser, loadStats, loadResumoFinanceiro, loadVeiculoStats, loadAgenda]);

  // A13: removido o gerador com Math.sin/cos. O gráfico de 30 dias passa
  // a usar APENAS dados reais de /api/dashboard/faturamento-mensal.
  // Enquanto o endpoint não devolver granularidade diária, mostramos a
  // mensagem de "dados insuficientes" no gráfico (tratada abaixo).

  const computedAlerts = useMemo(() => {
    const list: { type: 'CRITICAL' | 'ATTENTION' | 'NORMAL'; message: string; sub: string; date?: string }[] = [];
    
    const preventivasVencidasCount = preventivas.filter(p => p.status === 'VENCIDO').length;
    if (preventivasVencidasCount > 0) {
      list.push({
        type: 'CRITICAL',
        message: `${preventivasVencidasCount} Manutenções Vencidas`,
        sub: 'Veículos correndo riscos imediatos de pane.'
      });
    }

    const pecasComEstoqueBaixoCount = stats?.pecasEstoqueBaixo ?? pecas.filter(p => p.quantidade <= (p.estoque_minimo ?? 3)).length;
    if (pecasComEstoqueBaixoCount > 0) {
      list.push({
        type: 'CRITICAL',
        message: `${pecasComEstoqueBaixoCount} Peças em Estoque Baixo`,
        sub: 'Risco de gargalo operacional na montagem.'
      });
    }

    if (resumoFinanceiro?.aPagar > 10000) {
      list.push({
        type: 'ATTENTION',
        message: `Atenção: Fluxo de Contas a Pagar Elevado`,
        sub: `${formatCurrency(resumoFinanceiro.aPagar)} previstos para este período.`
      });
    }

    const inProgressList = recentActivities?.recentOS || [];
    const stalledOS = inProgressList.filter((os: any) => os.status === 'AGUARDANDO_PECAS' || os.status === 'AGUARDANDO_APROVACAO').length;
    if (stalledOS > 0) {
      list.push({
        type: 'ATTENTION',
        message: `${stalledOS} OS Aguardando Peça / Cliente`,
        sub: 'Risco de pátio obstruído e queda de giro.'
      });
    }

    if (list.length === 0) {
      list.push({
        type: 'NORMAL',
        message: 'Operação Operando em Fluxo Máximo',
        sub: 'Nenhum alerta crítico ou atraso operacional identificado.'
      });
    }

    return list;
  }, [preventivas, pecas, stats, resumoFinanceiro, recentActivities]);

  const alertsBadgeCount = useMemo(() => {
    return computedAlerts.filter(a => a.type === 'CRITICAL' || a.type === 'ATTENTION').length;
  }, [computedAlerts]);

  const lowStockProductsList = useMemo(() => {
    return pecas.filter(p => p.quantidade <= (p.estoque_minimo ?? 5)).slice(0, 5);
  }, [pecas]);

  const filteredEvents = useMemo(() => {
    if (agendaFilter === 'TODOS') return agendaEvents;
    if (agendaFilter === 'OS') return agendaEvents.filter(e => e.tipo === 'OS');
    if (agendaFilter === 'ENTREGAS') return agendaEvents.filter(e => e.tipo === 'ENTREGA');
    if (agendaFilter === 'EXECUCAO') return agendaEvents.filter(e => e.status === 'EM_ANDAMENTO');
    return agendaEvents;
  }, [agendaEvents, agendaFilter]);

  return (
    <div id="dashboard-viewport" className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8 pb-24 overflow-hidden text-zinc-100 font-sans">
      
      {/* 1. HERO HEADER DASHBOARD */}
      <div id="hero-header-section" className="bg-gradient-to-tr from-zinc-950 via-zinc-900 to-zinc-905 border border-zinc-800/80 rounded-[2rem] p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-orange-600/10 p-2.5 rounded-2xl border border-orange-500/20">
                <Sparkles className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest font-mono">
                  {BRANDING.name} • {BRANDING.slogan}
                </p>
                <h1 className="text-2xl sm:text-3.5xl font-black text-white italic leading-tight select-none tracking-tight">
                  {dynamicGreeting}, <span className="text-orange-500 font-extrabold">{user?.name || 'Administrador'}</span>!
                </h1>
              </div>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm font-sans leading-relaxed">
              Consolide metas financeiras, gerencie ordens urgentes e controle a produtividade da sua oficina com alta precisão técnica.
            </p>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 font-semibold bg-zinc-950/60 w-fit px-3 py-1.5 rounded-xl border border-zinc-900">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span className="uppercase text-zinc-300 font-sans tracking-wide">{dynamicDateString}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 transition hover:border-orange-500/30">
              <div className="p-3 bg-orange-600/10 rounded-xl text-orange-500 border border-orange-500/10">
                <Hammer className="w-5 h-5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">Ordens Ativas</span>
                <span className="text-2xl sm:text-3.5xl font-black font-sans leading-none text-white tracking-tight">
                  {loadingStats ? '...' : stats?.osEmAberto ?? 0}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 transition hover:border-cyan-500/30">
              <div className="p-3 bg-cyan-600/10 rounded-xl text-cyan-500 border border-cyan-500/10">
                <Truck className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-mono uppercase tracking-widest font-bold text-zinc-500">No Pátio</span>
                <span className="text-2xl sm:text-3.5xl font-black font-sans leading-none text-white tracking-tight">
                  {loadingVeiculoStats ? '...' : veiculoStats?.inMaint ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK ACTIONS */}
      <div id="quick-actions-bar" className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 italic flex items-center gap-2">
          <Play className="w-3 h-3 text-orange-500 fill-orange-500/40" /> Atalhos Administrativos Rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Link 
            href="/os/nova" 
            id="action-new-os" 
            className="flex items-center justify-center gap-3 bg-orange-600 hover:bg-orange-500 text-white font-extrabold text-xs uppercase tracking-widest h-14 rounded-2xl transition shadow-lg shadow-orange-950/20 group cursor-pointer border border-transparent"
          >
            <PlusCircle className="w-4 h-4 transition duration-300 group-hover:scale-110" />
            <span>Nova OS</span>
          </Link>
          <Link 
            href="/clientes/novo" 
            id="action-new-client" 
            className="flex items-center justify-center gap-3 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 font-black text-xs uppercase tracking-widest h-14 rounded-2xl transition group cursor-pointer"
          >
            <Users className="w-4 h-4 transition duration-300 group-hover:scale-110 text-orange-500" />
            <span>Novo Cliente</span>
          </Link>
          <Link 
            href="/veiculos/novo" 
            id="action-new-vehicle" 
            className="flex items-center justify-center gap-3 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 font-black text-xs uppercase tracking-widest h-14 rounded-2xl transition group cursor-pointer"
          >
            <Truck className="w-4 h-4 transition duration-300 group-hover:scale-110 text-orange-500" />
            <span>Novo Veículo</span>
          </Link>
          <Link 
            href="/importar-nfe" 
            id="action-new-nfe" 
            className="flex items-center justify-center gap-3 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 font-black text-xs uppercase tracking-widest h-14 rounded-2xl transition group cursor-pointer"
          >
            <FileText className="w-4 h-4 transition duration-300 group-hover:scale-110 text-orange-500" />
            <span>Importação NF-e</span>
          </Link>
          <Link 
            href="/orcamentos/novo" 
            id="action-new-quote" 
            className="flex items-center justify-center gap-3 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 font-black text-xs uppercase tracking-widest h-14 rounded-2xl transition group cursor-pointer"
          >
            <Wallet className="w-4 h-4 transition duration-300 group-hover:scale-110 text-orange-500" />
            <span>Orçamento</span>
          </Link>
          <Link 
            href="/checklist/novo" 
            id="action-new-checklist" 
            className="flex items-center justify-center gap-3 bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 text-zinc-300 font-black text-xs uppercase tracking-widest h-14 rounded-2xl transition group cursor-pointer"
          >
            <CheckSquare className="w-4 h-4 transition duration-300 group-hover:scale-110 text-orange-500" />
            <span>Novo Checklist</span>
          </Link>
        </div>
      </div>

      {/* 3. KPI GRID */}
      <div id="executive-kpi-grid-container" className="space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 italic flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-orange-500" /> Métricas Operacionais e de Desempenho
        </h2>
        {loadingStats || loadingResumo || loadingVeiculoStats ? (
          <StatsGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
            
            {/* KPI 1 — A13: selo "+14.2%" removido (número inventado) */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 hover:border-emerald-500/40 rounded-2xl px-5 py-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-34 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <TrendingUp className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Faturamento Mês</p>
                <p className="text-[20px] font-black tracking-tight text-white leading-none mt-1 select-all truncate font-sans">
                  {formatCurrency(stats?.faturamentoMes ?? 0)}
                </p>
                <p className="text-[8.5px] text-zinc-500 font-medium leading-none mt-2">OS Finalizadas no mês</p>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 hover:border-blue-500/40 rounded-2xl px-5 py-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-34 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Wallet className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-mono">A vencer</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Contas a Receber</p>
                <p className="text-[20px] font-black tracking-tight text-white leading-none mt-1 select-all truncate font-sans">
                  {formatCurrency(resumoFinanceiro?.aReceber ?? 0)}
                </p>
                <p className="text-[8.5px] text-zinc-500 font-medium leading-none mt-2">Provisionado em caixa</p>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 hover:border-orange-500/40 rounded-2xl px-5 py-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-34 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                  <Wrench className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-mono">Execução</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">OS em Aberto</p>
                <p className="text-[20px] font-black tracking-tight text-white leading-none mt-1 select-all truncate font-mono">
                  {stats?.osEmAberto ?? 0} <span className="text-zinc-500 text-xs font-sans">OS</span>
                </p>
                <p className="text-[8.5px] text-zinc-500 font-medium leading-none mt-2">Demanda operacional total</p>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 hover:border-cyan-500/40 rounded-2xl px-5 py-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-34 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                  <Truck className="w-4.5 h-4.5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/10 text-cyan-500 px-2 py-0.5 rounded-full font-mono">No Pátio</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Veículos Oficina</p>
                <p className="text-[20px] font-black tracking-tight text-white leading-none mt-1 select-all truncate font-mono">
                  {veiculoStats?.inMaint ?? 0} <span className="text-zinc-500 text-xs font-sans">Veículos</span>
                </p>
                <p className="text-[8.5px] text-zinc-500 font-medium leading-none mt-2">Alocação de pátio atual</p>
              </div>
            </div>

            {/* KPI 5 */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 hover:border-red-500/40 rounded-2xl px-5 py-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-34 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
                  <Package className="w-4.5 h-4.5" />
                </div>
                <span className="text-[8.5px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-mono">Abaixo Mínimo</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Estoque Crítico</p>
                <p className="text-[20px] font-black tracking-tight text-white leading-none mt-1 select-all truncate font-mono">
                  {stats?.pecasEstoqueBaixo ?? 0} <span className="text-zinc-500 text-xs font-sans">Peças</span>
                </p>
                <p className="text-[8.5px] text-zinc-500 font-medium leading-none mt-2">Reposição imediata obrigatória</p>
              </div>
            </div>

            {/* KPI 6 */}
            <div className="bg-zinc-900/40 border border-zinc-800/70 hover:border-amber-500/40 rounded-2xl px-5 py-5 transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden flex flex-col justify-between h-34 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <ShieldAlert className="w-4.5 h-4.5" />
                </div>
                {alertsBadgeCount > 0 && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-red-500 text-white
