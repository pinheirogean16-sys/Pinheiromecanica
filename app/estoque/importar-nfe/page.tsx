'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle, Package, DollarSign, 
  Trash2, ArrowLeft, Loader2, Info, Check, X, AlertTriangle, RefreshCw, Sparkles
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function ImportarNFePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [nfeData, setNfeData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [importFornecedor, setImportFornecedor] = useState(true);
  const [importarFinanceiro, setImportarFinanceiro] = useState(true);

  // Campos de Pagamento
  const [formaPagamento, setFormaPagamento] = useState('BOLETO À VISTA');
  const [numParcelas, setNumParcelas] = useState(3);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Por favor, selecione um arquivo XML válido de NF-e.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/importar-nfe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao processar arquivo XML');
      }

      const data = await res.json();
      setNfeData(data);
      // Select all items by default
      setSelectedItems(data.itens.map((_: any, i: number) => i));
      toast.success('XML processado e integrado com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao processar arquivo XML');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleConfirmImport = async () => {
    if (!nfeData) return;
    if (selectedItems.length === 0) {
      toast.error('Selecione pelo menos 1 item para importar ao estoque.');
      return;
    }

    setConfirming(true);
    setProgressStep('Iniciando integração de NF-e...');
    try {
      // Fake progress step simulation for better UX during Hostinger resource bottlenecks
      setTimeout(() => setProgressStep('Passo 1/3: Cadastrando fornecedor/vínculo...'), 500);
      setTimeout(() => setProgressStep('Passo 2/3: Processando estoque e lançando movimentos...'), 1200);
      setTimeout(() => setProgressStep('Passo 3/3: Registrando programação financeira...'), 2000);

      const res = await fetch('/api/importar-nfe/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nfeData,
          importFornecedor,
          itensParaImportar: selectedItems,
          importarFinanceiro,
          formaPagamento,
          numParcelas,
          diasEntreParcelas,
          dataPrimeiraParcela,
          categoriaPecas: 'OUTROS'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao confirmar importação');
      }

      const confirmation = await res.json();
      const stats = confirmation.results?.stats || { criados: selectedItems.length, atualizados: 0, total: selectedItems.length };
      
      toast.success(
        `NF-e importada! Peças criadas: ${stats.criados} | Peças atualizadas: ${stats.atualizados}`,
        { duration: 6000 }
      );
      router.push('/estoque');
    } catch (error: any) {
      toast.error(error.message || 'Falha na consolidação da NF-e');
    } finally {
      setConfirming(false);
      setProgressStep('');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-8 py-4 sm:py-8 overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition mb-2 text-xs font-black uppercase tracking-widest"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Importação <span className="text-orange-500">NF-e</span>
          </h1>
          <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
            Entrada de mercadorias e atualização de estoque automatizada
          </p>
        </div>

        {nfeData && (
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setNfeData(null);
                setSelectedItems([]);
              }}
              disabled={confirming}
              className="px-6 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest transition hover:bg-zinc-800 flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={14} /> Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={confirming}
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-2xl flex items-center gap-2 transform active:scale-95 disabled:opacity-50"
            >
              {confirming ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />} 
              CONFIRMAR ENTRADA / ESTOQUE
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <div className="bg-zinc-900 border border-orange-600/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
          <Loader2 className="text-orange-500 animate-spin" size={32} />
          <p className="text-sm font-black uppercase tracking-widest text-white">{progressStep}</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Por favor, não saia desta página. Sincronizando com banco ERP...</p>
        </div>
      )}

      {!nfeData ? (
        // Upload Zone
        <div className="relative">
          <input 
            type="file" 
            accept=".xml" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <div 
            onClick={() => !loading && fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 bg-zinc-900/50 rounded-2xl sm:rounded-[3rem] p-6 sm:p-16 md:p-32 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-600/5 hover:border-orange-600/30 transition-all group"
          >
            <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              {loading ? (
                <Loader2 className="text-orange-500 animate-spin" size={40} />
              ) : (
                <Upload className="text-zinc-500 group-hover:text-orange-500 transition-colors" size={40} />
              )}
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">
              {loading ? 'PROCESSANDO XML DA NF-e...' : 'ARRASTE OU SELECIONE SEU XML'}
            </h2>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
              Carregue o arquivo digital de nota fiscal (padrão SEFAZ .xml) para realizar a conferência e entrada
            </p>
          </div>
        </div>
      ) : (
        // Preview Zone
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Supplier and Items */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Resumo do Banco de Dados Bento Block */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-2">CADASTROS ENCONTRADOS</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-black italic text-emerald-400">{nfeData.resumo?.encontrados || 0}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">ATUALIZA ESTOQUE</span>
                </div>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 block mb-2">NOVOS CADASTRADOS</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-black italic text-orange-400">{nfeData.resumo?.novos || 0}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">AUTO-CRIAÇÃO</span>
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-2">TOTAL DE PRODUTOS</span>
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-black italic text-white">{nfeData.resumo?.total || 0}</span>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">VÃO AO ESTOQUE</span>
                </div>
              </div>
            </div>

            {/* Fornecedor Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8">
                <Package className="text-orange-500/20" size={80} />
              </div>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-orange-600/10 rounded-2xl text-orange-500">
                  <FileText size={20} />
                </div>
                <h2 className="text-sm font-black uppercase italic tracking-widest">
                  Dados da Nota e Fornecedor
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Razão Social</p>
                    <p className="text-lg font-black italic truncate">{nfeData.fornecedor.razaoSocial}</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">CNPJ</p>
                      <p className="text-sm font-bold font-mono text-zinc-300">{nfeData.fornecedor.cnpj}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">IE</p>
                      <p className="text-sm font-bold font-mono text-zinc-300">{nfeData.fornecedor.ie}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest font-mono">Endereço Emitente</p>
                    <p className="text-xs text-zinc-400 font-bold truncate">
                      {nfeData.fornecedor.endereco ? `${nfeData.fornecedor.endereco}, ${nfeData.fornecedor.bairro || ''} - ${nfeData.fornecedor.cidade || ''}/${nfeData.fornecedor.uf || ''}` : 'NÃO INFORMADO'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">NF-e</p>
                      <p className="text-sm font-black italic text-zinc-100">{nfeData.numero} / {nfeData.serie}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Emissão</p>
                      <p className="text-sm font-black italic text-zinc-100">{new Date(nfeData.dataEmissao).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl cursor-pointer hover:border-orange-600/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={importFornecedor}
                        onChange={e => setImportFornecedor(e.target.checked)}
                        className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600"
                      />
                      <span className="text-xs font-black uppercase tracking-widest">Cadastrar / Atualizar Fornecedor</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-500">
                    <Package size={20} />
                  </div>
                  <h2 className="text-sm font-black uppercase italic tracking-widest">
                    Itens da Nota ({nfeData.itens.length})
                  </h2>
                </div>
                <div className="flex gap-2">
                   <button 
                    onClick={() => setSelectedItems(nfeData.itens.map((_: any, i: number) => i))}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
                   >
                     Selecionar Tudo
                   </button>
                   <span className="text-zinc-800">|</span>
                   <button 
                    onClick={() => setSelectedItems([])}
                    className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white"
                   >
                     Desmarcar
                   </button>
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-xl">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 min-w-8">#</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 min-w-[100px]">Ref/Código</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 min-w-[220px]">Descrição / Integração</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 text-right">Qtd</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 text-right">Unitário</th>
                      <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 px-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {nfeData.itens.map((item: any, i: number) => (
                      <tr 
                        key={i}
                        className={`group hover:bg-zinc-800/20 transition-colors ${selectedItems.includes(i) ? 'opacity-100' : 'opacity-40'}`}
                      >
                        <td className="py-4 px-2">
                          <input 
                            type="checkbox" 
                            checked={selectedItems.includes(i)}
                            onChange={() => toggleItem(i)}
                            className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600"
                          />
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-[10px] font-bold font-mono text-zinc-300">{item.codigo}</p>
                        </td>
                        <td className="py-4 px-2">
                          <p className="text-xs font-black uppercase italic truncate max-w-sm">{item.descricao}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-[9px] text-zinc-600 font-bold tracking-widest">NCM: {item.ncm}</span>
                            {item.existe ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                                <Check size={8} /> INTEGRARÁ {item.pecaLocal?.quantidade || 0} QTD ESTOQUE (CUSTO: {formatCurrency(item.pecaLocal?.preco_custo || 0)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase bg-orange-500/10 text-orange-400 border border-orange-500/15">
                                <Sparkles size={8} /> AUTO-CADASTRO NOVO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <p className="text-xs font-black italic text-zinc-100">{item.quantidade}</p>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <p className="text-xs font-mono font-bold text-zinc-400">{formatCurrency(item.valorUnitario)}</p>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <p className="text-xs font-black text-white italic">{formatCurrency(item.valorTotal)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Totais */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 space-y-6 lg:sticky lg:top-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-green-600/10 rounded-2xl text-green-500">
                  <DollarSign size={20} />
                </div>
                <h2 className="text-sm font-black uppercase italic tracking-widest">
                  Resumo Financeiro
                </h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Produtos</span>
                  <span>{formatCurrency(nfeData.totais.valorProdutos)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>IPI / Frete</span>
                  <span>{formatCurrency(nfeData.totais.valorFrete)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black text-red-500 uppercase tracking-widest">
                  <span>Descontos</span>
                  <span>-{formatCurrency(nfeData.totais.valorDesconto)}</span>
                </div>
                <div className="pt-6 border-t border-zinc-800 mt-6">
                   <p className="text-[9px] font-black uppercase text-orange-500 tracking-widest mb-1 italic">Total da Nota</p>
                   <p className="text-4xl font-black italic tracking-tighter text-white font-mono">
                     {formatCurrency(nfeData.totais.valorNF)}
                   </p>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-800 space-y-4">
                <label className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl cursor-pointer hover:border-orange-600/50 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={importarFinanceiro}
                    onChange={e => setImportarFinanceiro(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600"
                  />
                  <span className="text-xs font-black uppercase tracking-widest">Gerar Contas a Pagar</span>
                </label>
                
                <div className="p-4 bg-orange-600/5 border border-orange-600/20 rounded-2xl flex gap-3">
                  <Info className="text-orange-500 shrink-0" size={16} />
                  <p className="text-[10px] text-orange-500/80 font-bold uppercase leading-relaxed italic">
                    Ao finalizar, serão processadas {selectedItems.length} peças no estoque e uma movimentação de entrada correspondente.
                  </p>
                </div>
              </div>

              {importarFinanceiro && (
                <div className="pt-6 border-t border-zinc-800 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-600/10 rounded-2xl text-emerald-500">
                      <DollarSign size={20} />
                    </div>
                    <h2 className="text-sm font-black uppercase italic tracking-widest">
                      Dados de Pagamento
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic px-1">Forma de Pagamento</label>
                      <select 
                        value={formaPagamento}
                        onChange={(e) => setFormaPagamento(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner appearance-none cursor-pointer"
                      >
                        <option value="DINHEIRO">DINHEIRO</option>
                        <option value="PIX">PIX</option>
                        <option value="BOLETO À VISTA">BOLETO À VISTA</option>
                        <option value="BOLETO PARCELADO">BOLETO PARCELADO</option>
                      </select>
                    </div>

                    {formaPagamento === 'BOLETO PARCELADO' && (
                      <div className="space-y-4 pt-2 border-t border-zinc-800/50 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-600 uppercase">Parcelas</label>
                            <input 
                              type="number" 
                              min="2" 
                              max="24"
                              value={numParcelas}
                              onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white font-mono outline-none focus:border-orange-500 transition"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-zinc-600 uppercase">Intervalo (dias)</label>
                            <input 
                              type="number" 
                              min="1"
                              value={diasEntreParcelas}
                              onChange={(e) => setDiasEntreParcelas(parseInt(e.target.value) || 28)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white font-mono outline-none focus:border-orange-500 transition"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-zinc-600 uppercase">Data 1ª Parcela</label>
                          <input 
                            type="date"
                            value={dataPrimeiraParcela}
                            onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-orange-500 transition"
                          />
                        </div>

                        {/* Preview das Parcelas */}
                        <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-2">
                            <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic">Simulação</h4>
                            <span className="text-[8px] font-mono text-zinc-600 uppercase">Total Importação: {formatCurrency(nfeData.totais.valorNF)}</span>
                          </div>
                          {Array.from({ length: numParcelas }).map((_, i) => {
                            const vlrParcela = nfeData.totais.valorNF / numParcelas;
                            const dt = new Date(dataPrimeiraParcela);
                            dt.setDate(dt.getDate() + (i * diasEntreParcelas));
                            return (
                              <div key={i} className="flex justify-between items-center text-[10px] font-mono text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-800/50 group hover:border-orange-500/30 transition-all">
                                <span className="text-zinc-600 font-black italic">P {i + 1}/{numParcelas}</span>
                                <span className="text-zinc-400">{dt.toLocaleDateString('pt-BR')}</span>
                                <span className="text-white font-black">{formatCurrency(vlrParcela)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 space-y-6">
               <div className="flex items-center gap-4">
                  <AlertTriangle className="text-yellow-500" size={20} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Chave de Acesso</h3>
               </div>
               <p className="text-[10px] font-mono text-zinc-500 break-all bg-zinc-950 p-4 border border-zinc-800 rounded-xl uppercase">
                 {nfeData.chaveAcesso || 'CHAVE NÃO INFORMADA NO XML'}
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
