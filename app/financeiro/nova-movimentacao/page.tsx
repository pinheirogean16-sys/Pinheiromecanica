'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, Save, Loader2, DollarSign, Calendar, 
  Tag, CreditCard, Layers, FileText, User, 
  Upload, Scissors, Trash2, ClipboardList
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NovaMovimentacaoCompleta() {
  const router = useRouter();
  
  // States - Dados Financeiros (Sessão 01)
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [valor, setValor] = useState('0,00');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [dataVencimento, setDataVencimento] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [status, setStatus] = useState('PENDENTE');

  // States - Classificação (Sessão 02)
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [categoria, setCategoria] = useState('OUTROS');
  const [centroCusto, setCentroCusto] = useState('OPERACIONAL');

  // States - Vínculos (Sessão 03)
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [osId, setOsId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);

  // States - Observações (Sessão 04)
  const [observacao, setObservacao] = useState('');
  
  // UI States
  const [saving, setSaving] = useState(false);
  const [osList, setOsList] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [osRes, cliRes] = await Promise.all([
          fetch('/api/ordens', { credentials: 'include' }),
          fetch('/api/clientes', { credentials: 'include' })
        ]);
        if (osRes.ok) setOsList(await osRes.json());
        if (cliRes.ok) setClientesList(await cliRes.json());
      } catch (error) {
        console.error('Erro ao buscar listas:', error);
      }
    };
    fetchData();
  }, []);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) value = "0";
    let floatValue = parseInt(value) / 100;
    setValor(floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const handleBack = () => {
    router.push('/financeiro');
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!descricao || descricao.length < 3) {
      return toast.error('A descrição deve ter pelo menos 3 caracteres');
    }

    const valorFloat = parseFloat(valor.replace(/\./g, '').replace(',', '.'));
    if (valorFloat === 0) {
      return toast.error('Informe um valor válido');
    }

    setSaving(true);
    try {
      let comprovanteUrl = null;
      if (comprovante) {
        const formData = new FormData();
        formData.append('file', comprovante);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          comprovanteUrl = uploadData.url;
        }
      }

      const payload = {
        tipo,
        descricao,
        valor: valorFloat,
        data: new Date(data).toISOString(),
        data_vencimento: dataVencimento ? new Date(dataVencimento).toISOString() : null,
        data_pagamento: dataPagamento ? new Date(dataPagamento).toISOString() : null,
        status,
        forma_pagamento: formaPagamento,
        categoria,
        centro_custo: centroCusto,
        numero_documento: numeroDocumento,
        os_id: osId || null,
        cliente_id: clienteId || null,
        observacao,
        comprovante_url: comprovanteUrl
      };

      const res = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success('Movimentação registrada com sucesso!');
        router.push('/financeiro');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao salvar lançamento');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro na comunicação com o servidor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-white min-h-screen font-sans selection:bg-orange-500/30">
      <header className="p-8 md:p-12 border-b border-zinc-900 bg-zinc-950 shadow-2xl relative z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleBack}
              className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Novo Lançamento</h1>
              <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px] mt-2">Módulo Financeiro Industrial</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Finalizar Lançamento
          </button>
        </div>
      </header>

      <main className="p-8 md:p-12 max-w-4xl mx-auto w-full space-y-16">
        <form onSubmit={handleSubmit} className="space-y-16 pb-32">
          
          {/* Seção 1 - Dados Bancários / Financeiros */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                <DollarSign size={24} className="text-orange-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest italic">01. Dados Financeiros</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-900/30 p-10 rounded-[3rem] border border-zinc-900/50 shadow-2xl">
               <div className="space-y-4">
                 <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-2">Tipo de Fluxo</label>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setTipo('ENTRADA')}
                      className={`py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${tipo === 'ENTRADA' ? 'bg-green-500 text-black border-green-400 shadow-lg shadow-green-500/20' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                    >ENTRADA</button>
                    <button 
                      type="button"
                      onClick={() => setTipo('SAIDA')}
                      className={`py-5 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${tipo === 'SAIDA' ? 'bg-red-500 text-black border-red-400 shadow-lg shadow-red-500/20' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                    >SAÍDA</button>
                 </div>
               </div>

               <div className="space-y-4">
                 <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-2">Valor da Operação</label>
                 <div className="relative group">
                   <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600 font-black italic transition-colors group-focus-within:text-orange-500">R$</div>
                   <input 
                     type="text"
                     value={valor}
                     onChange={handleValorChange}
                     placeholder="0,00"
                     className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-6 pl-16 pr-6 text-3xl font-black font-mono italic text-white outline-none focus:border-orange-500/50 transition-all focus:ring-4 focus:ring-orange-500/5"
                   />
                 </div>
               </div>

               <div className="md:col-span-2 space-y-4">
                 <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-2">Descrição / Finalidade</label>
                 <input 
                   type="text"
                   value={descricao}
                   onChange={(e) => setDescricao(e.target.value)}
                   className="w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-6 text-xl font-bold text-white outline-none focus:border-orange-500/50 transition-all focus:ring-4 focus:ring-orange-500/5"
                   placeholder="Ex: Reposição de Peças Motor Cummins..."
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 md:col-span-2 gap-6 pt-6 border-t border-zinc-800/30">
                 <div className="space-y-2">
                   <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-1">Lançamento</label>
                   <input 
                    type="date" 
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-1">Vencimento</label>
                   <input 
                    type="date" 
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" 
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-1">Pagamento</label>
                   <input 
                    type="date" 
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/50" 
                   />
                 </div>
               </div>

               <div className="md:col-span-2 space-y-4">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] px-2">Estado Atual</label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {['PENDENTE', 'PAGO', 'ATRASADO', 'CANCELADO'].map(s => (
                      <button 
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all ${status === s ? 'bg-orange-500 text-black border-orange-400 shadow-lg shadow-orange-500/20' : 'bg-zinc-950 border-zinc-800 text-zinc-700 hover:border-zinc-700'}`}
                      >{s}</button>
                    ))}
                  </div>
               </div>
            </div>
          </section>

          {/* Seção 2 - Classificação */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                <Tag size={24} className="text-orange-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest italic">02. Classificações</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-zinc-900/30 p-10 rounded-[3rem] border border-zinc-900/50 shadow-2xl">
               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2">Categoria</label>
                 <select 
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/50 appearance-none cursor-pointer"
                 >
                    {['PEÇAS', 'SERVIÇOS', 'MÃO DE OBRA', 'IMPOSTOS', 'MANUTENÇÃO', 'SALÁRIOS', 'COMBUSTÍVEL', 'FRETE', 'TAXAS', 'OUTROS'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                 </select>
               </div>

               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2">Forma de Pgto.</label>
                 <select 
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/50 appearance-none cursor-pointer"
                 >
                    {['DINHEIRO', 'PIX', 'CARTÃO DÉBITO', 'CARTÃO CRÉDITO', 'BOLETO', 'TRANSFERÊNCIA'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                 </select>
               </div>

               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2">Centro de Custo</label>
                 <select 
                  value={centroCusto}
                  onChange={(e) => setCentroCusto(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/50 appearance-none cursor-pointer"
                 >
                    {['ADMINISTRATIVO', 'OPERACIONAL', 'COMERCIAL'].map(cc => (
                      <option key={cc} value={cc}>{cc}</option>
                    ))}
                 </select>
               </div>
            </div>
          </section>

          {/* Seção 3 - Vínculos */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                <Layers size={24} className="text-orange-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest italic">03. Vínculos</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-900/30 p-10 rounded-[3rem] border border-zinc-900/50 shadow-2xl">
               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2">Vincular OS</label>
                 <select 
                  value={osId}
                  onChange={(e) => setOsId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/50 cursor-pointer"
                 >
                    <option value="">Não vincular</option>
                    {osList.map(os => (
                      <option key={os.id} value={os.id}>OS #{os.numero} - {os.cliente?.nome || 'S/ Ref'}</option>
                    ))}
                 </select>
               </div>

               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2">Vincular Cliente</label>
                 <select 
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/50 cursor-pointer"
                 >
                    <option value="">Nenhum selecionado</option>
                    {clientesList.map(cli => (
                      <option key={cli.id} value={cli.id}>{cli.nome}</option>
                    ))}
                 </select>
               </div>

               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2">Nº do Documento / Nota</label>
                 <input 
                   type="text"
                   value={numeroDocumento}
                   onChange={(e) => setNumeroDocumento(e.target.value)}
                   className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/50"
                   placeholder="Ex: NF-2024-X"
                 />
               </div>

               <div className="space-y-3">
                 <label className="text-[9px] text-zinc-600 uppercase font-black tracking-widest px-2 block mb-1">Anexo de Comprovante</label>
                 <label className="flex items-center justify-center gap-4 bg-zinc-950 border-2 border-dashed border-zinc-900 rounded-2xl p-5 cursor-pointer hover:border-zinc-700 transition-all active:scale-[0.99] group">
                    <input 
                      type="file"
                      className="hidden"
                      onChange={(e) => setComprovante(e.target.files?.[0] || null)}
                      accept="application/pdf,image/*"
                    />
                    <Upload size={20} className="text-zinc-700 group-hover:text-orange-500 transition-colors" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 group-hover:text-zinc-400">
                      {comprovante ? comprovante.name : 'Subir PDF ou Imagem'}
                    </span>
                 </label>
               </div>
            </div>
          </section>

          {/* Seção 4 - Observações */}
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-inner">
                <FileText size={24} className="text-orange-500" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-widest italic">04. Observações Internas</h2>
            </div>

            <div className="bg-zinc-900/30 p-10 rounded-[3rem] border border-zinc-900/50 shadow-2xl">
               <textarea 
                 value={observacao}
                 onChange={(e) => setObservacao(e.target.value)}
                 className="w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-base font-medium text-white outline-none focus:border-orange-500/50 transition-all min-h-[200px] resize-none focus:ring-4 focus:ring-orange-500/5 placeholder:text-zinc-800"
                 placeholder="Digite aqui informações complementares sobre este lançamento..."
               />
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
