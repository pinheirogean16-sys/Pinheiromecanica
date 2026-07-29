'use client';

import { useState, useEffect, use, Component, ReactNode, ErrorInfo } from 'react';
import { 
  ArrowLeft, Printer, Trash2, CheckCircle2, XCircle, 
  Camera, FileText, Hash, User, Calendar, ClipboardCheck,
  Loader2, AlertCircle, ExternalLink, Hash as HashIcon,
  AlertTriangle, XOctagon, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// --- ADICIONADO RENDER ERROR BOUNDARY DE SEGURANÇA ---
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary detectou falha no fluxo do frontend:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-zinc-950 border border-red-500/30 rounded-[2rem] m-8 text-center max-w-[800px] mx-auto space-y-6 shadow-2xl">
          <div className="flex justify-center text-red-500">
            <XOctagon size={48} className="animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-white italic uppercase tracking-wider">Falha de Segmentação no Fluxo Visual (React)</h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-mono max-w-[600px] mx-auto">
            O componente de exibição do checklist quebrou devido a um erro de renderização do Next/Client ou incompatibilidade de propriedades de relacionamento.
          </p>
          {this.state.error && (
            <div className="text-left bg-zinc-900 p-6 rounded-2xl border border-zinc-800 text-xs font-mono max-h-60 overflow-y-auto space-y-2">
              <p className="text-red-400 font-bold">Mensagem de Erro: {this.state.error.message}</p>
              <pre className="text-zinc-500 text-[10px] leading-tight">
                {this.state.error.stack}
              </pre>
            </div>
          )}
          <div className="flex justify-center gap-4 pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-500/50 hover:bg-red-500/5 transition-all text-center"
            >
              Forçar Recarregar
            </button>
            <Link 
              href="/checklist"
              className="px-6 py-3 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white transition-all text-center flex items-center gap-2"
            >
              <ArrowLeft size={12} /> Ir Para Listagem
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- FUNÇÃO UNIVERSAL COMPATÍVEL COM MÚLTIPLOS FORMATOS (OBJETO/ARRAY/JSON STRING) ---
function getResposta(itemId: string, respostas: any): any {
  if (!respostas) return null;
  
  let parsed = respostas;
  if (typeof respostas === 'string') {
    try {
      parsed = JSON.parse(respostas);
    } catch (e) {
      console.error('Falha ao parsear respostas como JSON string:', e);
      return null;
    }
  }

  // Se for um Array (Formato B)
  if (Array.isArray(parsed)) {
    const found = parsed.find((item: any) => {
      if (!item) return false;
      return (
        item.itemId === itemId ||
        item.item_id === itemId ||
        item.id_item === itemId ||
        item.id === itemId
      );
    });
    if (found) {
      if (found.valor !== undefined) return found.valor;
      if (found.resposta !== undefined) return found.resposta;
      if (found.value !== undefined) return found.value;
      return found;
    }
    return null;
  }

  // Se for um Objeto (Formato A)
  if (typeof parsed === 'object') {
    return parsed[itemId] !== undefined ? parsed[itemId] : null;
  }

  return null;
}

interface Execucao {
  id: string;
  checklist: {
    nome: string;
    itens: {
      id: string;
      descricao: string;
      tipo: string;
    }[];
  };
  os?: {
    id: string;
    numero: number;
    cliente: { nome: string };
    veiculo: { placa: string; modelo: string };
  };
  respostas: Record<string, any>;
  executado_por: string;
  observacoes: string;
  created_at: string;
  fotos?: {
    id: string;
    url: string;
    item_id: string;
    legenda?: string;
  }[];
}

// Wrapper local para expor a página envelopada no ErrorBoundary
export default function ChecklistResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <ErrorBoundary>
      <ChecklistResultadoContent id={resolvedParams.id} />
    </ErrorBoundary>
  );
}

