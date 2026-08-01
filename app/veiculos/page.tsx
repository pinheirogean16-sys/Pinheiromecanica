'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { 
  Search, Plus, Car, Truck, User, 
  Eye, Pencil, Trash2, Filter, ChevronLeft, ChevronRight,
  TrendingUp, Activity, PenTool as Tool, Loader2, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { StatusCard } from '@/components/StatusCard';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

const TIPO_VEICULO_LABELS: Record<string, string> = {
  CAVALO_MECANICO: 'Cavalo Mecânico',
  CARRETA: 'Carreta',
  ONIBUS: 'Ônibus',
  UTILITARIO: 'Utilitário',
  CAMINHAO_LEVE: 'Caminhão Leve',
  CAMINHAO_PESADO: 'Caminhão Pesado',
  CAMINHONETE: 'Caminhonete',
  VAN: 'Van',
  RETROESCAVADEIRA: 'Retroescavadeira',
  ESCAVADEIRA_HIDRAULICA: 'Escavadeira Hidráulica',
  PA_CARREGADEIRA: 'Pá Carregadeira',
  MOTONIVELADORA: 'Motoniveladora',
  TRATOR_ESTEIRA: 'Trator Esteira',
  ROLO_COMPACTADOR: 'Rolo Compactador',
  VIBROACABADORA: 'Vibroacabadora',
  FRESADORA: 'Fresadora',
  USINA_ASFALTO: 'Usina de Asfalto',
  EMPILHADEIRA: 'Empilhedeira',
  GUINDASTE: 'Guindaste',
  PERFURATRIZ: 'Perfuratriz',
  TRATOR_AGRICOLA: 'Trator Agrícola',
  CAMINHAO_PIPA: 'Caminhão Pipa',
  CAMINHAO_MUNCK: 'Caminhão Munck',
  EQUIPAMENTO_ASFALTO: 'Equipamento Asfalto',
  OUTROS: 'Outros',
};

const EQUIPAMENTOS = [
  'RETROESCAVADEIRA',
  'ESCAVADEIRA_HIDRAULICA',
  'PA_CARREGADEIRA',
  'MOTONIVELADORA',
  'ROLO_COMPACTADOR',
  'TRATOR_ESTEIRA',
  'VIBROACABADORA',
  'FRESADORA',
  'USINA_ASFALTO',
  'EMPILHADEIRA',
  'GUINDASTE',
  'PERFURATRIZ',
  'TRATOR_AGRICOLA',
  'CAMINHAO_PIPA',
  'CAMINHAO_MUNCK',
  'EQUIPAMENTO_ASFALTO'
];

