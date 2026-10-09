'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, Package, Search, Plus, Minus, AlertCircle, 
  Loader2, Filter, Warehouse, CheckCircle2, ChevronRight
} from 'lucide-react';
import { formatCurrency, roundDecimal } from '@/lib/utils';
import { obterUnidadesCompativeis, converterUnidade } from '@/lib/unidades';
import { toast } from 'sonner';

export interface StockPartItem {
  id: string;
  codigo: string;
  descricao: string;
  fabricante?: string | null;
  categoria: string;
  quantidade: number;
  estoque_minimo: number;
  localizacao?: string | null;
  preco_custo?: number;
  preco_venda: number;
  unidadeMedida?: string;
  permiteFracionado?: boolean;
}

interface StockPartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPart: (data: {
    peca: StockPartItem;
    quantidade: number;
    unidade: string;
    valorUnitario: number;
    valorTotal: number;
  }) => void;
  existingParts?: Array<{
    peca_id: string;
    quantidade: number;
    descricao?: string;
    unidade?: string;
  }>;
  colorScheme?: 'blue' | 'amber' | 'orange';
  isEditing?: boolean;
}

const CATEGORIAS_PECAS = [
  { value: 'TODAS', label: 'Todas as Categorias' },
  { value: 'MOTOR', label: 'Motor' },
  { value: 'INJECAO_ELETRONICA', label: 'Injeção Eletrônica' },
  { value: 'TURBO', label: 'Turbo / Alimentação' },
  { value: 'FREIOS', label: 'Freios & Pneumática' },
  { value: 'SUSPENSAO', label: 'Suspensão & Molas' },
  { value: 'TRANSMISSAO', label: 'Transmissão & Câmbio' },
  { value: 'FILTROS', label: 'Filtros' },
  { value: 'OLEOS_LUBRIFICANTES', label: 'Óleos & Fluidos' },
  { value: 'ARREFECIMENTO', label: 'Arrefecimento' },
  { value: 'ESCAPAMENTO', label: 'Escapamento & Arla' },
  { value: 'ELETRICA', label: 'Elétrica & Sensores' },
  { value: 'OUTROS', label: 'Outros Componentes' },
];

