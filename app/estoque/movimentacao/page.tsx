'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Search, 
  Plus, 
  History,
  Package,
  FileText,
  Clock,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

interface Peca {
  id: string;
  codigo: string;
  descricao: string;
  quantidade: number;
}

interface OS {
  id: string;
  numero: number;
  status: string;
}

interface Movimentacao {
  id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivo: string;
  observacao?: string;
  created_at: string;
  peca: {
    descricao: string;
    codigo: string;
  };
  os?: {
    numero: number;
  };
  usuario_id: string;
}

const MOTIVOS_ENTRADA = ['COMPRA', 'DEVOLUCAO', 'AJUSTE'];
const MOTIVOS_SAIDA = ['VENDA', 'USO_INTERNO', 'OS', 'PERDA', 'AJUSTE'];

const ITEMS_PER_PAGE_HIST = 10;

export default function MovimentacaoEstoquePage() {
  // Estados do formulário
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [pecaId, setPecaId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState(MOTIVOS_ENTRADA[0]);
  const [osId, setOsId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Função para trocar tipo e resetar motivo
  const handleTipoChange = (novoTipo: 'ENTRADA' | 'SAIDA') => {
    setTipo(novoTipo);
    setMotivo(novoTipo === 'ENTRADA' ? MOTIVOS_ENTRADA[0] : MOTIVOS_SAIDA[0]);
    setOsId(''); // limpa OS ao trocar tipo
  };

  // Estados de dados
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchPeca, setSearchPeca] = useState('');
  
  // Paginação do histórico
  const [histPage, setHistPage] = useState(1);
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [histTotal, setHistTotal] = useState(0);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const histParams = new URLSearchParams({
        page: histPage.toString(),
        limit: ITEMS_PER_PAGE_HIST.toString(),
      });

      const [pecasData, osData, histData] = await Promise.all([
        apiFetch<any>('/api/pecas?limit=100', { signal }).catch(() => ({ items: [] })),
        apiFetch<any>('/api/ordens?limit=100', { signal }).catch(() => ({ items: [] })),
        apiFetch<any>(`/api/estoque/movimentacao?${histParams.toString()}`, { signal }),
      ]);

      setPecas(Array.isArray(pecasData) ? pecasData : (pecasData.items || []));
      
      const ordensLista = Array.isArray(osData) ? osData : (osData.items || []);
      // Filtra OS ativas (ABERTA, EM_DIAGNOSTICO, AGUARDANDO_PECAS, EM_EXECUCAO, AGUARDANDO_APROVACAO)
      const ativas = ordensLista.filter((o: any) => 
        ['ABERTA', 'EM_DIAGNOSTICO', 'AGUARDANDO_PECAS', 'EM_EXECUCAO', 'AGUARDANDO_APROVACAO'].includes(o.status)
      );
      setOrdens(ativas);

      // ✅ CORRIGIDO: tratando resposta paginada
      const histItems = Array.isArray(histData) ? histData : (histData.items || []);
      const histTotal = typeof histData?.total === 'number' ? histData.total : histItems.length;
      const histTotalPages = Math.max(1, histData?.totalPages || 1);
      
      setHistorico(histItems);
      setHistTotal(histTotal);
      setHistTotalPages(histTotalPages);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
      handleApiError(err, { defaultMessage: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  }, [histPage]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    
    if (!pecaId || !quantidade || !motivo) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (motivo === 'OS' && !osId) {
      toast.error('Selecione a Ordem de Serviço');
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch('/api/estoque/movimentacao', {
        method: 'POST',
        body: {
          peca_id: pecaId,
          tipo,
          quantidade: parseInt(quantidade),
          motivo,
          os_id: osId || null,
          observacao
        }
      });

      toast.success('Movimentação registrada com sucesso!');
      
      // Limpar formulário
      setPecaId('');
      setQuantidade('');
      setOsId('');
      setObservacao('');
      setSearchPeca('');
      
      // Voltar para a primeira página e recarregar
      setHistPage(1);
      fetchData();
    } catch (error: any) {
      handleApiError(error, { defaultMessage: 'Erro ao registrar movimentação' });
    } finally {
      setIsSaving(false);
    }
  }

  const pecasFiltradas = pecas.filter(p => 
    p.descricao.toLowerCase().includes(searchPeca.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchPeca.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 overflow-hidden">
      
      {/* ============================================================ */}
      {/* FORMULÁRIO (1/3) */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-zinc-100 uppercase tracking-wider text-sm">Nova Movimentação</h2>
          </div>

          <form onSubmit={handleSalvar} className="p-5 space-y-4">
            {/* Toggle Tipo */}
            <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => handleTipoChange('ENTRADA')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  tipo === 'ENTRADA' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" />
                ENTRADA
              </button>
              <button
                type="button"
                onClick={() => handleTipoChange('SAIDA')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  tipo === 'SAIDA' 
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <ArrowDownCircle className="w-4 h-4" />
                SAÍDA
              </button>
            </div>

            {/* Seleção de Peça */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                <Package className="w-3 h-3" /> Peça
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="text"
                  placeholder="Pesquisar peça..."
                  value={searchPeca}
                  onChange={(e) => setSearchPeca(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-700"
                />
              </div>
              <select
                value={pecaId}
                onChange={(e) => setPecaId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="">Selecione a peça...</option>
                {pecasFiltradas.map(p => (
                  <option key={p.id} value={p.id}>
                    ({p.codigo}) {p.descricao} - Est: {p.quantidade}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade e Motivo */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Qtd</label>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-700"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase">Motivo</label>
                <select
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
                >
                  {(tipo === 'ENTRADA' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA).map(m => (
                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* OS condicional */}
            {motivo === 'OS' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                  <FileText className="w-3 h-3" /> Ordem de Serviço
                </label>
                <select
                  value={osId}
                  onChange={(e) => setOsId(e.target.value)}
                  className="w-full bg-zinc-950 border border-orange-500/30 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Selecione a OS...</option>
                  {ordens.map(o => (
                    <option key={o.id} value={o.id}>OS #{o.numero} - {o.status}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Observação */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase">Observação</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-zinc-200 focus:outline-none focus:border-orange-500/50 transition-colors placeholder:text-zinc-700"
                placeholder="Detalhes adicionais..."
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-900/20 active:scale-[0.98] cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
              {isSaving ? 'SALVANDO...' : 'REGISTRAR'}
            </button>
          </form>
        </div>
      </div>

      {/* ============================================================ */}
      {/* HISTÓRICO (2/3) */}
      {/* ============================================================ */}
      <div className="flex-1">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-zinc-100 uppercase tracking-wider text-sm">Histórico Recente</h2>
            </div>
            <button 
              onClick={() => fetchData()}
              disabled={loading}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              title="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                <p className="text-sm font-medium text-zinc-500">Sincronizando histórico...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertCircle className="w-12 h-12 text-red-500/60" />
                <p className="text-sm font-medium text-zinc-500">Falha na sincronização</p>
                <button 
                  onClick={() => fetchData()}
                  className="text-orange-500 text-xs font-black uppercase tracking-widest hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-3">
                <AlertCircle className="w-12 h-12 opacity-40" />
                <p className="text-sm font-medium text-zinc-500">Nenhuma movimentação encontrada</p>
              </div>
            ) : (
              <>
                {/* HISTÓRICO DESKTOP (TABELA) */}
                <div className="hidden md:block w-full overflow-x-auto rounded-xl">
                  <table className="w-full min-w-[700px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase font-bold bg-zinc-950/50">
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3 text-right">Qtd</th>
                        <th className="px-4 py-3">Motivo</th>
                        <th className="px-4 py-3">OS/Doc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {historico.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-zinc-300">
                                {new Date(item.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-[10px] opacity-60">
                                {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.tipo === 'ENTRADA' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {item.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-col">
                              <span className="text-zinc-200 font-medium truncate max-w-[150px] lg:max-w-xs" title={item.peca?.descricao}>
                                {item.peca?.descricao || '---'}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                {item.peca?.codigo || '---'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-bold text-zinc-300">
                            {item.quantidade}
                          </td>
                          <td className="px-4 py-3 text-[10px] font-bold text-zinc-400 uppercase">
                            {item.motivo?.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {item.os ? (
                              <span className="inline-flex items-center gap-1 text-orange-500/80 font-bold text-xs bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/10">
                                <FileText className="w-3 h-3" />
                                #{item.os.numero}
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* HISTÓRICO MOBILE (TIMELINE COMPACTA) */}
                <div className="block md:hidden divide-y divide-zinc-800/40 w-full max-w-full overflow-hidden min-w-0">
                  {historico.map((item) => (
                    <div key={item.id} className="p-4 space-y-3.5 hover:bg-zinc-900/10 transition-all min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                          item.tipo === 'ENTRADA' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {item.tipo}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500 font-bold shrink-0">
                          <Clock size={10} />
                          <span>{new Date(item.created_at).toLocaleDateString('pt-BR')} {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-[13px] font-black text-white uppercase italic leading-snug truncate" title={item.peca?.descricao}>
                          {item.peca?.descricao || '---'}
                        </h4>
                        <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase">
                          Ref Cod: {item.peca?.codigo || '---'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono pt-2 border-t border-zinc-900/40">
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Quantidade</p>
                          <p className={`text-sm font-black italic ${item.tipo === 'ENTRADA' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.tipo === 'ENTRADA' ? '+' : '-'}{item.quantidade} un
                          </p>
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Motivação</p>
                          <p className="text-zinc-300 font-bold uppercase truncate">{item.motivo?.replace('_', ' ')}</p>
                        </div>
                      </div>

                      {item.os && (
                        <div className="bg-zinc-950/50 border border-zinc-800 p-2.5 rounded-lg flex items-center justify-between gap-4">
                          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Vinculado à OS</span>
                          <span className="inline-flex items-center gap-1 text-orange-500 font-black text-[10px] bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/10">
                            <FileText size={10} />
                            #{item.os.numero}
                          </span>
                        </div>
                      )}

                      {item.observacao && (
                        <div className="text-[10px] bg-zinc-950/20 border-l-2 border-zinc-700/50 pl-3 py-1 font-mono italic text-zinc-500 break-words">
                          {item.observacao}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ✅ NOVO: Paginação do histórico */}
          {!loading && !error && historico.length > 0 && histTotalPages > 1 && (
            <div className="p-4 border-t border-zinc-800 bg-zinc-950/20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <p className="text-[9px] font-mono text-zinc-500 uppercase font-bold tracking-widest text-center md:text-left">
                  Mostrando {(histPage - 1) * ITEMS_PER_PAGE_HIST + 1} a {Math.min(histPage * ITEMS_PER_PAGE_HIST, histTotal)} de {histTotal}
                </p>
                <Pagination 
                  page={histPage} 
                  totalPages={histTotalPages} 
                  onPageChange={setHistPage} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
