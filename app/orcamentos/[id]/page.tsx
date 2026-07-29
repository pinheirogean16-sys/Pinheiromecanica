'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Edit, Printer, FileDown, CheckCircle2, 
  Clock, XCircle, Send, FileCode2, ChevronRight,
  TrendingUp, ArrowUpRight, ShieldCheck, Mail, Phone, MapPin
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function OrcamentoVisualizacaoPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/orcamentos/${id}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setOrcamento(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const converterEmOS = async () => {
    if (!confirm('Deseja converter este orçamento em uma Ordem de Serviço aberta?')) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/orcamentos/${id}/converter`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Orçamento convertido com sucesso!');
      router.push(`/os/${data.id}`);
    } catch (err: any) { alert(err.message); } finally { setConverting(false); }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  if (!orcamento) return <div className="min-h-screen bg-black flex items-center justify-center text-white">ORÇAMENTO NÃO ENCONTRADO</div>;

  return (
    <div className="animate-in fade-in duration-500">
       <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition"><ArrowLeft size={20} /></button>
                <div>
                  <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">{orcamento.numero}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest px-2 py-1 bg-zinc-900 rounded border border-zinc-800 italic">Proposta {orcamento.status}</span>
                  </div>
                </div>
             </div>
             <div className="flex flex-wrap gap-3">
                <Link href={`/orcamentos/${id}/imprimir`} className="flex-1 md:flex-none px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 hover:bg-zinc-800"><Printer size={16} /> Imprimir</Link>
                {orcamento.status === 'RASCUNHO' && <Link href={`/orcamentos/${id}/editar`} className="flex-1 md:flex-none px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 hover:bg-zinc-800 text-orange-500"><Edit size={16} /> Editar</Link>}
                {orcamento.status !== 'CONVERTIDO' && (
                  <button onClick={converterEmOS} disabled={converting} className="flex-1 md:flex-none px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-2xl flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50 min-w-[200px]">
                    {converting ? <Clock className="animate-spin" size={16} /> : <FileCode2 size={16} />} Converter em OS
                  </button>
                )}
             </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
             <div className="lg:col-span-8 space-y-8">
                <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden text-wrap break-words">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-[80px]" />
                   <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
                      <div className="space-y-4">
                         <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">Investimento Proposto</h3>
                         <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">Resumo dos Ativos e Insumos</p>
                      </div>
                      <div className="sm:text-right">
                         <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Emissão</p>
                         <p className="text-sm font-black text-white italic">{formatDate(orcamento.created_at)}</p>
                         {orcamento.data_validade && (
                           <div className="mt-2 text-red-500/80">
                             <p className="text-[9px] font-black uppercase tracking-widest">Vencimento</p>
                             <p className="text-xs font-black italic">{formatDate(orcamento.data_validade)}</p>
                           </div>
                         )}
                      </div>
                   </div>
                   <div className="space-y-12">
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 flex items-center gap-2 underline underline-offset-8 decoration-orange-500/30 mb-6">Mão de Obra e Serviços</h4>
                         {orcamento.servicos.map((s: any) => (
                           <div key={s.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-zinc-800/50 group gap-2">
                              <div className="space-y-1 min-w-0">
                                 <p className="text-[11px] font-black uppercase text-white group-hover:text-orange-500 transition-colors truncate">{s.descricao}</p>
                                 <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-mono truncate">{s.horas} Horas Técnicas</p>
                              </div>
                              <p className="text-sm font-black italic text-zinc-300">{formatCurrency(s.valor_total)}</p>
                           </div>
                         ))}
                      </div>
                      <div className="space-y-4">
                         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-green-500 flex items-center gap-2 underline underline-offset-8 decoration-green-500/30 mb-6">Peças e Peças de Reposição</h4>
                         {orcamento.pecas.map((p: any) => (
                           <div key={p.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 border-b border-zinc-800/50 group gap-2">
                              <div className="space-y-1 min-w-0">
                                 <p className="text-[11px] font-black uppercase text-white group-hover:text-green-500 transition-colors truncate">{p.descricao}</p>
                                 <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-mono truncate">{p.quantidade} Unidades</p>
                              </div>
                              <p className="text-sm font-black italic text-zinc-300">{formatCurrency(p.valor_total)}</p>
                           </div>
                         ))}
                      </div>
                   </div>
                </section>
                <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Termos e Condições</h3>
                   <p className="text-xs text-zinc-400 font-bold uppercase leading-relaxed tracking-wide italic whitespace-pre-wrap line-clamp-3">{orcamento.termos_condicoes || '—'}</p>
                   {orcamento.observacoes && (
                     <div className="mt-8 pt-8 border-t border-zinc-800 min-w-0">
                       <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2">Notas Técnicas</h4>
                       <p className="text-xs text-zinc-500 uppercase italic font-medium leading-relaxed line-clamp-3">{orcamento.observacoes}</p>
                     </div>
                   )}
                </section>
             </div>
             <div className="lg:col-span-4 space-y-8">
                <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Total do Projeto</h3>
                   <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-widest"><span>Serviços</span><span>{formatCurrency(orcamento.valor_servicos)}</span></div>
                      <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-widest"><span>Materiais</span><span>{formatCurrency(orcamento.valor_pecas)}</span></div>
                      {orcamento.desconto > 0 && <div className="flex justify-between text-[11px] font-black text-red-500 uppercase tracking-widest"><span>Bonificação</span><span>-{formatCurrency(orcamento.desconto)}</span></div>}
                      <div className="pt-6 border-t border-zinc-800 mt-6">
                         <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
                            <div><p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-1 italic">Vlr Final</p><p className="text-3xl md:text-4xl font-black italic tracking-tighter text-white font-mono">{formatCurrency(orcamento.valor_total)}</p></div>
                            <div className="text-right hidden sm:block"><TrendingUp className="text-zinc-800" size={32} /></div>
                         </div>
                      </div>
                   </div>
                </section>
                <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-8">
                   <div className="space-y-4 pb-6 border-b border-zinc-800">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Cliente / Contratante</h3>
                      <p className="text-lg font-black uppercase leading-tight italic truncate">{orcamento.cliente.nome}</p>
                      <div className="space-y-2 opacity-60 min-w-0">
                         <div className="flex items-center gap-3 text-[10px] font-bold truncate"><Mail size={12} className="flex-shrink-0" /> {orcamento.cliente.email || 'N/A'}</div>
                         <div className="flex items-center gap-3 text-[10px] font-bold truncate"><Phone size={12} className="flex-shrink-0" /> {orcamento.cliente.telefone || 'N/A'}</div>
                      </div>
                   </div>
                   {orcamento.veiculo && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Ativo Relacionado</h3>
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2 min-w-0">
                           <p className="text-xs font-black uppercase italic text-orange-500 truncate">{orcamento.veiculo.modelo}</p>
                           <div className="flex justify-between items-center text-[10px] font-bold text-zinc-600 gap-2"><span>Placa</span><span className="font-black text-white truncate">{orcamento.veiculo.placa}</span></div>
                        </div>
                      </div>
                   )}
                </section>
             </div>
          </div>
       </div>
    </div>
  );
}