const VeiculoRow = memo(({ 
  veiculo, 
  onDelete,
  EQUIPAMENTOS
}: { 
  veiculo: any, 
  onDelete: (id: string, modelo: string) => void,
  EQUIPAMENTOS: string[]
}) => {
  return (
    <tr className="border-zinc-800 hover:bg-zinc-900/50 transition-all group">
      <td className="p-4 text-sm">
        <div className="inline-flex flex-col min-w-[90px] border border-blue-600/15 rounded-lg overflow-hidden bg-white shadow-md text-zinc-900 leading-tight select-none">
          <div className="bg-blue-600 text-[6px] text-white font-black tracking-widest px-1.5 py-0.5 uppercase flex items-center justify-between gap-1 select-none leading-none">
            <span>BRASIL</span>
            <span className="w-1.5 h-1 bg-yellow-400 rounded-sm italic text-[3px] flex items-center justify-center font-serif text-blue-900 border border-blue-900">BR</span>
          </div>
          <div className="bg-white text-zinc-950 font-black font-mono text-[10px] text-center py-0.5 px-2 tracking-widest uppercase">
            {veiculo.placa}
          </div>
        </div>
      </td>
      <td className="p-4 text-sm">
        <p className="font-black text-white uppercase group-hover:text-orange-500 transition-colors italic leading-none truncate max-w-[200px]">{veiculo.modelo}</p>
        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1 group-hover:text-zinc-500 italic truncate max-w-[200px]">{veiculo.marca}</p>
      </td>
      <td className="p-4 text-sm">
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-zinc-300 uppercase tracking-widest truncate max-w-[150px]">
            {veiculo.cliente?.nome || 'N/A'}
          </span>
          <span className="text-[9px] text-zinc-600 font-mono font-bold mt-0.5">{veiculo.cliente?.telefone || ''}</span>
        </div>
      </td>
      <td className="p-4 text-sm">
         <span className="text-[11px] font-black text-zinc-500 font-mono italic">{veiculo.ano}</span>
      </td>
      <td className="p-4 text-sm">
         <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full border border-zinc-800 shadow-lg" style={{ backgroundColor: veiculo.cor?.toLowerCase() === 'preto' ? '#000' : veiculo.cor?.toLowerCase() === 'branco' ? '#fff' : '#444' }} />
               <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{veiculo.cor}</span>
            </div>
            {EQUIPAMENTOS.includes(veiculo.tipo) ? (
              <span className="text-[10px] font-mono font-black text-orange-500 italic">
                {veiculo.horimetro_atual || 0}h
              </span>
            ) : (
              <span className="text-[10px] font-mono font-black text-blue-500 italic">
                {veiculo.quilometragem?.toLocaleString() || 0} KM
              </span>
            )}
         </div>
      </td>
      <td className="p-4 text-sm text-right font-mono font-bold">
         <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-400 uppercase italic">OS #{veiculo.id?.slice(-4).toUpperCase() || '---'}</span>
            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest leading-none mt-1">{veiculo.updatedAt ? new Date(veiculo.updatedAt).toLocaleDateString('pt-BR') : '---'}</span>
         </div>
      </td>
      <td className="p-4 text-sm text-center">
         <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-2xl italic">
            ATIVO
         </span>
      </td>
      <td className="p-4 text-sm">
         <div className="flex items-center justify-center gap-2">
            <Link href={`/veiculos/${veiculo.id}`} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition shadow-lg">
              <Eye className="w-4 h-4" />
            </Link>
            <Link href={`/veiculos/${veiculo.id}/editar`} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition shadow-lg">
               <Pencil className="w-4 h-4" />
            </Link>
            <button 
              onClick={() => onDelete(veiculo.id, veiculo.modelo)}
              className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition shadow-lg"
            >
               <Trash2 className="w-4 h-4" />
            </button>
         </div>
      </td>
    </tr>
  );
});

VeiculoRow.displayName = 'VeiculoRow';

