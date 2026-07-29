'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, CheckCircle2, AlertCircle, Plus, Sparkles, 
  Search, Sliders, ChevronRight, Wrench, RefreshCw, Calendar, Loader2, Gauge, Trash
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function PreventivasGeraisPage() {
  const [preventivas, setPreventivas] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Formulario Nova Preventiva
  const [criarOpen, setCriarOpen] = useState(false);
  const [veiculoId, setVeiculoId] = useState('');
  const [componente, setComponente] = useState('OLEO');
  const [descricao, setDescricao] = useState('');
  const [kmLimite, setKmLimite] = useState('');
  const [dataLimite, setDataLimite] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Preventivas
      const resPrev = await fetch('/api/preventivas' + (statusFilter ? `?status=${statusFilter}` : ''));
      if (!resPrev.ok) throw new Error();
      const dataPrev = await resPrev.json();
      setPreventivas(dataPrev);

      // 2. Fetch Veiculos (para o dropdown)
      const resVeic = await fetch('/api/veiculos');
      if (resVeic.ok) {
        const dataVeic = await resVeic.json();
        setVeiculos(dataVeic);
      }
    } catch (e) {
      toast.error('Erro ao conectar com o serviço de telemetria preventiva');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!veiculoId) {
      toast.warning('Selecione o veículo destinatário');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/preventivas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          veiculo_id: veiculoId,
          componente,
          descricao,
          km_limite: kmLimite ? parseInt(kmLimite, 10) : null,
          data_limite: dataLimite || null
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Erro ao registrar preventiva');
      }

      toast.success('Regra preventiva agendada com completo sucesso!');
      setCriarOpen(false);
      // Reset form
      setVeiculoId('');
      setComponente('OLEO');
      setDescricao('');
      setKmLimite('');
      setDataLimite('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar regra preventiva');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover esta regra de manutenção preventiva?')) return;
    try {
      const res = await fetch(`/api/preventivas/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Regra removida');
      fetchData();
    } catch (e) {
      toast.error('Erro ao remover preventiva');
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case 'VENCIDO':
        return {
          badge: 'border-red-500/20 text-red-400 bg-red-500/5',
          banner: 'border-l-4 border-l-red-500 bg-zinc-950 border border-zinc-850',
          dot: 'bg-red-500'
        };
      case 'PROXIMO':
        return {
          badge: 'border-amber-500/20 text-amber-400 bg-amber-500/5',
          banner: 'border-l-4 border-l-amber-500 bg-zinc-950 border border-zinc-850',
          dot: 'bg-amber-500'
        };
      case 'SAUDAVEL':
        return {
          badge: 'border-green-500/20 text-green-400 bg-green-500/5',
          banner: 'border-l-4 border-l-green-500 bg-zinc-950 border border-zinc-850',
          dot: 'bg-green-500'
        };
      default:
        return {
          badge: 'border-zinc-800 text-zinc-400 bg-zinc-950',
          banner: 'border-l-4 border-l-zinc-700 bg-zinc-950 border border-zinc-850',
          dot: 'bg-zinc-400'
        };
    }
  };

  const filteredPreventivas = preventivas.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesPlate = p.veiculo?.placa?.toLowerCase().includes(term);
    const matchesModel = p.veiculo?.modelo?.toLowerCase().includes(term);
    const matchesClient = p.veiculo?.cliente?.nome?.toLowerCase().includes(term);
    const matchesDesc = p.descricao?.toLowerCase().includes(term);
    const matchesComp = p.componente?.toLowerCase().includes(term);

    return matchesPlate || matchesModel || matchesClient || matchesDesc || matchesComp;
  });

  if (loading && preventivas.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">Varrendo regras preventivas da frota...</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 space-y-8" id="preventivas-gerais">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-2xl w-fit">
            <Sparkles size={12} className="animate-spin text-orange-500" />
            MANUTENÇÃO PREVENTIVA AUTOMATIZADA
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white uppercase italic">
            ALERTAS DE PREVENTIVA
          </h1>
          <p className="text-xs text-zinc-400 font-medium">
            Monitoramento inteligente baseado na telemetria de KM e data limite dos componentes mecânicos e elétricos dos veículos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCriarOpen(!criarOpen)}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-orange-950/20"
          >
            <Plus size={14} />
            Agendar Preventiva
          </button>
        </div>
      </div>

      {/* FORMULARIO AGENDAMENTO INLINE (IF OPENED) */}
      {criarOpen && (
        <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <h3 className="text-md font-black uppercase italic text-orange-500">Agendar Inspeção / Troca Preventiva</h3>
            <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">Cadastrar nova regra ativa</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Veiculo */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Veículo Alvo</label>
              <select 
                value={veiculoId}
                onChange={(e) => setVeiculoId(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-zinc-300 rounded-xl py-3 px-4 text-xs font-black uppercase focus:outline-none focus:border-orange-500"
              >
                <option value="">SELECIONE UM VEÍCULO...</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.placa} — {v.marca} {v.modelo} ({v.cliente?.nome || 'Sem cliente'})
                  </option>
                ))}
              </select>
            </div>

            {/* Componente */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Componente / Setor</label>
              <select 
                value={componente} 
                onChange={(e) => setComponente(e.target.value)}
                className="w-full bg-black border border-zinc-800 text-zinc-300 rounded-xl py-3 px-4 text-xs font-black uppercase focus:outline-none"
              >
                <option value="OLEO">ÓLEO MOTOR</option>
                <option value="FILTROS">FILTROS</option>
                <option value="REVISAO">REVISÃO GERAL</option>
                <option value="FREIOS">FREIOS</option>
                <option value="DIFERENCIAL">DIFERENCIAL</option>
                <option value="CAIXA">CAIXA DE CAMBIO</option>
                <option value="SUSPENSAO">SUSPENSÃO</option>
                <option value="COMPRESSOR">COMPRESSOR</option>
                <option value="TURBINA">TURBINA</option>
              </select>
            </div>

            {/* KM Limite */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Quilometragem Limite</label>
              <input 
                type="number" 
                placeholder="Ex: 120000"
                value={kmLimite}
                onChange={(e) => setKmLimite(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl py-2.5 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Data Limite */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Data Limite Máxima</label>
              <input 
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl py-2 px-4 text-xs font-mono font-bold text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 block">Descrição adicional / Observações da Manutenção</label>
            <input 
              type="text" 
              placeholder="Descrever detalhes adicionais ex: Troca de óleo Shell Rimula 15W40 com filtro hidráulico..." 
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCriarOpen(false)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Salvar Regra
            </button>
          </div>
        </form>
      )}

      {/* FILTROS E PESQUISA */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-950 border border-zinc-900 p-4 rounded-xl items-center">
        {/* Busca rápida */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-3 text-zinc-500 w-4 h-4" />
          <input 
            type="text" 
            placeholder="PROCURAR POR PLACA, MODELO, CLIENTE OU COMPONENTE..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-zinc-900 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono font-bold text-white uppercase tracking-tight focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* Tab-like Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${!statusFilter ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-transparent border-zinc-900 text-zinc-500'}`}
          >
            Todos ({preventivas.length})
          </button>
          <button
            onClick={() => setStatusFilter('VENCIDO')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${statusFilter === 'VENCIDO' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-transparent border-zinc-900 text-zinc-500'}`}
          >
            Vencidos ({preventivas.filter(p => p.status === 'VENCIDO').length})
          </button>
          <button
            onClick={() => setStatusFilter('PROXIMO')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${statusFilter === 'PROXIMO' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-transparent border-zinc-900 text-zinc-500'}`}
          >
            Próximos ({preventivas.filter(p => p.status === 'PROXIMO').length})
          </button>
          <button
            onClick={() => setStatusFilter('SAUDAVEL')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${statusFilter === 'SAUDAVEL' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-transparent border-zinc-900 text-zinc-500'}`}
          >
            Saudáveis ({preventivas.filter(p => p.status === 'SAUDAVEL').length})
          </button>
        </div>
      </div>

      {/* LIST OF PREVENTIVES ITEMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPreventivas.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-zinc-900 rounded-3xl space-y-2">
            <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto block animate-pulse" />
            <h4 className="text-zinc-400 font-extrabold uppercase font-mono text-sm">Sem alertas ativos de preventiva</h4>
            <p className="text-[10px] text-zinc-600 uppercase font-mono font-bold">Nenhum veículo necessita de intervenções no momento com os critérios definidos.</p>
          </div>
        ) : (
          filteredPreventivas.map((p: any) => {
            const styles = getStatusStyle(p.status || '');
            const kmAtual = p.veiculo?.quilometragem || p.km_atual || 0;
            return (
              <div key={p.id} className={`${styles.banner} p-6 rounded-2xl flex flex-col justify-between space-y-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}>
                
                {/* Header card info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black font-mono text-zinc-500 uppercase tracking-widest block">Veículo / Placa</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-orange-500 text-white font-extrabold text-[11px] rounded tracking-tight italic">
                          {p.veiculo?.placa}
                        </span>
                        <span className="text-xs font-black text-white uppercase tracking-tight block">
                          {p.veiculo?.modelo}
                        </span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 border text-[9px] font-black rounded-lg uppercase tracking-widest ${styles.badge} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      {p.status}
                    </span>
                  </div>

                  <div className="bg-black/40 border border-zinc-900 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">
                        {p.componente}
                      </span>
                    </div>
                    {p.descricao && (
                      <p className="text-[11px] text-zinc-400 font-medium font-mono leading-relaxed">{p.descricao}</p>
                    )}
                  </div>
                </div>

                {/* Body telemetry stats */}
                <div className="space-y-4 border-t border-zinc-900/60 pt-4 font-mono">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-black">KM Atual</span>
                      <span className="text-zinc-200 block text-xs font-extrabold mt-0.5">
                        {kmAtual.toLocaleString('pt-BR')} KM
                      </span>
                    </div>

                    <div>
                      <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-black">KM Limite</span>
                      <span className={`block text-xs font-extrabold mt-0.5 ${p.km_limite && kmAtual >= p.km_limite ? 'text-red-400 font-black' : 'text-zinc-200'}`}>
                        {p.km_limite ? `${p.km_limite.toLocaleString('pt-BR')} KM` : 'Não definido'}
                      </span>
                    </div>
                    
                    <div className="col-span-2">
                      <span className="block text-[8px] uppercase tracking-widest text-zinc-500 font-black">Data Limite de Troca</span>
                      <span className="text-zinc-200 block text-xs font-extrabold mt-0.5">
                        {p.data_limite ? new Date(p.data_limite).toLocaleDateString('pt-BR') : 'Sem data limite'}
                      </span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center justify-between border-t border-zinc-900/40 pt-4">
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-zinc-600 hover:text-red-500 hover:scale-105 p-2 rounded-lg transition-all cursor-pointer"
                      title="Excluir Alerta"
                    >
                      <Trash size={14} />
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/veiculos/${p.veiculo_id}/historico`}
                        className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"
                      >
                        Histórico
                      </Link>

                      <Link
                        href={`/os/nova?veiculo_id=${p.veiculo_id}&preventiva_id=${p.id}&diagnostico=MANUTENCAO+PREVENTIVA+DE+${p.componente}`}
                        className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest inline-flex items-center gap-1.5 shadow-md shadow-orange-950/20"
                      >
                        <Wrench size={11} />
                        Executar OS
                      </Link>
                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
