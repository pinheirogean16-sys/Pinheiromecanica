'use client';

import { useState, useEffect, use, useCallback, Component, ReactNode, ErrorInfo } from 'react';
import { 
  ArrowLeft, Printer, Trash2, CheckCircle2, XCircle, 
  Camera, FileText, User, Calendar, Loader2, AlertCircle, 
  ExternalLink, Hash, AlertTriangle, XOctagon, Maximize2, 
  RefreshCw, ChevronLeft, X, ChevronRight, PenTool
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; error?: Error; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };
  public static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { hasError: true, error }; }
  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-zinc-950 border border-red-500/30 rounded-[2rem] m-8 text-center max-w-[800px] mx-auto space-y-6 shadow-2xl">
          <div className="flex justify-center text-red-500"><XOctagon size={48} className="animate-pulse" /></div>
          <h2 className="text-lg font-black text-white italic uppercase tracking-wider">Falha de Renderização</h2>
          <div className="flex justify-center gap-4 pt-4">
            <button onClick={() => window.location.reload()} className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-500/50 transition-all">Recarregar</button>
            <Link href="/checklist" className="px-6 py-3 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all flex items-center gap-2"><ArrowLeft size={12} /> Voltar</Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function getResposta(itemId: string, respostas: any): any {
  if (!respostas) return null;
  let parsed = respostas;
  if (typeof respostas === 'string') {
    try { parsed = JSON.parse(respostas); } catch { return null; }
  }
  if (Array.isArray(parsed)) {
    const found = parsed.find((item: any) => item.itemId === itemId || item.item_id === itemId || item.id_item === itemId || item.id === itemId);
    if (found) return found.valor !== undefined ? found.valor : (found.resposta !== undefined ? found.resposta : found.value);
    return null;
  }
  if (typeof parsed === 'object') return parsed[itemId] !== undefined ? parsed[itemId] : null;
  return null;
}

interface Execucao {
  id: string;
  checklist: { nome: string; itens: { id: string; descricao: string; tipo: string; }[]; };
  os?: { id: string; numero: number; cliente: { nome: string }; veiculo: { placa: string; modelo: string }; };
  respostas: Record<string, any>;
  executado_por: string;
  observacoes: string;
  created_at: string;
  fotos?: { id: string; url: string; item_id: string; legenda?: string; }[];
}

export default function ChecklistResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ErrorBoundary><ChecklistResultadoContent id={resolvedParams.id} /></ErrorBoundary>;
}

