'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Printer, Edit, Trash2, User, Truck, 
  Calendar, FileText, Wrench, Package, DollarSign,
  Terminal, ShieldCheck, ChevronRight, ClipboardCheck, Plus, Eye,
  MapPin, Navigation, Milestone, Receipt, Users, Clock, AlertTriangle, Loader2,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FluxoOficinaTracker } from '@/components/FluxoOficinaTracker';

export default function OSDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [ordem, setOrdem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checklistsExecutados, setChecklistsExecutados] = useState<any[]>([]);
  
  const [sigCliente, setSigCliente] = useState('');
  const [sigMecanico, setSigMecanico] = useState('');
  const [sigSupervisor, setSigSupervisor] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [numParcelas, setNumParcelas] = useState(1);
  const [diasIntervalo, setDiasIntervalo] = useState(28);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // A01: modal de cancelamento
  const [showCancelarModal, setShowCancelarModal] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchOrdem = useCallback(async () => {
    try {
      const res = await fetch(`/api/ordens/${resolvedParams.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setOrdem(data);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  const handleSaveSignatures = async () => {
    if (!sigCliente && !sigMecanico && !sigSupervisor) {
      toast.warning('Insira pelo menos uma assinatura para homologar');
      return;
    }
    setIsSigning(true);
    try {
      const msg = `${resolvedParams.id}-${sigCliente}-${sigMecanico}-${sigSupervisor}-${Date.now()}`;
      const msgBuffer = new TextEncoder().encode(msg);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const res = await fetch(`/api/ordens/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assinatura_cliente: sigCliente || null,
          assinatura_mecanico: sigMecanico || null,
          assinatura_supervisor: sigSupervisor || null,
          assinatura_hash: hashHex,
          assinatura_timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        toast.success('Documento formalizado via hash SHA-256!');
        fetchOrdem();
      } else {
        toast.error('Erro ao registrar homologação digital');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setIsSigning(false);
    }
  };

  useEffect(() => {
    fetchOrdem();
  }, [fetchOrdem]);

  useEffect(() => {
    fetch(`/api/checklist/execucoes?osId=${resolvedParams.id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const mapped = (data || []).map((e: any) => ({
          ...e,
          checklist: e.Checklist || e.checklist,
          os: e.OrdemServico || e.os,
          veiculo: e.Veiculo || e.veiculo
        }));
        setChecklistsExecutados(mapped);
      })
      .catch(() => {});
  }, [resolvedParams.id]);

  const handleDeleteChecklist = async (execId: string) => {
    if (!confirm('Deseja realmente excluir este checklist?')) return;

    try {
      const res = await fetch(`/api/checklist/execucao/${execId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'Checklist removido!');
        const resp = await fetch(`/api/checklist/execucoes?osId=${resolvedParams.id}`, { credentials: 'include' });
        const checklists = await resp.json();
        const mapped = (checklists || []).map((e: any) => ({
          ...e,
          checklist: e.Checklist || e.checklist,
          os: e.OrdemServico || e.os,
          veiculo: e.Veiculo || e.veiculo
        }));
        setChecklistsExecutados(mapped);
      } else {
        toast.error(data.error || 'Erro ao remover checklist');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  const extrairPreventivasVinculadas = (): string[] => {
    if (!ordem) return [];

    const ids: string[] = [];

    if (Array.isArray(ordem.preventivas_ids)) {
      ids.push(...ordem.preventivas_ids.filter(Boolean));
    }

    if (ordem.preventiva_id && !ids.includes(ordem.preventiva_id)) {
      ids.push(ordem.preventiva_id);
    }

    if (Array.isArray(ordem.preventivas_execucoes)) {
      ordem.preventivas_execucoes.forEach((pe: any) => {
        if (pe.preventiva_id && !ids.includes(pe.preventiva_id)) {
          ids.push(pe.preventiva_id);
        }
      });
    }

    if (ids.length === 0 && ordem.observacoes) {
      try {
        const meta = typeof ordem.observacoes === 'string'
          ? JSON.parse(ordem.observacoes)
          : ordem.observacoes;
        if (Array.isArray(meta?.preventivas_ids)) {
          meta.preventivas_ids.forEach((id: string) => {
            if (id && !ids.includes(id)) ids.push(id);
          });
        }
        if (meta?.preventiva_id && !ids.includes(meta.preventiva_id)) {
          ids.push(meta.preventiva_id);
        }
      } catch {}
    }

    return ids;
  };

  const handleStatusChange = async (novoStatus: string) => {
    if (novoStatus === 'FINALIZADA') {
      try {
        const preventivasVinculadas = extrairPreventivasVinculadas();

        const res = await fetch(`/api/ordens/${resolvedParams.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: 'FINALIZADA',
            preventivas_ids: preventivasVinculadas,
            km_veiculo: ordem?.veiculo?.quilometragem,
            horimetro_veiculo: ordem?.veiculo?.horimetro_atual
          })
        });
        if (res.ok) {
          toast.success('OS finalizada!');
          fetchOrdem();
          setShowFinalizarModal(false);
        } else {
          const err = await res.json().catch(() => ({}));
          toast.error(err.error || 'Erro ao finalizar');
        }
      } catch {
        toast.error('Erro de conexão');
      }
      return;
    }

    try {
      const res = await fetch(`/api/ordens/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) {
        toast.success(`Status atualizado para ${novoStatus.replace(/_/g, ' ')}`);
        fetchOrdem();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro de conexão');
    }
  };

  // A01: cancelamento em vez de exclusão
  const handleCancelar = async () => {
    if (!motivoCancelamento.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    setIsCanceling(true);
    try {
      const res = await fetch(`/api/ordens/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'CANCELADA',
          motivo_cancelamento: motivoCancelamento.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        toast.success('OS cancelada com sucesso');
        setShowCancelarModal(false);
        setMotivoCancelamento('');
        fetchOrdem();
      } else {
        toast.error(data.error || 'Erro ao cancelar OS');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setIsCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">Resgatando Protocolo...</p>
      </div>
    );
  }

  if (!ordem) {
    return (
      <div className="text-center py-32 space-y-4">
        <Terminal className="w-12 h-12 text-zinc-800 mx-auto" />
        <h2 className="text-xl font-bold text-white">Protocolo Inexistente</h2>
        <p className="text-zinc-500">A ordem de serviço solicitada não consta em nossa base de dados ativa.</p>
        <Link href="/os" className="inline-block text-orange-500 font-bold uppercase text-xs tracking-widest mt-4">
          Voltar para listagem
        </Link>
      </div>
    );
  }

  const confirmFinalizar = async () => {
    setIsFinalizing(true);
    try {
      const preventivasVinculadas = extrairPreventivasVinculadas();

      const res = await fetch(`/api/ordens/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: 'FINALIZADA',
          forma_pagamento: formaPagamento,
          numero_parcelas: numParcelas,
          dias_entre_parcelas: diasIntervalo,
          preventivas_ids: preventivasVinculadas,
          km_veiculo: ordem?.veiculo?.quilometragem,
          horimetro_veiculo: ordem?.veiculo?.horimetro_atual
        })
      });
      if (res.ok) {
        toast.success('OS Finalizada com sucesso!');
        setShowFinalizarModal(false);
        fetchOrdem();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Erro ao finalizar OS');
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setIsFinalizing(false);
    }
  };

  const statusColors: Record<string, string> = {
    ABERTA: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    EM_DIAGNOSTICO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    AGUARDANDO_PECAS: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    EM_EXECUCAO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    AGUARDANDO_APROVACAO: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    FINALIZADA: 'bg-green-500/20 text-green-400 border-green-500/30',
    ENTREGUE: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    CANCELADA: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const proximoStatus: Record<string, string> = {
    ABERTA: 'EM_DIAGNOSTICO',
    EM_DIAGNOSTICO: 'AGUARDANDO_PECAS',
    AGUARDANDO_PECAS: 'EM_EXECUCAO',
    EM_EXECUCAO: 'AGUARDANDO_APROVACAO',
    AGUARDANDO_APROVACAO: 'FINALIZADA',
    FINALIZADA: 'ENTREGUE'
  };

  // A01: esconde botão de cancelar se OS já cancelada ou entregue
  const podeCancelar = ordem.status !== 'CANCELADA' && ordem.status !== 'ENTREGUE';

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 py-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link href="/os">
            <button className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all text-zinc-400 hover:text-white shadow-lg">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Protocolo #{ordem.numero}</h2>
              <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-tighter border-2 ${statusColors[ordem.status]}`}>
                {ordem.status.replace(/_/g, ' ')}
              </span>
              {ordem.tipo_atendimento && (
                <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-tighter border-2 ${
                  ordem.tipo_atendimento === 'OFICINA'
                    ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
                    : ordem.tipo_atendimento === 'EMERGENCIAL'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                }`}>
                  📌 {ordem.tipo_atendimento.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em] mt-1">
              Registro: {new Date(ordem.created_at).toLocaleDateString('pt-BR')} às {new Date(ordem.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {ordem.tipo_atendimento && ordem.tipo_atendimento !== 'OFICINA' && (
            <Link href={`/os/viagem-print?id=${ordem.id}`}>
              <button className="px-5 h-12 bg-orange-600 border border-orange-500 rounded-2xl flex items-center gap-3 hover:bg-orange-500 transition-all text-white font-black text-[10px] uppercase tracking-widest shadow-lg">
                <Printer className="w-5 h-5 text-white" />
                Relatório de Viagem
              </button>
            </Link>
          )}
          <Link href={`/os/${ordem.id}/imprimir`}>
            <button className="px-5 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3 hover:bg-zinc-800 transition-all text-white font-black text-[10px] uppercase tracking-widest shadow-lg">
              <Printer className="w-5 h-5 text-orange-500" />
              Imprimir DANFE
            </button>
          </Link>
          <Link href={`/os/${ordem.id}/editar`}>
            <button className="w-12 h-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all text-zinc-500 hover:text-orange-500 shadow-md cursor-pointer">
              <Edit className="w-5 h-5" />
            </button>
          </Link>
          {/* A01: botão "Cancelar OS" em vez de "Excluir" */}
          {podeCancelar && (
            <button
              type="button"
              onClick={() => setShowCancelarModal(true)}
              title="Cancelar OS"
              className="w-full sm:w-auto px-5 h-12 bg-red-950/20 border border-red-500/30 rounded-2xl flex items-center justify-center gap-2 hover:bg-red-900/30 transition-all text-red-400 hover:text-red-300 shadow-md font-black text-[10px] uppercase tracking-widest"
            >
              <XCircle className="w-5 h-5" />
              Cancelar OS
            </button>
          )}
        </div>
      </div>

      <FluxoOficinaTracker currentStatus={ordem.status} />

      {proximoStatus[ordem.status] && (
        <div className="bg-orange-600/10 border border-orange-500/20 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-950/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Atualizar Fluxo de Trabalho</p>
              <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Avançar para a próxima etapa técnica</p>
            </div>
          </div>
          <button
            onClick={() => handleStatusChange(proximoStatus[ordem.status])}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-500 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-xl shadow-orange-950/20 flex items-center justify-center gap-2"
          >
            Avançar: {proximoStatus[ordem.status].replace(/_/g, ' ')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-zinc-500 border-b border-zinc-800/50 pb-4">
            <User className="w-4 h-4" />
            <h3 className="text-[10px] font-mono uppercase tracking-widest font-black">Identificação do Cliente</h3>
          </div>
          <Link href={`/clientes/${ordem.cliente?.id}`} className="block group min-w-0">
            <p className="text-xl font-black text-white group-hover:text-orange-500 transition-colors truncate">
              {ordem.cliente?.nome}
            </p>
            <p className="text-xs text-zinc-500 font-mono mt-1 tracking-widest truncate">{ordem.cliente?.cpf_cnpj}</p>
          </Link>
          <div className="flex items-center gap-3 text-zinc-400 mt-4">
            <div className="w-8 h-8 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs">{ordem.cliente?.telefone}</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-zinc-500 border-b border-zinc-800/50 pb-4">
            <Truck className="w-4 h-4" />
            <h3 className="text-[10px] font-mono uppercase tracking-widest font-black">Dados do Ativo / Frota</h3>
          </div>
          <Link href={`/veiculos/${ordem.veiculo?.id}`} className="block group min-w-0">
            <div className="bg-zinc-950 border-2 border-zinc-800 rounded-lg px-3 py-1 inline-block group-hover:border-orange-500/50 transition-colors max-w-full">
              <p className="text-xl font-black text-orange-500 font-mono tracking-widest truncate">
                {ordem.veiculo?.placa}
              </p>
            </div>
            <p className="text-sm font-bold text-white mt-3 uppercase truncate">
              {ordem.veiculo?.marca} {ordem.veiculo?.modelo}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase truncate font-bold">SÉRIE/ANO: {ordem.veiculo?.ano}</p>
            {ordem.veiculo?.horimetro_atual !== null ? (
              <p className="text-[10px] text-orange-500 font-mono mt-1 uppercase font-black tracking-widest">
                HORÍMETRO: {ordem.veiculo?.horimetro_atual}h
              </p>
            ) : (
              <p className="text-[10px] text-blue-400 font-mono mt-1 uppercase font-black tracking-widest">
                KM ATUAL: {ordem.veiculo?.quilometragem?.toLocaleString() || 0} KM
              </p>
            )}
          </Link>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-zinc-500 border-b border-zinc-800/50 pb-4">
            <Wrench className="w-4 h-4" />
            <h3 className="text-[10px] font-mono uppercase tracking-widest font-black">Técnico Encarregado</h3>
          </div>
          <div className="min-w-0">
            <p className="text-xl font-black text-white truncate">
              {ordem.mecanico?.name || 'VAGANTE / PENDENTE'}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-widest truncate font-bold">
              Setor: {ordem.mecanico?.especialidade || 'Mecânica Geral'}
            </p>
          </div>
          <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden mt-4">
            <div className={`h-full ${ordem.mecanico ? 'bg-orange-600' : 'bg-red-600'}`} style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-zinc-500 border-b border-zinc-800/50 pb-4">
          <FileText className="w-4 h-4" />
          <h3 className="text-[10px] font-mono uppercase tracking-widest font-black">Parecer Técnico e Diagnóstico</h3>
        </div>
        <p className="text-zinc-200 text-sm leading-relaxed italic">
          {ordem.diagnostico ? `"${ordem.diagnostico}"` : "Nenhum relatório técnico foi anexado a este protocolo até o momento..."}
        </p>
      </div>

      {ordem.tipo_atendimento && ordem.tipo_atendimento !== 'OFICINA' && (() => {
        let timeline: any[] = [];
        try {
          timeline = typeof ordem.timeline_viagem === 'string' ? JSON.parse(ordem.timeline_viagem || '[]') : (ordem.timeline_viagem || []);
        } catch {
          timeline = [];
        }

        let equipe: any[] = [];
        try {
          equipe = typeof ordem.mao_obra_equipe === 'string' ? JSON.parse(ordem.mao_obra_equipe || '[]') : (ordem.mao_obra_equipe || []);
        } catch {
          equipe = [];
        }

        const totalDespesas = (
          (ordem.despesa_pedagio || 0) +
          (ordem.despesa_combustivel || 0) +
          (ordem.despesa_hospedagem || 0) +
          (ordem.despesa_alimentacao || 0) +
          (ordem.despesa_diaria_tecnica || 0) +
          (ordem.despesa_guincho || 0) +
          (ordem.despesa_outros || 0)
        );

        return (
          <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-xl space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3 text-zinc-500">
                <Navigation className="w-5 h-5 text-orange-500" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Atendimento Externo & Logística de Campo</h3>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Gestão de KM, Custos Extras e Viagem</p>
                </div>
              </div>
              <span className="text-[10px] font-mono bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg px-2.5 py-1 uppercase tracking-widest">
                Ativo Externo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-zinc-500">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Local do Destino</span>
                  </div>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-bold text-white uppercase line-clamp-2">
                      {ordem.local_atendimento || 'Endereço não informado'}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono">
                      {ordem.local_cidade ? `${ordem.local_cidade} - ${ordem.local_estado || ''}` : 'Cidade não identificada'}
                    </p>
                  </div>
                </div>
                {ordem.local_gps ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ordem.local_gps)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full text-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 py-2.5 px-4 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all block mt-4"
                  >
                    📍 Abrir GPS ({ordem.local_gps})
                  </a>
                ) : (
                  <span className="text-[9px] text-zinc-600 font-mono mt-4 italic block">Coordenadas GPS ausentes</span>
                )}
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Milestone className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Controle e Cálculo de KM</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/40">
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">KM Ida</p>
                    <p className="text-sm font-black text-white mt-0.5">{ordem.km_saida || 0} km</p>
                  </div>
                  <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/40">
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">KM Volta</p>
                    <p className="text-sm font-black text-white mt-0.5">{ordem.km_retorno || 0} km</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-zinc-800 mt-2 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">KM Rodados (x R$ {(ordem.valor_km || 0).toFixed(2)})</p>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{ordem.km_total || 0} km total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Total Deslocamento</p>
                    <p className="text-sm font-black text-orange-500 mt-0.5">R$ {(ordem.total_deslocamento || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Receipt className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Despesas Reembolsáveis</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 mt-3">
                  {ordem.despesa_pedagio > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Pedágio</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_pedagio.toFixed(2)}</span>
                    </div>
                  )}
                  {ordem.despesa_combustivel > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Combustível</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_combustivel.toFixed(2)}</span>
                    </div>
                  )}
                  {ordem.despesa_hospedagem > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Hospedagem</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_hospedagem.toFixed(2)}</span>
                    </div>
                  )}
                  {ordem.despesa_alimentacao > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Alimentação</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_alimentacao.toFixed(2)}</span>
                    </div>
                  )}
                  {ordem.despesa_diaria_tecnica > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Diária Técnica</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_diaria_tecnica.toFixed(2)}</span>
                    </div>
                  )}
                  {ordem.despesa_guincho > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Guincho</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_guincho.toFixed(2)}</span>
                    </div>
                  )}
                  {ordem.despesa_outros > 0 && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Outros Custos</span>
                      <span className="font-mono text-zinc-300">R$ {ordem.despesa_outros.toFixed(2)}</span>
                    </div>
                  )}
                  {totalDespesas === 0 && (
                    <p className="text-[10px] text-zinc-600 font-mono italic">Nenhuma despesa extra informada</p>
                  )}
                </div>
                <div className="pt-2 border-t border-zinc-800 mt-2 flex justify-between items-center">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Subtotal Despesas</span>
                  <span className="text-sm font-black text-white">R$ {totalDespesas.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Users className="w-4 h-4 text-orange-500" />
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Mão de Obra Externa</span>
                </div>
                <div className="mt-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-mono">Horas:</span>
                    <span className="text-white font-bold">{ordem.mao_obra_externa_horas || 0}h</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-zinc-500 font-mono">Valor Hora:</span>
                    <span className="text-white font-bold">R$ {(ordem.mao_obra_externa_valor || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-1 pt-1.5 border-t border-zinc-800/40">
                    <span className="text-orange-500 font-bold font-mono">Total Extra:</span>
                    <span className="text-orange-500 font-black">R$ {(ordem.mao_obra_externa_total || 0).toFixed(2)}</span>
                  </div>
                </div>

                {equipe.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] text-zinc-500 font-mono uppercase">Equipe de Campo:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {equipe.map((p: any, idx: number) => (
                        <span key={idx} className="text-[9px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md px-1.5 py-0.5">
                          {p.nome || p.role || p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {timeline.length > 0 && (
              <div className="border-t border-zinc-800/80 pt-6">
                <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Registro de Atividades da Viagem (Timeline)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {timeline.map((item: any, idx: number) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-1 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-white font-mono">{item.status || 'PARADA'}</span>
                        <span className="text-[9px] text-orange-500 font-mono">#{idx+1}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{item.descricao || item.obs || 'Nenhuma observação'}</p>
                      <p className="text-[9px] text-zinc-500 font-mono mt-1 italic uppercase">
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString('pt-BR') : ''} {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 bg-zinc-800/20 border-b border-zinc-800">
            <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3">
              <Wrench className="w-4 h-4 text-orange-500" />
              Mão de Obra Técnica
            </h3>
          </div>
          {ordem.servicos && ordem.servicos.length > 0 ? (
            <div className="p-4 space-y-3">
              {(ordem.servicos || []).map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <div className="max-w-[60%]">
                    <p className="text-sm font-bold text-white uppercase truncate">{s.descricao}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">Fator: {s.horas}h @ R${(s.valor_hora || 0).toFixed(2)}/h</p>
                  </div>
                  <p className="text-sm font-black text-green-500">R$ {(s.valor_total || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Nenhum serviço registrado</div>
          )}
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 bg-zinc-800/20 border-b border-zinc-800">
            <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3">
              <Package className="w-4 h-4 text-orange-500" />
              Peças e Componentes
            </h3>
          </div>
          {ordem.pecas_aplicadas && ordem.pecas_aplicadas.length > 0 ? (
            <div className="p-4 space-y-3">
              {(ordem.pecas_aplicadas || []).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                  <div className="max-w-[60%]">
                    <p className="text-sm font-bold text-white uppercase truncate">{p.peca?.descricao}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">Vol: {p.quantidade} {p.unidade || p.peca?.unidadeMedida || 'un'} @ R${(p.valor_unit || 0).toFixed(2)}</p>
                  </div>
                  <p className="text-sm font-black text-green-500">R$ {(p.valor_total || 0).toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Nenhuma peça aplicada</div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 bg-zinc-800/20 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-3">
            <ClipboardCheck className="w-4 h-4 text-orange-500" />
            Checklists e Inspeções
          </h3>
          <Link href={`/checklist`}>
            <button className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Plus size={14} />
              Novo Checklist
            </button>
          </Link>
        </div>
        {Array.isArray(checklistsExecutados) && checklistsExecutados.length > 0 ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklistsExecutados.map((exec: any, index: number) => (
              <div key={exec?.id || index} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between group hover:border-orange-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-600 group-hover:text-orange-500 group-hover:border-orange-500/20 transition-all">
                    <ClipboardCheck size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase italic tracking-tight">{exec?.checklist?.nome || 'Checklist sem nome'}</p>
                    <p className="text-[9px] text-zinc-500 font-mono mt-1">
                      Executado em: {exec?.data ? (isNaN(new Date(exec.data).getTime()) ? 'Data inválida' : new Date(exec.data).toLocaleDateString('pt-BR')) : 'Data não registrada'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/checklist/resultado/${exec?.id}`}>
                    <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-600 hover:text-blue-500 hover:border-blue-500/50 transition-all">
                      <Eye size={14} />
                    </button>
                  </Link>
                  <button
                    onClick={() => exec?.id && handleDeleteChecklist(exec.id)}
                    className="p-2 bg-zinc-800 hover:bg-red-600/20 rounded-lg text-zinc-400 hover:text-red-500 transition"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Nenhum checklist executado para esta OS</div>
        )}
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 w-full sm:w-auto">
            {ordem.forma_pagamento && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Pagamento</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-white uppercase italic">{ordem.forma_pagamento}</p>
                  {ordem.numero_parcelas > 1 && (
                    <span className="text-[10px] text-zinc-500 font-mono">({ordem.numero_parcelas}x {ordem.dias_entre_parcelas}d)</span>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Subtotal Serviços</p>
              <p className="text-lg font-bold text-white">R$ {ordem.valor_servicos?.toFixed(2) || '0,00'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Subtotal Peças</p>
              <p className="text-lg font-bold text-white">R$ {ordem.valor_pecas?.toFixed(2) || '0,00'}</p>
            </div>
            {ordem.tipo_atendimento && ordem.tipo_atendimento !== 'OFICINA' && (() => {
              const totalExtras = (
                (ordem.total_deslocamento || 0) +
                (ordem.despesa_pedagio || 0) +
                (ordem.despesa_combustivel || 0) +
                (ordem.despesa_hospedagem || 0) +
                (ordem.despesa_alimentacao || 0) +
                (ordem.despesa_diaria_tecnica || 0) +
                (ordem.despesa_guincho || 0) +
                (ordem.despesa_outros || 0) +
                (ordem.mao_obra_externa_total || 0)
              );
              if (totalExtras <= 0) return null;
              return (
                <div className="space-y-1">
                  <p className="text-[10px] font-mono text-orange-500 uppercase tracking-widest">Custos Extras de Campo</p>
                  <p className="text-lg font-bold text-orange-500">R$ {totalExtras.toFixed(2)}</p>
                </div>
              );
            })()}
            {(ordem.desconto || 0) > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Abono / Desconto</p>
                <p className="text-lg font-bold text-red-500">R$ -{(ordem.desconto || 0).toFixed(2)}</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-auto p-6 bg-zinc-950 border border-zinc-800 rounded-3xl text-right">
            <div className="flex items-center gap-3 justify-end text-orange-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] font-black">Consolidado Total</p>
            </div>
            <p className="text-4xl font-black text-white tracking-tight">
              R$ {ordem.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
          <ShieldCheck className="text-emerald-400 w-5 h-5" />
          <div>
            <h3 className="text-md font-black tracking-widest text-white uppercase italic">Homologação Digital Integrada</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Assinatura corporativa com hash SHA-256</p>
          </div>
        </div>

        {ordem?.assinatura_hash ? (
          <div className="bg-black/60 border border-emerald-500/20 p-6 rounded-2xl space-y-4 relative overflow-hidden">
            <div className="absolute right-[-15px] top-[-15px] text-emerald-500/5 rotate-12">
              <ShieldCheck className="w-40 h-40" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-black text-emerald-400 rounded-2xl uppercase tracking-widest inline-flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Documento Certificado
              </span>
              <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">
                Timestamp: {new Date(ordem.assinatura_timestamp).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {ordem.assinatura_cliente && (
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-center space-y-1">
                  <span className="block text-[8px] font-mono uppercase text-zinc-500 tracking-widest">Cliente</span>
                  <span className="block text-lg font-black text-emerald-400 font-mono tracking-tight uppercase italic">{ordem.assinatura_cliente}</span>
                </div>
              )}
              {ordem.assinatura_mecanico && (
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-center space-y-1">
                  <span className="block text-[8px] font-mono uppercase text-zinc-500 tracking-widest">Mecânico</span>
                  <span className="block text-lg font-black text-emerald-400 font-mono tracking-tight uppercase italic">{ordem.assinatura_mecanico}</span>
                </div>
              )}
              {ordem.assinatura_supervisor && (
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-center space-y-1">
                  <span className="block text-[8px] font-mono uppercase text-zinc-500 tracking-widest">Supervisor</span>
                  <span className="block text-lg font-black text-emerald-400 font-mono tracking-tight uppercase italic">{ordem.assinatura_supervisor}</span>
                </div>
              )}
            </div>

            <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl space-y-1">
              <span className="block text-[8px] font-mono uppercase text-zinc-500 tracking-widest">HASH SHA-256</span>
              <span className="block text-[10px] text-zinc-400 font-mono font-bold uppercase tracking-widest break-all select-all">
                {ordem.assinatura_hash}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs text-zinc-400 font-medium">As assinaturas podem ser colhidas diretamente na tela do tablet ou celular pelo técnico, cliente e supervisor.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">1. Firma do Cliente</label>
                <input
                  type="text"
                  placeholder="DIGITE O NOME..."
                  value={sigCliente}
                  onChange={(e) => setSigCliente(e.target.value)}
                  className="w-full bg-black border border-zinc-850 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white uppercase tracking-tight focus:outline-none focus:border-zinc-700"
                />
                {sigCliente && (
                  <div className="p-3 bg-black/40 border border-dashed border-zinc-800 rounded-xl text-center select-none">
                    <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Preview</span>
                    <span className="text-lg font-bold font-mono text-orange-400 italic tracking-tight uppercase block">{sigCliente}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">2. Firma do Técnico</label>
                <input
                  type="text"
                  placeholder="DIGITE O NOME..."
                  value={sigMecanico}
                  onChange={(e) => setSigMecanico(e.target.value)}
                  className="w-full bg-black border border-zinc-850 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white uppercase tracking-tight focus:outline-none focus:border-zinc-700"
                />
                {sigMecanico && (
                  <div className="p-3 bg-black/40 border border-dashed border-zinc-800 rounded-xl text-center select-none">
                    <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Preview</span>
                    <span className="text-lg font-bold font-mono text-orange-400 italic tracking-tight uppercase block">{sigMecanico}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">3. Visto Supervisor</label>
                <input
                  type="text"
                  placeholder="DIGITE O NOME..."
                  value={sigSupervisor}
                  onChange={(e) => setSigSupervisor(e.target.value)}
                  className="w-full bg-black border border-zinc-850 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white uppercase tracking-tight focus:outline-none focus:border-zinc-700"
                />
                {sigSupervisor && (
                  <div className="p-3 bg-black/40 border border-dashed border-zinc-800 rounded-xl text-center select-none">
                    <span className="block text-[8px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Preview</span>
                    <span className="text-lg font-bold font-mono text-orange-400 italic tracking-tight uppercase block">{sigSupervisor}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveSignatures}
                disabled={isSigning || (!sigCliente && !sigMecanico && !sigSupervisor)}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800/40 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-950/20 flex items-center gap-2 cursor-pointer"
              >
                {isSigning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck size={14} />
                )}
                Homologar Assinaturas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Finalizar */}
      {showFinalizarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-800/20 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Finalizar Protocolo</h3>
                <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Configuração Financeira e Fechamento</p>
              </div>
              <button
                onClick={() => setShowFinalizarModal(false)}
                className="w-10 h-10 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-all"
              >
                <Eye className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">Forma de Pagamento</label>
                  <select
                    value={formaPagamento}
                    onChange={(e) => {
                      setFormaPagamento(e.target.value);
                      if (e.target.value !== 'PARCELADO') setNumParcelas(1);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 py-3 px-4 rounded-xl text-white font-bold text-sm focus:border-orange-500 outline-none transition-all selection:bg-orange-500 appearance-none"
                  >
                    <option value="DINHEIRO">💰 DINHEIRO / VISTA</option>
                    <option value="PIX">⚡ PIX</option>
                    <option value="BOLETO">📄 BOLETO</option>
                    <option value="CARTAO">💳 CARTÃO CRÉDITO/DÉBITO</option>
                    {ordem.cliente?.tipo === 'PJ' && (
                      <option value="PARCELADO">📅 FATURADO / PARCELADO (PJ)</option>
                    )}
                  </select>
                </div>

                {formaPagamento === 'PARCELADO' && ordem.cliente?.tipo === 'PJ' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">Parcelas</label>
                        <input
                          type="number"
                          value={numParcelas}
                          onChange={(e) => setNumParcelas(parseInt(e.target.value) || 1)}
                          min="1"
                          max="24"
                          className="w-full bg-zinc-950 border border-zinc-800 py-3 px-4 rounded-xl text-white font-bold text-sm focus:border-orange-500 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">Intervalo (dias)</label>
                        <input
                          type="number"
                          value={diasIntervalo}
                          onChange={(e) => setDiasIntervalo(parseInt(e.target.value) || 28)}
                          min="1"
                          className="w-full bg-zinc-950 border border-zinc-800 py-3 px-4 rounded-xl text-white font-bold text-sm focus:border-orange-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-orange-600/5 p-6 rounded-2xl border border-orange-500/10 flex items-center justify-between group overflow-hidden relative">
                <div className="relative z-10">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-orange-500 font-extrabold mb-1">Total a Consolidar</p>
                  <p className="text-3xl font-black text-white">R$ {ordem.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-32 h-32 text-orange-500" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => setShowFinalizarModal(false)}
                  className="flex-1 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmFinalizar}
                  disabled={isFinalizing}
                  className="flex-[2] px-8 py-4 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-800/50 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-orange-950/20 flex items-center justify-center gap-3"
                >
                  {isFinalizing ? (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Confirmar Encerramento
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* A01: MODAL DE CANCELAMENTO */}
      {showCancelarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Cancelar OS #{ordem.numero}</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Ação irreversível</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 text-xs text-zinc-300 leading-relaxed space-y-1.5">
                <p className="font-bold text-red-400 uppercase text-[10px] tracking-widest">O que vai acontecer</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li>O status da OS será alterado para <strong className="text-white">CANCELADA</strong></li>
                  <li>Lançamentos financeiros <strong>pendentes</strong> serão cancelados</li>
                  <li>Peças aplicadas serão devolvidas ao estoque (com registro)</li>
                  <li>O histórico da OS é <strong>preservado</strong> — nada é apagado</li>
                </ul>
                <p className="font-bold text-red-400 uppercase text-[10px] tracking-widest pt-2">Bloqueios</p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li>Não é possível cancelar OS <strong>ENTREGUE</strong></li>
                  <li>Não é possível cancelar OS com <strong>lançamento PAGO</strong></li>
                </ul>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-black">Motivo do Cancelamento *</label>
                <textarea
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Descreva o motivo (ex: cliente desistiu, erro de cadastro, duplicidade...)"
                  rows={3}
                  maxLength={500}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-red-500 transition font-medium resize-none placeholder:text-zinc-700"
                />
                <p className="text-[9px] text-zinc-600 text-right font-mono">
                  {motivoCancelamento.length}/500
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelarModal(false);
                    setMotivoCancelamento('');
                  }}
                  disabled={isCanceling}
                  className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleCancelar}
                  disabled={isCanceling || !motivoCancelamento.trim()}
                  className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-900/30 disabled:text-zinc-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3"
                >
                  {isCanceling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Confirmar Cancelamento
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
