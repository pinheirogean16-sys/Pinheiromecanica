'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, Package, Wrench, Hash, Tag, DollarSign, 
  MapPin, Scale, Layers, AlertCircle, Loader2, 
  Sparkles, CheckCircle2 
} from 'lucide-react';
import { LISTA_UNIDADES } from '@/lib/unidades';
import { roundDecimal, formatCurrency } from '@/lib/utils';
import { StockPartItem } from '@/components/StockPartsModal';
import { toast } from 'sonner';

export const CATEGORIAS_PECAS = [
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

export interface QuickPartSuccessData {
  peca: StockPartItem;
  applyToOrder?: {
    quantidade: number;
    unidade: string;
    valorUnitario: number;
    valorTotal: number;
  } | null;
}

interface QuickPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: QuickPartSuccessData) => void;
  colorScheme?: 'blue' | 'amber' | 'orange';
}

export default function QuickPartModal({
  isOpen,
  onClose,
  onSuccess,
  colorScheme = 'orange',
}: QuickPartModalProps) {
  // Dados da Peça
  const [descricao, setDescricao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [fabricante, setFabricante] = useState('');
  const [categoria, setCategoria] = useState('OUTROS');
  const [unidadeMedida, setUnidadeMedida] = useState('un');
  const [quantidadeInicial, setQuantidadeInicial] = useState<number>(1);
  const [estoqueMinimo, setEstoqueMinimo] = useState<number>(2);
  const [precoCusto, setPrecoCusto] = useState<string>('0');
  const [precoVenda, setPrecoVenda] = useState<string>('');
  const [localizacao, setLocalizacao] = useState('');
  const [permiteFracionado, setPermiteFracionado] = useState(false);

  // Aplicação direta na OS
  const [adicionarNaOS, setAdicionarNaOS] = useState(true);
  const [quantidadeOS, setQuantidadeOS] = useState<number>(1);

  // Estados de controle
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Esquema de cor dinâmico
  const theme = useMemo(() => {
    switch (colorScheme) {
      case 'blue':
        return {
          primary: 'bg-blue-600 hover:bg-blue-500 text-white',
          border: 'border-blue-500',
          focusBorder: 'focus:border-blue-500',
          text: 'text-blue-400',
          badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          ring: 'focus:ring-blue-500/20',
          checkbox: 'text-blue-600 focus:ring-blue-500',
        };
      case 'amber':
        return {
          primary: 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black',
          border: 'border-amber-500',
          focusBorder: 'focus:border-amber-500',
          text: 'text-amber-400',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          ring: 'focus:ring-amber-500/20',
          checkbox: 'text-amber-500 focus:ring-amber-500',
        };
      case 'orange':
      default:
        return {
          primary: 'bg-orange-600 hover:bg-orange-500 text-white',
          border: 'border-orange-500',
          focusBorder: 'focus:border-orange-500',
          text: 'text-orange-400',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          ring: 'focus:ring-orange-500/20',
          checkbox: 'text-orange-600 focus:ring-orange-500',
        };
    }
  }, [colorScheme]);

  // Listener para fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onClose]);

  // Subtotal na OS calculado
  const subtotalOS = useMemo(() => {
    const pv = parseFloat(precoVenda.replace(',', '.')) || 0;
    const qtd = Number(quantidadeOS) || 0;
    return roundDecimal(pv * qtd);
  }, [precoVenda, quantidadeOS]);

  // Gerador de código automático caso não possua SKU/etiqueta
  const handleGerarCodigo = () => {
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const prefix = categoria.substring(0, 3) || 'PEC';
    setCodigo(`${prefix}-${randomHex}`);
    if (errorMsg) setErrorMsg(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validações locais
    const cleanDesc = descricao.trim();
    if (!cleanDesc || cleanDesc.length < 3) {
      setErrorMsg('Informe o nome/descrição da peça (mínimo 3 caracteres).');
      return;
    }

    const cleanCodigo = codigo.trim();
    if (!cleanCodigo || cleanCodigo.length < 2) {
      setErrorMsg('Informe o código/SKU da peça (ou clique em Gerar Código).');
      return;
    }

    const parsedCusto = parseFloat(precoCusto.replace(',', '.')) || 0;
    if (parsedCusto < 0) {
      setErrorMsg('O custo unitário não pode ser negativo.');
      return;
    }

    const parsedVenda = parseFloat(precoVenda.replace(',', '.')) || 0;
    if (isNaN(parsedVenda) || parsedVenda <= 0) {
      setErrorMsg('Informe um preço de venda unitário válido e maior que zero.');
      return;
    }

    const parsedEstoqueInicial = Number(quantidadeInicial);
    if (isNaN(parsedEstoqueInicial) || parsedEstoqueInicial < 0) {
      setErrorMsg('A quantidade inicial em estoque não pode ser negativa.');
      return;
    }

    if (!permiteFracionado && !Number.isInteger(parsedEstoqueInicial)) {
      setErrorMsg('Para quantidade com casas decimais, ative a opção "Permite Fracionamento".');
      return;
    }

    // Validação da inclusão na OS se marcada
    if (adicionarNaOS) {
      const parsedQtdOS = Number(quantidadeOS);
      if (isNaN(parsedQtdOS) || parsedQtdOS <= 0) {
        setErrorMsg('Informe uma quantidade válida para aplicar nesta OS.');
        return;
      }
      if (!permiteFracionado && !Number.isInteger(parsedQtdOS)) {
        setErrorMsg('A quantidade da OS deve ser inteira para peças não fracionadas.');
        return;
      }
      if (parsedEstoqueInicial === 0) {
        setErrorMsg('A peça possui estoque inicial 0. Para aplicá-la à OS, cadastre um estoque inicial maior ou desmarque a aplicação imediata.');
        return;
      }
      if (parsedQtdOS > parsedEstoqueInicial) {
        setErrorMsg(`A quantidade na OS (${parsedQtdOS}) não pode exceder o estoque inicial registrado (${parsedEstoqueInicial} ${unidadeMedida}).`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        codigo: cleanCodigo.toUpperCase(),
        descricao: cleanDesc.toUpperCase(),
        fabricante: fabricante.trim() ? fabricante.trim().toUpperCase() : null,
        categoria,
        quantidade: parsedEstoqueInicial,
        estoque_minimo: Number(estoqueMinimo) || 2,
        localizacao: localizacao.trim() ? localizacao.trim().toUpperCase() : null,
        preco_custo: parsedCusto,
        preco_venda: parsedVenda,
        unidadeMedida,
        unidadeCompra: unidadeMedida,
        fatorConversao: 1,
        permiteFracionado,
      };

      const res = await fetch('/api/pecas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar peça no almoxarifado.');
      }

      const createdPeca: StockPartItem = {
        id: data.id,
        codigo: data.codigo,
        descricao: data.descricao,
        fabricante: data.fabricante,
        categoria: data.categoria,
        quantidade: Number(data.quantidade) || 0,
        estoque_minimo: Number(data.estoque_minimo) || 0,
        localizacao: data.localizacao,
        preco_custo: Number(data.preco_custo) || 0,
        preco_venda: Number(data.preco_venda) || 0,
        unidadeMedida: data.unidadeMedida || 'un',
        permiteFracionado: Boolean(data.permiteFracionado),
      };

      toast.success(`Peça "${createdPeca.descricao}" cadastrada no estoque com sucesso!`);

      // Se o usuário solicitou aplicação imediata na OS
      if (adicionarNaOS && Number(quantidadeOS) > 0) {
        const parsedQtdOS = Number(quantidadeOS);
        const subtotal = roundDecimal(parsedQtdOS * createdPeca.preco_venda);
        
        onSuccess({
          peca: createdPeca,
          applyToOrder: {
            quantidade: parsedQtdOS,
            unidade: unidadeMedida,
            valorUnitario: createdPeca.preco_venda,
            valorTotal: subtotal,
          },
        });
      } else {
        onSuccess({
          peca: createdPeca,
          applyToOrder: null,
        });
      }

      // Limpar formulário e fechar
      setDescricao('');
      setCodigo('');
      setFabricante('');
      setPrecoCusto('0');
      setPrecoVenda('');
      setLocalizacao('');
      setQuantidadeInicial(1);
      setQuantidadeOS(1);
      onClose();
    } catch (err: any) {
      console.error('Erro ao cadastrar peça:', err);
      setErrorMsg(err.message || 'Falha de comunicação ao cadastrar peça.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40 rounded-t-2xl md:rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${theme.badge}`}>
              <Package size={20} className={theme.text} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight">
                  Cadastrar Peça Rápida
                </h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${theme.badge}`}>
                  Estoque
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Cadastre o item diretamente no almoxarifado sem sair da Ordem de Serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition cursor-pointer disabled:opacity-50"
            title="Fechar (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-400 text-xs flex items-center gap-2.5 animate-in shake">
              <AlertCircle size={16} className="flex-shrink-0 text-red-400" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {/* Seção 1: Identificação da Peça */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Tag size={13} className={theme.text} /> Identificação do Componente
            </h4>

            {/* Nome / Descrição */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                Nome da Peça / Descrição Completa *
              </label>
              <input
                type="text"
                required
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="EX: FILTRO DE ÓLEO DIESEL MOTOR VOLVO D13"
                className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white uppercase font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
              />
            </div>

            {/* Código / SKU + Gerador + Fabricante */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">
                    Código / SKU *
                  </label>
                  <button
                    type="button"
                    onClick={handleGerarCodigo}
                    className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition cursor-pointer underline"
                  >
                    <Sparkles size={11} className={theme.text} /> Gerar auto
                  </button>
                </div>
                <div className="relative">
                  <Hash size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={codigo}
                    onChange={(e) => {
                      setCodigo(e.target.value.toUpperCase());
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="EX: LF-16015 OU MOT-9921"
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white uppercase font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Fabricante / Marca
                </label>
                <div className="relative">
                  <Wrench size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    placeholder="EX: FLEETGUARD, BOSCH, EATON, MANN"
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white uppercase font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  />
                </div>
              </div>
            </div>

            {/* Categoria + Unidade de Medida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Categoria da Peça
                </label>
                <div className="relative">
                  <Layers size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white font-bold uppercase tracking-wider outline-none transition appearance-none cursor-pointer ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  >
                    {CATEGORIAS_PECAS.map((cat) => (
                      <option key={cat.value} value={cat.value} className="bg-zinc-900 text-white">
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Unidade de Medida
                </label>
                <div className="relative">
                  <Scale size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <select
                    value={unidadeMedida}
                    onChange={(e) => {
                      const u = e.target.value;
                      setUnidadeMedida(u);
                      if (['L', 'ml', 'm', 'kg', 'g'].includes(u)) {
                        setPermiteFracionado(true);
                      }
                    }}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white font-bold uppercase tracking-wider outline-none transition appearance-none cursor-pointer ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  >
                    {LISTA_UNIDADES.map((u) => (
                      <option key={u.sigla} value={u.sigla} className="bg-zinc-900 text-white">
                        {u.sigla.toUpperCase()} — {u.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Estoque e Preços */}
          <div className="space-y-3.5 pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={13} className={theme.text} /> Estoque & Valores
            </h4>

            {/* Quantidade Inicial + Estoque Mínimo + Localização */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Estoque Inicial *
                </label>
                <input
                  type="number"
                  step={permiteFracionado ? '0.1' : '1'}
                  min="0"
                  required
                  value={quantidadeInicial}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setQuantidadeInicial(v);
                    if (v < quantidadeOS) {
                      setQuantidadeOS(Math.max(1, v));
                    }
                  }}
                  className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Estoque Mínimo
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(parseFloat(e.target.value) || 0)}
                  className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Localização no Almox.
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    placeholder="PRAT. A2"
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white uppercase font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  />
                </div>
              </div>
            </div>

            {/* Custo + Preço de Venda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Custo Unitário (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                    placeholder="0,00"
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                  Preço de Venda Unitário (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={precoVenda}
                    onChange={(e) => {
                      setPrecoVenda(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="0,00"
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-3 text-xs text-white font-bold tracking-wider placeholder:text-zinc-600 outline-none transition ${theme.focusBorder} focus:ring-2 ${theme.ring}`}
                  />
                </div>
              </div>
            </div>

            {/* Permite fracionamento */}
            <label className="flex items-center gap-2.5 p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl cursor-pointer hover:border-zinc-700 transition">
              <input
                type="checkbox"
                checked={permiteFracionado}
                onChange={(e) => setPermiteFracionado(e.target.checked)}
                className={`rounded border-zinc-700 bg-zinc-900 ${theme.checkbox}`}
              />
              <div className="text-xs">
                <span className="font-bold text-white">Permite Fracionamento</span>
                <span className="text-zinc-500 ml-1.5">(ex: 1.5 litros, 2.5 metros)</span>
              </div>
            </label>
          </div>

          {/* Seção 3: Adição Automática à OS */}
          <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adicionarNaOS}
                  onChange={(e) => setAdicionarNaOS(e.target.checked)}
                  className={`rounded border-zinc-700 bg-zinc-900 ${theme.checkbox}`}
                />
                <div>
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Adicionar imediatamente a esta OS
                  </span>
                  <p className="text-[10px] text-zinc-400">
                    A peça será inserida na lista da Ordem de Serviço com a quantidade definida abaixo
                  </p>
                </div>
              </label>
            </div>

            {adicionarNaOS && (
              <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                    Quantidade a Aplicar na OS
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={permiteFracionado ? '0.1' : '1'}
                      min="0.1"
                      max={quantidadeInicial > 0 ? quantidadeInicial : undefined}
                      value={quantidadeOS}
                      onChange={(e) => setQuantidadeOS(parseFloat(e.target.value) || 0)}
                      className={`w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-white font-bold tracking-wider outline-none transition ${theme.focusBorder}`}
                    />
                    <span className="text-xs font-bold text-zinc-400 uppercase">
                      {unidadeMedida}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">
                    Subtotal na OS:
                  </span>
                  <span className={`text-sm font-black ${theme.text}`}>
                    {formatCurrency(subtotalOS)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950/60 rounded-b-2xl md:rounded-b-3xl flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer disabled:opacity-50 ${theme.primary}`}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Cadastrando Peça...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} />
                {adicionarNaOS ? 'Cadastrar e Inserir na OS' : 'Cadastrar no Almoxarifado'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
