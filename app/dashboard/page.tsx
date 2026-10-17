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
                  <span className="text-[9px] font-black uppercase tracking-widest bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">{alertsBadgeCount}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest font-mono">Alertas Críticos</p>
                <p className="text-[20px] font-black tracking-tight text-white leading-none mt-1 select-all truncate font-mono">
                  {alertsBadgeCount} <span className="text-zinc-500 text-xs font-sans">Conformidades</span>
                </p>
                <p className="text-[8.5px] text-zinc-500 font-medium leading-none mt-2">Ações pendentes preventivas</p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 4. FINANCIAL CHART */}
      <div id="financial-statement-container">
        <LazyModule fallback={<ChartSkeleton />} onVisible={loadFaturamento}>
          <ErrorBoundary fallbackTitle="FLUXO DE CAIXA INDISPONÍVEL">
            <div className="bg-zinc-950/20 border border-zinc-800/70 rounded-[2rem] p-6 sm:p-8 space-y-6">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-base font-black uppercase tracking-widest italic flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-500" /> Fluxo Financeiro de Caixa
                  </h2>
                  <p className="text-[10px] uppercase text-zinc-500 font-black tracking-widest mt-1">
                    Análise comparativa de entradas, saídas e faturamento líquido acumulado
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 border border-zinc-800 rounded-2xl w-full sm:w-auto">
                  <button
                    onClick={() => setChartPeriod('30_DIAS')}
                    className={cn(
                      "flex-1 sm:flex-none text-[9.5px] uppercase tracking-widest font-black px-4 py-2 rounded-xl transition cursor-pointer duration-200",
                      chartPeriod === '30_DIAS' ? "bg-orange-600 text-white shadow-md shadow-orange-900/10" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    fluxo 30 dias
                  </button>
                  <button
                    onClick={() => setChartPeriod('6_MESES')}
                    className={cn(
                      "flex-1 sm:flex-none text-[9.5px] uppercase tracking-widest font-black px-4 py-2 rounded-xl transition cursor-pointer duration-200",
                      chartPeriod === '6_MESES' ? "bg-orange-600 text-white shadow-md shadow-orange-900/10" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    6 meses
                  </button>
                </div>
              </div>

              <div className="w-full h-[240px] md:h-[360px] min-h-[240px]">
                {chartPeriod === '30_DIAS' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl text-center space-y-3 p-8">
                    <Activity className="w-10 h-10 text-zinc-600" />
                    <p className="text-sm font-black text-zinc-400 uppercase tracking-widest italic">
                      Dados diários indisponíveis
                    </p>
                    <p className="text-[11px] text-zinc-500 max-w-md leading-relaxed">
                      O fluxo dos últimos 30 dias será exibido aqui assim que a granularidade
                      diária for habilitada. Use a aba <strong className="text-zinc-400">6 meses</strong> para ver
                      o faturamento real já registrado.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={faturamentoData} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#71717a" opacity={0.15} vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#71717a', fontSize: 10, fontWeight: 'bold' }} 
                        dy={8}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`}
                      />
                      <Tooltip 
                        cursor={{ fill: '#1f1f23', opacity: 0.3 }}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '16px', fontSize: '11px', color: '#eaeaea' }}
                        itemStyle={{ color: '#eaeaea' }}
                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Faturamento']}
                      />
                      <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} barSize={42}>
                        {faturamentoData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === faturamentoData.length - 1 ? '#f97316' : '#10b981'} />
                        ))}
                      </Bar>
                      <Legend 
                        verticalAlign="top"
                        align="right"
                        height={36}
                        content={() => (
                          <div className="hidden md:flex justify-end gap-5 -mt-6">
                            <div className="flex items-center gap-1.5 text-[9.5px] font-black text-zinc-500 uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Meses Anteriores
                            </div>
                            <div className="flex items-center gap-1.5 text-[9.5px] font-black text-zinc-500 uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-orange-500"></span> Mês Atual (Em Fechamento)
                            </div>
                          </div>
                        )}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          </ErrorBoundary>
        </LazyModule>
      </div>

      {/* 5. AGENDA & ALERTS */}
      <div id="agenda-alerts-panel" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="xl:col-span-2">
          <div className="bg-zinc-950/20 border border-zinc-800/70 rounded-[2rem] p-6 sm:p-8 space-y-6 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-1.5 text-white">
                    <Calendar className="w-4.5 h-4.5 text-orange-500" /> Agenda Operacional de Hoje
                  </h2>
                  <p className="text-[10px] uppercase text-zinc-500 font-extrabold tracking-widest mt-1">Atividades, diagnósticos e entregas do fluxo diário</p>
                </div>

                <div className="flex bg-zinc-900/60 p-1 rounded-xl gap-1 w-full sm:w-auto">
                  {(['TODOS', 'OS', 'ENTREGAS', 'EXECUCAO'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setAgendaFilter(f)}
                      className={cn(
                        "flex-1 sm:flex-none text-[8.5px] uppercase font-black tracking-widest px-2.5 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer",
                        agendaFilter === f ? "bg-orange-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {loadingAgenda ? (
                <div className="space-y-3 py-6">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-zinc-900/40 rounded-xl border border-zinc-800/40 animate-pulse" />)}
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="p-10 border border-dashed border-zinc-850 rounded-2xl text-center space-y-2 select-none">
                  <Inbox className="w-10 h-10 text-zinc-500 mx-auto" />
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider italic">Nenhuma atividade agendada para hoje</p>
                  <p className="text-[10px] text-zinc-600">Você pode adicionar novos eventos usando os atalhos superiores.</p>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800/80 bg-zinc-900/10">
                          <th className="p-4 text-[9.5px] font-black uppercase text-zinc-500 tracking-wider">Horário</th>
                          <th className="p-4 text-[9.5px] font-black uppercase text-zinc-500 tracking-wider">Cliente / Veículo</th>
                          <th className="p-4 text-[9.5px] font-black uppercase text-zinc-500 tracking-wider">Compromisso</th>
                          <th className="p-4 text-[9.5px] font-black uppercase text-zinc-500 tracking-wider">Status</th>
                          <th className="p-4 text-[9.5px] font-black uppercase text-zinc-500 tracking-wider">Responsável</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40">
                        {filteredEvents.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="p-4 text-xs font-mono font-bold text-orange-500">
                              {new Date(item.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-4">
                              <p className="text-xs font-bold text-white uppercase italic truncate max-w-[150px]">{item.cliente?.nome || 'Avulso'}</p>
                              <p className="text-[9.5px] font-mono text-zinc-500 uppercase">{item.veiculo ? `${item.veiculo.modelo} [${item.veiculo.placa}]` : 'Sem Veículo'}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-xs font-bold text-zinc-200 uppercase truncate max-w-[150px]">{item.titulo}</p>
                              <p className="text-[9px] text-zinc-500 italic truncate max-w-[150px]">{item.descricao || 'Nenhuma descrição técnica'}</p>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "px-2 tracking-widest uppercase font-mono text-[8px] font-black py-0.5 rounded-full border",
                                item.status === 'CONCLUIDO' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                item.status === 'EM_ANDAMENTO' ? "bg-orange-500/10 border-orange-500/20 text-orange-500" :
                                "bg-zinc-900 border-zinc-800 text-zinc-500"
                              )}>
                                {item.status}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-zinc-400 font-bold uppercase italic">
                              {item.mecanico?.name || 'Não assinalado'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="block lg:hidden space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {filteredEvents.map((item, index) => (
                      <div key={item.id} className="flex gap-4 relative pl-3 group">
                        {index !== filteredEvents.length - 1 && (
                          <div className="absolute left-6.5 top-8 bottom-0 w-0.5 bg-zinc-800/80 pointer-events-none" />
                        )}
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center font-mono text-[9px] font-black text-orange-500 border border-zinc-800">
                            {new Date(item.data_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        <div className="flex-1 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 space-y-2 group-hover:border-orange-500/10 transition-all duration-300">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="text-[10px] font-bold text-zinc-400 font-mono tracking-widest uppercase">
                                {item.cliente?.nome || 'Atendimento Avulso'}
                              </p>
                              <h4 className="text-xs font-black text-white uppercase italic leading-tight mt-0.5">{item.titulo}</h4>
                            </div>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[7.5px] font-mono tracking-wider font-black",
                              item.status === 'CONCLUIDO' ? "bg-emerald-500/10 text-emerald-500" :
                              item.status === 'EM_ANDAMENTO' ? "bg-orange-500/10 text-orange-500" :
                              "bg-zinc-950 text-zinc-500"
                            )}>
                              {item.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold uppercase text-zinc-500 font-mono border-t border-zinc-950 pt-2">
                            <div>
                              <span className="block text-[8px] text-zinc-600">Veículo:</span>
                              <span className="text-zinc-400">{item.veiculo?.placa || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="block text-[8px] text-zinc-600">Resp:</span>
                              <span className="text-zinc-400 truncate block">{item.mecanico?.name || 'Não assinalado'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>
            
            <Link 
              href="/agenda" 
              className="mt-6 block text-center w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
            >
              Consultar Planejamento da Agenda
            </Link>
          </div>
        </div>

        <div>
          <div className="bg-zinc-950/20 border border-zinc-800/70 rounded-[2rem] p-6 sm:p-8 space-y-6 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center gap-4">
                <h2 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-2 text-white">
                  <ShieldAlert className="w-4.5 h-4.5 text-red-500" /> Console de Alertas Críticos
                </h2>
                <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-900/60 border border-zinc-800 text-zinc-400 px-2 py-1 rounded-lg">Realtime</span>
              </div>
              <p className="text-[10px] uppercase text-zinc-500 font-extrabold tracking-widest mt-1">Incidentes ativos exigindo ação imediata</p>

              <div className="space-y-3.5 mt-6 max-h-[300px] overflow-y-auto pr-1">
                {computedAlerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "p-4 rounded-2xl flex gap-4 border transition duration-300",
                      alert.type === 'CRITICAL' ? "bg-red-550/10 border-red-500/15" :
                      alert.type === 'ATTENTION' ? "bg-amber-550/10 border-amber-500/15" :
                      "bg-emerald-555/10 border-emerald-500/15"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {alert.type === 'CRITICAL' ? (
                        <div className="p-1.5 rounded bg-red-500/10 text-red-500"><AlertCircle className="w-4 h-4 text-red-400" /></div>
                      ) : alert.type === 'ATTENTION' ? (
                        <div className="p-1.5 rounded bg-amber-500/10 text-amber-500"><AlertTriangle className="w-4 h-4 text-amber-500" /></div>
                      ) : (
                        <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-500"><CheckCircle className="w-4 h-4 text-emerald-500" /></div>
                      )}
                    </div>
                    <div>
                      <h4 className={cn(
                        "text-xs font-black uppercase tracking-wide",
                        alert.type === 'CRITICAL' ? "text-red-400" :
                        alert.type === 'ATTENTION' ? "text-amber-500" :
                        "text-emerald-500"
                      )}>
                        {alert.message}
                      </h4>
                      <p className="text-[10.5px] text-zinc-400 leading-normal mt-0.5">{alert.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link 
              href="/notificacoes" 
              className="mt-6 block text-center w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
            >
              Gerenciar Centrais de Alerta
            </Link>
          </div>
        </div>

      </div>

      {/* 6. OPERATIONS FEED & INVENTORY */}
      <div id="stock-activities-split" className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        <div>
          <LazyModule fallback={<div className="h-96 bg-zinc-950/20 rounded-[2rem] animate-pulse" />} onVisible={loadActivities}>
            <ErrorBoundary fallbackTitle="LOG OPERACIONAL INDISPONÍVEL">
              <div className="bg-zinc-950/20 border border-zinc-800/70 rounded-[2rem] p-6 sm:p-8 space-y-6 h-full flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center gap-4">
                    <h2 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-1.5 text-white">
                      <Activity className="w-4.5 h-4.5 text-orange-500" /> Registro Chrono de Movimentações
                    </h2>
                    <Link 
                      href="/auditoria" 
                      className="text-[9px] font-black uppercase tracking-widest bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-white transition flex-shrink-0"
                    >
                      Audit Log
                    </Link>
                  </div>
                  <p className="text-[10px] uppercase text-zinc-500 font-extrabold tracking-widest mt-1">Registros de Ordens de Serviço e Notas em tempo de execução</p>

                  {loadingActivities ? (
                    <div className="space-y-3 py-4">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-zinc-900/40 rounded-xl" />)}
                    </div>
                  ) : (
                    <>
                      <div className="hidden lg:block">
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {(() => {
                            const osList = recentActivities?.recentOS || [];
                            return osList.length > 0 ? osList.slice(0, 5).map((os: any) => (
                              <div 
                                key={os.id} 
                                onClick={() => window.location.href = `/os/${os.id}`}
                                className="p-4 bg-zinc-900/50 border border-zinc-850 hover:border-zinc-700 rounded-xl flex items-center justify-between gap-5 transition hover:bg-zinc-900 cursor-pointer"
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl border border-orange-500/10 flex-shrink-0">
                                    <Hammer className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white uppercase italic truncate">OS #{os.numero} registrada</p>
                                    <p className="text-[10px] font-semibold text-zinc-500 uppercase truncate">Para: {os.cliente?.nome || 'N/A'}</p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="text-xs font-black text-white font-mono italic block">{formatCurrency(os.valor_total || 0)}</span>
                                  <span className="text-[8.5px] font-mono font-bold text-zinc-500 italic block mt-0.5">{formatDate(os.created_at || new Date())}</span>
                                </div>
                              </div>
                            )) : (
                              <p className="text-center py-12 text-xs text-zinc-500 italic uppercase">Sem lançamentos de ordens localizados</p>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="block lg:hidden pr-1">
                        <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                          {(() => {
                            const osList = recentActivities?.recentOS || [];
                            return osList.length > 0 ? osList.slice(0, 4).map((os: any, idx: number) => (
                              <div key={os.id} className="flex gap-4 relative pl-3">
                                {idx !== osList.slice(0, 4).length - 1 && (
                                  <div className="absolute left-6.5 top-8 bottom-0 w-0.5 bg-zinc-800/80" />
                                )}
                                <div className="w-7 h-7 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-orange-500 flex-shrink-0">
                                  <Hammer className="w-3.5 h-3.5" />
                                </div>
                                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex-1">
                                  <span className="text-[8px] font-mono text-zinc-500 font-bold block">{formatDate(os.created_at || new Date())}</span>
                                  <h4 className="text-xs font-black text-white uppercase italic mt-0.5">Ordem de Serviço #{os.numero}</h4>
                                  <p className="text-[10px] text-zinc-400 uppercase mt-1 truncate">Cliente: {os.cliente?.nome || 'Atendimento'}</p>
                                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-zinc-950">
                                    <span className="text-[8px] font-mono bg-zinc-950 px-2 py-0.5 rounded text-zinc-400 font-bold uppercase">{os.status}</span>
                                    <span className="text-xs font-black text-orange-500 font-mono italic">{formatCurrency(os.valor_total || 0)}</span>
                                  </div>
                                </div>
                              </div>
                            )) : (
                              <p className="text-[10px] text-zinc-500 text-center uppercase py-8 italic font-semibold">Sem lançamentos recentes</p>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}

                </div>

                <Link 
                  href="/os" 
                  className="mt-6 block text-center w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                >
                  Ver Painel Geral de OS
                </Link>
              </div>
            </ErrorBoundary>
          </LazyModule>
        </div>

        <div>
          <LazyModule fallback={<div className="h-96 bg-zinc-950/20 rounded-[2rem] animate-pulse" />} onVisible={loadPecas}>
            <ErrorBoundary fallbackTitle="ESTOQUE INDISPONÍVEL">
              <div className="bg-zinc-950/20 border border-zinc-800/70 rounded-[2rem] p-6 sm:p-8 space-y-6 h-full flex flex-col justify-between">
                
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest italic flex items-center gap-1.5 text-white">
                        <Package className="w-4.5 h-4.5 text-orange-500" /> Insights de Estoque e Peças
                      </h2>
                      <p className="text-[10px] uppercase text-zinc-500 font-extrabold tracking-widest mt-1">Conformidade de suprimentos e peças de reposição</p>
                    </div>

                    <div className="flex bg-zinc-900/60 p-1 rounded-xl gap-1 w-full sm:w-auto">
                      <button
                        onClick={() => setStockTab('LOW_STOCK')}
                        className={cn(
                          "flex-1 sm:flex-none text-[8.5px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer",
                          stockTab === 'LOW_STOCK' ? "bg-orange-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Estoque Baixo
                      </button>
                      <button
                        onClick={() => setStockTab('MOST_MOVE')}
                        className={cn(
                          "flex-1 sm:flex-none text-[8.5px] uppercase font-black tracking-widest px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer",
                          stockTab === 'MOST_MOVE' ? "bg-orange-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        Peças Cadastradas
                      </button>
                    </div>
                  </div>

                  {loadingPecas ? (
                    <div className="space-y-3 py-4">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-zinc-900/40 rounded-xl" />)}
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {stockTab === 'LOW_STOCK' ? (
                        lowStockProductsList.length > 0 ? (
                          lowStockProductsList.map((item) => (
                            <div key={item.id} className="p-4 bg-zinc-900/45 border border-red-500/10 rounded-xl flex items-center justify-between gap-5">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="p-2.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/15 flex-shrink-0">
                                  <AlertCircle className="w-4 h-4 text-red-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white uppercase italic truncate">{item.descricao}</p>
                                  <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Código: {item.codigo} / Local: {item.localizacao || 'Padrão'}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className="text-xs font-black text-red-500 font-mono italic block">Qtd: {item.quantidade}</span>
                                <span className="text-[8.5px] font-mono font-medium text-zinc-500 block mt-0.5">Min: {item.estoque_minimo ?? 5}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12 border border-dashed border-zinc-850 rounded-2xl text-center space-y-2 select-none">
                            <CheckSquare className="w-10 h-10 text-emerald-500 mx-auto" />
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider italic">Nenhuma peça operando abaixo do mínimo</p>
                            <p className="text-[10px] text-zinc-600">Estoque operando com excelente margem preventiva.</p>
                          </div>
                        )
                      ) : (
                        pecas.length > 0 ? (
                          pecas.slice(0, 5).map((item) => (
                            <div key={item.id} className="p-4 bg-zinc-900/45 border border-zinc-850 hover:border-zinc-700 transition rounded-xl flex items-center justify-between gap-5">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="p-2.5 rounded-lg bg-zinc-900 text-zinc-500 border border-zinc-800 flex-shrink-0">
                                  <Package className="w-4 h-4 text-zinc-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-white uppercase italic truncate">{item.descricao}</p>
                                  <p className="text-[10px] font-mono text-zinc-500 uppercase mt-0.5">Código: {item.codigo} / Cat: {item.categoria}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={cn(
                                  "text-xs font-black font-mono block",
                                  item.quantidade <= (item.estoque_minimo ?? 5) ? "text-red-500" : "text-emerald-500"
                                )}>
                                  Qtd: {item.quantidade}
                                </span>
                                <span className="text-[8.5px] font-mono font-medium text-zinc-500 block mt-0.5">Venda: {formatCurrency(item.preco_venda || 0)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10.5px] text-zinc-500 text-center uppercase py-8 italic font-semibold">Sem peças registradas no estoque</p>
                        )
                      )}
                    </div>
                  )}

                </div>

                <Link 
                  href="/estoque" 
                  className="mt-6 block text-center w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition cursor-pointer"
                >
                  Acessar Inventário Completo
                </Link>
              </div>
            </ErrorBoundary>
          </LazyModule>
        </div>

      </div>

    </div>
  );
}
