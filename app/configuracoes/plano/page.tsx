'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Clock, Zap, Loader2, Sparkles, Users, MessageCircle
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

interface PlanoData {
  plano: 'TRIAL' | 'BASICO' | 'PRO';
  status: 'ATIVO' | 'BLOQUEADO' | 'CANCELADO';
  trial_ends_at: string | null;
  diasRestantes: number;
  limites: {
    usuarios: number | null; // null = ilimitado
    portalCliente: boolean;
    financeiroCompleto: boolean;
  };
  uso: {
    usuarios: number;
  };
}

const WHATSAPP_SUPORTE =
  process.env.NEXT_PUBLIC_WHATSAPP_SUPORTE || '5511999999999'; // ⚠️ troque pelo seu número
const EMAIL_SUPORTE = 'suporte@vehlox.com.br';

export default function PlanoPage() {
  const [data, setData] = useState<PlanoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPlano = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const res = await apiFetch<PlanoData>('/api/configuracoes/plano', { signal });
      setData(res);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar dados do plano' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPlano(controller.signal);
    return () => controller.abort();
  }, [fetchPlano]);

  const abrirWhatsApp = (mensagem: string) => {
    const url = `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUpgradeClick = () => {
    if (!data) return;
    const msg = `Olá! Quero fazer upgrade do plano ${data.plano} do VEHLOX para o PRO.`;
    abrirWhatsApp(msg);
  };

  const handleSuporteClick = () => {
    abrirWhatsApp('Olá! Preciso de ajuda com minha assinatura VEHLOX.');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">Consultando Faturamento...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-black text-white uppercase">Erro ao carregar plano</h2>
        <Link href="/configuracoes" className="text-orange-500 font-bold uppercase text-xs tracking-widest mt-2 hover:underline">
          Voltar para Configurações
        </Link>
      </div>
    );
  }

  const isTrialExpiring = data.plano === 'TRIAL' && data.diasRestantes <= 7;
  const isBlocked = data.status === 'BLOQUEADO' || data.status === 'CANCELADO';
  const isPro = data.plano === 'PRO';

  const limiteUsuarios = data.limites.usuarios;
  const usoUsuarios = data.uso.usuarios;
  const usuariosPercent =
    limiteUsuarios && limiteUsuarios > 0
      ? Math.min(100, Math.round((usoUsuarios / limiteUsuarios) * 100))
      : 0;
  const usuariosNoLimite = limiteUsuarios !== null && usoUsuarios >= limiteUsuarios;

  const features = [
    { label: 'Gestão de OS Ilimitada', ativo: true },
    { label: 'Módulo de Estoque', ativo: true },
    { label: 'Controle de Preventivas', ativo: true },
    { label: 'Agenda e Checklists', ativo: true },
    { label: 'Portal do Cliente', ativo: data.limites.portalCliente },
    { label: 'Financeiro Completo (DRE / Curva ABC)', ativo: data.limites.financeiroCompleto },
  ];

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter">Seu Plano</h1>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Faturamento e Assinatura</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* CARD PRINCIPAL - STATUS ATUAL */}
        <div className="lg:col-span-2 space-y-6">
          <div className={`bg-zinc-900 border ${isBlocked ? 'border-red-500/30' : isTrialExpiring ? 'border-orange-500/50' : 'border-zinc-800'} rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden shadow-2xl`}>

            <div className="relative z-10 space-y-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-2">Plano Contratado</p>
                  <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">
                    {data.plano === 'TRIAL' ? 'Período de Testes' : data.plano === 'PRO' ? 'Plano PRO' : 'Plano Básico'}
                  </h2>
                </div>
                <div className={`p-4 rounded-2xl ${isBlocked ? 'bg-red-500/10 text-red-500' : isTrialExpiring ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                  {isBlocked ? <AlertTriangle size={32} /> : isTrialExpiring ? <Clock size={32} className="animate-pulse" /> : <ShieldCheck size={32} />}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Status da Conta</p>
                  <p className={`text-lg font-black uppercase italic ${isBlocked ? 'text-red-500' : 'text-green-500'}`}>
                    {data.status}
                  </p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-1">
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Expira em</p>
                  <p className="text-lg font-black text-white font-mono uppercase italic">
                    {data.trial_ends_at ? new Date(data.trial_ends_at).toLocaleDateString('pt-BR') : '—'}
                  </p>
                </div>
              </div>

              {/* ✅ USO DE USUÁRIOS */}
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-zinc-400" />
                    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Usuários</p>
                  </div>
                  <p className={`text-sm font-black uppercase italic ${usuariosNoLimite ? 'text-red-500' : 'text-white'}`}>
                    {usoUsuarios} de {limiteUsuarios === null ? '∞' : limiteUsuarios}
                  </p>
                </div>
                {limiteUsuarios !== null && (
                  <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${usuariosNoLimite ? 'bg-red-500' : usuariosPercent >= 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.max(usuariosPercent, 4)}%` }}
                    />
                  </div>
                )}
                {usuariosNoLimite && (
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                    Limite atingido. Faça upgrade para adicionar mais usuários.
                  </p>
                )}
              </div>

              {data.plano === 'TRIAL' && (
                <div className={`p-6 rounded-2xl border ${isTrialExpiring ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-zinc-950 border-zinc-800 text-zinc-400'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Sparkles size={18} />
                    <h3 className="font-black uppercase tracking-widest text-sm">
                      {isTrialExpiring ? 'Seu teste está acabando!' : 'Você está no período de testes'}
                    </h3>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed uppercase tracking-wide">
                    {isTrialExpiring
                      ? `Restam apenas ${data.diasRestantes} dias de acesso. Faça o upgrade agora para não perder o acesso aos seus dados.`
                      : `Aproveite todos os recursos. Você tem ${data.diasRestantes} dias restantes.`}
                  </p>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleUpgradeClick}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                >
                  <Zap size={18} className="fill-white" />
                  {isPro ? 'Falar com Suporte' : data.plano === 'TRIAL' ? 'Fazer Upgrade Agora' : 'Fazer Upgrade para PRO'}
                </button>
              </div>
            </div>

            {/* Efeito visual de fundo */}
            <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl opacity-10 rounded-full translate-x-1/2 -translate-y-1/2 ${isBlocked ? 'bg-red-500' : isTrialExpiring ? 'bg-orange-500' : 'bg-green-500'}`} />
          </div>
        </div>

        {/* SIDEBAR - BENEFÍCIOS */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 space-y-6">
            <h3 className="text-sm font-black text-white uppercase italic tracking-tight flex items-center gap-2">
              <CheckCircle2 className="text-green-500 w-5 h-5" />
              Recursos do seu plano
            </h3>
            <div className="space-y-3 text-[11px] font-bold uppercase tracking-widest">
              {features.map((f) => (
                <p key={f.label} className="flex items-center gap-2">
                  {f.ativo ? (
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-zinc-600 shrink-0" />
                  )}
                  <span className={f.ativo ? 'text-zinc-300' : 'text-zinc-600 line-through'}>
                    {f.label}
                  </span>
                </p>
              ))}
            </div>
            {!isPro && (
              <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest border-t border-zinc-800 pt-4">
                Faça upgrade para liberar os itens riscados.
              </p>
            )}
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-6 text-center space-y-3">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Precisa de ajuda?</p>
            <button
              onClick={handleSuporteClick}
              className="inline-flex items-center gap-2 text-xs font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest transition"
            >
              <MessageCircle size={14} />
              Falar com o Suporte
            </button>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest">
              ou envie e-mail para {EMAIL_SUPORTE}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
