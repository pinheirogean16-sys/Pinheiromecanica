'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, CheckCircle2, AlertCircle, Plus, Sparkles, 
  Search, ChevronRight, Wrench, RefreshCw, Clock, Loader2, 
  Trash2, Edit, ShieldCheck, X, History, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import PreventivaModal from '@/components/PreventivaModal';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

// ============================================================
// HELPERS
// ============================================================
function getStatusBadge(status: string, ativo = true) {
  if (!ativo || status === 'DESATIVADO') {
    return {
      banner: 'bg-zinc-900/60 border-zinc-800 text-zinc-400',
      badge: 'bg-zinc-800/80 border-zinc-700 text-zinc-400',
      dot: 'bg-zinc-600',
      label: 'DESATIVADO'
    };
  }
  switch (status) {
    case 'VENCIDO':
      return {
        banner: 'bg-red-950/20 border-red-900/60 text-red-400',
        badge: 'bg-red-500/10 border-red-500/30 text-red-400',
        dot: 'bg-red-500 animate-ping',
        label: 'VENCIDO'
      };
    case 'PROXIMO':
      return {
        banner: 'bg-amber-950/20 border-amber-900/60 text-amber-400',
        badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        dot: 'bg-amber-500 animate-pulse',
        label: 'PRÓXIMO'
      };
    default:
      return {
        banner: 'bg-zinc-950/80 border-zinc-800 text-zinc-300',
        badge: 'bg-green-500/10 border-green-500/30 text-green-400',
        dot: 'bg-green-500',
        label: 'EM DIA'
      };
  }
}

