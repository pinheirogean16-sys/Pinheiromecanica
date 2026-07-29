'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Trash2, X, ExternalLink, Loader2, BellOff, MoreVertical } from 'lucide-react';
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
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [ultimaNotificacaoId, setUltimaNotificacaoId] = useState<string | null>(null);

  const notificacoesRef = useRef<Notificacao[]>([]);
  const ultimaNotificacaoIdRef = useRef<string | null>(null);

  const updateNotificacoes = (lista: Notificacao[]) => {
    notificacoesRef.current = lista;
    setNotificacoes(lista);
  };

  const updateUltimaNotificacaoId = (id: string | null) => {
    ultimaNotificacaoIdRef.current = id;
    setUltimaNotificacaoId(id);
  };

  const fetchNotificacoes = useCallback(async (triggerFinance = false) => {
    try {
      const url = `/api/notificacoes?limite=5${triggerFinance ? '&triggerCheck=true' : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const lista = Array.isArray(data) ? data : (data.items || []);
        
        const currentUltimaId = ultimaNotificacaoIdRef.current;
        const currentNotificacoes = notificacoesRef.current;

        // Detectar novas notificações para mostrar toast
        if (currentUltimaId && lista.length > 0) {
          const novidades = lista.filter((n: any) => !n.lida && n.id !== currentUltimaId && new Date(n.created_at) > new Date(currentNotificacoes[0]?.created_at || 0));
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
    } catch (err) {
      // silencioso
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial com gatilho para verificação financeira
    const timer = setTimeout(() => {
      fetchNotificacoes(true);
    }, 50);
    const interval = setInterval(() => fetchNotificacoes(false), 30000); // Aumentado para 30s

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotificacoes]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setAberto(!aberto)}
        className="relative p-2 hover:bg-zinc-800 rounded-lg transition"
      >
        <Bell className="w-5 h-5 text-zinc-400" />
        {nLidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg border-2 border-zinc-900">
            {nLidas > 99 ? '99+' : nLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header do Dropdown */}
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest truncate">Notificações</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase truncate">{nLidas} novas alertas</p>
            </div>
            <div className="flex items-center gap-1">
              {notificacoes.length > 0 && (
                <>
                  <button 
                    onClick={marcarTodasLidas}
                    title="Marcar todas como lidas"
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-green-500 transition"
                  >
                    <Check size={14} />
                  </button>
                  <button 
                    onClick={excluirTodas}
                    title="Excluir todas"
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button 
                onClick={() => setAberto(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {carregando ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3">
                <Loader2 size={24} className="text-orange-500 animate-spin" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Sincronizando...</p>
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center opacity-40">
                <div className="p-4 bg-zinc-900 rounded-full mb-3">
                  <BellOff size={24} className="text-zinc-600" />
                </div>
                <p className="text-xs font-black text-white uppercase tracking-widest mb-1">Céu limpo por aqui</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Nenhuma notificação nova</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-900">
                {notificacoes.slice(0, 5).map((n) => (
                  <div 
                    key={n.id}
                    onClick={() => marcarLida(n.id, n.link)}
                    className={`group px-5 py-4 cursor-pointer transition-all hover:bg-zinc-900/50 ${!n.lida ? 'bg-orange-500/[0.03] border-l-2 border-l-orange-500' : 'border-l-2 border-l-transparent'}`}
                  >
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h4 className={`text-xs font-black uppercase tracking-tight truncate ${!n.lida ? 'text-white' : 'text-zinc-500'}`}>
                            {n.titulo}
                          </h4>
                          <span className="text-[9px] text-zinc-600 font-bold whitespace-nowrap flex-shrink-0">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed line-clamp-2 ${!n.lida ? 'text-zinc-300 font-medium' : 'text-zinc-600'}`}>
                          {n.mensagem}
                        </p>
                        {n.link && (
                          <div className="flex items-center gap-1 mt-2 text-[9px] font-black text-orange-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink size={10} /> Ver Detalhes
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => excluirNotificacao(n.id, e)}
                          className="p-1.5 hover:bg-red-600/20 rounded-lg text-zinc-700 hover:text-red-500 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <button 
              onClick={() => {
                setAberto(false);
                router.push('/notificacoes');
              }}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg border border-zinc-700/50"
            >
              Ver Todas as Notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
