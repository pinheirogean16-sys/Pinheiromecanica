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
  // A03: guarda o XML bruto para reenviar ao servidor na confirmação
  const [xmlRaw, setXmlRaw] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [importFornecedor, setImportFornecedor] = useState(true);
  const [importarFinanceiro, setImportarFinanceiro] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    date: string;
  } | null>(null);

  const [formaPagamento, setFormaPagamento] = useState('BOLETO À VISTA');
  const [numParcelas, setNumParcelas] = useState(3);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);
  const [categoriaPecas, setCategoriaPecas] = useState('OUTROS');

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
      // Lê o XML bruto no cliente para reenviar na confirmação (A03)
      const xmlText = await file.text();
      setXmlRaw(xmlText);

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
        date: new Date().toLocaleDateString('pt-BR'),
      });
      setSelectedItems(data.itens.map((_: any, i: number) => i));
      toast.success('XML processado com sucesso!');
      setStep(2);
    } catch (error: any) {
      toast.error(error.message);
      setXmlRaw('');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    if (!nfeData || !xmlRaw) return;
    try {
      localStorage.setItem('nfe_import_draft', JSON.stringify({
        xmlRaw,
        nfeData,
        selectedItems,
        importFornecedor,
        importarFinanceiro,
        formaPagamento,
        numParcelas,
        diasEntreParcelas,
        dataPrimeiraParcela,
        selectedFile,
        categoriaPecas,
        step,
      }));
      setHasDraft(true);
      toast.success('Rascunho operacional da NF-e salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar rascunho de importação.');
    }
  };

  const loadDraft = () => {
    try {
      const draftStr = localStorage.getItem('nfe_import_draft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        setXmlRaw(draft.xmlRaw || '');
        setNfeData(draft.nfeData);
        setSelectedItems(draft.selectedItems || []);
        setImportFornecedor(draft.importFornecedor ?? true);
        setImportarFinanceiro(draft.importarFinanceiro ?? true);
        setFormaPagamento(draft.formaPagamento || 'BOLETO À VISTA');
        setNumParcelas(draft.numParcelas || 3);
        setDiasEntreParcelas(draft.diasEntreParcelas || 28);
        setDataPrimeiraParcela(draft.dataPrimeiraParcela || new Date().toISOString().split('T')[0]);
        setCategoriaPecas(draft.categoriaPecas || 'OUTROS');
        setSelectedFile(draft.selectedFile || {
          name: 'NotaFiscal_Rascunho.xml',
          size: '—',
          date: new Date().toLocaleDateString('pt-BR'),
        });
        setStep(draft.step || 2);
        toast.success('Rascunho operacional restaurado!');
      } else {
        toast.error('Nenhum rascunho encontrado.');
      }
    } catch {
      toast.error('Erro ao carregar o rascunho.');
    }
  };

  const handleClear = () => {
    if (confirm('Deseja realmente cancelar esta importação? Todos os dados atuais serão limpos.')) {
      setStep(1);
      setNfeData(null);
      setXmlRaw('');
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
    if (!xmlRaw) {
      toast.error('XML da nota não disponível. Reenvie o arquivo.');
      return;
    }

    setConfirming(true);
    try {
      // A03: envia SÓ o XML. O servidor reparseia e ignora qualquer nfeData.
      const res = await fetch('/api/importar-nfe/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          xml: xmlRaw,
          importFornecedor,
          itensParaImportar: selectedItems,
          importarFinanceiro,
          formaPagamento,
          numParcelas,
          diasEntreParcelas,
          dataPrimeiraParcela,
          categoriaPecas,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao confirmar importação');
      }

      const data = await res.json();
      const criados = data?.results?.stats?.criados ?? 0;
      const atualizados = data?.results?.stats?.atualizados ?? 0;

      localStorage.removeItem('nfe_import_draft');
      setHasDraft(false);

      toast.success(
        `NF-e importada! ${criados} peça(s) criada(s), ${atualizados} atualizada(s).`
      );
      router.push('/estoque');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setConfirming(false);
    }
  };

  // A14/A35: contadores reais. Sem "idx % 3".
  // Como não sabemos no cliente se a peça existe no banco, mostramos o total
  // e deixamos a distinção "novo/atualizado" para depois da importação.
  const totalItens = nfeData ? nfeData.itens.length : 0;
  const valorTotal = nfeData ? nfeData.totais.valorNF : 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 pb-36 min-w-0 overflow-hidden">

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
                className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <Trash2 size={14} /> Descartar XML
              </button>
            </>
          )}
        </div>
      </div>

      {/* METADATA */}
      {selectedFile && step > 1 && (
        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
              <FileText size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Lote e Arquivo XML Ativo</p>
              <p className="text-xs font-black text-white truncate max-w-[280px] sm:max-w-md break-all">{selectedFile.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono text-zinc-400">
            <div>
              <span className="font-extrabold uppercase text-zinc-500 mr-1">Tamanho:</span>
              <span className="font-black text-white">{selectedFile.size}</span>
            </div>
            <div className="hidden sm:block text-zinc-800">|</div>
            <div>
              <span className="font-extrabold uppercase text-zinc-500 mr-1">Carregado em:</span>
              <span className="font-black text-white">{selectedFile.date}</span>
            </div>
            {nfeData && (
              <>
                <div className="hidden sm:block text-zinc-800">|</div>
                <div>
                  <span className="font-extrabold uppercase text-zinc-500 mr-1">Protocolo NF-e:</span>
                  <span className="font-black text-orange-500">#{nfeData.numero || '---'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* STEPPER */}
      <div className="w-full">
        <div className="lg:hidden flex flex-col gap-2.5 bg-zinc-900 border border-zinc-800 p-4.5 rounded-2xl">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.25em]">ETAPA {step} DE 4</span>
            <span className="text-xs font-black uppercase text-orange-500 tracking-wider">
              {steps[step - 1].label}
            </span>
          </div>
          <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
            <div
              className="bg-orange-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

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
                    'bg-zinc-950 text-zinc-600 border border-zinc-800'
                  }`}>
                    {isCompleted ? <Check size={16} className="stroke-[3]" /> : st.id}
                  </div>
                  <div className="text-left select-none">
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1 ${isActive ? 'text-orange-500' : 'text-zinc-500'}`}>
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

      {/* KPIs */}
      {nfeData && step > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-emerald-500/10">
              <DollarSign size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-2">Valor Total da Nota</p>
            <p className="text-2xl font-black text-emerald-400 font-mono italic">{formatCurrency(valorTotal)}</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-sky-500/10">
              <PlusCircle size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-2">Itens Selecionados</p>
            <div className="flex items-baseline gap-2.5">
              <dt className="text-2xl font-black text-sky-400 font-mono">{selectedItems.length}</dt>
              <dd className="text-[9px] px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold uppercase rounded-md tracking-wider leading-none">SELECIONADOS</dd>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-emerald-500/10">
              <CheckCircle size={44} />
            </div>
            <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.2em] leading-none mb-2">Itens a Importar</p>
            <div className="flex items-baseline gap-2.5">
              <dt className="text-2xl font-black text-emerald-400 font-mono">{selectedItems.length}/{totalItens}</dt>
              <dd className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase rounded-md tracking-wider leading-none font-sans">PRONTO</dd>
            </div>
          </div>
        </div>
      )}

      <main className="space-y-8 min-w-0 max-w-full">

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <input
              type="file"
              accept=".xml"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />

            <div className="relative">
              <div
                onClick={() => {
                  if (!loading) fileInputRef.current?.click();
                }}
                className="border-2 border-dashed border-zinc-800 bg-zinc-900/40 rounded-[2.5rem] p-10 md:p-24 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-orange-600/5 hover:border-orange-600/20 transition-all duration-300 group shadow-lg min-h-[300px]"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-950 border border-zinc-800 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform shadow-inner">
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
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest hidden md:block">
                    Arraste o arquivo XML da NF-e para cá ou clique para selecionar do computador
                  </p>
                </div>
              </div>
            </div>

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

            {selectedFile && !loading && (
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                    <CheckCircle size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase italic">Arquivo Carregado com Sucesso</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest mt-0.5">Os dados técnicos foram lidos de forma íntegra.</p>
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
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
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
                  className="w-full sm:w-auto px-6 py-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition cursor-pointer"
                >
                  Restaurar Rascunho
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && nfeData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-8 select-none pointer-events-none opacity-[0.03]">
                <Package size={140} className="text-white" />
              </div>

              <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
                <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
                  <FileText size={18} />
                </div>
                <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                  Dados Fiscais e Cadastrais da Nota
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 min-w-0 max-w-full">
                  <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Razão Social do Emissor</p>
                  <p className="text-sm font-black italic text-white break-words uppercase">{nfeData.fornecedor.razaoSocial}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">CNPJ emitente</p>
                    <p className="text-xs font-bold font-mono text-zinc-200">{nfeData.fornecedor.cnpj}</p>
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[9px] font-black uppercase text-zinc-500 tracking-wider">Inscrição Estadual (IE)</p>
                    <p className="text-xs font-bold font-mono text-zinc-200">{nfeData.fornecedor.ie || '---'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-950 p-4 rounded-2xl">
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
                <label className="flex items-start gap-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-700 transition">
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

            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
                <AlertTriangle className="text-yellow-500" size={18} />
                <h3 className="text-xs font-black uppercase italic tracking-wider">Segurança e Validação</h3>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-extrabold text-zinc-400 uppercase tracking-widest">Chave de Acesso Fiscal (Sefaz)</p>
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[10px] font-mono font-black text-white tracking-widest break-all select-all leading-normal uppercase">
                    {nfeData.chaveAcesso || 'CHAVE NÃO INFORMADA NO ARQUIVO XML'}
                  </p>
                </div>
                <div className="p-3.5 bg-emerald-600/5 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                  <p className="text-[9.5px] text-zinc-400 font-bold uppercase leading-relaxed font-sans">
                    cStat validado como autorizado pela SEFAZ no servidor.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-span-full hidden lg:flex items-center justify-end gap-4 pt-4 border-t border-zinc-800/60 mt-4">
              <button
                onClick={handleClear}
                className="px-8 py-4 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
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

        {/* STEP 3 */}
        {step === 3 && nfeData && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <HelpCircle className="text-orange-500" size={18} />
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider italic text-white">Selecione os itens a importar</h3>
                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Clique nas linhas para alternar a seleção</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl">
                    <Package size={18} />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                      Lista Operacional de Itens ({selectedItems.length} selecionados)
                    </h2>
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

              <div className="hidden md:block overflow-x-auto min-w-0 max-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-950/20">
                      <th className="py-4 px-3 w-10">#</th>
                      <th className="py-4 px-3">Código Técnico</th>
                      <th className="py-4 px-3">Insumo / Descrição</th>
                      <th className="py-4 px-3">Unidade</th>
                      <th className="py-4 px-3 text-right">Qtd</th>
                      <th className="py-4 px-3 text-right">Unitário</th>
                      <th className="py-4 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {nfeData.itens.map((item: any, i: number) => {
                      const isSelected = selectedItems.includes(i);
                      return (
                        <tr
                          key={i}
                          onClick={() => toggleItem(i)}
                          className={`group hover:bg-orange-500/[0.015] transition-all cursor-pointer ${
                            isSelected ? 'bg-zinc-950/25 opacity-100' : 'opacity-40 hover:opacity-60 bg-zinc-950/5'
                          }`}
                        >
                          <td className="py-4 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-orange-600 focus:ring-orange-600 accent-orange-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-4 px-3">
                            <p className="text-[10px] font-black font-mono text-zinc-400">{item.codigo}</p>
                            <p className="text-[9px] font-mono text-zinc-600 mt-0.5">NCM: {item.ncm || '—'}</p>
                          </td>
                          <td className="py-4 px-3 min-w-[250px] max-w-xs truncate">
                            <p className="text-xs font-black uppercase italic truncate text-zinc-200 group-hover:text-white transition-colors">{item.descricao}</p>
                            <p className="text-[9px] text-zinc-500 font-bold tracking-wider uppercase mt-0.5 truncate">{nfeData.fornecedor.razaoSocial}</p>
                          </td>
                          <td className="py-4 px-3">
                            <span className="text-[9px] px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-400 font-extrabold uppercase">{item.unidade || 'UN'}</span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-xs font-black italic text-white md:pr-4">
                            {item.quantidade}
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-xs font-bold text-zinc-400">
                            {formatCurrency(item.valorUnitario)}
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-xs font-black italic text-zinc-100">
                            {formatCurrency(item.valorTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="block md:hidden space-y-4">
                {nfeData.itens.map((item: any, i: number) => {
                  const isSelected = selectedItems.includes(i);
                  return (
                    <div
                      key={i}
                      onClick={() => toggleItem(i)}
                      className={`bg-zinc-950 border rounded-3xl p-5 space-y-4 relative overflow-hidden transition-all duration-200 cursor-pointer ${
                        isSelected ? 'border-orange-500/40 opacity-100 bg-zinc-950' : 'border-zinc-900 opacity-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2.5 border-b border-zinc-900 pb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-5 h-5 rounded border-zinc-800 bg-zinc-900 text-orange-600 focus:ring-orange-600 accent-orange-600"
                          />
                          <span className="text-[10px] font-mono font-black text-zinc-500">ITEM #{i + 1}</span>
                        </div>
                      </div>

                      <div className="space-y-1 min-w-0 max-w-full">
                        <p className="text-xs font-black uppercase text-white break-words leading-tight">{item.descricao}</p>
                        <div className="text-[9px] font-mono text-zinc-500 flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="font-extrabold uppercase text-zinc-600">Ref:</span>
                          <span className="text-zinc-300">{item.codigo}</span>
                          <span className="font-extrabold uppercase text-zinc-600">Un:</span>
                          <span>{item.unidade || 'UN'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 p-3.5 rounded-2xl text-[11px] border border-zinc-900/40">
                        <div>
                          <p className="text-[8.5px] text-zinc-500 font-black uppercase tracking-wider mb-0.5">Quantidade</p>
                          <p className="text-xs font-black text-white italic leading-none">{item.quantidade} {item.unidade || 'un'}</p>
                        </div>
                        <div>
                          <p className="text-[8.5px] text-zinc-500 font-black uppercase tracking-wider mb-0.5">Valor Unitário</p>
                          <p className="text-xs font-bold font-mono text-emerald-400 leading-none">{formatCurrency(item.valorUnitario)}</p>
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

            <div className="hidden lg:flex items-center justify-end gap-4 pt-4 border-t border-zinc-800/60 mt-4">
              <button
                onClick={() => setStep(2)}
                className="px-8 py-4 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
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

        {/* STEP 4 */}
        {step === 4 && nfeData && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
                <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-xl">
                  <DollarSign size={18} />
                </div>
                <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider">
                  Tratamento Financeiro / Pagamento
                </h2>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl cursor-pointer hover:border-zinc-700 transition">
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
                <div className="space-y-6 pt-4 border-t border-zinc-800">
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
                    <div className="space-y-6 pt-4 border-t border-zinc-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Número de parcelas</label>
                          <input
                            type="number"
                            min="2"
                            max="60"
                            value={numParcelas}
                            onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-mono font-bold outline-none focus:border-orange-500 transition min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Intervalo (dias)</label>
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={diasEntreParcelas}
                            onChange={(e) => setDiasEntreParcelas(parseInt(e.target.value) || 28)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-mono font-bold outline-none focus:border-orange-500 transition min-h-[44px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Data do 1º Vencimento</label>
                        <input
                          type="date"
                          value={dataPrimeiraParcela}
                          onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white font-mono font-bold outline-none focus:border-orange-500 transition min-h-[44px]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t border-zinc-800">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Categoria das Peças Novas</label>
                    <select
                      value={categoriaPecas}
                      onChange={(e) => setCategoriaPecas(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 rounded-2xl p-4 text-xs font-black text-white uppercase outline-none transition shadow-inner appearance-none cursor-pointer min-h-[44px]"
                    >
                      <option value="MOTOR">MOTOR</option>
                      <option value="INJECAO_ELETRONICA">INJEÇÃO ELETRÔNICA</option>
                      <option value="TURBO">TURBO</option>
                      <option value="FREIOS">FREIOS</option>
                      <option value="SUSPENSAO">SUSPENSÃO</option>
                      <option value="TRANSMISSAO">TRANSMISSÃO</option>
                      <option value="FILTROS">FILTROS</option>
                      <option value="OLEOS_LUBRIFICANTES">ÓLEOS E LUBRIFICANTES</option>
                      <option value="ARREFECIMENTO">ARREFECIMENTO</option>
                      <option value="ESCAPAMENTO">ESCAPAMENTO</option>
                      <option value="ELETRICA">ELÉTRICA</option>
                      <option value="OUTROS">OUTROS</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-xl sticky top-6">
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
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
                    <span className="font-mono text-xs text-zinc-300">{formatCurrency(nfeData.totais.valorFrete)}</span>
                  </div>
                )}

                {nfeData.totais.valorDesconto > 0 && (
                  <div className="flex justify-between items-center text-[10px] font-black text-red-500 uppercase tracking-wider">
                    <span>Soma Descontos</span>
                    <span className="font-mono text-xs font-black">-{formatCurrency(nfeData.totais.valorDesconto)}</span>
                  </div>
                )}

                <div className="pt-5 border-t border-zinc-800 mt-4">
                  <p className="text-[8.5px] font-black uppercase text-orange-500 tracking-[0.2em] mb-1 italic">Total Líquido da Entrada</p>
                  <p className="text-3xl sm:text-4xl font-black italic tracking-tighter text-white font-mono">
                    {formatCurrency(nfeData.totais.valorNF)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-orange-600/5 border border-orange-600/20 rounded-2xl flex gap-3">
                <Info className="text-orange-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-orange-400 font-bold uppercase leading-relaxed italic">
                  {selectedItems.length} insumo(s) serão introduzidos em seu estoque operacional.
                </p>
              </div>

              <div className="hidden lg:grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/60 mt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-4 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition min-h-[48px]"
                >
                  VOLTAR DE ETAPA
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={confirming}
                  className="px-6 py-4 bg-orange-600 hover:bg-orange-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition shadow-lg shrink-0 flex items-center justify-center gap-2 min-h-[48px] disabled:opacity-50"
                >
                  {confirming ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                  Gravar Nota Fiscal
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MOBILE DOCK */}
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
              className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white font-bold rounded-xl text-[10.5px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1.5 cursor-pointer"
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
