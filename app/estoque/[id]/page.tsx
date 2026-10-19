'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Edit, Trash2, Package, Tag, 
  BarChart3, Warehouse, Calendar, Clock,
  ArrowRight, Hash, Layers, MapPin, 
  TrendingUp, Activity, User, FileText,
  AlertTriangle, DollarSign, Printer, Info,
  AlertCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { BRANDING } from '@/lib/branding';

interface Peca {
  id: string;
  codigo: string;
  descricao: string;
  fabricante: string | null;
  categoria: string;
  quantidade: number;
  estoque_minimo: number;
  localizacao: string | null;
  preco_custo: number;
  preco_venda: number;
  created_at: string;
  aplicacoes: any[];
  unidadeMedida?: string;
  unidadeCompra?: string;
  fatorConversao?: number;
  permiteFracionado?: boolean;
}

export default function DetalhesPecaPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [peca, setPeca] = useState<Peca | null>(null);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState<string>('');
  const [aba, setAba] = useState('info'); // 'info' | 'movimentacoes'
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    params.then(p => {
      setItemId(p.id);
      fetch(`/api/pecas/${p.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
             toast.error(data.error);
             router.push('/estoque');
          } else {
             setPeca(data);
          }
        })
        .finally(() => setLoading(false));
    });
  }, [params, router]);

  useEffect(() => {
    if (itemId && aba === 'movimentacoes') {
      fetch(`/api/estoque/movimentacao?peca_id=${itemId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => setMovimentacoes(Array.isArray(data) ? data : []))
        .catch(err => console.error('Erro ao buscar movimentações:', err));
    }
  }, [itemId, aba]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/pecas/${itemId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Peça removida com sucesso');
        router.push('/estoque');
      } else {
        toast.error(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return (
     <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500 italic">CARREGANDO DOSSIÊ TÉCNICO...</p>
     </div>
  );

  if (!peca) return null;

  const margem = peca.preco_custo > 0 ? ((peca.preco_venda / peca.preco_custo - 1) * 100).toFixed(1) : '0.0';
  const statusEstoque = peca.quantidade <= peca.estoque_minimo;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 pb-20 overflow-hidden">
      {/* Header Fino */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/estoque" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group">
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter truncate">{peca.descricao}</h1>
              <span className="bg-zinc-800 text-orange-500 px-3 py-1 rounded-lg text-[10px] font-mono font-black italic border border-zinc-700">#{peca.codigo}</span>
            </div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] mt-1">Dossiê Técnico de Insumo • {BRANDING.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <button onClick={() => toast.info('Imprimindo etiqueta de identificação...')} className="p-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl transition shadow-lg flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
              <Printer size={16} /> Etiqueta
           </button>
           <Link href={`/estoque/${itemId}/editar`} className="px-6 py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-3 shadow-lg">
              <Edit size={16} className="text-blue-500" /> EDITAR
           </Link>
           <button onClick={() => setShowDeleteModal(true)} className="px-6 py-4 bg-red-500/10 border border-red-500/20 text-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center gap-3 shadow-lg">
              <Trash2 size={16} /> EXCLUIR
           </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
        <button 
          onClick={() => setAba('info')} 
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            aba === 'info' 
              ? 'bg-orange-600 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Informações
        </button>
        <button 
          onClick={() => setAba('movimentacoes')} 
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
            aba === 'movimentacoes' 
              ? 'bg-orange-600 text-white shadow-lg' 
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Movimentações
        </button>
      </div>

      {aba === 'info' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Stats and Specs */}
        <div className="xl:col-span-8 space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`bg-zinc-900 border ${statusEstoque ? 'border-red-500/30' : 'border-zinc-800'} rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 space-y-4 relative overflow-hidden group`}>
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest relative z-10">DISPONÍVEL EM ESTOQUE</p>
                 <div className="flex items-end gap-3 relative z-10">
                    <h3 className={`text-6xl font-black italic tracking-tighter ${statusEstoque ? 'text-red-500' : 'text-green-500'}`}>{peca.quantidade}</h3>
                    <span className="text-zinc-500 text-xs font-black uppercase mb-3">{peca.unidadeMedida || 'un'}</span>
                 </div>
                 {statusEstoque && (
                    <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-2 rounded-xl border border-red-500/20">
                       <AlertTriangle size={14} />
                       <span className="text-[9px] font-black uppercase">REABASTECIMENTO NECESSÁRIO</span>
                    </div>
                 )}
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 space-y-4 relative overflow-hidden">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">LOCALIZAÇÃO TÉCNICA</p>
                 <div className="flex items-center gap-4 pt-2">
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-blue-500">
                       <MapPin size={28} />
                    </div>
                    <div>
                       <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate">{peca.localizacao || 'BOX CENTRAL'}</h3>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">ALMOXARIFADO SETOR A</p>
                    </div>
                 </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 space-y-4 relative overflow-hidden">
                 <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">MARGEM DE OPERAÇÃO</p>
                 <div className="flex items-center gap-4 pt-2">
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-orange-500">
                       <TrendingUp size={28} />
                    </div>
                    <div>
                       <h3 className="text-3xl font-black text-white italic tracking-tighter">{margem}%</h3>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">MARKUP PROJETADO</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Technical Specs & Details */}
           <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[3rem] p-5 sm:p-10 shadow-2xl space-y-10">
              <div className="flex items-center gap-4 border-b border-zinc-800/50 pb-6">
                 <div className="p-3 bg-zinc-950 text-zinc-500 rounded-2xl">
                    <Info size={18} />
                 </div>
                 <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Dados do Produto</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                       <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Fabricante</span>
                       <span className="text-xs font-black text-white uppercase italic truncate">{peca.fabricante || 'Geral/OEM'}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                       <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Categoria</span>
                       <span className="text-xs font-black text-white uppercase italic">{peca.categoria.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                       <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Data de Cadastro</span>
                       <span className="text-xs font-black text-white font-mono">{new Date(peca.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                       <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Estoque Mínimo</span>
                       <span className="text-xs font-black text-red-500 font-mono tracking-tighter italic">{peca.estoque_minimo} {peca.unidadeMedida || 'un'}</span>
                     </div>
                     <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Unidade de Compra</span>
                        <span className="text-xs font-black text-blue-400 font-mono tracking-tighter uppercase italic">{peca.unidadeCompra || 'un'}</span>
                     </div>
                     <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Fator de Conversão</span>
                        <span className="text-xs font-black text-zinc-300 font-mono tracking-tighter">1 {peca.unidadeCompra || 'un'} = {peca.fatorConversao || 1} {peca.unidadeMedida || 'un'}</span>
                     </div>
                     <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Estoque Divisível (Fracionado)</span>
                        <span className={`text-[10px] font-black uppercase ${peca.permiteFracionado ? 'text-green-500' : 'text-zinc-500'}`}>{peca.permiteFracionado ? 'Sim (Habilitado)' : 'Não'}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                       <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Último Custo</span>
                       <span className="text-xs font-black text-zinc-400 font-mono">{peca.preco_custo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center py-4 border-b border-zinc-800/50">
                       <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Preço de Balcão</span>
                       <span className="text-base font-black text-white font-mono italic tracking-tighter">{peca.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                 </div>
              </div>
           </section>

           {/* Historico de Aplicacao */}
           <section className="bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Activity size={18} className="text-orange-500" />
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Últimas Aplicações em Frota</h2>
                 </div>
                 <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Ciclo de Consumo</p>
              </div>

              <div className="w-full overflow-x-auto rounded-xl">
                 <table className="w-full min-w-[700px] text-left">
                    <thead>
                       <tr className="bg-zinc-950/50 border-b border-zinc-800">
                          <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</th>
                          <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ordem de Serviço</th>
                          <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cliente / Ativo</th>
                          <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Qnt.</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                       {peca.aplicacoes.length > 0 ? peca.aplicacoes.map((ap: any) => (
                          <tr key={ap.id} className="hover:bg-zinc-800/20 transition-colors">
                             <td className="p-5 text-[10px] text-zinc-500 font-mono italic">{new Date(ap.os.created_at).toLocaleDateString('pt-BR')}</td>
                             <td className="p-5">
                                <Link href={`/os/${ap.os.id}`} className="text-xs font-black text-orange-500 hover:underline">#{ap.os.numero}</Link>
                             </td>
                             <td className="p-5">
                                <div className="space-y-0.5">
                                   <p className="text-xs font-bold text-white uppercase">{ap.os.cliente.nome}</p>
                                   <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">{ap.os.veiculo.modelo} | {ap.os.veiculo.placa}</p>
                                </div>
                             </td>
                             <td className="p-5 text-right font-black text-zinc-200 font-mono italic">{ap.quantidade} un</td>
                          </tr>
                       )) : (
                          <tr>
                             <td colSpan={4} className="p-20 text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest opacity-60 italic">Sem registros de saída no sistema</td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </section>
        </div>

        {/* Right Column: Widgets */}
        <div className="xl:col-span-4 space-y-8">
           {/* Financial Context */}
           <section className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[3rem] p-5 sm:p-10 shadow-2xl space-y-8">
              <div className="flex items-center gap-3 border-b border-zinc-800/50 pb-6">
                 <DollarSign size={20} className="text-green-500" />
                 <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Contexto Financeiro</h2>
              </div>
              
              <div className="space-y-6">
                 <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-1 shadow-inner">
                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Patrimônio Líquido em Peça</p>
                    <h3 className="text-3xl font-black text-white italic tracking-tighter tabular-nums">
                       {(peca.quantidade * peca.preco_custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                 </div>
                 
                 <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-1 shadow-inner group">
                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest group-hover:text-orange-500 transition-colors">Estimativa de Receita Bruta</p>
                    <h3 className="text-3xl font-black text-orange-500/80 italic tracking-tighter tabular-nums group-hover:text-orange-500 transition-colors">
                       {(peca.quantidade * peca.preco_venda).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                 </div>
              </div>

              <div className="p-6 bg-orange-600 shadow-xl shadow-orange-950/20 rounded-3xl space-y-2">
                 <p className="text-[9px] text-orange-200 uppercase font-black tracking-widest">ROI Potencial</p>
                 <div className="flex items-end justify-between">
                    <h4 className="text-4xl font-black text-white italic tracking-tighter">+{margem}%</h4>
                    <TrendingUp size={30} className="text-white/20 mb-1" />
                 </div>
              </div>
           </section>

           {/* Quick Actions */}
           <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 space-y-4">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-2 italic">Ações Rápidas de Terminal</h3>
              <Link href={`/os/nova?peca=${peca.id}`} className="w-full flex items-center justify-between p-5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-[2rem] transition shadow-lg group">
                 <span className="text-xs font-black text-white italic uppercase group-hover:text-orange-500 tracking-tight transition-colors">Alocar em nova OS</span>
                 <ArrowRight size={16} className="text-zinc-800 group-hover:text-orange-500 transition-colors" />
              </Link>
           </div>
        </div>
      </div>
      ) : (
        <section className="bg-zinc-900 border border-zinc-800 rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-orange-500" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Compêndio de Movimentações</h2>
            </div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Rastreabilidade Total</p>
          </div>

          <div className="w-full overflow-x-auto rounded-xl">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950 border-b border-zinc-800">
                  <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</th>
                  <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tipo</th>
                  <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Qtd</th>
                  <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Motivo</th>
                  <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">OS / Documento</th>
                  <th className="p-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {movimentacoes.length > 0 ? (
                  movimentacoes.map((mov: any) => (
                    <tr key={mov.id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="p-5 text-[10px] text-zinc-500 font-mono italic">
                        <div className="flex flex-col">
                          <span>{new Date(mov.created_at).toLocaleDateString('pt-BR')}</span>
                          <span className="opacity-40">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                          mov.tipo === 'ENTRADA' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-zinc-200 font-mono italic">{mov.quantidade} un</td>
                      <td className="p-5 text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                        {mov.motivo.replace(/_/g, ' ')}
                      </td>
                      <td className="p-5">
                        {mov.os ? (
                          <Link href={`/os/${mov.os_id}`} className="text-xs font-black text-orange-500 hover:underline flex items-center gap-1">
                            <FileText size={12} /> OS #{mov.os.numero}
                          </Link>
                        ) : (
                          <span className="text-zinc-600 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-5 text-xs text-zinc-500 italic">
                        {mov.observacao || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-20 text-center text-[10px] font-black text-zinc-600 uppercase tracking-widest opacity-60 italic">
                      Nenhuma movimentação registrada para este item
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL DE EXCLUSÃO */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Excluir Peça</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Ação irreversível</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tem certeza que deseja excluir permanentemente a peça <strong className="text-white">{peca.descricao}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-900/30 disabled:text-zinc-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
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
    </div>
  );
}
