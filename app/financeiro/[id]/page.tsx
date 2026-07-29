'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { 
  ArrowLeft, Save, Loader2, DollarSign, Calendar, 
  Tag, CreditCard, Layers, FileText, User, 
  Trash2, CheckCircle2, AlertCircle, XCircle,
  ExternalLink, Download, ArrowUpRight, ArrowDownLeft,
  Briefcase, Hash, Clock, Scissors
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function DetalheMovimentacao({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [movimentacao, setMovimentacao] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchMovimentacao = async () => {
      try {
        const res = await fetch(`/api/financeiro/${id}`, { credentials: 'include' });
        if (res.ok) {
          setMovimentacao(await res.json());
        } else {
          toast.error('Movimentação não encontrada');
          router.push('/financeiro');
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao buscar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchMovimentacao();
  }, [id, router, refreshKey]);

  const handleDarBaixa = async () => {
    setSaving(true);
    try {
      const valor = movimentacao.valor;
      console.log('VALOR ENVIADO');
      console.log(valor);
      console.log(typeof valor);

      const res = await fetch(`/api/financeiro/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...movimentacao,
          valor: valor !== undefined && valor !== null ? Number(valor) : undefined,
          status: 'PAGO',
          data_pagamento: new Date().toISOString().split('T')[0]
        }),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success('Baixa realizada com sucesso!');
        setRefreshKey(prev => prev + 1);
      } else {
        toast.error('Erro ao realizar baixa');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = async () => {
    if (!confirm('Deseja realmente excluir este lançamento? Esta ação é irreversível.')) return;
    
    try {
      const res = await fetch(`/api/financeiro/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        toast.success('Lançamento excluído permanentemente');
        router.push('/financeiro');
      } else {
        toast.error('Erro ao excluir');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Acessando Registro Financeiro...</p>
      </div>
    );
  }

  if (!movimentacao) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">Movimentação não localizada...</p>
        <Link href="/financeiro" className="mt-4 text-orange-500 text-[10px] font-black uppercase underline">Voltar para o Financeiro</Link>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'PAGO') return 'bg-green-500 text-black border-green-400';
    if (s === 'PENDENTE') return 'bg-yellow-500 text-black border-yellow-400';
    if (s === 'ATRASADO') return 'bg-red-500 text-black border-red-400 text-white';
    return 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white min-h-screen">
      <header className="p-8 md:p-12 border-b border-zinc-900 bg-zinc-950 shadow-2xl relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <Link 
              href="/financeiro"
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black italic tracking-tighter uppercase line-clamp-1">{movimentacao.descricao || '---'}</h1>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg ${getStatusStyle(movimentacao.status || 'PENDENTE')}`}>
                  {movimentacao.status || 'PENDENTE'}
                </div>
              </div>
              <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">ID: {movimentacao.id.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
             {movimentacao.status !== 'PAGO' && (
               <button 
                 onClick={handleDarBaixa}
                 disabled={saving}
                 className="flex items-center gap-4 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-green-500/20"
               >
                 {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                 Dar Baixa
               </button>
             )}
             <button 
               onClick={handleExcluir}
               className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-red-500 hover:bg-red-500 hover:text-black transition-all"
             >
               <Trash2 size={20} />
             </button>
          </div>
        </div>
      </header>

      <main className="p-8 md:p-12 max-w-6xl mx-auto w-full space-y-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Section 1: Financial Core */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 px-2">
                 <DollarSign size={20} className="text-orange-500" />
                 <h2 className="text-sm font-black uppercase tracking-widest italic">Análise Financeira</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2rem] flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Valor Total</p>
                    <h3 className={`text-5xl font-black font-mono italic tracking-tight ${movimentacao.tipo === 'ENTRADA' ? 'text-green-500' : 'text-red-500'}`}>
                      {movimentacao.tipo === 'SAIDA' ? '-' : '+'}{formatCurrency(movimentacao.valor)}
                    </h3>
                    <div className="mt-4 px-4 py-1.5 bg-zinc-950 border border-zinc-800 rounded-full text-[8px] font-black uppercase tracking-widest text-zinc-500">
                      TIPO: {movimentacao.tipo}
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2rem] space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg"><Calendar size={14} className="text-orange-500" /></div>
                         <span className="text-[10px] font-black uppercase text-zinc-500">Movimento</span>
                       </div>
                       <span className="text-xs font-bold text-white font-mono">{new Date(movimentacao.data).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg"><Clock size={14} className="text-yellow-500" /></div>
                         <span className="text-[10px] font-black uppercase text-zinc-500">Vencimento</span>
                       </div>
                       <span className="text-xs font-bold text-white font-mono">
                         {movimentacao.data_vencimento ? new Date(movimentacao.data_vencimento).toLocaleDateString('pt-BR') : '---'}
                       </span>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg"><CheckCircle2 size={14} className="text-green-500" /></div>
                         <span className="text-[10px] font-black uppercase text-zinc-500">Pagamento</span>
                       </div>
                       <span className="text-xs font-bold text-white font-mono">
                         {movimentacao.data_pagamento ? new Date(movimentacao.data_pagamento).toLocaleDateString('pt-BR') : 'PENDENTE'}
                       </span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Section 2: Classification */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 px-2">
                 <Tag size={20} className="text-orange-500" />
                 <h2 className="text-sm font-black uppercase tracking-widest italic">Classificação e Natureza</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl group hover:border-zinc-700 transition-colors">
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Categoria</p>
                    <p className="text-xs font-black text-white italic">{movimentacao.categoria || 'NÃO DEFINIDA'}</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl group hover:border-zinc-700 transition-colors">
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Forma de Pagto</p>
                    <p className="text-xs font-black text-white italic">{movimentacao.forma_pagamento || 'NÃO DEFINIDA'}</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-900 p-6 rounded-2xl group hover:border-zinc-700 transition-colors">
                    <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">Centro de Custo</p>
                    <p className="text-xs font-black text-white italic">{movimentacao.centro_custo || 'NÃO DEFINIDA'}</p>
                  </div>
               </div>
            </div>

            {/* Section 3: Document Content */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 px-2">
                 <FileText size={20} className="text-orange-500" />
                 <h2 className="text-sm font-black uppercase tracking-widest italic">Descrição e Notas</h2>
               </div>
               <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2rem] min-h-[120px]">
                  <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                    {movimentacao.descricao || 'Nenhuma descrição adicional informada.'}
                  </p>
               </div>
            </div>

          </div>

          {/* Sidebar Info */}
          <div className="space-y-12">
            {/* Vínculos */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 px-2">
                 <Layers size={20} className="text-zinc-600" />
                 <h2 className="text-[10px] font-black uppercase tracking-widest">Origem e Vínculos</h2>
               </div>
               <div className="space-y-4">
                  {movimentacao.os && (
                    <Link 
                      href={`/os/${movimentacao.os.id}`}
                      className="flex flex-col p-6 bg-zinc-900/50 border border-orange-500/20 rounded-2xl group hover:border-orange-500/50 transition-all"
                    >
                      <span className="text-[8px] text-orange-500/60 font-black uppercase mb-2">VINCULADO A OS</span>
                      <h4 className="text-xs font-black text-white italic mb-1 uppercase tracking-tight">OS #{movimentacao.os.numero || '---'}</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase">{movimentacao.os.cliente?.nome || '---'}</p>
                    </Link>
                  )}

                  {movimentacao.cliente && (
                    <Link 
                      href={`/clientes/${movimentacao.cliente.id}`}
                      className="flex flex-col p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl group hover:border-zinc-600 transition-all"
                    >
                      <span className="text-[8px] text-zinc-600 font-black uppercase mb-2">VINCULADO A CLIENTE</span>
                      <h4 className="text-xs font-black text-white italic mb-1 uppercase tracking-tight">{movimentacao.cliente.nome}</h4>
                      <p className="text-[9px] text-zinc-500 font-black uppercase">Visualizar Perfil Completo</p>
                    </Link>
                  )}

                  <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                    <span className="text-[8px] text-zinc-600 font-black uppercase mb-2">Nº DOCUMENTO</span>
                    <h4 className="text-xs font-black text-white italic uppercase tracking-tight">{movimentacao.numero_documento || 'SEM DOC'}</h4>
                  </div>
               </div>
            </div>

            {/* Comprovante */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 px-2">
                 <Download size={20} className="text-zinc-600" />
                 <h2 className="text-[10px] font-black uppercase tracking-widest">Documento Anexado</h2>
               </div>
               {movimentacao.comprovante_url ? (
                 <div className="group relative bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center overflow-hidden hover:border-orange-500/30 transition-all">
                    <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mb-6 border border-orange-500/20">
                      <FileText className="text-orange-500" size={32} />
                    </div>
                    <p className="text-xs font-bold text-white uppercase italic mb-6">Comprovante Digitalizado</p>
                    <a 
                      href={movimentacao.comprovante_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 text-zinc-500 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-zinc-700 active:scale-95 transition-all"
                    >
                      <ExternalLink size={14} />
                      Visualizar Arquivo
                    </a>
                 </div>
               ) : (
                 <div className="border-2 border-dashed border-zinc-900 rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-40">
                    <Scissors size={24} className="text-zinc-800 mb-4" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-700 leading-relaxed">Nenhum comprovante anexado<br/>a este lançamento.</p>
                 </div>
               )}
            </div>

            {/* Audit log basics */}
            <div className="p-8 bg-zinc-950 border border-zinc-900 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase text-zinc-600">Criado por</span>
                <span className="text-[9px] font-black text-zinc-400 italic">{movimentacao.created_by}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase text-zinc-600">Integridade</span>
                <span className="text-[9px] font-black text-green-700 italic flex items-center gap-1">
                  <CheckCircle2 size={8} /> VERIFICADO
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