export default function StockPartsModal({
  isOpen,
  onClose,
  onAddPart,
  existingParts = [],
  colorScheme = 'orange',
  isEditing = false,
}: StockPartsModalProps) {
  // Estados de Busca e Listagem
  const [searchTerm, setSearchTerm] = useState('');
  const [categoria, setCategoria] = useState('TODAS');
  const [items, setItems] = useState<StockPartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Item Selecionado e Configurações de Inclusão
  const [selectedPeca, setSelectedPeca] = useState<StockPartItem | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('un');
  const [validationError, setValidationError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Paleta de cores dinâmica conforme o tipo de OS
  const theme = useMemo(() => {
    switch (colorScheme) {
      case 'blue':
        return {
          primary: 'bg-blue-600 hover:bg-blue-500 text-white',
          border: 'border-blue-500',
          focusBorder: 'focus:border-blue-500',
          focusRing: 'focus:ring-blue-500/20',
          text: 'text-blue-400',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          glow: 'shadow-blue-950/40',
        };
      case 'amber':
        return {
          primary: 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black',
          border: 'border-amber-500',
          focusBorder: 'focus:border-amber-500',
          focusRing: 'focus:ring-amber-500/20',
          text: 'text-amber-400',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          glow: 'shadow-amber-950/40',
        };
      case 'orange':
      default:
        return {
          primary: 'bg-orange-600 hover:bg-orange-500 text-white',
          border: 'border-orange-500',
          focusBorder: 'focus:border-orange-500',
          focusRing: 'focus:ring-orange-500/20',
          text: 'text-orange-400',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          glow: 'shadow-orange-950/40',
        };
    }
  }, [colorScheme]);

  // Bloqueio de scroll do body e listener do ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Carregar catálogo de peças
  const fetchPecas = useCallback(async (q: string, cat: string, p: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append('q', q.trim());
      if (cat !== 'TODAS') params.append('categoria', cat);
      params.append('page', p.toString());
      params.append('limit', '14');

      const res = await fetch(`/api/pecas?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Falha ao consultar estoque de peças');
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err: any) {
      console.error('Erro ao buscar peças:', err);
      setErrorMsg(err.message || 'Erro ao consultar almoxarifado');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Disparar busca com debounce
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      setPage(1);
      fetchPecas(searchTerm, categoria, 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, categoria, isOpen, fetchPecas]);

  // Troca de página
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchPecas(searchTerm, categoria, newPage);
  };

  // Ao selecionar uma peça na lista
  const handleSelectPeca = (peca: StockPartItem) => {
    setSelectedPeca(peca);
    const unit = peca.unidadeMedida || 'un';
    setSelectedUnit(unit);
    setQuantidade(1);
    setValidationError(null);
  };

  // Unidades compatíveis com a peça selecionada
  const compativeis = useMemo(() => {
    if (!selectedPeca) return [];
    const baseUnit = selectedPeca.unidadeMedida || 'un';
    const list = obterUnidadesCompativeis(baseUnit);
    return list.length > 0 ? list : [{ sigla: baseUnit, nome: baseUnit, grupo: 'quantidade', fatorParaPadrao: 1 }];
  }, [selectedPeca]);

  // Quantidade já existente desta peça na OS atual
  const qtdJaNaOS = useMemo(() => {
    if (!selectedPeca) return 0;
    return existingParts
      .filter(p => p.peca_id === selectedPeca.id)
      .reduce((sum, p) => sum + (Number(p.quantidade) || 0), 0);
  }, [selectedPeca, existingParts]);

  // Saldo restante disponível para ser adicionado nesta operação
  const saldoDisponivel = useMemo(() => {
    if (!selectedPeca) return 0;
    // Em modo de edição, o que está na OS já foi descontado do banco, então o estoque
    // no banco reflete o saldo remanescente disponível além do que já está na OS.
    // Em criação de OS, o que foi selecionado localmente ainda não foi debitado do banco.
    if (isEditing) {
      return Number(selectedPeca.quantidade) || 0;
    }
    return Math.max(0, (Number(selectedPeca.quantidade) || 0) - qtdJaNaOS);
  }, [selectedPeca, qtdJaNaOS, isEditing]);

  // Preço unitário ajustado pela unidade selecionada
  const precoUnitarioCalculado = useMemo(() => {
    if (!selectedPeca) return 0;
    const basePreco = Number(selectedPeca.preco_venda) || 0;
    const originalUnit = selectedPeca.unidadeMedida || 'un';
    if (selectedUnit.toLowerCase() !== originalUnit.toLowerCase()) {
      try {
        const ratio = converterUnidade(1, selectedUnit, originalUnit);
        return roundDecimal(basePreco * ratio);
      } catch {
        return basePreco;
      }
    }
    return basePreco;
  }, [selectedPeca, selectedUnit]);

  // Subtotal calculado
  const subtotalCalculado = useMemo(() => {
    const qty = Number(quantidade) || 0;
    return roundDecimal(qty * precoUnitarioCalculado);
  }, [quantidade, precoUnitarioCalculado]);

  // Validar quantidade antes de adicionar
  const handleValidateQuantity = (val: number) => {
    if (isNaN(val) || val <= 0) {
      setValidationError('A quantidade deve ser maior que zero.');
      return false;
    }

    if (selectedPeca && !selectedPeca.permiteFracionado && !Number.isInteger(val)) {
      setValidationError(`Esta peça (${selectedPeca.descricao}) não permite fracionamento.`);
      return false;
    }

    if (val > saldoDisponivel) {
      setValidationError(`Quantidade informada (${val}) excede o saldo disponível em estoque (${saldoDisponivel} ${selectedPeca?.unidadeMedida || 'un'}).`);
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleQuantityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      setQuantidade(0);
      setValidationError('Informe uma quantidade válida.');
      return;
    }
    const parsed = parseFloat(rawVal);
    setQuantidade(parsed);
    handleValidateQuantity(parsed);
  };

  const handleStepQuantity = (delta: number) => {
    const current = Number(quantidade) || 0;
    const isFrac = selectedPeca?.permiteFracionado;
    const step = isFrac ? (delta > 0 ? 0.5 : -0.5) : delta;
    const novo = Math.max(isFrac ? 0.1 : 1, roundDecimal(current + step));
    setQuantidade(novo);
    handleValidateQuantity(novo);
  };

  // Confirmar adição à OS
  const handleConfirmAdd = () => {
    if (!selectedPeca) return;

    if (!handleValidateQuantity(quantidade)) {
      return;
    }

    onAddPart({
      peca: selectedPeca,
      quantidade,
      unidade: selectedUnit,
      valorUnitario: precoUnitarioCalculado,
      valorTotal: subtotalCalculado,
    });

    toast.success(
      qtdJaNaOS > 0
        ? `Quantidade de "${selectedPeca.descricao}" ampliada na OS!`
        : `"${selectedPeca.descricao}" adicionada à OS!`
    );

    // Reset para próxima inclusão ou fechar
    setSelectedPeca(null);
    setQuantidade(1);
    setValidationError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl bg-[#15181B] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 ${theme.text}`}>
              <Warehouse size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white uppercase italic tracking-tight">
                  Adicionar Peça do Estoque
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {totalCount} itens no almoxarifado
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                Selecione os insumos cadastrados no estoque da empresa para vincular à Ordem de Serviço
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-xl transition cursor-pointer"
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="p-3 sm:p-5 border-b border-zinc-800 bg-zinc-900/40 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Campo de Busca */}
          <div className="sm:col-span-7 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="PESQUISAR POR NOME, CÓDIGO OU FABRICANTE..."
              className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-9 text-xs text-white uppercase font-bold placeholder:text-zinc-600 outline-none transition ${theme.focusBorder}`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtro por Categoria */}
          <div className="sm:col-span-5 relative">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-3 text-xs text-white font-bold uppercase outline-none cursor-pointer appearance-none transition ${theme.focusBorder}`}
            >
              {CATEGORIAS_PECAS.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-zinc-950 text-white">
                  {cat.label}
                </option>
              ))}
            </select>
            <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* CORPO DO MODAL: MASTER / DETAIL */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LADO ESQUERDO: LISTA DE PEÇAS (7 ou 12 cols se nada selecionado) */}
          <div className={`${selectedPeca ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col h-full overflow-hidden border-r border-zinc-800/80`}>
            {/* Lista com scroll suave */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className={`w-8 h-8 animate-spin ${theme.text}`} />
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Consultando almoxarifado...
                  </p>
                </div>
              ) : errorMsg ? (
                <div className="p-8 text-center bg-red-950/20 border border-red-900/50 rounded-2xl space-y-2">
                  <AlertCircle size={28} className="text-red-500 mx-auto" />
                  <p className="text-xs font-bold text-red-400">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={() => fetchPecas(searchTerm, categoria, page)}
                    className="mt-2 px-3 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-20 text-center space-y-2">
                  <Package size={36} className="text-zinc-600 mx-auto opacity-50" />
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                    Nenhuma peça encontrada no estoque
                  </p>
                  <p className="text-[11px] text-zinc-600 max-w-sm mx-auto">
                    Tente buscar por outro código ou termo, ou selecione outra categoria de componente.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const isSelected = selectedPeca?.id === item.id;
                  const itemInOS = existingParts.find(p => p.peca_id === item.id);
                  const jaNaOSQtd = itemInOS ? Number(itemInOS.quantidade) || 0 : 0;
                  const saldoAtual = isEditing ? item.quantidade : Math.max(0, item.quantidade - jaNaOSQtd);
                  const semEstoque = saldoAtual <= 0;
                  const estoqueBaixo = saldoAtual > 0 && saldoAtual <= item.estoque_minimo;

                  return (
                    <div
                      key={item.id}
                      onClick={() => !semEstoque && handleSelectPeca(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? `bg-zinc-900/90 ${theme.border} ring-1 ${theme.border} shadow-lg`
                          : semEstoque
                          ? 'bg-zinc-950/40 border-zinc-900 opacity-60 cursor-not-allowed'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                            CÓD: {item.codigo}
                          </span>
                          {item.fabricante && (
                            <span className="text-[10px] font-bold text-zinc-500 uppercase truncate">
                              • {item.fabricante}
                            </span>
                          )}
                          {item.categoria && (
                            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                              [{item.categoria.replace('_', ' ')}]
                            </span>
                          )}
                          {jaNaOSQtd > 0 && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-950/70 text-blue-400 border border-blue-800">
                              Já na OS: {jaNaOSQtd} {item.unidadeMedida || 'un'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-black text-white uppercase tracking-tight truncate">
                          {item.descricao}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                          {item.localizacao && (
                            <span className="text-zinc-500">
                              Loc: <strong className="text-zinc-300">{item.localizacao}</strong>
                            </span>
                          )}
                          <span className="font-bold text-zinc-300">
                            Unitário: <strong className="text-green-400">{formatCurrency(item.preco_venda)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* LADO DIREITO: STATUS DO ESTOQUE E PREÇO */}
                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        {semEstoque ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-red-950/60 text-red-400 border border-red-800">
                            Esgotado (0 {item.unidadeMedida || 'un'})
                          </span>
                        ) : estoqueBaixo ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-amber-950/60 text-amber-400 border border-amber-800">
                            Saldo: {saldoAtual} {item.unidadeMedida || 'un'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800">
                            Saldo: {saldoAtual} {item.unidadeMedida || 'un'}
                          </span>
                        )}

                        <button
                          type="button"
                          disabled={semEstoque}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!semEstoque) handleSelectPeca(item);
                          }}
                          className={`mt-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                            isSelected
                              ? `${theme.text} underline`
                              : semEstoque
                              ? 'text-zinc-600 cursor-not-allowed'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Selecionado' : 'Selecionar'} <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RODAPÉ DA LISTAGEM (PAGINAÇÃO) */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono text-[11px]">
                  Página {page} de {totalPages} ({totalCount} peças)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold uppercase text-zinc-300 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* LADO DIREITO: DETALHES DA PEÇA SELECIONADA E DEFINIÇÃO DE QUANTIDADE */}
          {selectedPeca && (
            <div className="lg:col-span-5 bg-zinc-950/80 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar border-t lg:border-t-0 border-zinc-800">
              <div className="space-y-5">
                {/* Cabeçalho da seleção */}
                <div className="border-b border-zinc-850 pb-3 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                      Item Selecionado
                    </span>
                    <h4 className="text-sm sm:text-base font-black text-white uppercase mt-0.5">
                      {selectedPeca.descricao}
                    </h4>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      CÓD: {selectedPeca.codigo} {selectedPeca.fabricante && `• ${selectedPeca.fabricante}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPeca(null)}
                    className="text-zinc-500 hover:text-zinc-300 p-1"
                    title="Desmarcar peça"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Bloco Informativo de Saldo */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 font-mono text-xs">
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Estoque Cadastrado:</span>
                    <strong className="text-white">{selectedPeca.quantidade} {selectedPeca.unidadeMedida || 'un'}</strong>
                  </div>
                  {qtdJaNaOS > 0 && (
                    <div className="flex justify-between items-center text-amber-400/90">
                      <span>Já Alocado nesta OS:</span>
                      <strong>{qtdJaNaOS} {selectedPeca.unidadeMedida || 'un'}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-xs font-bold">
                    <span className="text-emerald-400">Disponível para Inclusão:</span>
                    <strong className="text-emerald-400 text-sm">
                      {saldoDisponivel} {selectedPeca.unidadeMedida || 'un'}
                    </strong>
                  </div>
                </div>

                {/* Seletor de Quantidade e Unidade */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      Quantidade a Adicionar
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {selectedPeca.permiteFracionado ? 'Permite fracionamento' : 'Unidades inteiras'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-1">
                      <button
                        type="button"
                        onClick={() => handleStepQuantity(-1)}
                        className="w-10 h-10 flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg font-bold transition active:scale-95 cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>

                      <input
                        type="number"
                        step={selectedPeca.permiteFracionado ? 'any' : '1'}
                        min={selectedPeca.permiteFracionado ? 0.01 : 1}
                        max={saldoDisponivel}
                        value={quantidade}
                        onChange={handleQuantityInputChange}
                        className="flex-1 bg-transparent text-center font-mono font-black text-white text-base outline-none p-1"
                      />

                      <button
                        type="button"
                        onClick={() => handleStepQuantity(1)}
                        className="w-10 h-10 flex items-center justify-center bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg font-bold transition active:scale-95 cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {/* Unidade */}
                    <div className="w-24">
                      <select
                        value={selectedUnit}
                        onChange={(e) => setSelectedUnit(e.target.value)}
                        className="w-full h-12 bg-zinc-900 border border-zinc-800 rounded-xl px-2 text-xs font-black uppercase text-white font-mono outline-none cursor-pointer focus:border-zinc-700"
                      >
                        {compativeis.map((u) => (
                          <option key={u.sigla} value={u.sigla} className="bg-zinc-950 text-white uppercase">
                            {u.sigla}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {validationError && (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-medium bg-rose-950/30 border border-rose-900/60 p-2.5 rounded-xl">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>

                {/* Resumo Financeiro da Peça */}
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>Valor Unitário ({selectedUnit}):</span>
                    <span className="font-mono text-zinc-200 font-bold">{formatCurrency(precoUnitarioCalculado)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-zinc-400">
                    <span>Quantidade Solicitada:</span>
                    <span className="font-mono text-zinc-200 font-bold">{quantidade} {selectedUnit}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-white">Subtotal da Peça:</span>
                    <span className="text-lg font-mono font-black text-emerald-400">
                      {formatCurrency(subtotalCalculado)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  disabled={quantidade <= 0 || quantidade > saldoDisponivel || !!validationError}
                  className={`w-full py-3.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-xl transition active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${theme.primary} ${theme.glow}`}
                >
                  <CheckCircle2 size={16} />
                  Adicionar à Ordem de Serviço
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPeca(null)}
                  className="w-full py-2.5 text-zinc-400 hover:text-white text-xs font-bold uppercase transition"
                >
                  Cancelar Seleção
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