function ChecklistResultadoContent({ id }: { id: string }) {
  const router = useRouter();
  const [execucao, setExecucao] = useState<Execucao | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<any>(null);

  // LOGS EXIGIDOS: ENTRADA / MOUNT
  useEffect(() => {
    console.log('COMPONENT MOUNT', { id });
  }, [id]);

  // LOGS EXIGIDOS: ESTADOS DO COMPONENTE
  console.log('RENDER INICIADO');
  console.log('LOADING', loading);
  console.log('ERROR', error);
  console.log('EXECUCAO STATE', execucao);

  useEffect(() => {
    let active = true;
    const fetchExecucao = async () => {
      try {
        console.log('BUSCANDO EXECUCAO', id);
        const response = await fetch(`/api/checklist/execucao/${id}`, { credentials: 'include' });
        console.log('STATUS EXECUCAO', response.status);
        
        if (response.ok && active) {
          const data = await response.json();
          console.log('DADOS EXECUCAO RAW', data);
          console.log('CHECKLIST RESPONSE', data);
          console.log('CHECKLIST RESPONSE KEYS', Object.keys(data || {}));
          
          // MAP ATRIBUTOS DE MANEIRA ULTRA ULTRA RESILIENTE
          const checklistObj = data.checklist || data.Checklist;
          const osObj = data.os || data.OrdemServico;
          const fotosObj = data.fotos || data.ChecklistFoto || [];

          let parsedRespostas = data.respostas;
          if (typeof data.respostas === 'string') {
            try {
              parsedRespostas = JSON.parse(data.respostas);
            } catch (err) {
              console.error('Erro ao normalizar respostas json string:', err);
            }
          }

          // Normalização completa (Prisma/Casing flex)
          const normalized: Execucao = {
            ...data,
            respostas: parsedRespostas || {},
            checklist: checklistObj ? {
              nome: checklistObj.nome || 'Checklist sem nome',
              itens: checklistObj.itens || checklistObj.ChecklistItem || []
            } : { nome: 'Checklist sem nome', itens: [] },
            os: osObj ? {
              id: osObj.id,
              numero: osObj.numero,
              cliente: osObj.cliente || osObj.Cliente || { nome: 'Cliente não identificado' },
              veiculo: osObj.veiculo || osObj.Veiculo || { placa: '—', modelo: '—' }
            } : undefined,
            fotos: Array.isArray(fotosObj) ? fotosObj : []
          };

          console.log('DADOS EXECUCAO NORMALIZED', normalized);
          setExecucao(normalized);
        } else if (!response.ok && active) {
          console.log('FALHA STATUS EXECUCAO', response.status);
          const errData = await response.json().catch(() => ({}));
          setError(errData || 'Erro no servidor');
          toast.error('Laudo não encontrado ou erro no servidor.');
        }
      } catch (err: any) {
        console.error('Erro ao buscar resultado:', err);
        if (active) {
          setError(err);
          toast.error('Falha de comunicação com o sistema.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchExecucao();
    return () => { active = false; };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('DESEJA REALMENTE CANCELAR E REMOVER ESTE LAUDO PERMANENTEMENTE?')) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/checklist/execucao/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        toast.success('Laudo removido com sucesso.');
        router.push('/checklist');
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Não foi possível excluir o laudo.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com a API.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-zinc-500 font-black uppercase tracking-[0.4em] italic text-xs">Sincronizando Laudo Técnico...</p>
      </div>
    );
  }

  if (!execucao) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-6">
        <AlertCircle size={64} className="text-zinc-800" />
        <p className="text-zinc-500 font-black uppercase tracking-[0.4em] italic text-xs text-center px-10">Este laudo não existe ou foi removido do inventário técnico</p>
        <Link href="/checklist" className="flex items-center gap-2 bg-zinc-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border border-zinc-800 hover:border-orange-500 transition-all">
          <ArrowLeft size={14} /> VOLTAR PARA LISTAGEM
        </Link>
      </div>
    );
  }

  const { checklist, os, respostas, observacoes, executado_por, created_at, fotos } = execucao;

  console.log('EXECUCAO COMPLETA', execucao);
  console.log('RESPOSTAS RAW', execucao.respostas);
  console.log('TIPO RESPOSTAS', typeof execucao.respostas);

  console.log('RENDER FINALIZADO');

  return (
    <div className="max-w-[900px] mx-auto space-y-12 pb-20 print:p-0 print:m-0 print:max-w-none">
      {/* HEADER LAUDO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div className="flex items-center gap-6">
          <button onClick={() => router.push('/checklist')} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter line-clamp-1">{checklist?.nome || 'Checklist sem nome'}</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">LAUDO TÉCNICO DE INSPEÇÃO</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex-1 md:flex-none bg-zinc-900 border border-zinc-800 hover:border-orange-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl flex items-center justify-center gap-3 italic"
          >
            <Printer size={18} /> IMPRIMIR
          </button>
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition disabled:opacity-50"
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          </button>
        </div>
      </div>

      {/* CABEÇALHO PARA IMPRESSÃO (HIDDEN ON WEB) */}
      <div className="hidden print:flex flex-col border-b-4 border-zinc-900 pb-10 mb-10">
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">{checklist?.nome || 'PROTOCOLO TÉCNICO'}</h1>
               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em]">RELATÓRIO DE CONFORMIDADE OPERACIONAL</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">CÓDIGO LAUDO</p>
                <p className="text-xl font-black text-black font-mono">#{id.slice(-8).toUpperCase()}</p>
            </div>
         </div>
      </div>

      {/* INFO BLOCKS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* CLIENTE / OS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden print:bg-gray-50 print:border-gray-200 print:text-black">
          <div className="flex items-center gap-3 relative mb-6">
            <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
            <h2 className="text-sm font-black text-white print:text-black uppercase italic tracking-tight">Referência Operacional</h2>
            
            {execucao?.os && (
              <Link href={`/os/${execucao.os.id}`} className="ml-auto hidden md:flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 transition-all print:hidden">
                <FileText size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  OS VINCULADA: #{execucao.os.numero}
                </span>
                <ChevronRight size={12} className="text-zinc-600" />
              </Link>
            )}
          </div>
          
          <div className="space-y-4 relative">
             {os ? (
               <div className="grid grid-cols-1 gap-4">
                  <Link href={`/os/${os.id}`} className="block group/oslink print:hidden">
                    <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex items-center justify-between group-hover/oslink:border-orange-500 transition-all">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500"><FileText size={18} /></div>
                          <div>
                             <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Ordem de Serviço</p>
                             <p className="text-xs font-black text-white uppercase italic tracking-tighter">OS #{os.numero}</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-zinc-800 group-hover/oslink:text-orange-500" />
                    </div>
                  </Link>
                  <div className="hidden print:flex bg-white border border-gray-100 p-5 rounded-2xl items-center gap-4">
                     <div className="p-3 bg-gray-100 rounded-xl text-zinc-500"><FileText size={18} /></div>
                     <div>
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Ordem de Serviço</p>
                        <p className="text-xs font-black text-black uppercase italic tracking-tighter">OS #{os.numero}</p>
                     </div>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl print:bg-white print:border-gray-100 flex items-center gap-4">
                     <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500 print:bg-gray-100"><User size={18} /></div>
                     <div>
                        <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Cliente / Solicitante</p>
                        <p className="text-xs font-black text-white print:text-black uppercase italic tracking-tighter truncate max-w-[200px]">{os.cliente?.nome}</p>
                     </div>
                  </div>
               </div>
             ) : (
               <div className="p-10 border-2 border-dashed border-zinc-800 rounded-3xl text-center flex flex-col items-center justify-center gap-2 opacity-50">
                  <AlertCircle size={24} className="text-zinc-700" />
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] italic">Nenhuma OS vinculada</p>
               </div>
             )}
          </div>
        </div>

        {/* EXECUÇÃO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden print:bg-gray-50 print:border-gray-200 print:text-black">
          <div className="flex items-center gap-3 relative mb-6">
            <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
            <h2 className="text-sm font-black text-white print:text-black uppercase italic tracking-tight">Status de Verificação</h2>
          </div>

          <div className="space-y-4 relative">
             <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl print:bg-white print:border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500 print:bg-gray-100"><Calendar size={18} /></div>
                <div>
                   <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Data / Hora Execução</p>
                   <p className="text-xs font-black text-white print:text-black uppercase italic tracking-tighter">
                    {created_at ? new Date(created_at).toLocaleString('pt-BR') : 'DATA INDISPONÍVEL'}
                   </p>
                </div>
             </div>
             <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl print:bg-white print:border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-zinc-900 rounded-xl text-zinc-500 print:bg-gray-100"><User size={18} /></div>
                <div>
                   <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Técnico Responsável</p>
                   <p className="text-xs font-black text-white print:text-black uppercase italic tracking-tighter">{executado_por || 'NÃO INFORMADO'}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* ITENS DO LAUDO */}
      <div className="space-y-10">
         <div className="flex items-center gap-4 px-8 print:px-0">
            <div className="w-12 h-1px bg-zinc-800 flex-1 print:hidden" />
            <h3 className="text-[10px] font-black text-zinc-500 print:text-black uppercase tracking-[0.4em] italic text-center shrink-0">DISCRIMINAÇÃO DE ITENS E RESPOSTAS</h3>
            <div className="w-12 h-1px bg-zinc-800 flex-1 print:hidden" />
         </div>

         <div className="space-y-2 print:space-y-0 print:border print:border-gray-200 print:rounded-lg overflow-hidden">
            {(checklist?.itens || []).map((item, index) => {
              console.log('ITEM', item);
              console.log('ITEM ID', item.id);
              console.log('BUSCANDO RESPOSTA PARA', item.id);
              console.log('OBJETO RESPOSTAS', respostas);

              const resposta = getResposta(item.id, respostas);
              console.log('RESPOSTA ENCONTRADA', resposta);

              const fotosDoItem = fotos?.filter(f => f.item_id === item.id) || [];
              const displayResposta = resposta;
              
              return (
                <div 
                  key={item.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row md:items-center gap-10 hover:border-orange-500/20 transition-all group print:bg-white print:border-b print:border-gray-100 print:rounded-none print:p-6"
                >
                  <div className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 w-14 h-14 rounded-2xl shadow-inner shrink-0 group-hover:bg-orange-500/10 transition-colors print:bg-gray-100 print:border-gray-200">
                     <span className="text-xl font-black text-zinc-800 font-mono italic group-hover:text-orange-500/30 transition-colors print:text-gray-400">{(index + 1).toString().padStart(2, '0')}</span>
                  </div>

                  <div className="flex-1 space-y-2">
                     <h4 className="text-base font-black text-white print:text-black uppercase italic tracking-tight leading-tight truncate">{item?.descricao || 'Item'}</h4>
                     <p className="text-[8px] text-zinc-600 print:text-gray-400 font-black uppercase tracking-widest leading-none">Tipo: {item.tipo?.replace('_', ' ') || 'INDET.'}</p>
                  </div>

                  <div className={`shrink-0 ${item.tipo === 'FOTO' ? 'md:flex-1' : 'md:w-64'} flex flex-col items-center md:items-end`}>
                    {item.tipo === 'SIM_NAO' ? (
                       <div className="flex items-center gap-4">
                          {displayResposta === 'OK' || displayResposta === true ? (
                             <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 font-black uppercase tracking-widest text-[10px] italic print:bg-white print:border-green-500">
                                <CheckCircle2 size={16} /> OK / CONFORME
                             </div>
                          ) : displayResposta === 'MEDIO' ? (
                             <div className="flex items-center gap-3 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 font-black uppercase tracking-widest text-[10px] italic print:bg-white print:border-yellow-500">
                                <AlertTriangle size={16} /> MÉDIO / REPARO
                             </div>
                          ) : displayResposta === 'RUIM' || displayResposta === false ? (
                             <div className="flex items-center gap-3 px-6 py-3 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 font-black uppercase tracking-widest text-[10px] italic print:bg-white print:border-orange-500">
                                <AlertCircle size={16} /> RUIM / ALERTA
                             </div>
                          ) : displayResposta === 'CRITICO' ? (
                             <div className="flex items-center gap-3 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 font-black uppercase tracking-widest text-[10px] italic print:bg-white print:border-red-500">
                                <XOctagon size={16} /> CRÍTICO / RISCO
                             </div>
                          ) : (
                            <div className="text-zinc-700 italic font-black uppercase text-[10px] tracking-widest">SEM RESPOSTA</div>
                          )}
                       </div>
                    ) : item.tipo === 'FOTO' ? (
                       <div className="flex flex-wrap gap-3">
                          {fotosDoItem.length > 0 ? (
                             fotosDoItem.map((foto: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className="relative group cursor-pointer" 
                                  onClick={() => {
                                    const url = typeof foto === 'string' ? foto : foto?.url;
                                    if (url) window.open(url, '_blank');
                                  }}
                                >
                                  <img 
                                    src={typeof foto === 'string' ? foto : foto?.url} 
                                    alt={`Foto ${idx + 1}`} 
                                    className="w-28 h-24 object-cover flex-shrink-0 rounded-2xl border border-zinc-800 hover:scale-105 transition-transform" 
                                  />
                                  {foto.legenda && <p className="text-[8px] text-zinc-500 mt-1 text-center font-black uppercase tracking-widest">{foto.legenda}</p>}
                                </div>
                              ))
                          ) : (
                            <div className="flex items-center gap-2 text-zinc-700 font-black uppercase italic text-[9px] tracking-widest justify-center md:justify-end">
                               <Camera size={14} /> NENHUM REGISTRO
                            </div>
                          )}
                       </div>
                    ) : item.tipo === 'NUMERICO' ? (
                       <div className="flex flex-col items-end">
                          <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-1">Valor Medido</span>
                          <div className="flex items-center gap-3">
                             <HashIcon size={18} className="text-zinc-800" />
                             <span className="text-2xl font-black text-white print:text-black font-mono italic">{displayResposta !== null ? displayResposta : '---'}</span>
                          </div>
                       </div>
                    ) : (
                       <div className="flex flex-col items-end max-w-xs">
                          <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest mb-2">Relato Técnico</span>
                          <p className="text-[10px] text-zinc-300 print:text-black font-bold uppercase tracking-widest leading-relaxed bg-zinc-950 p-4 rounded-xl border border-zinc-900 group-hover:border-orange-500/20 transition-colors print:bg-white print:border-gray-200 line-clamp-3">
                             {displayResposta || 'NENHUMA DESCRIÇÃO INFORMADA'}
                          </p>
                       </div>
                    )}
                  </div>
                </div>
              );
            })}
         </div>

         {/* OBSERVACOES FINAIS */}
         {observacoes && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 space-y-6 print:bg-white print:border-gray-200 print:rounded-lg">
               <div className="flex items-center gap-3">
                  <div className="w-1.5 h-4 bg-zinc-600 rounded-full" />
                  <h2 className="text-sm font-black text-white print:text-black uppercase italic tracking-tight">Parecer Técnico Final</h2>
               </div>
               <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-3xl text-[11px] text-zinc-400 print:text-black font-bold uppercase tracking-[0.2em] leading-relaxed italic print:bg-white print:border-none print:p-0 line-clamp-3">
                  {observacoes}
               </div>
            </div>
         )}
      </div>

      {/* FOOTER ASSINATURA (ONLY IN PRINT) */}
      <div className="hidden print:grid grid-cols-2 gap-20 pt-20">
          <div className="border-t border-black pt-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest">Assinatura do Técnico</p>
              <p className="text-[8px] text-zinc-500 mt-1">{executado_por || 'Técnico Não Identificado'}</p>
          </div>
          <div className="border-t border-black pt-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest">Assinatura do Cliente / Responsável</p>
              <p className="text-[8px] text-zinc-500 mt-1">Data: {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
      </div>
    </div>
  );
}