export default function PreventivasPage() {
  const [preventivas, setPreventivas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clienteFilter, setClienteFilter] = useState<string>('');
  const [veiculoFilter, setVeiculoFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPreventiva, setEditingPreventiva] = useState<any | null>(null);

  // Modal de Exclusão
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (veiculoFilter) params.append('veiculo_id', veiculoFilter);
      if (clienteFilter) params.append('cliente_id', clienteFilter);

      const url = `/api/preventivas${params.toString() ? `?${params.toString()}` : ''}`;
      
      const [dataPrev, dataVeic, dataCli] = await Promise.all([
        apiFetch<any>(url, { signal }),
        apiFetch<any>('/api/veiculos?limit=1000', { signal }).catch(() => ({ items: [] })),
        apiFetch<any>('/api/clientes?limit=1000', { signal }).catch(() => ({ items: [] })),
      ]);

      setPreventivas(Array.isArray(dataPrev) ? dataPrev : (dataPrev.items || []));
      setVeiculos(Array.isArray(dataVeic) ? dataVeic : (dataVeic.items || []));
      setClientes(Array.isArray(dataCli) ? dataCli : (dataCli.items || []));
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setError(true);
      handleApiError(e, { defaultMessage: 'Erro ao conectar com o serviço de manutenção preventiva' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, veiculoFilter, clienteFilter]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/api/preventivas/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Plano preventivo removido com sucesso!');
      setDeleteTarget(null);
      fetchData();
    } catch (e: any) {
      handleApiError(e, { defaultMessage: 'Erro ao remover preventiva' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (p: any) => {
    setEditingPreventiva(p);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingPreventiva(null);
    setModalOpen(true);
  };

  // ============================================================
  // ✅ NOVO: Função para enviar WhatsApp
  // ============================================================
  const enviarWhatsApp = (p: any) => {
    const veiculo = p.Veiculo || p.veiculo;
    const cliente = veiculo?.Cliente || veiculo?.cliente;

    if (!cliente || !cliente.telefone) {
      toast.error('Cliente não possui telefone cadastrado.');
      return;
    }

    // Limpa o telefone e adiciona o código do país (55)
    let telefone = cliente.telefone.replace(/\D/g, '');
    if (!telefone.startsWith('55')) {
      telefone = '55' + telefone;
    }

    // Monta a mensagem
    let mensagem = `*Relatório de Manutenção Preventiva*\n\n`;
    mensagem += `Olá, *${cliente.nome}*!\n`;
    mensagem += `Segue o registro do serviço realizado no veículo *${veiculo.marca} ${veiculo.modelo} (${veiculo.placa})*.\n\n`;
    mensagem += `🛠️ *Serviço:* ${p.nome || p.servico || p.componente}\n`;
    
    // Anexa as fotos se existirem
    if (p.fotos && Array.isArray(p.fotos) && p.fotos.length > 0) {
      mensagem += `\n📸 *Fotos do Serviço:*\n`;
      p.fotos.forEach((foto: string, index: number) => {
        const baseUrl = foto.startsWith('http') ? '' : window.location.origin;
        mensagem += `Foto ${index + 1}: ${baseUrl}${foto}\n`;
      });
    }

    mensagem += `\nQualquer dúvida, estamos à disposição!`;

    // Abre o WhatsApp em nova aba
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  // Modal de Histórico de Ciclos Executados
  const [historicoModalOpen, setHistoricoModalOpen] = useState(false);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [selectedPreventivaHistory, setSelectedPreventivaHistory] = useState<any[]>([]);
  const [selectedPreventivaInfo, setSelectedPreventivaInfo] = useState<any | null>(null);

  const handleOpenHistorico = async (p: any) => {
    setSelectedPreventivaInfo(p);
    setHistoricoModalOpen(true);
    setHistoricoLoading(true);
    try {
      const data = await apiFetch<any>(`/api/preventivas/${p.id}/historico`);
      setSelectedPreventivaHistory(data?.historico || []);
    } catch (e) {
      setSelectedPreventivaHistory([]);
    } finally {
      setHistoricoLoading(false);
    }
  };

  // Estatísticas
  const totalCadastradas = preventivas.length;
  const totalAtivas = preventivas.filter(p => p.ativo !== false).length;
  const totalVencidas = preventivas.filter(p => p.ativo !== false && p.status === 'VENCIDO').length;
  const totalProximas = preventivas.filter(p => p.ativo !== false && p.status === 'PROXIMO').length;
  const totalSaudaveis = preventivas.filter(p => p.ativo !== false && p.status === 'SAUDAVEL').length;
  const totalDesativadas = preventivas.filter(p => p.ativo === false || p.status === 'DESATIVADO').length;

  // Filtragem local por texto
  const filteredPreventivas = preventivas.filter(p => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const matchesPlate = p.veiculo?.placa?.toLowerCase().includes(term);
    const matchesModel = p.veiculo?.modelo?.toLowerCase().includes(term);
    const matchesClient = p.veiculo?.Cliente?.nome?.toLowerCase().includes(term) || p.veiculo?.cliente?.nome?.toLowerCase().includes(term);
    const matchesNome = p.nome?.toLowerCase().includes(term);
    const matchesServico = p.servico?.toLowerCase().includes(term);
    const matchesComponente = p.componente?.toLowerCase().includes(term);
    const matchesDesc = p.descricao?.toLowerCase().includes(term);

    return matchesPlate || matchesModel || matchesClient || matchesNome || matchesServico || matchesComponente || matchesDesc;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-8" id="preventivas-dashboard">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-2xl w-fit">
            <Sparkles size={12} className="animate-spin text-orange-500" />
            OFICINA DIESEL & MÁQUINAS PESADAS
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase italic">
            PLANO DE MANUTENÇÃO PREVENTIVA
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Acompanhamento preditivo por Data, Quilometragem e Horímetro para frotas pesadas e equipamentos diesel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData()}
            className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
            title="Atualizar dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-orange-500' : ''} />
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-orange-950/20"
          >
            <Plus size={16} />
            Cadastrar Novo Plano
          </button>
        </div>
      </div>

      {/* METRIC CARDS DE TELEMETRIA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Planos Ativos</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <ShieldCheck size={14} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black font-mono text-white">
            {totalCadastradas}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block">Monitoramento contínuo</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'VENCIDO' ? '' : 'VENCIDO')}
          className={`bg-zinc-950 border p-5 rounded-2xl space-y-2 cursor-pointer transition ${statusFilter === 'VENCIDO' ? 'border-red-500 ring-1 ring-red-500/30' : 'border-zinc-800 hover:border-red-900/50'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Vencidas</span>
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <AlertCircle size={14} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black font-mono text-red-400">
            {totalVencidas}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block">Necessitam intervenção imediata</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'PROXIMO' ? '' : 'PROXIMO')}
          className={`bg-zinc-950 border p-5 rounded-2xl space-y-2 cursor-pointer transition ${statusFilter === 'PROXIMO' ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-zinc-800 hover:border-amber-900/50'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Próximas do Vencimento</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock size={14} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black font-mono text-amber-400">
            {totalProximas}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block">Na faixa de tolerância de alerta</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'SAUDAVEL' ? '' : 'SAUDAVEL')}
          className={`bg-zinc-950 border p-5 rounded-2xl space-y-2 cursor-pointer transition ${statusFilter === 'SAUDAVEL' ? 'border-green-500 ring-1 ring-green-500/30' : 'border-zinc-800 hover:border-green-900/50'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Em Dia</span>
            <div className="w-7 h-7 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black font-mono text-green-400">
            {totalSaudaveis}
          </div>
          <span className="text-[9px] text-zinc-500 font-mono block">Manutenções regulares</span>
        </div>
      </div>

      {/* PAINEL DE BUSCA E FILTROS */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 md:p-5 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="PESQUISAR CLIENTE, VEÍCULO, PLACA OU SERVIÇO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-orange-500 placeholder:text-zinc-700"
            />
          </div>

          <div>
            <select
              value={clienteFilter}
              onChange={(e) => setClienteFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-zinc-300 uppercase focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="">TODOS OS CLIENTES</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={veiculoFilter}
              onChange={(e) => setVeiculoFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs font-mono font-bold text-zinc-300 uppercase focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="">TODOS OS VEÍCULOS</option>
              {veiculos.map(v => (
                <option key={v.id} value={v.id}>
                  {v.placa ? `[${v.placa}] ` : ''}{v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${!statusFilter ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
          >
            Todos ({totalCadastradas})
          </button>
          <button
            onClick={() => setStatusFilter('VENCIDO')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${statusFilter === 'VENCIDO' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-transparent border-zinc-900 text-zinc-500 hover:text-red-400'}`}
          >
            Vencidos ({totalVencidas})
          </button>
          <button
            onClick={() => setStatusFilter('PROXIMO')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${statusFilter === 'PROXIMO' ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-transparent border-zinc-900 text-zinc-500 hover:text-amber-400'}`}
          >
            Próximos ({totalProximas})
          </button>
          <button
            onClick={() => setStatusFilter('SAUDAVEL')}
            className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${statusFilter === 'SAUDAVEL' ? 'bg-green-500/10 border-green-500/40 text-green-400' : 'bg-transparent border-zinc-900 text-zinc-500 hover:text-green-400'}`}
          >
            Em Dia ({totalSaudaveis})
          </button>
        </div>
      </div>

      {/* LISTA / GRID DE PLANOS PREVENTIVOS */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Carregando planos de preventiva...</p>
        </div>
      ) : error ? (
        <div className="py-20 text-center space-y-3 bg-zinc-950 border border-red-500/20 rounded-3xl">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="text-sm font-black uppercase text-white">Falha na Sincronização</p>
          <button onClick={() => fetchData()} className="mt-2 px-6 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-black uppercase rounded-xl hover:bg-zinc-800 transition">Tentar novamente</button>
        </div>
      ) : filteredPreventivas.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-zinc-800 rounded-3xl space-y-3 bg-zinc-950/40">
          <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto" />
          <h4 className="text-zinc-400 font-extrabold uppercase font-mono text-sm">Nenhum plano de manutenção encontrado</h4>
          <p className="text-xs text-zinc-600 font-mono">
            Cadastre os planos de inspeção e substituição periódica para os veículos e máquinas diesel.
          </p>
          <button
            onClick={handleNew}
            className="mt-3 inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition"
          >
            <Plus size={14} /> Cadastrar Primeiro Plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPreventivas.map((p: any) => {
            const styles = getStatusBadge(p.status || '', p.ativo !== false);
            const veiculo = p.Veiculo || p.veiculo;
            const cliente = veiculo?.Cliente || veiculo?.cliente;
            const kmAtual = veiculo?.quilometragem ?? p.km_atual ?? 0;
            const horimetroAtual = veiculo?.horimetro_atual ?? p.horimetro_atual ?? 0;
            const proximoKm = p.proximo_km ?? p.km_limite;
            const proximaData = p.proxima_data ?? p.data_limite;

            return (
              <div 
                key={p.id} 
                className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition shadow-lg ${styles.banner}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {veiculo?.placa ? (
                          <span className="px-2 py-0.5 bg-orange-600 text-white font-extrabold text-[10px] rounded tracking-tight font-mono">
                            {veiculo.placa}
                          </span>
                        ) : null}
                        <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[180px] block">
                          {veiculo?.marca} {veiculo?.modelo}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-bold block truncate max-w-[220px]">
                        Cliente: {cliente?.nome || 'Sem cliente vinculado'}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 border text-[9px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1.5 ${styles.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      {styles.label}
                    </span>
                  </div>

                  <div className="bg-zinc-950/50 border border-zinc-900 p-3.5 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white uppercase tracking-tight">
                        {p.nome || p.servico || p.componente}
                      </span>
                      <span className="text-[9px] font-mono text-orange-400 font-bold uppercase">
                        {p.componente}
                      </span>
                    </div>
                    {p.descricao && (
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                        {p.descricao}
                      </p>
                    )}
                    
                    {/* ✅ NOVO: Exibição das miniaturas das fotos no card */}
                    {p.fotos && Array.isArray(p.fotos) && p.fotos.length > 0 && (
                      <div className="flex gap-1 mt-2 overflow-x-auto custom-scrollbar pb-1">
                        {p.fotos.map((foto: string, idx: number) => (
                          <a key={idx} href={foto} target="_blank" rel="noreferrer" className="w-10 h-10 rounded border border-zinc-800 overflow-hidden flex-shrink-0 hover:border-orange-500 transition">
                            <img src={foto} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 border-t border-zinc-800/80 pt-3 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-zinc-900/40 p-2 rounded-lg">
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-black block">KM Atual / Alvo</span>
                      <span className="text-zinc-200 font-bold block mt-0.5">
                        {kmAtual.toLocaleString('pt-BR')} / {proximoKm ? `${proximoKm.toLocaleString('pt-BR')} KM` : '—'}
                      </span>
                      {p.km_restante !== null && p.km_restante !== undefined && (
                        <span className={`text-[9px] font-bold block mt-0.5 ${p.km_restante <= 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                          {p.km_restante <= 0 ? `Excedido em ${Math.abs(p.km_restante)} KM` : `Resta ${p.km_restante} KM`}
                        </span>
                      )}
                    </div>

                    <div className="bg-zinc-900/40 p-2 rounded-lg">
                      <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-black block">Horímetro / Alvo</span>
                      <span className="text-zinc-200 font-bold block mt-0.5">
                        {horimetroAtual}h / {p.proximo_horimetro ? `${p.proximo_horimetro}h` : '—'}
                      </span>
                      {p.horas_restantes !== null && p.horas_restantes !== undefined && (
                        <span className={`text-[9px] font-bold block mt-0.5 ${p.horas_restantes <= 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                          {p.horas_restantes <= 0 ? `Excedido em ${Math.abs(p.horas_restantes)}h` : `Restam ${p.horas_restantes}h`}
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 bg-zinc-900/40 p-2 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-black block">Data Prevista</span>
                        <span className="text-zinc-200 font-bold block mt-0.5">
                          {proximaData ? new Date(proximaData).toLocaleDateString('pt-BR') : 'Sem data limite'}
                        </span>
                      </div>
                      {p.dias_restantes !== null && p.dias_restantes !== undefined && (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${p.dias_restantes <= 0 ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-300'}`}>
                          {p.dias_restantes <= 0 ? `Vencido há ${Math.abs(p.dias_restantes)} dias` : `Em ${p.dias_restantes} dias`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ✅ AÇÕES DO CARD COM O NOVO BOTÃO DE WHATSAPP */}
                  <div className="flex flex-wrap items-center justify-between border-t border-zinc-800/60 pt-3 gap-y-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                        title="Editar Plano"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
                        title="Excluir Plano"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenHistorico(p)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 cursor-pointer transition"
                      >
                        <Clock size={12} className="text-orange-500" />
                        Ciclos
                      </button>
                      
                      {/* Botão de WhatsApp */}
                      <button
                        onClick={() => enviarWhatsApp(p)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-md shadow-green-950/20 transition cursor-pointer"
                        title="Enviar Relatório no WhatsApp"
                      >
                        <MessageCircle size={12} />
                        Enviar
                      </button>

                      <Link
                        href={`/os/nova?veiculo_id=${p.veiculo_id}&preventiva_id=${p.id}&diagnostico=MANUTENCAO+PREVENTIVA:+${encodeURIComponent(p.nome || p.servico || p.componente)}`}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-md shadow-orange-950/20 transition"
                      >
                        <Wrench size={12} />
                        Gerar OS
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE HISTÓRICO DE CICLOS CONCLUÍDOS */}
      {historicoModalOpen && selectedPreventivaInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Histórico de Ciclos Concluídos
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {selectedPreventivaInfo.nome || selectedPreventivaInfo.servico || selectedPreventivaInfo.componente} • {selectedPreventivaInfo.Veiculo?.placa || selectedPreventivaInfo.veiculo?.placa || 'Sem Placa'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoricoModalOpen(false)}
                className="p-2 text-zinc-500 hover:text-white rounded-lg cursor-pointer transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
              {historicoLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
                  <Loader2 size={24} className="animate-spin text-orange-500" />
                  Carregando ciclos concluídos...
                </div>
              ) : selectedPreventivaHistory.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                  Nenhuma conclusão de ciclo registrada para este plano até o momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedPreventivaHistory.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-orange-400 uppercase font-mono">
                          Ciclo Concluído em {new Date(item.data_conclusao).toLocaleDateString('pt-BR')}
                        </span>
                        {item.os_numero ? (
                          <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-300">
                            OS #{item.os_numero}
                          </span>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-400 pt-1">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">KM Conclusão</span>
                          <strong className="text-white">{item.km_conclusao ? `${item.km_conclusao.toLocaleString('pt-BR')} KM` : '---'}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">Horímetro</span>
                          <strong className="text-white">{item.horimetro_conclusao ? `${item.horimetro_conclusao} h` : '---'}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">Próximo KM Calculado</span>
                          <strong className="text-zinc-300">{item.km_proximo_calculado ? `${item.km_proximo_calculado.toLocaleString('pt-BR')} KM` : '---'}</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">Responsável</span>
                          <strong className="text-zinc-300 truncate block">{item.usuario_nome || 'Sistema'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Excluir Preventiva</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Ação irreversível</p>
                </div>
              </div>
              <button onClick={() => setDeleteTarget(null)} className="p-2 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-500 hover:text-white transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o plano de manutenção <strong className="text-white">{deleteTarget.nome || deleteTarget.componente}</strong> do veículo <strong className="text-white">{deleteTarget.Veiculo?.placa || deleteTarget.veiculo?.placa || 'S/N'}</strong>?
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-900/30 disabled:text-zinc-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirmar Exclusão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO / EDIÇÃO DE PLANO PREVENTIVO */}
      {modalOpen && (
        <PreventivaModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingPreventiva(null);
          }}
          onSuccess={fetchData}
          veiculos={veiculos}
          preventivaToEdit={editingPreventiva}
        />
      )}
    </main>
  );
}
