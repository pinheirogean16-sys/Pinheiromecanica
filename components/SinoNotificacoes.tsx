'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, Trash2, X, ExternalLink, Loader2, BellOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export default function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const notificacoesRef = useRef<Notificacao[]>([]);
  const ultimaNotificacaoIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const backoffRef = useRef<number>(0); // ✅ NOVO: Controle de Backoff para 429

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateNotificacoes = (lista: Notificacao[]) => {
    notificacoesRef.current = lista;
    setNotificacoes(lista);
  };

  const updateUltimaNotificacaoId = (id: string | null) => {
    ultimaNotificacaoIdRef.current = id;
  };

  const fetchNotificacoes = useCallback(async () => {
    // Se estivermos em backoff (bloqueados), não faz a chamada
    if (backoffRef.current > Date.now()) return;

    // Cancela requisição anterior se ainda estiver pendente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = `/api/notificacoes?limit=10`;
      const res = await fetch(url, { 
        credentials: 'include',
        signal: controller.signal 
      });

      // ✅ NOVO: Se tomar bloqueio (429), ativa backoff de 2 minutos
      if (res.status === 429) {
        console.warn('Rate limit atingido nas notificações. Pausando por 2 minutos.');
        backoffRef.current = Date.now() + 120000; 
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.items || []);
        
        const currentUltimaId = ultimaNotificacaoIdRef.current;
        const currentNotificacoes = notificacoesRef.current;

        // Detectar novas notificações para mostrar toast
        if (currentUltimaId && lista.length > 0) {
          const novidades = lista.filter((n: any) => 
            !n.lida && 
            n.id !== currentUltimaId && 
            new Date(n.created_at) > new Date(currentNotificacoes[0]?.created_at || 0)
          );
          novidades.forEach((n: any) => {
             toast.info(n.titulo, {
              description: n.mensagem,
              duration: 5000,
             });
          });
        }

        updateNotificacoes(lista);
        if (lista.length > 0) {
          updateUltimaNotificacaoId(lista[0].id);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // silencioso para erros de rede normais
      }
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial após montar
    const timer = setTimeout(() => {
      fetchNotificacoes();
    }, 100);

    // ✅ NOVO: Intervalo aumentado para 60 segundos (evita rate limit)
    const interval = setInterval(() => {
      fetchNotificacoes();
    }, 60000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchNotificacoes]);

  // Fechar com a tecla Escape
  useEffect(() => {
    if (!aberto) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto]);

  const nLidas = notificacoes.filter(n => !n.lida).length;

  const marcarLida = async (id: string, link?: string | null) => {
    try {
      await fetch(`/api/notificacoes/${id}`, { 
        method: 'PATCH',
        credentials: 'include'
      });
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
      
      if (link) {
        setAberto(false);
        router.push(link);
      }
    } catch (error) {
      toast.error('Erro ao marcar como lida');
    }
  };

  const excluirNotificacao = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/notificacoes/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      setNotificacoes(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação excluída');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const marcarTodasLidas = async () => {
    try {
      const promises = notificacoes
        .filter(n => !n.lida)
        .map(n => fetch(`/api/notificacoes/${n.id}`, { method: 'PATCH', credentials: 'include' }));
      
      await Promise.all(promises);
      setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
      toast.success('Todas as notificações foram lidas');
    } catch (error) {
      toast.error('Erro ao marcar todas');
    }
  };

  const excluirTodas = async () => {
    if (!confirm('Excluir todas as notificações?')) return;
    try {
      await fetch('/api/notificacoes?type=todas', { 
        method: 'DELETE',
        credentials: 'include'
      });
      setNotificacoes([]);
      setAberto(false);
      toast.success('Limpeza concluída');
    } catch (error) {
      toast.error('Erro ao limpar');
    }
  };

  return (
    <>
      <button 
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        aria-label={`Notificações${nLidas > 0 ? ` (${nLidas} não lidas)` : ''}`}
        title="Notificações"
        className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer text-zinc-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {nLidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg border-2 border-zinc-950">
            {nLidas > 99 ? '99+' : nLidas}
          </span>
        )}
      </button>

      {mounted && aberto && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Central de Notificações"
        >
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 animate-in fade-in"
            onClick={() => setAberto(false)}
            aria-hidden="true"
          />

          <div 
            onClick={(e) => e.stopPropagation()}
            className="fixed top-14 sm:top-16 right-2 sm:right-6 w-[calc(100vw-1rem)] sm:w-[420px] max-w-[440px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[calc(100vh-4.5rem)] sm:max-h-[580px] z-[100000] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
          >
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500 border border-orange-500/20 shrink-0">
                  <Bell size={16} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest truncate">Notificações</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase truncate">
                    {nLidas > 0 ? `${nLidas} ${nLidas === 1 ? 'novo alerta' : 'novos alertas'}` : 'Nenhum alerta pendente'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {notificacoes.length > 0 && (
                  <>
                    <button onClick={marcarTodasLidas} title="Marcar todas como lidas" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-emerald-400 transition cursor-pointer"><Check size={16} /></button>
                    <button onClick={excluirTodas} title="Excluir todas" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition cursor-pointer"><Trash2 size={16} /></button>
                  </>
                )}
                <button onClick={() => setAberto(false)} title="Fechar" className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer ml-1"><X size={16} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-900 bg-zinc-950">
              {carregando ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={24} className="text-orange-500 animate-spin" />
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Sincronizando...</p>
                </div>
              ) : notificacoes.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-zinc-900 rounded-full mb-3 border border-zinc-800 text-zinc-500">
                    <BellOff size={24} />
                  </div>
                  <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Céu limpo por aqui</p>
                  <p className="text-[11px] text-zinc-400 font-medium">Nenhuma notificação nova no momento</p>
                </div>
              ) : (
                notificacoes.map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => marcarLida(n.id, n.link)}
                    className={`group relative px-5 py-4 cursor-pointer transition-colors ${
                      !n.lida 
                        ? 'bg-zinc-900/80 hover:bg-zinc-900 border-l-4 border-l-orange-500' 
                        : 'bg-zinc-950 hover:bg-zinc-900/50 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {!n.lida && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />}
                            <h4 className={`text-xs uppercase tracking-tight truncate ${!n.lida ? 'text-white font-black' : 'text-zinc-300 font-bold'}`}>
                              {n.titulo}
                            </h4>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-semibold whitespace-nowrap shrink-0">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.lida ? 'text-zinc-200 font-normal' : 'text-zinc-400 font-normal'}`}>
                          {n.mensagem}
                        </p>

                        {n.link && (
                          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] font-black text-orange-500 uppercase tracking-widest hover:text-orange-400 transition-colors">
                            <ExternalLink size={11} /> 
                            <span>Ver Detalhes</span>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={(e) => excluirNotificacao(n.id, e)}
                        title="Excluir notificação"
                        className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors opacity-70 group-hover:opacity-100 shrink-0 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 shrink-0">
              <button 
                onClick={() => {
                  setAberto(false);
                  router.push('/notificacoes');
                }}
                className="w-full py-2.5 bg-zinc-800 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-lg border border-zinc-700/60 hover:border-orange-500 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Ver Todas as Notificações</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