function ChecklistResultadoContent({ id }: { id: string }) {
  const router = useRouter();
  const [execucao, setExecucao] = useState<Execucao | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [galeria, setGaleria] = useState<{ fotos: { url: string; legenda?: string }[]; indice: number; } | null>(null);

  const fetchExecucao = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true);
      const response = await fetch(`/api/checklist/execucao/${id}`, { credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      
      if (!response.ok) {
        if (!silent) toast.error('Laudo não encontrado.');
        return null;
      }
      
      const data = await response.json();
      const checklistObj = data.checklist || data.Checklist;
      const osObj = data.os || data.OrdemServico;
      const fotosObj = data.fotos || data.ChecklistFoto || [];
      let parsedRespostas = data.respostas;
      if (typeof data.respostas === 'string') { try { parsedRespostas = JSON.parse(data.respostas); } catch { parsedRespostas = {}; } }

      const normalized: Execucao = {
        ...data,
        respostas: parsedRespostas || {},
        checklist: checklistObj ? { nome: checklistObj.nome || 'Checklist', itens: checklistObj.itens || checklistObj.ChecklistItem || [] } : { nome: 'Checklist', itens: [] },
        os: osObj ? { id: osObj.id, numero: osObj.numero, cliente: osObj.cliente || osObj.Cliente || { nome: 'Cliente' }, veiculo: osObj.veiculo || osObj.Veiculo || { placa: '—', modelo: '—' } } : undefined,
        fotos: Array.isArray(fotosObj) ? fotosObj : [],
      };

      setExecucao(normalized);
      return normalized;
    } catch {
      if (!silent) toast.error('Falha de comunicação.');
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchExecucao(false); }, [fetchExecucao]);

  useEffect(() => {
    if (!galeria) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGaleria(null);
      if (e.key === 'ArrowRight' && galeria.indice < galeria.fotos.length - 1) setGaleria({ ...galeria, indice: galeria.indice + 1 });
      if (e.key === 'ArrowLeft' && galeria.indice > 0) setGaleria({ ...galeria, indice: galeria.indice - 1 });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galeria]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/checklist/execucao/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast.success('Laudo removido.'); router.push('/checklist'); }
      else { toast.error('Não foi possível excluir.'); }
    } catch { toast.error('Erro ao conectar.'); }
    finally { setDeleting(false); setShowDeleteModal(false); }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 space-y-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] italic">Carregando Laudo...</p>
      </div>
    );
  }

  if (!execucao) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-zinc-950 space-y-4 text-white">
        <AlertCircle size={48} className="text-red-500" />
        <h2 className="text-lg font-black uppercase italic">Laudo não encontrado</h2>
        <Link href="/checklist" className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest hover:border-orange-500 transition">Voltar</Link>
      </div>
    );
  }

  const { checklist, os, respostas, observacoes, executado_por, created_at, fotos } = execucao;
  
  // Busca metadados salvos
  const metaTipoVeiculo = respostas['__meta_tipo_veiculo'] || 'NÃO INFORMADO';
  const metaVeredito = respostas['__meta_veredito_laudo'] || 'CONFORME';
  const metaAssinatura = respostas['__meta_assinatura_digital'];

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 py-8 pb-24 text-white bg-zinc-950 min-h-screen print:bg-white print:text-black print:p-0">
      
      {/* HEADER DA PÁGINA (Oculto na impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/checklist')} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter truncate max-w-[300px] sm:max-w-md">{checklist?.nome}</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Laudo Técnico de Inspeção</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setRefreshing(true); fetchExecucao(true).then(() => setRefreshing(false)); }} disabled={refreshing} className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-orange-500 rounded-xl transition">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => window.print()} className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-500 text-white px-6 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition shadow-lg flex items-center justify-center gap-2">
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* CABEÇALHO DO DOCUMENTO (Visível apenas na impressão) */}
      <div className="hidden print:flex justify-between items-end border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase">{checklist?.nome}</h1>
          <p className="text-sm font-bold uppercase tracking-widest text-gray-600">Relatório de Inspeção Veicular</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-gray-500">CÓDIGO DO LAUDO</p>
          <p className="text-xl font-black font-mono">#{id.slice(-8).toUpperCase()}</p>
        </div>
      </div>

      {/* INFORMAÇÕES GERAIS (Grid Unificado) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden mb-8 shadow-xl print:bg-white print:border-gray-300 print:rounded-none">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800 print:divide-gray-300">
          
          {/* Lado Esquerdo: Cliente e OS */}
          <div className="p-6 space-y-4">
            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2 print:text-black">
              <FileText size={14} /> Referência Operacional
            </h3>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Ordem de Serviço</p>
              <p className="text-sm font-bold font-mono">{os ? `OS #${os.numero}` : 'Nenhuma OS vinculada'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Cliente</p>
              <p className="text-sm font-bold uppercase">{os?.cliente?.nome || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Especificador</p>
              <p className="text-sm font-bold uppercase">{metaTipoVeiculo}</p>
            </div>
          </div>

          {/* Lado Direito: Data e Técnico */}
          <div className="p-6 space-y-4">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 print:text-black">
              <Calendar size={14} /> Status de Verificação
            </h3>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Data de Execução</p>
              <p className="text-sm font-bold font-mono">{new Date(created_at).toLocaleString('pt-BR')}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Técnico Responsável</p>
              <p className="text-sm font-bold uppercase">{executado_por}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Veredito Final</p>
              <p className={`text-sm font-black uppercase ${metaVeredito === 'CONFORME' ? 'text-green-500 print:text-black' : 'text-red-500 print:text-black'}`}>
                {metaVeredito === 'CONFORME' ? 'Aprovado / Conforme' : 'Reprovado / Não Conforme'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ITENS DO CHECKLIST */}
      <div className="space-y-3 mb-10 print:space-y-2">
        <div className="flex items-center gap-4 mb-6 print:mb-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 print:text-black">Discriminação de Itens</h2>
          <div className="flex-1 h-px bg-zinc-800 print:bg-gray-300" />
        </div>

        {checklist?.itens.map((item, index) => {
          const resposta = getResposta(item.id, respostas);
          const fotosDoItem = fotos?.filter(f => f.item_id === item.id) || [];
          
          // Cor da borda baseada na resposta
          let borderColor = 'border-l-zinc-600';
          if (resposta === 'OK' || resposta === true) borderColor = 'border-l-green-500';
          else if (resposta === 'MEDIO') borderColor = 'border-l-yellow-500';
          else if (resposta === 'RUIM' || resposta === false) borderColor = 'border-l-orange-500';
          else if (resposta === 'CRITICO') borderColor = 'border-l-red-500';

          return (
            <div 
              key={item.id} 
              className={`bg-zinc-900 border border-zinc-800 border-l-4 ${borderColor} rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm print:border-gray-300 print:border-l-gray-500 print:rounded-none print:border-b-0 print:border-l-2 print:py-3`}
            >
              
              <div className="flex items-start gap-4 flex-1">
                <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 print:hidden">
                  <span className="text-[10px] font-black text-zinc-400 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide print:text-black print:font-black">{item.descricao}</h3>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-0.5 print:text-gray-500">Tipo: {item.tipo.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="shrink-0 sm:w-64 flex justify-start sm:justify-end print:w-48">
                
                {/* Resposta SIM/NAO */}
                {item.tipo === 'SIM_NAO' && (
                  <div>
                    {resposta === 'OK' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase rounded-lg print:bg-white print:border-green-500 print:text-black">
                        <CheckCircle2 size={14} /> OK / Conforme
                      </span>
                    ) : resposta === 'MEDIO' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase rounded-lg print:bg-white print:border-yellow-500 print:text-black">
                        <AlertTriangle size={14} /> Médio
                      </span>
                    ) : resposta === 'RUIM' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase rounded-lg print:bg-white print:border-orange-500 print:text-black">
                        <AlertCircle size={14} /> Ruim
                      </span>
                    ) : resposta === 'CRITICO' ? (
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase rounded-lg print:bg-white print:border-red-500 print:text-black">
                        <XOctagon size={14} /> Crítico
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-600 italic font-bold uppercase tracking-widest">Sem resposta</span>
                    )}
                  </div>
                )}

                {/* Resposta FOTO */}
                {item.tipo === 'FOTO' && (
                  <div className="flex gap-2">
                    {fotosDoItem.length > 0 ? (
                      fotosDoItem.map((foto, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            const urls = fotosDoItem.map(f => ({ url: f.url, legenda: f.legenda }));
                            setGaleria({ fotos: urls, indice: idx });
                          }}
                          className="relative group cursor-pointer print:hidden"
                        >
                          <img src={foto.url} alt="Foto" className="w-16 h-12 sm:w-20 sm:h-16 object-cover rounded-lg border border-zinc-700 group-hover:scale-105 transition" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center">
                            <Maximize2 size={16} className="text-white" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-zinc-600 italic font-bold uppercase flex items-center gap-1"><Camera size={12}/> Sem foto</span>
                    )}
                    {/* Print foto */}
                    <div className="hidden print:block text-xs font-bold text-gray-500">
                      {fotosDoItem.length > 0 ? `${fotosDoItem.length} foto(s) anexada(s)` : 'Sem foto'}
                    </div>
                  </div>
                )}

                {/* Resposta NUMÉRICA */}
                {(item.tipo === 'NUMERICO' || item.tipo === 'NUMERO') && (
                  <div className="text-left sm:text-right">
                    <span className="block text-[8px] text-zinc-500 uppercase tracking-widest mb-0.5 print:text-gray-500">Valor Medido</span>
                    <span className="text-xl font-black text-white font-mono print:text-black">
                      {resposta || '---'}
                    </span>
                  </div>
                )}

                {/* Resposta TEXTO */}
                {item.tipo === 'TEXTO' && (
                  <div className="w-full text-left sm:text-right bg-zinc-950 p-3 rounded-lg border border-zinc-800 print:bg-white print:border-none print:p-0">
                    <p className="text-[10px] text-zinc-300 font-bold uppercase tracking-widest leading-relaxed line-clamp-3 print:text-black print:italic">
                      {resposta || 'Nenhuma descrição informada'}
                    </p>
                  </div>
                )}

              </div>
            </div>
          );
        })}
      </div>

      {/* PARECER TÉCNICO E ASSINATURA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-10">
        
        {/* Parecer */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 print:bg-white print:border-gray-300 print:rounded-none">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2 print:text-black">
            <FileText size={14} /> Parecer Técnico Final
          </h3>
          <p className="text-xs text-zinc-300 font-medium leading-relaxed print:text-black">
            {observacoes || 'Nenhuma observação adicional registrada.'}
          </p>
        </div>

        {/* Assinatura Digital */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-end items-center print:bg-white print:border-gray-300 print:rounded-none print:p-0">
          {metaAssinatura ? (
            <img src={metaAssinatura} alt="Assinatura do Técnico" className="h-24 object-contain mb-2" />
          ) : (
            <div className="h-24 flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase tracking-widest print:hidden">
              Sem assinatura digital
            </div>
          )}
          <div className="w-full border-t border-zinc-700 print:border-black mt-2 pt-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-white print:text-black">{executado_por}</p>
            <p className="text-[8px] text-zinc-500 uppercase tracking-wider print:text-gray-500">Assinatura do Técnico Responsável</p>
          </div>
        </div>
      </div>

      {/* RODAPÉ DE IMPRESSÃO */}
      <div className="hidden print:block mt-12 text-center border-t border-gray-300 pt-4">
        <p className="text-[9px] text-gray-500 uppercase tracking-widest">Documento gerado eletronicamente pelo sistema VEHLOX.</p>
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Data de Emissão: {new Date().toLocaleString('pt-BR')}</p>
      </div>

      {/* LIGHTBOX DE FOTO */}
      {galeria && galeria.fotos[galeria.indice] && (
        <div className="fixed inset-0 z-[999999] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 print:hidden" onClick={() => setGaleria(null)}>
          <button onClick={(e) => { e.stopPropagation(); setGaleria(null); }} className="absolute top-6 right-6 p-3 bg-zinc-900 border border-zinc-700 text-white rounded-2xl hover:bg-red-600 transition z-10"><X size={24} /></button>
          {galeria.fotos.length > 1 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-full text-white text-xs font-black tracking-widest">{galeria.indice + 1} / {galeria.fotos.length}</div>
          )}
          {galeria.indice > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setGaleria({ ...galeria, indice: galeria.indice - 1 }); }} className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-zinc-900/80 border border-zinc-700 text-white rounded-2xl hover:bg-orange-600 transition"><ChevronLeft size={28} /></button>
          )}
          {galeria.indice < galeria.fotos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setGaleria({ ...galeria, indice: galeria.indice + 1 }); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-zinc-900/80 border border-zinc-700 text-white rounded-2xl hover:bg-orange-600 transition"><ChevronRight size={28} /></button>
          )}
          <div className="max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img src={galeria.fotos[galeria.indice].url} alt="Foto" className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl" />
            <a href={galeria.fotos[galeria.indice].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition" onClick={(e) => e.stopPropagation()}><ExternalLink size={14} /> Baixar Original</a>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSÃO */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl p-6 text-center space-y-5">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-xl font-black text-white uppercase">Excluir Laudo?</h3>
            <p className="text-sm text-zinc-400">Esta ação apagará permanentemente este relatório.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-[10px] font-black uppercase">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
