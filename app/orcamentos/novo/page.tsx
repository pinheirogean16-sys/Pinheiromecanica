'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, ArrowLeft, Save, Plus, Trash2, 
  Search, User, Car, DollarSign, Calendar,
  ChevronRight, Calculator, Clock, Loader2, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, parseHoras, formatHoras } from '@/lib/utils';

export default function NovoOrcamentoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [pecasEstoque, setPecasEstoque] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    numero: '', cliente_id: '', veiculo_id: '', status: 'RASCUNHO',
    data_validade: '', desconto: 0, observacoes: '',
    termos_condicoes: 'Validade do orçamento: 7 dias. Pagamento conforme condições comerciais.',
    servicos: [] as any[], pecas: [] as any[],
  });

  useEffect(() => {
    const fetchData = async () => {
      setFetchingData(true);
      try {
        const [resN, resC, resV, resP] = await Promise.all([
          fetch('/api/orcamentos/proximo-numero'),
          fetch('/api/clientes?limit=100'),
          fetch('/api/veiculos?limit=100'),
          fetch('/api/pecas?limit=200')
        ]);
        const dataN = await resN.json();
        const dataC = await resC.json();
        const dataV = await resV.json();
        const dataP = await resP.json();
        
        setFormData(prev => ({ ...prev, numero: dataN.numero }));
        
        const listaClientes = Array.isArray(dataC) ? dataC : (dataC.items || []);
        setClientes(listaClientes);
        
        const listaVeiculos = Array.isArray(dataV) ? dataV : (dataV.items || []);
        setVeiculos(listaVeiculos);
        
        const listaPecas = Array.isArray(dataP) ? dataP : (dataP.items || []);
        setPecasEstoque(listaPecas);
      } catch {
        toast.error('Erro ao carregar dados do formulário');
      } finally { setFetchingData(false); }
    };
    fetchData();
  }, []);

  const totais = useMemo(() => {
    const vServicos = formData.servicos.reduce((acc, s) => acc + (Number(s.valor_total) || 0), 0);
    const vPecas = formData.pecas.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0);
    const total = (vServicos + vPecas) - (Number(formData.desconto) || 0);
    return { servicos: vServicos, pecas: vPecas, total };
  }, [formData.servicos, formData.pecas, formData.desconto]);

  const addServico = () => setFormData(p => ({ ...p, servicos: [...p.servicos, { id: Date.now().toString(), descricao: '', horas: '1:00', valor_hora: 0, valor_total: 0 }] }));
  const updateServico = (id: string, field: string, val: any) => setFormData(p => ({ ...p, servicos: p.servicos.map(s => { 
    if(s.id === id) { 
      const u = { ...s, [field]: val }; 
      const h = parseHoras(u.horas.toString());
      u.valor_total = h * (Number(u.valor_hora) || 0); 
      return u; 
    } return s; 
  }) }));
  const removeServico = (id: string) => setFormData(p => ({ ...p, servicos: p.servicos.filter(s => s.id !== id) }));
  
  const adicionarPecaDoEstoque = (peca: any) => {
    setFormData(p => ({ 
      ...p, 
      pecas: [
        ...p.pecas, 
        { 
          id: Date.now().toString(), 
          peca_id: peca.id, 
          descricao: peca.descricao, 
          quantidade: 1, 
          valor_unit: peca.preco_venda || 0, 
          valor_total: peca.preco_venda || 0 
        }
      ] 
    }));
  };

  const addPeca = () => setFormData(p => ({ ...p, pecas: [...p.pecas, { id: Date.now().toString(), peca_id: '', descricao: '', quantidade: 1, valor_unit: 0, valor_total: 0 }] }));
  const updatePeca = (id: string, field: string, val: any) => setFormData(p => ({ ...p, pecas: p.pecas.map(item => { 
    if(item.id === id) { 
      const u = { ...item, [field]: val }; 
      if(field === 'peca_id' && val) { const e = pecasEstoque.find(x => x.id === val); if(e) { u.descricao = e.descricao; u.valor_unit = e.preco_venda; } }
      u.valor_total = u.quantidade * u.valor_unit; 
      return u; 
    } return item; 
  }) }));
  const removePeca = (id: string) => setFormData(p => ({ ...p, pecas: p.pecas.filter(item => item.id !== id) }));

  const onSubmit = async (e: React.FormEvent, statusOverride?: string) => {
    e.preventDefault();
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }
    setLoading(true);
    try {
      const servicosFiltrados = formData.servicos
        .filter((s: any) => s.descricao?.trim())
        .map(({ id, ...s }: any) => ({
          ...s,
          horas: Number(parseHoras(s.horas.toString())),
          valor_hora: Number(s.valor_hora || 0),
          valor_total: Number(s.valor_total || 0),
        }));

      const pecasProcessadas = formData.pecas
        .filter((p: any) => p.descricao?.trim())
        .map(({ id, ...p }: any) => ({
          ...p,
          quantidade: Number(p.quantidade || 0),
          valor_unit: Number(p.valor_unit || 0),
          valor_total: Number(p.valor_total || 0),
        }));

      const payload = {
        ...formData,
        status: statusOverride || formData.status,
        desconto: Number(formData.desconto || 0),
        valor_servicos: Number(totais.servicos || 0),
        valor_pecas: Number(totais.pecas || 0),
        valor_total: Number(totais.total || 0),
        servicos: servicosFiltrados,
        pecas: pecasProcessadas
      };

      const res = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      const r = await res.json();
      router.push(`/orcamentos/${r.id}`);
    } catch {
      toast.error('Erro ao salvar orçamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 py-6 md:py-10 pb-20 overflow-hidden animate-in fade-in duration-500">
      <form onSubmit={onSubmit} className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <button onClick={() => router.back()} type="button" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition"><ArrowLeft size={20} /></button>
              <div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">Novo Orçamento <span className="text-zinc-700 text-xl">/ {formData.numero}</span></h1>
              </div>
           </div>
           <div className="flex flex-wrap gap-3">
              <button type="button" onClick={(e) => onSubmit(e, 'RASCUNHO')} className="flex-1 md:flex-none px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2"> {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Salvar Rascunho </button>
              <button type="button" onClick={(e) => onSubmit(e, 'ENVIADO')} className="flex-1 md:flex-none px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-2xl flex items-center justify-center gap-2 transform active:scale-95"> {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Enviar para Cliente </button>
           </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 space-y-8">
              <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
                 <h2 className="text-sm font-black text-white uppercase italic tracking-widest border-b border-zinc-800 pb-4">Identificação do Cliente</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <select required className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500/50 appearance-none" value={formData.cliente_id} onChange={(e) => setFormData(prev => ({ ...prev, cliente_id: e.target.value }))} >
                      <option value="">SELECIONE UM CLIENTE</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <select className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold uppercase outline-none focus:border-orange-500/50 appearance-none" value={formData.veiculo_id} onChange={(e) => setFormData(prev => ({ ...prev, veiculo_id: e.target.value }))} >
                      <option value="">SELECIONE UM VEÍCULO</option>
                      {veiculos.filter(v => !formData.cliente_id || v.cliente_id === formData.cliente_id).map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                    </select>
                 </div>
              </section>
              <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
                 <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Serviços</h2>
                    <button type="button" onClick={addServico} className="text-[10px] font-black uppercase text-blue-500 underline underline-offset-4">+ Adicionar Serviço</button>
                 </div>
                 <div className="space-y-4">
                 {formData.servicos.map(s => (
                   <div key={s.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-950 p-4 border border-zinc-800 rounded-2xl items-end">
                      <div className="md:col-span-6">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Descrição</label>
                        <input type="text" placeholder="DESCRIÇÃO" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-bold uppercase outline-none" value={s.descricao} onChange={e => updateServico(s.id, 'descricao', e.target.value.toUpperCase())} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Horas (H:MM)</label>
                        <input 
                          type="text" 
                          placeholder="1:30" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-mono outline-none" 
                          value={s.horas} 
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^0-9:]/g, '');
                            updateServico(s.id, 'horas', val);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val && !val.includes(':')) {
                              updateServico(s.id, 'horas', `${val}:00`);
                            }
                          }}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Valor Hora</label>
                        <input type="number" placeholder="VALOR HORA" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-mono outline-none" value={s.valor_hora} onChange={e => updateServico(s.id, 'valor_hora', Number(e.target.value))} />
                      </div>
                      <div className="md:col-span-1 text-right text-[10px] font-mono font-black py-2">{formatCurrency(s.valor_total)}</div>
                      <div className="md:col-span-1 text-right py-2"><button type="button" onClick={() => removeServico(s.id)} className="text-zinc-700 hover:text-red-500"><Trash2 size={16} /></button></div>
                   </div>
                 ))}
                 </div>
              </section>
              <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6">
                 <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Peças</h2>
                    <div className="flex items-center gap-4">
                        <select 
                          className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-black uppercase text-green-500 outline-none focus:border-green-500/50"
                          value="" 
                          onChange={e => {
                            const peca = pecasEstoque.find(p => p.id === e.target.value);
                            if (peca) adicionarPecaDoEstoque(peca);
                          }}
                        >
                          <option value="">+ Adicionar peça do estoque</option>
                          {pecasEstoque.map(p => {
                            const precoVendaValor = p.preco_venda;
                            const formattedPreco = Number.isFinite(Number(precoVendaValor)) 
                              ? Number(precoVendaValor).toFixed(2) 
                              : '0.00';
                            return (
                              <option key={p.id} value={p.id}>
                                {p.descricao} - R$ {formattedPreco} (Estoque: {p.quantidade})
                              </option>
                            );
                          })}
                        </select>
                        <button type="button" onClick={addPeca} className="text-[10px] font-black uppercase text-zinc-500 underline underline-offset-4">+ Texto Livre</button>
                    </div>
                 </div>
                 <div className="space-y-4">
                 {formData.pecas.map(p => (
                   <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-zinc-950 p-4 border border-zinc-800 rounded-2xl items-end">
                      <div className="md:col-span-4">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Seleção</label>
                        <select className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-bold uppercase outline-none" value={p.peca_id} onChange={e => updatePeca(p.id, 'peca_id', e.target.value)}><option value="">TEXTO LIVRE...</option>{pecasEstoque.map(ps => <option key={ps.id} value={ps.id}>{ps.descricao}</option>)}</select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Descrição</label>
                        <input type="text" disabled={!!p.peca_id} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-bold uppercase outline-none" value={p.descricao} onChange={e => updatePeca(p.id, 'descricao', e.target.value.toUpperCase())} />
                      </div>
                      <div className="md:col-span-1">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Qtd</label>
                        <input type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-mono outline-none" value={p.quantidade} onChange={e => updatePeca(p.id, 'quantidade', Number(e.target.value))} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black text-zinc-600 uppercase mb-1 block">Vlr Unit</label>
                        <input type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] font-mono outline-none" value={p.valor_unit} onChange={e => updatePeca(p.id, 'valor_unit', Number(e.target.value))} />
                      </div>
                      <div className="md:col-span-1 text-right text-[10px] font-mono font-black py-2">{formatCurrency(p.valor_total)}</div>
                      <div className="md:col-span-1 text-right py-2"><button type="button" onClick={() => removePeca(p.id)} className="text-zinc-700 hover:text-red-500"><Trash2 size={16} /></button></div>
                   </div>
                 ))}
                 </div>
              </section>
           </div>
           <div className="lg:col-span-4 space-y-8">
              <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-6 lg:sticky lg:top-8">
                 <h3 className="text-lg font-black uppercase italic tracking-tighter">Totais</h3>
                 <div className="space-y-3 opacity-60">
                    <div className="flex justify-between text-[10px]"><span>Serviços:</span><span>{formatCurrency(totais.servicos)}</span></div>
                    <div className="flex justify-between text-[10px]"><span>Peças:</span><span>{formatCurrency(totais.pecas)}</span></div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-orange-500">Desconto R$</label>
                    <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-mono font-bold outline-none border focus:border-orange-500" value={formData.desconto} onChange={e => setFormData(p => ({ ...p, desconto: Number(e.target.value) }))} />
                 </div>
                 <div className="p-6 bg-orange-600/10 border border-orange-500/20 rounded-3xl mt-4">
                    <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest block mb-1">TOTAL GERAL</span>
                    <p className="text-4xl font-black italic text-white tracking-tighter">{formatCurrency(totais.total)}</p>
                 </div>
              </section>
              <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 space-y-4">
                 <div className="space-y-2"><label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Validade Proposta</label><input type="date" className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold outline-none text-zinc-400" value={formData.data_validade} onChange={e => setFormData(p => ({ ...p, data_validade: e.target.value }))} /></div>
                 <div className="space-y-2"><label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Termos e Condições</label><textarea className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold outline-none min-h-[150px]" value={formData.termos_condicoes} onChange={e => setFormData(p => ({ ...p, termos_condicoes: e.target.value }))} /></div>
              </section>
           </div>
        </div>
      </form>
    </div>
  );
}
