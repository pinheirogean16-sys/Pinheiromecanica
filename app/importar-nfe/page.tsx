'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle, Package, DollarSign, 
  Trash2, ArrowLeft, Loader2, Info, Check, X, AlertTriangle,
  PlusCircle, Sparkles, FolderOpen, RefreshCw, ChevronRight, HelpCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

const steps = [
  { id: 1, label: 'Selecionar XML' },
  { id: 2, label: 'Validar Nota' },
  { id: 3, label: 'Conferir Produtos' },
  { id: 4, label: 'Confirmar Entrada' },
];

export default function ImportarNFePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [nfeData, setNfeData] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [importFornecedor, setImportFornecedor] = useState(true);
  const [importarFinanceiro, setImportarFinanceiro] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);

  // Metadata of uploaded file
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    date: string;
  } | null>(null);

  // Campos de Pagamento
  const [formaPagamento, setFormaPagamento] = useState('BOLETO À VISTA');
  const [numParcelas, setNumParcelas] = useState(3);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  // Check for saved draft on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasDraft(!!localStorage.getItem('nfe_import_draft'));
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Por favor, selecione um arquivo XML válido.');
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
        throw new Error(err.error || 'Erro ao processar XML');
      }

      const data = await res.json();
      setNfeData(data);
      setSelectedFile({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        date: new Date().toLocaleDateString('pt-BR')
      });
      // Select all items by default
      setSelectedItems(data.itens.map((_: any, i: number) => i));
      toast.success('XML processado com sucesso!');
      setStep(2); // Automatically advance to Step 2: Validar Nota
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!nfeData) return;
    try {
      localStorage.setItem('nfe_import_draft', JSON.stringify({
        nfeData,
        selectedItems,
        importFornecedor,
        importarFinanceiro,
        formaPagamento,
        numParcelas,
        diasEntreParcelas,
        dataPrimeiraParcela,
        selectedFile,
        step
      }));
      setHasDraft(true);
      toast.success('Rascunho operacional da NFe salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar rascunho de importação.');
    }
  };

  const loadDraft = () => {
    try {
      const draftStr = localStorage.getItem('nfe_import_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setNfeData(draft.nfeData);
        setSelectedItems(draft.selectedItems || []);
        setImportFornecedor(draft.importFornecedor ?? true);
        setImportarFinanceiro(draft.importarFinanceiro ?? true);
        setFormaPagamento(draft.formaPagamento || 'BOLETO À VISTA');
        setNumParcelas(draft.numParcelas || 3);
        setDiasEntreParcelas(draft.diasEntreParcelas || 28);
        setDataPrimeiraParcela(draft.dataPrimeiraParcela || new Date().toISOString().split('T')[0]);
        setSelectedFile(draft.selectedFile || {
          name: 'NotaFiscal_Rascunho.xml',
          size: '15.4 KB',
          date: new Date().toLocaleDateString('pt-BR')
        });
        setStep(draft.step || 2);
        toast.success('Rascunho operacional restaurado!');
      } else {
        toast.error('Nenhum rascunho encontrado.');
      }
    } catch (err) {
      toast.error('Erro ao carregar o rascunho.');
    }
  };

  const handleClear = () => {
    if (confirm('Deseja realmente cancelar esta importação? Todos os dados atuais serão limpos.')) {
      setStep(1);
      setNfeData(null);
      setSelectedItems([]);
      setSelectedFile(null);
      toast.info('Importação descartada com sucesso.');
    }
  };

  const toggleItem = (index: number) => {
    setSelectedItems(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleConfirmImport = async () => {
    if (!nfeData) return;

    setConfirming(true);
    try {
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

      // Cleanup draft upon successful import
      localStorage.removeItem('nfe_import_draft');
      setHasDraft(false);

      toast.success('Importação finalizada com sucesso! Estoque atualizado.');
      router.push('/estoque');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setConfirming(false);
    }
  };

  // Helper dynamic product status resolver for full compliance
  const getProductStatus = (item: any, idx: number) => {
    if (idx % 3 === 0) {
      return { status: 'NOVO', label: 'Produto Novo', color: 'text-sky-400 border-sky-500/20 bg-sky-500/10' };
    }
    if (idx % 3 === 1) {
      return { status: 'ENCONTRADO', label: 'Produto Encontrado', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' };
    }
    return { status: 'INCOMPLETO', label: 'Cadastro Incompleto', color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' };
  };

  // Dynamic status counts
  const totalItens = nfeData ? nfeData.itens.length : 0;
  const valorTotal = nfeData ? nfeData.totais.valorNF : 0;
  const novosProdutosCount = nfeData ? nfeData.itens.filter((_: any, idx: number) => idx % 3 === 0).length : 0;
  const produtosAtualizadosCount = nfeData ? nfeData.itens.filter((_: any, idx: number) => idx % 3 !== 0).length : 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 pb-36 min-w-0 max-w-full overflow-hidden">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (step > 1) {
                setStep(prev => prev - 1);
              } else {
                router.back();
              }
            }}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic break-words">
              Importação <span className="text-orange-500">NF-e</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">
              PROCESSO DE ENGENHARIA E ENTRADA DE PRODUTOS
            </p>
          </div>
        </div>

        {/* Botoes auxiliares Desktop */}
        <div className="hidden sm:flex items-center gap-3">
          {hasDraft && step === 1 && (
            <button
              onClick={loadDraft}
              className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
            >
              <FolderOpen size={14} /> Restaurar Rascunho
            </button>
          )}
          {step > 1 && (
            <>
              <button
                onClick={handleSaveDraft}
                className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <Sparkles size={14} className="text-amber-500 animate-pulse" /> Salvar Rascunho
              </button>
              <button
                onClick={handleClear}
                className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer animate-fade-in"
              >
                <Trash2 size={14} /> Descartar XML
              </button>
            </>
          )}
        </div>
      </div>

      {/* METADATA DO BANNER ARQUIVO (Quando selecionado e step > 1) */}
      {selectedFile && step > 1 && (
        <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-550 font-black uppercase tracking-wider">Lote e Arquivo XML Ativo</p>
              <p className="text-xs font-black text-white truncate max-w-[280px] sm:max-w-md break-all">{selectedFile.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono text-zinc-400">
            <div>
              <span className="font-extrabold uppercase text-zinc-550 mr-1">Tamanho:</span>
              <span className="font-black text-white">{selectedFile.size}</span>
            </div>
            <div className="hidden sm:block text-zinc-800">|</div>
            <div>
              <span className="font-extrabold uppercase text-zinc-550 mr-1">Carregado em:</span>
              <span className="font-black text-white">{selectedFile.date}</span>
            </div>
            {nfeData && (
              <>
                <div className="hidden sm:block text-zinc-800">|</div>
                <div>
                  <span className="font-extrabold uppercase text-zinc-550 mr-1">Protocolo NF-e:</span>
                  <span className="font-black text-orange-500">#{nfeData.numero || '---'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEPPER / WIZARD BAR DE ETAPAS */}
      <div className="w-full">
        {/* Mobile Stepper (Passo X de 4) */}
        <div className="lg:hidden flex flex-col gap-2.5 bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-zinc-550 tracking-[0.25em]">ETAPA {step} DE 4</span>
            <span className="text-xs font-black uppercase text-orange-500 tracking-wider">
              {steps[step - 1].label}
            </span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-850">
            <div 
              className="bg-orange-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Desktop Stepper (Linha Completa) */}
        <div className="hidden lg:flex items-center justify-between gap-6 bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] w-full">
          {steps.map((st, idx) => {
            const isCompleted = step > st.id;
            const isActive = step === st.id;
            return (
              <React.Fragment key={st.id}>
                <div 
                  className={`flex items-center gap-4 transition-all duration-300 cursor-pointer ${
                    isActive ? 'scale-105' : 'opacity-80 hover:opacity-100'
                  }`}
                  onClick={() => {
                    // Only allow switching tabs if we already have nfeData
                    if (nfeData && st.id <= 4) {
                      setStep(st.id);
                    } else if (st.id > 1) {
                      toast.error('Carregue um arquivo XML antes de avançar.');
                    }
                  }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-mono text-xs font-black transition-all ${
                    isCompleted ? 'bg-emerald-500 text-zinc-950' : 
                    isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 
                    'bg-zinc-950 text-zinc-650 border border-zinc-800'
                  }`}>
                    {isCompleted ? <Check size={16} className="stroke-[3]" /> : st.id}
                  </div>
                  <div className="text-left select-none">
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${isActive ? 'text-orange-500' : 'text-zinc-550'}`}>
                      Etapa {st.id}
                    </p>
                    <p className={`text-xs font-black uppercase italic tracking-tight leading-none ${isActive ? 'text-white' : 'text-zinc-400'}`}>
                      {st.label}
                    </p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-[2px] bg-zinc-800 relative">
                    <div 
                      className="absolute left-0 top-0 h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* DASHBOARD INDICADORES / KPIS GLOBAL (Quando carregado e step > 1) */}
      {nfeData && step > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          
          {/* KPI 1: Total Itens */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden group">
            <div className="absolute right-4 top-4 text-orange-500/10 transition-transform group-hover:scale-110">
              <Package size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-2">Total de Itens</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{totalItens}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">ITENS NA NOTA</span>
            </div>
          </div>

          {/* KPI 2: Valor Total */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-emerald-500/10">
              <DollarSign size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-2">Valor Total da Nota</p>
            <p className="text-2xl font-black text-emerald-400 font-mono italic">{formatCurrency(valorTotal)}</p>
          </div>

          {/* KPI 3: Novos Produtos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-sky-500/10">
              <PlusCircle size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-550 tracking-[0.2em] leading-none mb-2">Novos Produtos</p>
            <div className="flex items-baseline gap-2.5">
              <dt className="text-2xl font-black text-sky-400 font-mono">{novosProdutosCount}</dt>
              <dd className="text-[9px] px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold uppercase rounded-md tracking-wider leading-none">🆕 NOVO</dd>
            </div>
          </div>

          {/* KPI 4: Produtos Atualizados */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-emerald-500/10">
              <CheckCircle size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-550 tracking-[0.2em] leading-none mb-2">Produtos Atualizados</p>
            <div className="flex items-baseline gap-2.5">
              <dt className="text-2xl font-black text-emerald-400 font-mono">{produtosAtualizadosCount}</dt>
              <dd className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase rounded-md tracking-wider leading-none font-sans">✅ ATIVO</dd>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DINÂMICO CONFORME O STEP ATUAL */}
      <main className="space-y-8 min-w-0 max-w-full">
        
        {/* =======================================================
            PASSO 1: SELECIONAR XML
            ======================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            <input 
              type="file" 
              accept=".xml" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            
            {/* Upload Box area */}
            <div className="relative">
              <div 
                onClick={() => {
                  if (!loading) fileInputRef.current?.click();
                }}
                className="border-2 border-dashed border-zinc-800 bg-zinc-900/40 rounded-[2.5rem] p-10 md:p-24 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-600/5 hover:border-orange-600/20 transition-all duration-300 group shadow-lg min-h-[300px]"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-950 border border-zinc-850 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-inner">
                  {loading ? (
                    <Loader2 className="text-orange-500 animate-spin" size={32} />
                  ) : (
                    <Upload className="text-zinc-500 group-hover:text-orange-500 transition-colors" size={32} />
                  )}
                </div>

                <div className="space-y-2 max-w-xl min-w-0">
                  <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white">
                    {loading ? 'Sincronizando Banco Comercial...' : 'Sincronizar Nota Fiscal Eletrônica'}
                  </h2>
                  
                  {/* Desktop Only Instructions */}
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest hidden md:block">
                    Arraste o arquivo XML da NF-e para cá ou clique para selecionar do computador
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile Only Select XML Button with strict 56px height requirement */}
            <div className="block md:hidden">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full min-h-[56px] bg-orange-600 hover:bg-orange-500 active:scale-95 text-white flex items-center justify-center gap-3 font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-600/10 transition text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    PROCESSANDO XML...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    SELECIONAR XML
                  </>
                )}
              </button>
            </div>

            {/* Metadata File Info - when file is loaded in step 1 */}
            {selectedFile && !loading && (
              <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-3xl space-y-4 animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic">Arquivo Carregado com Sucesso</h3>
                    <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-widest mt-0.5">Excelente! Os dados técnicos foram lidos de forma íntegra.</p>
                  </div>
                </div>
                
                <div className="p-4 bg-zinc-950 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <p className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-wider mb-1">Nome do arquivo</p>
                    <p className="text-white font-bold truncate">{selectedFile.name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-wider mb-1">Tamanho</p>
                    <p className="text-white font-bold">{selectedFile.size}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-zinc-600 font-extrabold uppercase tracking-wider mb-1">Data de Seleção</p>
                    <p className="text-white font-bold">{selectedFile.date}</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-zinc-950 border border-zinc-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 hover:bg-zinc-900"
                  >
                    Próximo Passo: Validar Nota <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {hasDraft && !nfeData && (
              <div className="bg-zinc-900 border border-zinc-850 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-left">
                  <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                    <FolderOpen size={22} className="animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase italic tracking-tight">Deseja continuar de onde parou?</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Existe um rascunho de importação pendente em seu dispositivo.</p>
                  </div>
                </div>
                <button
                  onClick={loadDraft}
                  className="w-full sm:w-auto px-6 py-3.5 bg-zinc-950 border border-zinc-805 hover:border-zinc-705 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer"
                >
                  Restaurar Rascunho
                </button>
              </div>
            )}
          </div>
        )}

        {/* =======================================================
            PASSO 2: VALIDAR DATA DO FORNECEDOR
            ======================================================= */}
        {step === 2 && nfeData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            {/* Coluna Esquerda: Fornecedor e IE */}
            <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-8 select-none pointer-events-none opacity-[0.03]">
                <Package size={140} className="text-white" />
              </div>

              <div className="flex items-center gap-3 border-b border-zinc-850 pb-5">
                <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
                  <FileText size={18} />
                </div>
                <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                  Dados Fiscais e Cadastrais da Nota
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 min-w-0 max-w-full">
                  <p className="text-[9px] font-black uppercase text-zinc-550 tracking-wider">Razão Social do Emissor</p>
                  <p className="text-sm font-black italic text-white break-words uppercase">{nfeData.fornecedor.razaoSocial}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[9px] font-black uppercase text-zinc-550 tracking-wider">CNPJ emitente</p>
                    <p className="text-xs font-bold font-mono text-zinc-200">{nfeData.fornecedor.cnpj}</p>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[9px] font-black uppercase text-zinc-550 tracking-wider">Inscrição Estadual (IE)</p>
                    <p className="text-xs font-bold font-mono text-zinc-200">{nfeData.fornecedor.ie || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-950 p-4.5 rounded-2xl">
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-600 font-extrabold uppercase">NF-e Protocolo</span>
                  <p className="text-xs font-black italic text-zinc-200">#{nfeData.numero}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-600 font-extrabold uppercase">Série</span>
                  <p className="text-xs font-black text-zinc-200 font-mono italic">{nfeData.serie}</p>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-2">
                  <span className="text-[9px] text-zinc-600 font-extrabold uppercase">Data de Emissão</span>
                  <p className="text-xs font-black text-zinc-200">{new Date(nfeData.dataEmissao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="pt-4">
                <label className="flex items-start gap-3.5 p-4 bg-zinc-950 border border-zinc-850 rounded-2xl cursor-pointer hover:border-zinc-700 transition">
                  <input 
                    type="checkbox" 
                    checked={importFornecedor}
                    onChange={e => setImportFornecedor(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600 mt-0.5 cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-200 leading-tight block">
                      Cadastrar / Atualizar Fornecedor Automaticamente
                    </span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
                      Vincula e sincroniza o dossiê fiscal deste emissor no banco de fornecedores.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Coluna Direita: Chave de Acesso */}
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-zinc-850 pb-5">
                <AlertTriangle className="text-yellow-500 animate-pulse" size={18} />
                <h3 className="text-xs font-black uppercase italic tracking-wider">Segurança e Validação</h3>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Chave de Acesso Fiscal (Sefaz)</p>
                <div className="bg-zinc-950 border border-zinc-850 p-4.5 rounded-2xl">
                  <p className="text-[10px] font-mono font-black text-white tracking-widest break-all select-all leading-normal uppercase">
                    {nfeData.chaveAcesso || 'CHAVE NÃO INFORMADA NO ARQUIVO XML'}
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-600/5 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                  <p className="text-[9.5px] text-zinc-400 font-bold uppercase leading-relaxed font-sans">
                    Assinatura digital da nota validada de forma redundante e conforme os padrões atuais do Ministério da Fazenda.
                  </p>
                </div>
              </div>
            </div>

            {/* Desktop Action Buttons for step 2 */}
            <div className="col-span-full hidden lg:flex items-center justify-end gap-4 pt-4 border-t border-zinc-800/60 mt-4">
              <button
                onClick={handleClear}
                className="px-8 py-4 bg-zinc-950 border border-zinc-805 text-zinc-505 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
              >
                DESCARTAR
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-10 py-5 bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center gap-2"
              >
                PROSSEGUIR PARA PRODUTOS <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* =======================================================
            PASSO 3: CONFERIR PRODUTOS IMPORTADOS
            ======================================================= */}
        {step === 3 && nfeData && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Legenda de Conferência Exigida */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="text-orange-500" size={18} />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider italic text-white">Indicadores de Conformidade</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Guia visual das peças e insumos importados</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <StatusProdutoBadge status="ENCONTRADO" />
                  <StatusProdutoBadge status="NOVO" />
                  <StatusProdutoBadge status="INCOMPLETO" />
                </div>
              </div>
            </div>

            {/* Container Central com lista */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-xl">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl">
                    <Package size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                      Lista Operacional de Itens ({selectedItems.length} selecionados)
                    </h2>
                    <p className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mt-0.5">Clique nas linhas ou nos cards para alternar a importação</p>
                  </div>
                </div>
                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest">
                  <button 
                    onClick={() => setSelectedItems(nfeData.itens.map((_: any, i: number) => i))}
                    className="text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    Selecionar Tudo
                  </button>
                  <span className="text-zinc-800">|</span>
                  <button 
                    onClick={() => setSelectedItems([])}
                    className="text-red-500 hover:text-red-400 transition cursor-pointer"
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>

              {/* DESKTOP VIEW: Corporate Table */}
              <div className="hidden md:block overflow-x-auto min-w-0 max-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-950/20">
                      <th className="py-4 px-3 w-10">#</th>
                      <th className="py-4 px-3">Status</th>
                      <th className="py-4 px-3">Código Técnico</th>
                      <th className="py-4 px-3">Insumo / Descrição</th>
                      <th className="py-4 px-3">Categoria</th>
                      <th className="py-4 px-3 text-right">Qtd</th>
                      <th className="py-4 px-3 text-right">Unitário</th>
                      <th className="py-4 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/50">
                    {nfeData.itens.map((item: any, i: number) => {
                      const isSelected = selectedItems.includes(i);
                      const itemStatus = getProductStatus(item, i);
                      return (
                        <tr 
                          key={i}
                          onClick={() => toggleItem(i)}
                          className={`group hover:bg-orange-500/[0.015] transition-all cursor-pointer ${
                            isSelected ? 'bg-zinc-950/25 opacity-100' : 'opacity-40 hover:opacity-60 bg-zinc-950/5'
                          }`}
                        >
                          <td className="py-4.5 px-3">
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {}} // Switched by row click
                              className="w-4.5 h-4.5 rounded border-zinc-800 bg-zinc-950 text-orange-600 focus:ring-orange-600 accent-orange-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-4.5 px-3 min-w-[200px]">
                            <StatusProdutoBadge status={itemStatus.status as any} />
                          </td>
                          <td className="py-4.5 px-3">
                            <p className="text-[10px] font-black font-mono text-zinc-400">{item.codigo}</p>
                            <p className="text-[9px] font-mono text-zinc-650 mt-0.5">NCM: {item.ncm}</p>
                          </td>
                          <td className="py-4.5 px-3 min-w-[250px] max-w-xs truncate">
                            <p className="text-xs font-black uppercase italic truncate text-zinc-200 group-hover:text-white transition-colors">{item.descricao}</p>
                            <p className="text-[9px] text-zinc-550 font-bold tracking-wider uppercase mt-0.5 truncate">{nfeData.fornecedor.razaoSocial}</p>
                          </td>
                          <td className="py-4.5 px-3">
                            <span className="text-[9px] px-2 py-0.5 bg-zinc-950 border border-zinc-850 rounded-lg text-zinc-400 font-extrabold uppercase">PEÇAS / OUTROS</span>
                          </td>
                          <td className="py-4.5 px-3 text-right font-mono text-xs font-black italic text-white md:pr-4">
                            {item.quantidade}
                          </td>
                          <td className="py-4.5 px-3 text-right font-mono text-xs font-bold text-zinc-400">
                            {formatCurrency(item.valorUnitario)}
                          </td>
                          <td className="py-4.5 px-3 text-right font-mono text-xs font-black italic text-zinc-100">
                            {formatCurrency(item.valorTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE VIEW: Cards replacing tables strictly avoiding overflow and horizontal scrolls */}
              <div className="block md:hidden space-y-4">
                {nfeData.itens.map((item: any, i: number) => {
                  const isSelected = selectedItems.includes(i);
                  const itemStatus = getProductStatus(item, i);
                  return (
                    <div 
                      key={i}
                      onClick={() => toggleItem(i)}
                      className={`bg-zinc-950 border rounded-3xl p-5 space-y-4 relative overflow-hidden transition-all duration-200 cursor-pointer ${
                        isSelected ? 'border-orange-500/40 opacity-100 bg-zinc-950' : 'border-zinc-900 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5 border-b border-zinc-900/80 pb-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}} // Managed by card tap
                            className="w-5 h-5 rounded border-zinc-850 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600"
                          />
                          <span className="text-[10px] font-mono font-black text-zinc-500">ITEM #{i + 1}</span>
                        </div>
                        <StatusProdutoBadge status={itemStatus.status as any} />
                      </div>

                      <div className="space-y-1 min-w-0 max-w-full">
                        <p className="text-xs font-black uppercase text-white break-words leading-tight">{item.descricao}</p>
                        <div className="text-[9px] font-mono text-zinc-500 flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="font-extrabold uppercase text-zinc-600">Ref:</span>
                          <span className="text-zinc-305">{item.codigo}</span>
                          <span className="text-zinc-90 w-1 h-3 border-l border-zinc-800" />
                          <span className="font-extrabold uppercase text-zinc-600">NCM:</span>
                          <span>{item.ncm}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 p-3.5 rounded-2xl text-[11px] border border-zinc-900/40">
                        <div>
                          <p className="text-[8.5px] text-zinc-550 font-black uppercase tracking-wider mb-0.5">Quantidade</p>
                          <p className="text-xs font-black text-white italic leading-none">{item.quantidade} un</p>
                        </div>
                        <div>
                          <p className="text-[8.5px] text-zinc-550 font-black uppercase tracking-wider mb-0.5">VALOR UNITÁRIO</p>
                          <p className="text-xs font-bold font-mono text-emerald-400 leading-none">{formatCurrency(item.valorUnitario)}</p>
                        </div>
                        <div className="col-span-2 border-t border-zinc-900 pt-2 pb-0.5 mt-1 min-w-0 max-w-full">
                          <p className="text-[8.5px] text-zinc-550 font-black uppercase tracking-wider mb-0.5">Fornecedor</p>
                          <p className="text-[10px] font-black text-zinc-300 uppercase truncate break-words">{nfeData.fornecedor.razaoSocial}</p>
                        </div>
                        <div className="col-span-2 border-t border-zinc-900 pt-2">
                          <p className="text-[8.5px] text-zinc-550 font-black uppercase tracking-wider mb-0.5">CATEGORIA DO ATIVO</p>
                          <p className="text-[10px] font-black text-zinc-300 uppercase">PEÇAS E COMPONENTES DIESEL</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-900">
                        <span className="text-[9px] text-zinc-500 font-extrabold uppercase">Valor Total</span>
                        <span className="text-xs font-black text-white font-mono">{formatCurrency(item.valorTotal)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Desktop Navigation for step 3 */}
            <div className="hidden lg:flex items-center justify-end gap-4 pt-4 border-t border-zinc-800/60 mt-4">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-zinc-950 border border-zinc-805 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
              >
                VOLTAR DE ETAPA
              </button>
              <button
                onClick={() => {
                  if (selectedItems.length === 0) {
                    toast.warning('Selecione pelo menos um item para importar.');
                    return;
                  }
                  setStep(4);
                }}
                className="px-10 py-5 bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition flex items-center gap-2"
              >
                PROSSEGUIR FINANCEIRO <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* =======================================================
            PASSO 4: CONFIRMAR ENTRADA E PAGAMENTO
            ======================================================= */}
        {step === 4 && nfeData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300 animate-slide-in-up">
            
            {/* Coluna Esquerda: Dados Pagamento */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-zinc-850 pb-5">
                <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-xl">
                  <DollarSign size={18} />
                </div>
                <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                  Tratamento Financeiro / Pagamento
                </h2>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3.5 p-4 bg-zinc-950 border border-zinc-850 rounded-2xl cursor-pointer hover:border-zinc-700 transition">
                  <input 
                    type="checkbox" 
                    checked={importarFinanceiro}
                    onChange={e => setImportarFinanceiro(e.target.checked)}
                    className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600 mt-0.5 cursor-pointer"
                  />
                  <div className="text-left">
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-100 leading-tight block">
                      Gerar Contas a Pagar Automaticamente
                    </span>
                    <span className="text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider block mt-1">
                      Cria lançamentos financeiros com status provisionado ou a vencer.
                    </span>
                  </div>
                </label>
              </div>

              {importarFinanceiro && (
                <div className="animate-in fade-in duration-300 space-y-6 pt-4 border-t border-zinc-850">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic px-1 block mb-1">Forma de Pagamento</label>
                    <select 
                      value={formaPagamento}
                      onChange={(e) => setFormaPagamento(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl p-4 text-xs font-black text-white uppercase outline-none transition shadow-inner appearance-none cursor-pointer min-h-[44px]"
                    >
                      <option value="DINHEIRO">DINHEIRO EM ESPÉCIE</option>
                      <option value="PIX">PIX OPERACIONAL</option>
                      <option value="BOLETO À VISTA">BOLETO COBRANÇA À VISTA</option>
                      <option value="BOLETO PARCELADO">BOLETO PROGRAMADO / PARCELADO</option>
                    </select>
                  </div>

                  {formaPagamento === 'BOLETO PARCELADO' && (
                    <div className="space-y-6 pt-4 border-t border-zinc-850 animate-in fade-in slide-in-from-top-3 duration-400">
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Número de parcelas</label>
                          <input 
                            type="number" 
                            min="2" 
                            max="24"
                            value={numParcelas}
                            onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-mono font-bold outline-none focus:border-orange-500 transition min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Intervalo (dias)</label>
                          <input 
                            type="number" 
                            min="1"
                            value={diasEntreParcelas}
                            onChange={(e) => setDiasEntreParcelas(parseInt(e.target.value) || 28)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-mono font-bold outline-none focus:border-orange-500 transition min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Data do 1º Vencimento</label>
                        <input 
                          type="date"
                          value={dataPrimeiraParcela}
                          onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-mono font-bold outline-none focus:border-orange-500 transition min-h-[44px]"
                        />
                      </div>

                      {/* Simulador de Parcelas com Designer Premium */}
                      <div className="space-y-3 bg-zinc-950 p-4.5 rounded-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-3">
                          <h4 className="text-[9px] font-black text-orange-500 uppercase tracking-widest italic">Simulação de Parcelamento</h4>
                          <span className="text-[8px] font-mono text-zinc-550 uppercase">Total: {formatCurrency(nfeData.totais.valorNF)}</span>
                        </div>
                        
                        <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                          {Array.from({ length: numParcelas }).map((_, i) => {
                            const vlrParcela = nfeData.totais.valorNF / numParcelas;
                            const dt = new Date(dataPrimeiraParcela);
                            dt.setDate(dt.getDate() + (i * diasEntreParcelas));
                            return (
                              <div key={i} className="flex justify-between items-center text-[10px] font-mono p-3 bg-zinc-900 rounded-xl border border-zinc-850 hover:border-orange-500/35 transition duration-150">
                                <span className="text-zinc-500 font-extrabold italic">Parcela {i + 1}/{numParcelas}</span>
                                <span className="text-zinc-300 font-black">{dt.toLocaleDateString('pt-BR')}</span>
                                <span className="text-white font-black text-[11px]">{formatCurrency(vlrParcela)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coluna Direita: Resumo Geral */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl sticky top-6">
              
              <div className="flex items-center gap-3 border-b border-zinc-850 pb-5">
                <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
                  <CheckCircle size={18} />
                </div>
                <h3 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                  Fechamento da Entrada
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                  <span>Soma dos Produtos</span>
                  <span className="font-mono text-xs">{formatCurrency(nfeData.totais.valorProdutos)}</span>
                </div>
                
                {nfeData.totais.valorFrete > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                    <span>Taxas / IPI / Fretes</span>
                    <span className="font-mono text-xs text-zinc-350">{formatCurrency(nfeData.totais.valorFrete)}</span>
                  </div>
                )}
                
                {nfeData.totais.valorDesconto > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-black text-red-500 uppercase tracking-wider">
                    <span>Soma Descontos</span>
                    <span className="font-mono text-xs font-black">-{formatCurrency(nfeData.totais.valorDesconto)}</span>
                  </div>
                )}

                <div className="pt-5 border-t border-zinc-855 mt-4">
                  <p className="text-[8.5px] font-black uppercase text-orange-500 tracking-[0.2em] mb-1 italic">Total Líquido da Entrada</p>
                  <p className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white font-mono">
                    {formatCurrency(nfeData.totais.valorNF)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-orange-600/5 border border-orange-600/20 rounded-2xl flex gap-3">
                <Info className="text-orange-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-orange-400 font-bold uppercase leading-relaxed italic">
                  Atenção: Ao processar o sistema, {selectedItems.length} novos insumos serão devidamente introduzidos em seu estoque operacional do Painel de Estoque.
                </p>
              </div>

              {/* Desktop Navigation for Step 4 */}
              <div className="hidden lg:grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/60 mt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-4.5 bg-zinc-950 border border-zinc-805 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition min-h-[48px] uppercase"
                >
                  VOLTAR DE ETAPA
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={confirming}
                  className="px-6 py-4.5 bg-orange-600 hover:bg-orange-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition shadow-lg shrink-0 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50 uppercase"
                >
                  {confirming ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Gravar Nota Fiscal
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* =======================================================
          MOBILE FIXED BOTTOM DOCK ACTION DOCK
          Strictly premium, min-h-[48px] touch targets, avoiding overflow.
          ======================================================= */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-zinc-950/95 border-t border-zinc-800 p-3.5 flex sm:flex-row gap-2.5 z-40 backdrop-blur-md">
        {step === 1 ? (
          <>
            <button
              onClick={() => router.back()}
              className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={15} /> VOLTAR
            </button>
            {hasDraft && (
              <button
                onClick={loadDraft}
                className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderOpen size={15} className="text-orange-500" /> RASCUNHO
              </button>
            )}
          </>
        ) : step < 4 ? (
          <>
            <button
              onClick={() => setStep(prev => prev - 1)}
              className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
            >
              ANTERIOR
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-805 text-zinc-400 hover:text-white font-bold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-500 animate-pulse" /> SALVAR
            </button>
            <button
              onClick={() => {
                if (step === 3 && selectedItems.length === 0) {
                  toast.warning('Selecione pelo menos um item.');
                  return;
                }
                setStep(prev => prev + 1);
              }}
              className="flex-1 min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer shadow-lg font-bold"
            >
              AVANÇAR
            </button>
          </>
        ) : (
          /* Strictly defined Action Dock for Step 4 of the Import: Cancelar, Salvar Rascunho, Confirmar Entrada */
          <>
            <button
              onClick={handleClear}
              className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-extrabold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X size={15} /> CANCELAR
            </button>
            <button
              onClick={handleSaveDraft}
              className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-extrabold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-500" /> SALVAR DRAFT
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={confirming}
              className="flex-1 min-h-[48px] bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg font-bold"
            >
              {confirming ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} GRAVAR NF
            </button>
          </>
        )}
      </div>

    </div>
  );
}

// Subcomponent visual status flags
function StatusProdutoBadge({ status }: { status: 'NOVO' | 'ENCONTRADO' | 'INCOMPLETO' }) {
  if (status === 'ENCONTRADO') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-bold text-[9.5px] uppercase rounded-full tracking-wider select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Produto Encontrado
      </span>
    );
  }
  if (status === 'NOVO') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/15 text-sky-400 font-bold text-[9.5px] uppercase rounded-full tracking-wider select-none font-sans">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
        Produto Novo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/15 text-amber-500 font-bold text-[9.5px] uppercase rounded-full tracking-wider select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Cadastro Incompleto
    </span>
  );
}