export default function VeiculosListingPage() {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [veiculosError, setVeiculosError] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [veiculosData, setVeiculosData] = useState<any>({ items: [], total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Debounce search effect (300ms) sem memory leaks
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page to 1 when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, tipoFilter]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const data = await apiFetch('/api/veiculos/stats');
      setStats(data);
      setStatsError(false);
    } catch (err) { 
      console.error(err);
      setStatsError(true);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchVeiculos = useCallback(async () => {
    setLoading(true);
    setVeiculosError(false);
    try {
      const query = new URLSearchParams({
        q: debouncedSearch,
        page: page.toString(),
        limit: '10'
      });
      if (tipoFilter !== 'all') query.append('tipo', tipoFilter);
      
      const data = await apiFetch(`/api/veiculos?${query.toString()}`);
      const items = Array.isArray(data) ? data : (data.items || []);
      const total = data.total || items.length;
      const totalPages = data.totalPages || 1;
      setVeiculosData({ items, total, totalPages });
    } catch (err) { 
      console.error(err);
      setVeiculosError(true);
      handleApiError(err, { defaultMessage: 'Erro ao buscar frota' });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tipoFilter, page]);

  useEffect(() => {
    const loadStats = async () => {
      await fetchStats();
    };
    loadStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchVeiculos();
  }, [fetchVeiculos]);

  const handleDelete = async (id: string, modelo: string) => {
    if (!confirm(`Tem certeza que deseja excluir o veículo "${modelo}"?`)) return;
    
    try {
      await apiFetch(`/api/veiculos/${id}`, { method: 'DELETE' });
      toast.success('Veículo removido da frota');
      fetchVeiculos();
      fetchStats();
    } catch (err: any) {
      handleApiError(err, { defaultMessage: 'Erro de conexão ao excluir veículo' });
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-8 bg-orange-600 rounded-full" />
             <h1 className="text-3xl font-black text-white uppercase tracking-tight">CONTROLE DE FROTA</h1>
          </div>
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none ml-5">GERENCIAMENTO TÉCNICO DE ATIVOS E LOGÍSTICA</p>
        </div>

        <Link 
          href="/veiculos/novo" 
          className="bg-orange-600 hover:bg-orange-500 text-white rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition shadow-lg flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          VINCULAR NOVO VEÍCULO
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-7 animate-pulse h-[140px]" />
          ))
        ) : statsError ? (
          <div className="col-span-full bg-red-500/5 border border-red-500/20 rounded-3xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              <p className="text-[10px] font-mono font-black uppercase tracking-widest">Falha ao carregar indicadores estatísticos</p>
            </div>
            <button onClick={fetchStats} className="text-[10px] font-black text-white hover:bg-zinc-800 uppercase tracking-widest bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 transition">Recarregar</button>
          </div>
        ) : (
          <>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 transition hover:border-orange-500/30 group relative overflow-hidden shadow-xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total de Veículos</p>
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-3xl font-black text-white tracking-tight">{stats?.total || 0}</h3>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-orange-600 shadow-inner">
                   <Truck className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[9px] text-zinc-700 font-black mt-4 uppercase tracking-widest">Frota Catalogada</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 transition hover:border-blue-500/30 group relative overflow-hidden shadow-xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Veículos Ativos</p>
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-3xl font-black text-white tracking-tight">{stats?.ativo || 0}</h3>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-blue-500 shadow-inner">
                   <Activity className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[9px] text-blue-500/60 font-black mt-4 uppercase tracking-widest">Em Operação</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 transition hover:border-green-500/30 group relative overflow-hidden shadow-xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Manutenções Hoje</p>
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-3xl font-black text-white tracking-tight">{stats?.maintToday || 0}</h3>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-green-500 shadow-inner">
                   <Tool className="w-6 h-6" />
                </div>
              </div>
              <p className="text-[9px] text-green-500/60 font-black mt-4 uppercase tracking-widest">Procedimentos Executados</p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 transition hover:border-red-500/30 group relative overflow-hidden shadow-xl">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Em Manutenção</p>
              <div className="flex items-center justify-between relative z-10">
                <h3 className="text-3xl font-black text-red-500 tracking-tight">{stats?.inMaint || 0}</h3>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-red-500 shadow-inner">
                   <Tool className={`w-6 h-6 ${stats?.inMaint > 0 ? "animate-pulse" : ""}`} />
                </div>
              </div>
              <p className="text-[9px] text-red-500/60 font-black mt-4 uppercase tracking-widest">Oficina Ocupada</p>
            </div>
          </>
        )}
      </div>

      {/* Filtros e Listagem */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group w-full">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500 transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <input 
              type="text" 
              placeholder="BUSCAR POR PLACA, MODELO OU CLIENTE..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pl-14 text-sm text-white focus:border-orange-500 outline-none transition uppercase font-black tracking-widest placeholder:text-zinc-800 shadow-inner"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select 
            className="w-full md:w-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500 outline-none focus:border-orange-500 cursor-pointer min-h-[44px]"
            value={tipoFilter}
            onChange={(e) => { setTipoFilter(e.target.value); setPage(1); }}
          >
            <option value="all">TODOS OS TIPOS</option>
            <optgroup label="TRANSPORTE">
              <option value="CAVALO_MECANICO">CAVALO MECÂNICO</option>
              <option value="CAMINHAO_PESADO">CAMINHÃO PESADO</option>
              <option value="CAMINHAO_LEVE">CAMINHÃO LEVE</option>
              <option value="CAMINHONETE">CAMINHONETE</option>
              <option value="VAN">VAN</option>
              <option value="ONIBUS">ÔNIBUS</option>
              <option value="CARRETA">CARRETA</option>
              <option value="UTILITARIO">UTILITÁRIO</option>
            </optgroup>
            <optgroup label="EQUIPAMENTOS">
              <option value="RETROESCAVADEIRA">RETROESCAVADEIRA</option>
              <option value="ESCAVADEIRA_HIDRAULICA">ESCAVADEIRA HIDRÁULICA</option>
              <option value="PA_CARREGADEIRA">PÁ CARREGADEIRA</option>
              <option value="MOTONIVELADORA">MOTONIVELADORA</option>
              <option value="ROLO_COMPACTADOR">ROLO COMPACTADOR</option>
              <option value="TRATOR_ESTEIRA">TRATOR ESTEIRA</option>
              <option value="VIBROACABADORA">VIBROACABADORA</option>
              <option value="FRESADORA">FRESADORA</option>
              <option value="USINA_ASFALTO">USINA DE ASFALTO</option>
              <option value="EMPILHADEIRA">EMPILHADEIRA</option>
              <option value="GUINDASTE">GUINDASTE</option>
              <option value="PERFURATRIZ">PERFURATRIZ</option>
              <option value="TRATOR_AGRICOLA">TRATOR AGRÍCOLA</option>
              <option value="CAMINHAO_PIPA">CAMINHÃO PIPA</option>
              <option value="CAMINHAO_MUNCK">CAMINHÃO MUNCK</option>
              <option value="EQUIPAMENTO_ASFALTO">EQUIPAMENTO ASFALTO</option>
            </optgroup>
            <option value="OUTROS">OUTROS</option>
          </select>
        </div>

        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-700 italic">Varrendo Banco de Dados...</p>
          </div>
        ) : veiculosError ? (
          <div className="p-20 text-center text-zinc-700 italic font-black uppercase tracking-widest text-[10px]">
            Falha na Sincronização da Frota
          </div>
        ) : veiculosData.items.length > 0 ? (
          <>
            {/* Desktop layout: Table */}
            <div className="hidden lg:block w-full overflow-x-auto min-w-0">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="bg-zinc-900/50 text-zinc-400 text-[10px] font-mono uppercase tracking-widest">
                    <th className="p-4 italic">Identificação (Placa)</th>
                    <th className="p-4 italic">Veículo / Configuração</th>
                    <th className="p-4 italic">Proprietário / Titular</th>
                    <th className="p-4 italic">Ano / Modelo</th>
                    <th className="p-4 italic">Cor / Status Atual</th>
                    <th className="p-4 italic text-right">Última OS / Data</th>
                    <th className="p-4 italic text-center">Status Ativo</th>
                    <th className="p-4 italic text-center">Gestão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {veiculosData.items.map((veiculo: any) => (
                    <VeiculoRow 
                      key={veiculo.id} 
                      veiculo={veiculo} 
                      onDelete={handleDelete}
                      EQUIPAMENTOS={EQUIPAMENTOS}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile layout: Premium responsive Cards */}
            <div className="block lg:hidden w-full divide-y divide-zinc-800/40 p-4 space-y-4">
              {veiculosData.items.map((veiculo: any) => (
                <div key={veiculo.id} className="p-5 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-4 hover:border-orange-500/30 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex flex-col min-w-[100px] border border-blue-600/30 rounded-lg overflow-hidden bg-white shadow-md text-zinc-900 leading-tight select-none">
                      <div className="bg-blue-600 text-[6px] text-white font-black tracking-widest px-2 py-0.5 uppercase flex items-center justify-between gap-1 select-none leading-none">
                        <span>BRASIL</span>
                        <span className="w-1.5 h-1 bg-yellow-400 rounded-sm italic text-[3px] flex items-center justify-center font-serif text-blue-900 border border-blue-900">BR</span>
                      </div>
                      <div className="bg-white text-zinc-950 font-black font-mono text-[11px] text-center py-1 px-3 tracking-widest uppercase">
                        {veiculo.placa}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-green-500/10 text-green-400 text-[9px] font-black uppercase tracking-widest rounded-full italic border border-green-500/15">
                      ATIVO
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h4 className="font-black text-white text-base uppercase leading-tight italic truncate max-w-full break-words">{veiculo.modelo}</h4>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">{veiculo.marca} • <span className="font-mono">{veiculo.ano}</span></span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-zinc-850 bg-zinc-900/10 px-3 rounded-xl text-left">
                    <div>
                      <p className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest mb-1">MÉTRICA</p>
                      {EQUIPAMENTOS.includes(veiculo.tipo) ? (
                        <p className="text-xs font-black font-mono text-orange-500 italic">
                          {veiculo.horimetro_atual || 0}h
                        </p>
                      ) : (
                        <p className="text-xs font-black font-mono text-blue-500 italic">
                          {veiculo.quilometragem?.toLocaleString() || 0} KM
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest mb-1">CORES</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full border border-zinc-700 shadow-sm" style={{ backgroundColor: veiculo.cor?.toLowerCase() === 'preto' ? '#000' : veiculo.cor?.toLowerCase() === 'branco' ? '#fff' : '#444' }} />
                        <p className="text-xs font-black text-zinc-300 uppercase tracking-wider">{veiculo.cor || '---'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner (Cliente Proprietário) */}
                  <div className="flex items-center gap-2.5 p-3 bg-zinc-950/60 border border-zinc-850 rounded-xl">
                    <div className="p-1.5 bg-blue-600/15 text-blue-500 rounded-lg">
                      <User size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-none">Proprietário / Titular</p>
                      <p className="text-[11px] font-black text-zinc-300 uppercase tracking-tight mt-1 truncate max-w-full break-words">{veiculo.cliente?.nome || 'Não Vinculado'}</p>
                    </div>
                  </div>

                  {/* Operational status and ID key info */}
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-650 bg-zinc-900/10 px-2.5 py-1.5 rounded-lg border border-zinc-850/50">
                    <span>OS #{veiculo.id?.slice(-4).toUpperCase() || '---'}</span>
                    <span>ATT: {veiculo.updatedAt ? new Date(veiculo.updatedAt).toLocaleDateString() : '---'}</span>
                  </div>

                  {/* Gestão touchscreen targets */}
                  <div className="flex gap-2 pt-2">
                    <Link href={`/veiculos/${veiculo.id}`} className="flex-1 min-h-[44px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider border border-zinc-800 shadow-sm transition-all flex items-center justify-center gap-2">
                      <Eye size={14} /> DETALHES
                    </Link>
                    <Link href={`/veiculos/${veiculo.id}/editar`} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl transition shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center">
                      <Pencil size={15} />
                    </Link>
                    <button 
                      onClick={() => handleDelete(veiculo.id, veiculo.modelo)}
                      className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 border border-zinc-800 rounded-xl transition shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-32 text-center">
            <div className="px-12 py-8 border border-zinc-800 rounded-3xl bg-zinc-900/50 inline-block border-dashed shadow-2xl">
              <Car className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-700 italic">Frota de ativos não localizada</p>
            </div>
          </div>
        )}

        {/* Pagination */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4">
            <p className="text-[10px] font-mono text-zinc-600 uppercase font-black tracking-widest italic">
               SINC: <span className="text-zinc-500">{(page-1)*10+1} — {Math.min(page*10, veiculosData.total)} DE {veiculosData.total} REGISTROS</span>
            </p>
          </div>
          <Pagination 
            page={page} 
            totalPages={veiculosData.totalPages || 0} 
            onPageChange={setPage} 
          />
        </div>
      </section>
    </div>
  );
}
