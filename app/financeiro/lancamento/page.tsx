'use client';

import { useState } from 'react';
import { ArrowLeft, Save, Loader2, DollarSign, Calendar, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LancamentoLeve() {
  const router = useRouter();
  
  // States Essenciais (Mínimo para o Banco de Dados)
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('SAIDA');
  const [valor, setValor] = useState('0,00');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [categoria, setCategoria] = useState('OUTROS');
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [status, setStatus] = useState('PENDENTE');
  const [saving, setSaving] = useState(false);

  // States Parcelamento
  const [isParcelado, setIsParcelado] = useState(false);
  const [numParcelas, setNumParcelas] = useState(3);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) value = "0";
    let floatValue = parseInt(value) / 100;
    setValor(floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!descricao || descricao.length < 3) {
      return toast.error('Descreva o lançamento (mín. 3 caracteres)');
    }

    const valorFloat = parseFloat(valor.replace(/\./g, "").replace(",", "."));
    if (valorFloat === 0) {
      return toast.error('O valor deve ser maior que zero');
    }

    setSaving(true);
    try {
      if (isParcelado) {
        const valorParcela = valorFloat / numParcelas;
        
        for (let i = 0; i < numParcelas; i++) {
          const vencimento = new Date(dataPrimeiraParcela);
          vencimento.setDate(vencimento.getDate() + (i * diasEntreParcelas));

          await fetch('/api/financeiro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo,
              descricao: `${descricao} - Parcela ${i + 1}/${numParcelas}`,
              valor: valorParcela,
              data: new Date(data).toISOString(),
              data_vencimento: vencimento.toISOString(),
              status: 'PENDENTE',
              categoria,
              forma_pagamento: formaPagamento
            }),
            credentials: 'include'
          });
        }
        toast.success(`${numParcelas} parcelas registradas!`);
        router.push('/financeiro');
      } else {
        const res = await fetch('/api/financeiro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            descricao,
            valor: valorFloat,
            data: new Date(data).toISOString(),
            status,
            categoria,
            forma_pagamento: formaPagamento
          }),
          credentials: 'include'
        });

        if (res.ok) {
          toast.success('Lançamento registrado!');
          router.push('/financeiro');
        } else {
          const err = await res.json();
          toast.error(err.error || 'Erro ao salvar');
        }
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black text-zinc-100 min-h-screen font-sans selection:bg-orange-500/30">
      <header className="p-6 md:p-10 border-b border-zinc-900 bg-zinc-950 shadow-2xl relative z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/financeiro')}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">Lançamento Rápido</h1>
          </div>

          <button 
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="flex items-center gap-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-black px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[2rem] space-y-8">
            
            {/* TIPO */}
            <div className="space-y-3">
              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Natureza do Fluxo</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => setTipo('ENTRADA')}
                  className={`py-4 rounded-2xl font-black text-[10px] tracking-widest border transition-all ${tipo === 'ENTRADA' ? 'bg-green-600 text-white border-green-500' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                >ENTRADA</button>
                <button 
                  type="button"
                  onClick={() => setTipo('SAIDA')}
                  className={`py-4 rounded-2xl font-black text-[10px] tracking-widest border transition-all ${tipo === 'SAIDA' ? 'bg-red-600 text-white border-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
                >SAÍDA</button>
              </div>
            </div>

            {/* VALOR */}
            <div className="space-y-3">
              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Valor do Título</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 font-bold italic group-focus-within:text-orange-500">R$</div>
                <input 
                  type="text"
                  value={valor}
                  onChange={handleValorChange}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-5 pl-14 pr-6 text-2xl font-black font-mono italic text-white outline-none focus:border-orange-500/30 transition-all"
                />
              </div>
            </div>

            {/* DESCRICAO */}
            <div className="space-y-3">
              <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Descrição / Detalhes</label>
              <textarea 
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-sm font-bold text-white outline-none focus:border-orange-500/30 transition-all min-h-[120px] resize-none"
                placeholder="O que está sendo pago ou recebido?"
              />
            </div>

            {/* DATA, CATEGORIA E STATUS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Data da Operação</label>
                <input 
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 font-mono"
                />
              </div>

              <div className="space-y-3">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Categoria</label>
                <select 
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 appearance-none"
                >
                  {['PEÇAS', 'SERVIÇOS', 'MÃO DE OBRA', 'IMPOSTOS', 'MANUTENÇÃO', 'SALÁRIOS', 'COMBUSTÍVEL', 'FRETE', 'TAXAS', 'OUTROS'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Status</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 appearance-none"
                >
                  <option value="PENDENTE">🟡 PENDENTE</option>
                  <option value="PAGO">🟢 PAGO</option>
                  <option value="ATRASADO">🔴 ATRASADO</option>
                  <option value="CANCELADO">⚪ CANCELADO</option>
                </select>
              </div>
            </div>

            {/* FORMA DE PGTO */}
            <div className="pt-6 border-t border-zinc-900/50 space-y-8">
              <div className="space-y-3">
                <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Forma de Pagamento</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 appearance-none"
                >
                  {['DINHEIRO', 'PIX', 'CARTÃO DÉBITO', 'CARTÃO CRÉDITO', 'BOLETO', 'TRANSFERÊNCIA'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* TOGGLE PARCELAMENTO */}
              <div className="flex items-center justify-between p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Deseja Parcelar?</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Criar múltiplos lançamentos automaticamente</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsParcelado(!isParcelado)}
                  className={`w-20 h-10 rounded-full border-2 transition-all flex items-center px-1 ${isParcelado ? 'bg-orange-500/20 border-orange-500 justify-end' : 'bg-zinc-800 border-zinc-700 justify-start'}`}
                >
                  <div className={`w-7 h-7 rounded-full shadow-lg transition-all ${isParcelado ? 'bg-orange-500' : 'bg-zinc-500'}`} />
                </button>
              </div>

              {/* CAMPOS PARCELAMENTO */}
              {isParcelado && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Número de Parcelas</label>
                      <input 
                        type="number"
                        min="2"
                        max="12"
                        value={numParcelas}
                        onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 font-mono"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Dias entre Parcelas</label>
                      <input 
                        type="number"
                        min="1"
                        value={diasEntreParcelas}
                        onChange={(e) => setDiasEntreParcelas(parseInt(e.target.value) || 28)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest px-1">Vencimento da 1ª Parcela</label>
                    <input 
                      type="date"
                      value={dataPrimeiraParcela}
                      onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-xs font-bold text-white outline-none focus:border-orange-500/30 font-mono"
                    />
                  </div>

                  {/* PREVIEW */}
                  <div className="space-y-4 pt-6 border-t border-zinc-900">
                    <h4 className="text-[9px] font-black text-zinc-600 uppercase tracking-widest italic leading-none">Preview das Parcelas</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {Array.from({ length: numParcelas }).map((_, i) => {
                        const vlrFloat = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
                        const vlrParc = vlrFloat / numParcelas;
                        const dtParc = new Date(dataPrimeiraParcela);
                        dtParc.setDate(dtParc.getDate() + (i * diasEntreParcelas));
                        
                        return (
                          <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-900 rounded-xl group hover:border-orange-500/30 transition-all">
                            <span className="text-[10px] font-black text-zinc-600 italic">P {i + 1}/{numParcelas}</span>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-white leading-none mb-1">Venc: {dtParc.toLocaleDateString('pt-BR')}</p>
                              <p className="text-xs font-black text-emerald-500 font-mono italic">R$ {vlrParc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

        </form>
      </main>
    </div>
  );
}
