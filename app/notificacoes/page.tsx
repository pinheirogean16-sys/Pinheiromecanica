'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Bell, Check, Trash2, X, ExternalLink, Loader2, 
  BellOff, Filter, ArrowLeft, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Pagination } from '@/components/Pagination';

interface Notificacao {
  id: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export default function NotificacoesPage() {
  const [data, setData] = useState<{ items: Notificacao[], total: number, totalPages: number }>({ items: [], total: 0, totalPages: 0 });
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas' | 'lidas'>('todas');
  const [page, setPage] = useState(1);
  const router = useRouter();

  const fetchNotificacoes = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams();
      if (filtro === 'nao_lidas') params.append('lida', 'false');
      if (filtro === 'lidas') params.append('lida', 'true');
      params.append('page', page.toString());
      params.append('limit', '10');

      const res = await fetch(`/api/notificacoes?${params.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const result = await res.json();
        const items = Array.isArray(result) ? result : (result.items || []);
        const total = result.total || items.length;
        const totalPages = result.totalPages || 1;
        setData({ items, total, totalPages });
      }
    } catch (error) {
      toast.error('Erro ao buscar notificações');
    } finally {
      setCarregando(false);
    }
  }, [filtro, page]);

  useEffect(() => {
    const load = async () => {
      await fetchNotificacoes();
    };
    load();
  }, [fetchNotificacoes]);

  const marcarLida = async (id: string) => {
    try {
      await fetch(`/api/notificacoes/${id}`, { 
        method: 'PATCH',
        credentials: 'include'
      });
      setData(prev => ({
        ...prev,
        items: prev.items.map(n => n.id === id ? { ...n, lida: true } : n)
      }));
    } catch (error) {
      toast.error('Erro ao atualizar');
    }
  };

  const excluirNotificacao = async (id: string) => {
    try {
      await fetch(`/api/notificacoes/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      setData(prev => ({
        ...prev,
        items: prev.items.filter(n => n.id !== id),
        total: prev.total - 1
      }));
      toast.success('Notificação removida');
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const marcarTodasLidas = async () => {
    const naoLidas = data.items.filter(n => !n.lida);
    if (naoLidas.length === 0) return;

    try {
      const promises = naoLidas.map(n => fetch(`/api/notificacoes/${n.id}`, { method: 'PATCH', credentials: 'include' }));
      await Promise.all(promises);
      setData(prev => ({
        ...prev,
        items: prev.items.map(n => ({ ...n, lida: true }))
      }));
      toast.success('Todas marcadas como lidas');
    } catch (error) {
      toast.error('Erro ao atualizar todas');
    }
  };

  const limparTodas = async () => {
    if (!confirm('Deseja excluir todas as notificações permanentemente?')) return;
    try {
      await fetch('/api/notificacoes?type=todas', { 
        method: 'DELETE',
        credentials: 'include'
      });
      setData({ items: [], total: 0, totalPages: 0 });
      toast.success('Todas as notificações foram excluídas');
    } catch (error) {
      toast.error('Erro ao excluir todas');
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden bg-zinc-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition group shadow-lg"
          >
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight italic truncate">Notificações</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Acompanhe todos os alertas do sistema</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchNotificacoes}
            disabled={carregando}
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={marcarTodasLidas}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition flex items-center gap-2"
          >
            <CheckCircle2 size={16} /> Marcar tudo
          </button>
          <button 
            onClick={limparTodas}
            className="bg-red-600/10 border border-red-600/20 hover:bg-red-600 hover:text-white text-red-500 rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition flex items-center gap-2"
          >
            <Trash2 size={16} /> Limpar Tudo
          </button>
        </div>
      </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFiltro('todas')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap border ${filtro === 'todas' ? 'bg-orange-600 text-white border-orange-500 shadow-lg' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
          >
            Todas ({data.total})
          </button>
          <button 
            onClick={() => setFiltro('nao_lidas')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap border ${filtro === 'nao_lidas' ? 'bg-orange-600 text-white border-orange-500 shadow-lg' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
          >
            Não Lidas
          </button>
          <button 
            onClick={() => setFiltro('lidas')}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition whitespace-nowrap border ${filtro === 'lidas' ? 'bg-orange-600 text-white border-orange-500 shadow-lg' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
          >
            Lidas
          </button>
        </div>

        {/* Conteúdo */}
        <div className="space-y-4">
          {carregando ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sincronizando base de notificações...</p>
            </div>
          ) : data.items.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6">
                <BellOff size={40} className="text-zinc-600" />
              </div>
              <h3 className="text-lg font-black text-white uppercase italic tracking-tighter mb-2">Tudo em ordem</h3>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Nenhuma notificação encontrada com este filtro</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4">
                {data.items.map((n) => (
                <div 
                  key={n.id}
                  className={`group bg-zinc-900/50 border transition-all rounded-3xl overflow-hidden ${!n.lida ? 'border-orange-600/50 shadow-xl' : 'border-zinc-800 opacity-80 hover:opacity-100 hover:border-zinc-700'}`}
                >
                  <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
                    <div className={`p-4 rounded-2xl shrink-0 ${!n.lida ? 'bg-orange-600/10 text-orange-500' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Bell size={24} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className={`text-sm md:text-base font-black uppercase italic tracking-tight truncate ${!n.lida ? 'text-white' : 'text-zinc-500'}`}>
                          {n.titulo}
                        </h4>
                        {!n.lida && (
                          <span className="px-3 py-1 bg-orange-600 rounded-full text-[8px] font-black text-white uppercase tracking-widest animate-pulse">Novo</span>
                        )}
                      </div>
                      <p className={`text-xs md:text-sm leading-relaxed mb-4 line-clamp-3 ${!n.lida ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {n.mensagem}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                        <span>{new Date(n.created_at).toLocaleDateString('pt-BR')}</span>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full" />
                        <span>{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 md:pt-0 border-t border-zinc-800 md:border-0">
                      {n.link && (
                        <Link 
                          href={n.link}
                          onClick={() => !n.lida && marcarLida(n.id)}
                          className="bg-zinc-900 border border-zinc-800 hover:bg-orange-600 hover:text-white text-zinc-400 rounded-2xl px-6 py-3 font-black text-xs uppercase tracking-widest transition flex items-center gap-2"
                        >
                          <ExternalLink size={14} /> Abrir
                        </Link>
                      )}
                      {!n.lida && (
                        <button 
                          onClick={() => marcarLida(n.id)}
                          className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-green-500 rounded-lg transition"
                          title="Marcar como lida"
                        >
                          <Check size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => excluirNotificacao(n.id)}
                        className="p-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 rounded-lg transition"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>
              <div className="mt-8">
                <Pagination 
                  page={page} 
                  totalPages={data.totalPages || 0} 
                  onPageChange={setPage} 
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
}
