'use client';

import { useState, useEffect, useCallback, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Car, Wrench, Package, 
  Search, ChevronLeft, Info, Calendar,
  DollarSign, Check, AlertTriangle, Trash2, Plus, Clock, FileText, CreditCard,
  Loader2, Save, Printer, Navigation, Milestone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { parseHoras, formatHoras, roundDecimal } from '@/lib/utils';
import { obterUnidadesCompativeis, converterUnidade } from '@/lib/unidades';
import StockPartsModal, { StockPartItem } from '@/components/StockPartsModal';

function sanitizeWorkOrderPayload(payload: any) {
  console.log("Payload Final OS", payload);
  const servicosValidos = (payload.servicos || [])
    .map((s: any) => ({
      id: s.id,
      descricao: s.descricao ? s.descricao.trim() : 'Serviço',
      tipo_cobranca: s.tipo_cobranca || 'HORA',
      horas: s.tipo_cobranca === 'HORA' ? Number(s.horas || 1) : null,
      valor_hora: s.tipo_cobranca === 'HORA' ? parseFloat(s.valor_hora || 0) : null,
      valor_pacote: s.tipo_cobranca === 'PACOTE' ? parseFloat(s.valor_pacote || 0) : null,
      valor_total: parseFloat(s.valor_total || 0)
    }));

  const pecasValidas = (payload.pecas || [])
    .filter((p: any) => p.peca_id || p.pecaId)
    .map((p: any) => ({
      peca_id: p.peca_id || p.pecaId,
      descricao: p.descricao || 'Peça',
      quantidade: Math.max(1, Number(p.quantidade || 1)),
      unidade: p.unidade || 'un',
      valor_unit: parseFloat(p.valor_unit || 0),
      valor_total: parseFloat(p.valor_total || 0),
      origem: p.origem || 'OFICINA'
    }));

  return {
    ...payload,
    mecanico_id: payload.mecanico_id && payload.mecanico_id !== "" && payload.mecanico_id !== "null" && payload.mecanico_id !== "undefined" ? payload.mecanico_id : null,
    desconto: parseFloat(payload.desconto || 0),
    valor_total: parseFloat(payload.valor_total || 0),
    servicos: servicosValidos,
    pecas: pecasValidas,
    km_saida: payload.tipoOS === 'CAMPO' ? parseFloat(payload.km_saida || 0) : 0,
    km_retorno: payload.tipoOS === 'CAMPO' ? parseFloat(payload.km_retorno || 0) : 0,
    km_total: payload.tipoOS === 'CAMPO' ? parseFloat(payload.km_total || 0) : 0,
    valor_km: payload.tipoOS === 'CAMPO' ? parseFloat(payload.valor_km || 0) : 0,
    total_deslocamento: payload.tipoOS === 'CAMPO' ? parseFloat(payload.total_deslocamento || 0) : 0,
    despesa_pedagio: parseFloat(payload.despesa_pedagio || 0),
    despesa_combustivel: parseFloat(payload.despesa_combustivel || 0),
    despesa_hospedagem: parseFloat(payload.despesa_hospedagem || 0),
    despesa_alimentacao: parseFloat(payload.despesa_alimentacao || 0),
    despesa_diaria_tecnica: parseFloat(payload.despesa_diaria_tecnica || 0),
    despesa_guincho: parseFloat(payload.despesa_guincho || 0),
    despesa_outros: parseFloat(payload.despesa_outros || 0),
    mao_obra_externa_horas: parseFloat(payload.mao_obra_externa_horas || 0),
    mao_obra_externa_valor: parseFloat(payload.mao_obra_externa_valor || 0),
    mao_obra_externa_total: parseFloat(payload.mao_obra_externa_total || 0)
  };
}

export default function EditarOSPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Refs para controle de concorrência e carregamento seguro do rascunho
  const lastRequestId = useRef<number>(0);
  const isLoadedRef = useRef(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Dados fundamentais
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [availablePecas, setAvailablePecas] = useState<any[]>([]);
  const [pecasLoading, setPecasLoading] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  
  // Dados da OS
  const [ordem, setOrdem] = useState<any>(null);
  
  // Formulário
  const [status, setStatus] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [selectedMecanico, setSelectedMecanico] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Novos campos estruturais "CAMPOS X OFICINA"
  const [tipoOS, setTipoOS] = useState<'OFICINA' | 'CAMPO'>('OFICINA');

  // Atributos Específicos de Oficina
  const [boxElevador, setBoxElevador] = useState('');
  const [prioridade, setPrioridade] = useState('NORMAL');
  const [statusElevador, setStatusElevador] = useState('LIVRE');
  const [lavagem, setLavagem] = useState(false);
  const [testeFinal, setTesteFinal] = useState(false);
  const [tempoInterno, setTempoInterno] = useState('');
  const [checklistOficina, setChecklistOficina] = useState({
    fluidos: false,
    filtros: false,
    freios: false,
    suspensao: false,
    bateria: false,
    iluminacao: false
  });

  // Atributos Específicos de Campo adicionais
  const [veiculoApoio, setVeiculoApoio] = useState('');
  const [horarioSaidaEquipe, setHorarioSaidaEquipe] = useState('');
  const [horarioChegadaEquipe, setHorarioChegadaEquipe] = useState('');
  const [tempoDeslocamento, setTempoDeslocamento] = useState('');
  const [fotosCampo, setFotosCampo] = useState<string[]>([]);
  const [assinaturaCampo, setAssinaturaCampo] = useState('');

  // Canvas Ref para Desenho de Assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // Campos de Atendimento Externo e Logística de Campo
  const [tipoAtendimento, setTipoAtendimento] = useState('OFICINA');
  const [kmSaida, setKmSaida] = useState(0);
  const [kmRetorno, setKmRetorno] = useState(0);
  const [valorKm, setValorKm] = useState(0);

  const [despesaPedagio, setDespesaPedagio] = useState(0);
  const [despesaCombustivel, setDespesaCombustivel] = useState(0);
  const [despesaHospedagem, setDespesaHospedagem] = useState(0);
  const [despesaAlimentacao, setDespesaAlimentacao] = useState(0);
  const [despesaDiariaTecnica, setDespesaDiariaTecnica] = useState(0);
  const [despesaGuincho, setDespesaGuincho] = useState(0);
  const [despesaOutros, setDespesaOutros] = useState(0);

  const [maoObraExternaHoras, setMaoObraExternaHoras] = useState(0);
  const [maoObraExternaValor, setMaoObraExternaValor] = useState(0);
  const [mecanicosAdicionaisInput, setMecanicosAdicionaisInput] = useState('');

  const [localAtendimento, setLocalAtendimento] = useState('');
  const [localCidade, setLocalCidade] = useState('');
  const [localEstado, setLocalEstado] = useState('');
  const [localGps, setLocalGps] = useState('');

  // Métodos de Assinatura por Canvas
  const startDrawing = (e: any) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e: any) => {
    if (!isDrawing.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setAssinaturaCampo(dataUrl);
    }
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaCampo('');
  };

  // Carregamento de Inicialização de Assinatura se houver ativa
  useEffect(() => {
    if (assinaturaCampo && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = assinaturaCampo;
    }
  }, [assinaturaCampo]);

  // Gestão de Fotos em Campo
  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      filesArr.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setFotosCampo((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removerFoto = (idx: number) => {
    setFotosCampo((prev) => prev.filter((_, i) => i !== idx));
  };

  // Campos Financeiros
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [numParcelas, setNumParcelas] = useState(1);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  // Itens
  const [servicos, setServicos] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);

  const [pecaSearchTerm, setPecaSearchTerm] = useState('');

  // Carregamento inicial com proteção de concorrência e rascunho inteligente
  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++lastRequestId.current;

    const loadBasics = async () => {
      try {
        const [mRes, oRes] = await Promise.all([
          fetch('/api/usuarios?limit=1000', { signal: controller.signal }),
          fetch(`/api/ordens/${id}`, { signal: controller.signal })
        ]);

        console.log('Editar OS Basics:', {
          mecanicos: mRes?.status,
          ordem: oRes?.status
        });

        // Aborta se outra requisição iniciou após esta
        if (requestId !== lastRequestId.current) return;

        if (mRes.ok) {
          const data = await mRes.json();
          const users = data.items || [];
          setMecanicos(users.filter((u: any) => u.role === 'MECANICO' || u.role === 'LIDER' || u.role === 'ADMIN'));
        }
        
        if (oRes.ok) {
          const data = await oRes.json();
          setOrdem(data);
          setStatus(data.status || 'ABERTA');
          setDiagnostico(data.diagnostico || '');
          setPrevisao(data.data_previsao ? new Date(data.data_previsao).toISOString().slice(0, 16) : '');
          setDesconto(data.desconto || 0);
          setSelectedMecanico(data.mecanico_id || '');
          setObservacoes(data.observacoes || '');

          // Tipo de OS dinâmico herdadado
          const tOS = data.tipoOS || (data.tipo_atendimento === 'CAMPO' ? 'CAMPO' : 'OFICINA');
          setTipoOS(tOS);

          // Carregamento inteligente de metadados estendidos via Observações serializadas
          if (data.observacoes) {
            try {
              const meta = JSON.parse(data.observacoes);
              if (meta && typeof meta === 'object') {
                if (meta.boxElevador) setBoxElevador(meta.boxElevador);
                if (meta.prioridade) setPrioridade(meta.prioridade);
                if (meta.statusElevador) setStatusElevador(meta.statusElevador);
                if (meta.lavagem !== undefined) setLavagem(!!meta.lavagem);
                if (meta.testeFinal !== undefined) setTesteFinal(!!meta.testeFinal);
                if (meta.tempoInterno) setTempoInterno(meta.tempoInterno);
                if (meta.checklistOficina) setChecklistOficina(prev => ({ ...prev, ...meta.checklistOficina }));
                if (meta.veiculoApoio) setVeiculoApoio(meta.veiculoApoio);
                if (meta.horarioSaidaEquipe) setHorarioSaidaEquipe(meta.horarioSaidaEquipe);
                if (meta.horarioChegadaEquipe) setHorarioChegadaEquipe(meta.horarioChegadaEquipe);
                if (meta.tempoDeslocamento) setTempoDeslocamento(meta.tempoDeslocamento);
                if (Array.isArray(meta.fotosCampo)) setFotosCampo(meta.fotosCampo);
                if (meta.assinaturaCampo) setAssinaturaCampo(meta.assinaturaCampo);
              }
            } catch (err) {
              console.log('observacoes não é JSON ou está em formato de texto customizado:', data.observacoes);
            }
          }

          // Campos de Atendimento Externo e Logística de Campo
          setTipoAtendimento(tOS);
          setKmSaida(data.km_saida || 0);
          setKmRetorno(data.km_retorno || 0);
          setValorKm(data.valor_km || 0);
          
          setDespesaPedagio(data.despesa_pedagio || 0);
          setDespesaCombustivel(data.despesa_combustivel || 0);
          setDespesaHospedagem(data.despesa_hospedagem || 0);
          setDespesaAlimentacao(data.despesa_alimentacao || 0);
          setDespesaDiariaTecnica(data.despesa_diaria_tecnica || 0);
          setDespesaGuincho(data.despesa_guincho || 0);
          setDespesaOutros(data.despesa_outros || 0);
          
          setMaoObraExternaHoras(data.mao_obra_externa_horas || 0);
          setMaoObraExternaValor(data.mao_obra_externa_valor || 0);
          
          let parsedEquipe: any[] = [];
          try {
            parsedEquipe = typeof data.mao_obra_equipe === 'string' 
              ? JSON.parse(data.mao_obra_equipe || '[]') 
              : (data.mao_obra_equipe || []);
          } catch(e) {
            parsedEquipe = [];
          }
          setMecanicosAdicionaisInput(parsedEquipe.map((p: any) => typeof p === 'object' ? p.nome || p.role : p).join(', '));
          
          setLocalAtendimento(data.local_atendimento || '');
          setLocalCidade(data.local_cidade || '');
          setLocalEstado(data.local_estado || '');
          setLocalGps(data.local_gps || '');
          
          const fp = data.forma_pagamento === 'PARCELADO' ? 'BOLETO PARCELADO' : (data.forma_pagamento || 'DINHEIRO');
          setFormaPagamento(fp);
          setNumParcelas(data.numero_parcelas || 1);
          setDiasEntreParcelas(data.dias_entre_parcelas || 28);
          if (data.data_vencimento_primeira) {
            setDataPrimeiraParcela(new Date(data.data_vencimento_primeira).toISOString().split('T')[0]);
          }
          
          // Mapear serviços
          setServicos((data.servicos || []).map((s: any) => ({
            id: s.id || crypto.randomUUID(),
            descricao: s.descricao,
            tipo_cobranca: s.tipo_cobranca || 'HORA',
            horas: formatHoras(s.horas || 0),
            valor_hora: s.valor_hora || 150,
            valor_pacote: s.valor_pacote || 0,
            valor_total: s.valor_total || 0
          })));
          
          // Mapear peças vindas da API
          const rawPecas = data.pecas || data.pecas_aplicadas || data.itens || [];
          console.log('PECAS RECEBIDAS', rawPecas);
          
          const apiPecasMapped = rawPecas.map((p: any) => {
            const defaultUnit = p.unidade || p.peca?.unidadeMedida || 'un';
            const originalUnit = p.peca?.unidadeMedida || 'un';
            return {
              id: p.id || crypto.randomUUID(),
              peca_id: p.peca_id,
              descricao: p.descricao || p.peca?.descricao || 'Peça sem descrição',
              quantidade: p.quantidade,
              unidade: defaultUnit,
              unidadeMedidaOriginal: originalUnit,
              valor_unit: p.valor_unit,
              valor_total: p.valor_total,
              original_preco_venda: p.peca?.preco_venda || p.valor_unit,
              maxQuantidade: p.peca?.quantidade !== undefined ? p.peca.quantidade + p.quantidade : undefined,
              compativeis: obterUnidadesCompativeis(originalUnit)
            };
          });

          // Limpa rascunho anterior de peças local ao carregar a página inicialmente do banco (evita rascunhos corruptos antigos de sobrescrever os dados corretos)
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('os-draft-' + id);
            } catch (err) {
              console.error('Erro ao limpar rascunho:', err);
            }
          }

          setPecas(apiPecasMapped);
        } else {
          toast.error('Erro ao carregar Ordem de Serviço');
        }
      } catch (err: any) { 
        if (err.name !== 'AbortError') {
          console.error(err);
          toast.error('Erro de conexão com o servidor');
        }
      } finally {
        if (requestId === lastRequestId.current) {
          setFetching(false);
          // Habilita a escuta do autosave após o delay para a sincronização de estados dos inputs
          setTimeout(() => {
            isLoadedRef.current = true;
          }, 400);
        }
      }
    };
    loadBasics();

    return () => {
      controller.abort();
    };
  }, [id]);

  // Busca de peças dinâmica com Debounce e AbortController (Otimizado para Hostinger Business)
  useEffect(() => {
    if (!pecaSearchTerm || pecaSearchTerm.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setPecasLoading(true);
      try {
        const res = await fetch(`/api/pecas?onlySearch=true&q=${encodeURIComponent(pecaSearchTerm.trim())}`, {
          signal: controller.signal
        });
        if (res.ok) {
          const data = await res.json();
          setAvailablePecas(data.items || []);
        } else {
          setAvailablePecas([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Erro ao pesquisar peças:', err);
          setAvailablePecas([]);
        }
      } finally {
        setPecasLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [pecaSearchTerm]);

  // Lógica de Serviços Memoizada
  const addServico = useCallback(() => {
    const serviceId = crypto.randomUUID();
    setServicos(prev => [...prev, { 
      id: serviceId, 
      descricao: '', 
      tipo_cobranca: 'HORA',
      horas: '1:00', 
      valor_hora: 150, 
      valor_pacote: 0,
      valor_total: 150 
    }]);
  }, []);

  const updateServico = useCallback((id: string, field: string, value: any) => {
    setServicos(prev => prev.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        if (updated.tipo_cobranca === 'HORA') {
          const h = parseHoras(updated.horas.toString());
          updated.valor_total = h * (parseFloat(updated.valor_hora) || 0);
        } else {
          updated.valor_total = parseFloat(updated.valor_pacote) || 0;
        }
        return updated;
      }
      return s;
    }));
  }, []);

  const removeServico = useCallback((sid: string) => {
    setServicos(prev => prev.filter(s => s.id !== sid));
  }, []);

  // Lógica de Peças Memoizada com Adição e Atualização Consistente
  const addPeca = useCallback((pecaRef: any) => {
    const defaultUnit = pecaRef.unidadeMedida || 'un';
    const compativeis = obterUnidadesCompativeis(defaultUnit);
    setPecas(prev => {
      const existingIndex = prev.findIndex(p => p.peca_id === pecaRef.id);
      if (existingIndex >= 0) {
        const updatedList = [...prev];
        const existing = updatedList[existingIndex];
        const novaQtd = roundDecimal(existing.quantidade + 1);
        const novoTotal = roundDecimal(novaQtd * existing.valor_unit);
        updatedList[existingIndex] = {
          ...existing,
          quantidade: novaQtd,
          valor_total: novoTotal
        };
        return updatedList;
      }
      return [
        ...prev,
        { 
          id: crypto.randomUUID(), 
          peca_id: pecaRef.id, 
          descricao: pecaRef.descricao, 
          quantidade: 1, 
          unidade: defaultUnit,
          unidadeMedidaOriginal: defaultUnit,
          valor_unit: pecaRef.preco_venda, 
          valor_total: pecaRef.preco_venda,
          original_preco_venda: pecaRef.preco_venda,
          maxQuantidade: pecaRef.quantidade,
          compativeis
        }
      ];
    });
  }, []);

  const handleAddPartFromStockModal = useCallback((data: {
    peca: StockPartItem;
    quantidade: number;
    unidade: string;
    valorUnitario: number;
    valorTotal: number;
  }) => {
    const { peca, quantidade, unidade, valorUnitario, valorTotal } = data;
    const defaultUnit = unidade || peca.unidadeMedida || 'un';
    const compativeis = obterUnidadesCompativeis(peca.unidadeMedida || 'un');

    setPecas(prev => {
      const existingIndex = prev.findIndex(p => p.peca_id === peca.id);
      if (existingIndex >= 0) {
        const updatedList = [...prev];
        const existing = updatedList[existingIndex];
        const novaQtd = roundDecimal(existing.quantidade + quantidade);
        const novoTotal = roundDecimal(novaQtd * existing.valor_unit);
        updatedList[existingIndex] = {
          ...existing,
          quantidade: novaQtd,
          valor_total: novoTotal
        };
        return updatedList;
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          peca_id: peca.id,
          descricao: peca.descricao,
          quantidade,
          unidade: defaultUnit,
          unidadeMedidaOriginal: peca.unidadeMedida || 'un',
          valor_unit: valorUnitario,
          valor_total: valorTotal,
          original_preco_venda: peca.preco_venda,
          maxQuantidade: peca.quantidade,
          compativeis
        }
      ];
    });
  }, []);

  const updatePeca = useCallback((pid: string, field: string, value: any) => {
    setPecas(prev => prev.map(p => {
      if (p.id === pid) {
        let updated = { ...p, [field]: value };
        
        if (field === 'unidade') {
          const targetUnit = value;
          const originalUnit = updated.unidadeMedidaOriginal;
          if (targetUnit && originalUnit && targetUnit.toLowerCase() !== originalUnit.toLowerCase()) {
            try {
              const ratio = converterUnidade(1, targetUnit, originalUnit);
              updated.valor_unit = Number((updated.original_preco_venda * ratio).toFixed(2));
            } catch (err) {
              console.error('Falha ao converter preço unitário:', err);
            }
          } else {
            updated.valor_unit = updated.original_preco_venda;
          }
        }

        updated.valor_total = Number((updated.quantidade * updated.valor_unit).toFixed(2));
        return updated;
      }
      return p;
    }));
  }, []);

  const removePeca = useCallback((pid: string) => {
    setPecas(prev => prev.filter(p => p.id !== pid));
  }, []);

  // Persistência local do rascunho de peças
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      try {
        localStorage.setItem('os-draft-' + id, JSON.stringify(pecas));
        console.log('Saved parts to Local Storage draft safely:', pecas);
      } catch (err) {
        console.error('Failed to save draft to localStorage', err);
      }
    }
  }, [pecas, id]);

  // LOGS DE MONITORAMENTO E AUDITORIA EXIGIDOS
  useEffect(() => {
    if (fetching) return;
    console.log('PECAS STATE', pecas);
    console.log('FORM VALUES', {
      status,
      diagnostico,
      previsao,
      desconto,
      selectedMecanico,
      observacoes,
      tipoOS,
      formaPagamento,
      numParcelas,
      servicos,
      pecas
    });
  }, [fetching, status, diagnostico, previsao, desconto, selectedMecanico, observacoes, tipoOS, formaPagamento, numParcelas, servicos, pecas]);

  // Cálculos Memoizados de Alta Performance e À Prova de Loops
  const totalServicos = useMemo(() => {
    return servicos.reduce((acc, s) => acc + (parseFloat(s.valor_total) || 0), 0);
  }, [servicos]);

  const totalPecas = useMemo(() => {
    return pecas.reduce((acc, p) => acc + (parseFloat(p.valor_total) || 0), 0);
  }, [pecas]);

  const kmTotal = useMemo(() => {
    const q1 = Math.max(0, parseFloat(kmSaida as any) || 0);
    const q2 = Math.max(0, parseFloat(kmRetorno as any) || 0);
    return q1 + q2;
  }, [kmRetorno, kmSaida]);

  const totalDeslocamento = useMemo(() => {
    return kmTotal * valorKm;
  }, [kmTotal, valorKm]);

  const maoObraExternaTotal = useMemo(() => {
    return maoObraExternaHoras * maoObraExternaValor;
  }, [maoObraExternaHoras, maoObraExternaValor]);

  const totalDespesas = useMemo(() => {
    return (
      (parseFloat(despesaPedagio as any) || 0) + 
      (parseFloat(despesaCombustivel as any) || 0) + 
      (parseFloat(despesaHospedagem as any) || 0) + 
      (parseFloat(despesaAlimentacao as any) || 0) + 
      (parseFloat(despesaDiariaTecnica as any) || 0) + 
      (parseFloat(despesaGuincho as any) || 0) + 
      (parseFloat(despesaOutros as any) || 0)
    );
  }, [
    despesaPedagio, 
    despesaCombustivel, 
    despesaHospedagem, 
    despesaAlimentacao, 
    despesaDiariaTecnica, 
    despesaGuincho, 
    despesaOutros
  ]);

  const subtotal = useMemo(() => {
    if (tipoOS === 'OFICINA') {
      return totalServicos + totalPecas;
    }
    return totalServicos + totalPecas + totalDeslocamento + totalDespesas + maoObraExternaTotal;
  }, [tipoOS, totalServicos, totalPecas, totalDeslocamento, totalDespesas, maoObraExternaTotal]);

  const totalGeral = useMemo(() => {
    return Math.max(0, subtotal - desconto);
  }, [subtotal, desconto]);

  // Lógica de Autosave Inteligente em Background Debounced (800ms)
  useEffect(() => {
    if (!isLoadedRef.current || fetching || loading) return;

    setAutosaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const rawPayload = {
          status,
          cliente_id: ordem?.cliente_id,
          veiculo_id: ordem?.veiculo_id,
          mecanico_id: selectedMecanico || null,
          tipoOS: tipoOS,
          diagnostico,
          data_previsao: previsao,
          observacoes: JSON.stringify({
            boxElevador,
            prioridade,
            statusElevador,
            lavagem,
            testeFinal,
            tempoInterno,
            checklistOficina,
            veiculoApoio,
            horarioSaidaEquipe,
            horarioChegadaEquipe,
            tempoDeslocamento,
            fotosCampo,
            assinaturaCampo
          }),
          servicos: servicos.map(s => ({
            id: s.id,
            descricao: s.descricao,
            tipo_cobranca: s.tipo_cobranca,
            horas: s.tipo_cobranca === 'HORA' ? parseHoras(s.horas.toString()) : null,
            valor_hora: s.tipo_cobranca === 'HORA' ? parseFloat(s.valor_hora) : null,
            valor_pacote: s.tipo_cobranca === 'PACOTE' ? parseFloat(s.valor_pacote) : null,
            valor_total: parseFloat(s.valor_total)
          })),
          pecas: pecas.map(p => ({
            peca_id: p.peca_id,
            descricao: p.descricao,
            quantidade: p.quantidade,
            unidade: p.unidade,
            valor_unit: p.valor_unit,
            valor_total: p.valor_total
          })),
          desconto,
          valor_total: totalGeral,
          forma_pagamento: formaPagamento === 'BOLETO PARCELADO' ? 'PARCELADO' : formaPagamento,
          numero_parcelas: formaPagamento === 'BOLETO PARCELADO' ? numParcelas : null,
          dias_entre_parcelas: formaPagamento === 'BOLETO PARCELADO' ? diasEntreParcelas : null,
          data_vencimento_primeira: (formaPagamento === 'BOLETO PARCELADO' || formaPagamento === 'PARCELADO') && dataPrimeiraParcela ? new Date(dataPrimeiraParcela).toISOString() : null,

          // Campos de Atendimento Externo e Logística de Campo
          tipo_atendimento: tipoOS === 'CAMPO' ? 'CAMPO' : 'OFICINA',
          km_saida: tipoOS === 'CAMPO' ? kmSaida : 0,
          km_retorno: tipoOS === 'CAMPO' ? kmRetorno : 0,
          km_total: tipoOS === 'CAMPO' ? kmTotal : 0,
          valor_km: tipoOS === 'CAMPO' ? valorKm : 0,
          total_deslocamento: tipoOS === 'CAMPO' ? totalDeslocamento : 0,

          despesa_pedagio: tipoOS === 'CAMPO' ? despesaPedagio : 0,
          despesa_combustivel: tipoOS === 'CAMPO' ? despesaCombustivel : 0,
          despesa_hospedagem: tipoOS === 'CAMPO' ? despesaHospedagem : 0,
          despesa_alimentacao: tipoOS === 'CAMPO' ? despesaAlimentacao : 0,
          despesa_diaria_tecnica: tipoOS === 'CAMPO' ? despesaDiariaTecnica : 0,
          despesa_guincho: tipoOS === 'CAMPO' ? despesaGuincho : 0,
          despesa_outros: tipoOS === 'CAMPO' ? despesaOutros : 0,

          mao_obra_externa_horas: tipoOS === 'CAMPO' ? maoObraExternaHoras : 0,
          mao_obra_externa_valor: tipoOS === 'CAMPO' ? maoObraExternaValor : 0,
          mao_obra_externa_total: tipoOS === 'CAMPO' ? maoObraExternaTotal : 0,
          mao_obra_equipe: tipoOS === 'CAMPO' ? (mecanicosAdicionaisInput ? JSON.stringify(mecanicosAdicionaisInput.split(',').map((name: string) => name.trim())) : '[]') : '[]',

          local_atendimento: tipoOS === 'CAMPO' ? localAtendimento : '',
          local_cidade: tipoOS === 'CAMPO' ? localCidade : '',
          local_estado: tipoOS === 'CAMPO' ? localEstado : '',
          local_gps: tipoOS === 'CAMPO' ? localGps : ''
        };

        console.log('ANTES SALVAR (AUTOSAVE)', {
          checklistOficina,
          checklistEntrega: undefined,
          servicos,
          pecas_aplicadas: pecas,
          despesas: totalDespesas
        });

        const sanitizedPayload = sanitizeWorkOrderPayload(rawPayload);
        console.log('PAYLOAD ENVIADO', sanitizedPayload);

        const res = await fetch(`/api/ordens/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sanitizedPayload)
        });

        let responseData = null;
        try {
          const clonedRes = res.clone();
          responseData = await clonedRes.json();
        } catch (e: any) {
          console.error('Falha ao parsear JSON no autosave response:', e);
        }
        console.log('RESPOSTA API (AUTOSAVE)', responseData);

        if (res.ok) {
          setAutosaveStatus('saved');
          // Limpa o rascunho de peças local se salvou com sucesso na API
          if (typeof window !== 'undefined') {
            localStorage.removeItem('os-draft-' + id);
          }
        } else {
          setAutosaveStatus('error');
        }
      } catch (err) {
        console.error('Erro de background autosave:', err);
        setAutosaveStatus('error');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [
    status,
    diagnostico,
    previsao,
    observacoes,
    servicos,
    pecas,
    desconto,
    formaPagamento,
    numParcelas,
    diasEntreParcelas,
    dataPrimeiraParcela,
    tipoAtendimento,
    tipoOS,
    boxElevador,
    prioridade,
    statusElevador,
    lavagem,
    testeFinal,
    tempoInterno,
    checklistOficina,
    veiculoApoio,
    horarioSaidaEquipe,
    horarioChegadaEquipe,
    tempoDeslocamento,
    fotosCampo,
    assinaturaCampo,
    kmSaida,
    kmRetorno,
    valorKm,
    despesaPedagio,
    despesaCombustivel,
    despesaHospedagem,
    despesaAlimentacao,
    despesaDiariaTecnica,
    despesaGuincho,
    despesaOutros,
    maoObraExternaHoras,
    maoObraExternaValor,
    mecanicosAdicionaisInput,
    localAtendimento,
    localCidade,
    localEstado,
    localGps,
    totalGeral
  ]);

  const capturarGps = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalGps(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`);
        },
        (err) => {
          console.error(err);
          alert('Não foi possível obter a geolocalização automática.');
        }
      );
    } else {
      alert('Geolocalização não suportada por este navegador.');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const rawPayload = {
        status,
        cliente_id: ordem.cliente_id,
        veiculo_id: ordem.veiculo_id,
        mecanico_id: selectedMecanico || null,
        tipoOS: tipoOS,
        diagnostico,
        data_previsao: previsao,
        observacoes: JSON.stringify({
          boxElevador,
          prioridade,
          statusElevador,
          lavagem,
          testeFinal,
          tempoInterno,
          checklistOficina,
          veiculoApoio,
          horarioSaidaEquipe,
          horarioChegadaEquipe,
          tempoDeslocamento,
          fotosCampo,
          assinaturaCampo
        }),
        servicos: servicos.map(s => ({
          descricao: s.descricao,
          tipo_cobranca: s.tipo_cobranca,
          horas: s.tipo_cobranca === 'HORA' ? parseHoras(s.horas.toString()) : null,
          valor_hora: s.tipo_cobranca === 'HORA' ? parseFloat(s.valor_hora) : null,
          valor_pacote: s.tipo_cobranca === 'PACOTE' ? parseFloat(s.valor_pacote) : null,
          valor_total: parseFloat(s.valor_total)
        })),
        pecas: pecas.map(p => ({
          peca_id: p.peca_id,
          descricao: p.descricao,
          quantidade: p.quantidade,
          unidade: p.unidade,
          valor_unit: p.valor_unit,
          valor_total: p.valor_total
        })),
        desconto,
        valor_total: totalGeral,
        forma_pagamento: formaPagamento === 'BOLETO PARCELADO' ? 'PARCELADO' : formaPagamento,
        numero_parcelas: formaPagamento === 'BOLETO PARCELADO' ? numParcelas : null,
        dias_entre_parcelas: formaPagamento === 'BOLETO PARCELADO' ? diasEntreParcelas : null,
        data_vencimento_primeira: (formaPagamento === 'BOLETO PARCELADO' || formaPagamento === 'PARCELADO') && dataPrimeiraParcela ? new Date(dataPrimeiraParcela).toISOString() : null,

        // Campos de Atendimento Externo e Logística de Campo
        tipo_atendimento: tipoOS === 'CAMPO' ? 'CAMPO' : 'OFICINA',
        km_saida: tipoOS === 'CAMPO' ? kmSaida : 0,
        km_retorno: tipoOS === 'CAMPO' ? kmRetorno : 0,
        km_total: tipoOS === 'CAMPO' ? kmTotal : 0,
        valor_km: tipoOS === 'CAMPO' ? valorKm : 0,
        total_deslocamento: tipoOS === 'CAMPO' ? totalDeslocamento : 0,

        despesa_pedagio: tipoOS === 'CAMPO' ? despesaPedagio : 0,
        despesa_combustivel: tipoOS === 'CAMPO' ? despesaCombustivel : 0,
        despesa_hospedagem: tipoOS === 'CAMPO' ? despesaHospedagem : 0,
        despesa_alimentacao: tipoOS === 'CAMPO' ? despesaAlimentacao : 0,
        despesa_diaria_tecnica: tipoOS === 'CAMPO' ? despesaDiariaTecnica : 0,
        despesa_guincho: tipoOS === 'CAMPO' ? despesaGuincho : 0,
        despesa_outros: tipoOS === 'CAMPO' ? despesaOutros : 0,

        mao_obra_externa_horas: tipoOS === 'CAMPO' ? maoObraExternaHoras : 0,
        mao_obra_externa_valor: tipoOS === 'CAMPO' ? maoObraExternaValor : 0,
        mao_obra_externa_total: tipoOS === 'CAMPO' ? maoObraExternaTotal : 0,
        mao_obra_equipe: tipoOS === 'CAMPO' ? (mecanicosAdicionaisInput ? JSON.stringify(mecanicosAdicionaisInput.split(',').map(name => name.trim())) : '[]') : '[]',

        local_atendimento: tipoOS === 'CAMPO' ? localAtendimento : '',
        local_cidade: tipoOS === 'CAMPO' ? localCidade : '',
        local_estado: tipoOS === 'CAMPO' ? localEstado : '',
        local_gps: tipoOS === 'CAMPO' ? localGps : ''
      };

      console.log('ANTES SALVAR', {
        checklistOficina,
        checklistEntrega: undefined,
        servicos,
        pecas_aplicadas: pecas,
        despesas: totalDespesas
      });

      const sanitizedPayload = sanitizeWorkOrderPayload(rawPayload);
      console.log('PAYLOAD ENVIADO', sanitizedPayload);

      const res = await fetch(`/api/ordens/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedPayload)
      });
      
      let responseData = null;
      try {
        const clonedRes = res.clone();
        responseData = await clonedRes.json();
      } catch (e: any) {
        console.error('Falha ao parsear JSON no save response:', e);
      }
      console.log('RESPOSTA API', responseData);

      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('os-draft-' + id);
        }
        toast.success('Ordem de Serviço atualizada com sucesso!');
        router.push(`/os/${id}`);
      } else {
        const error = responseData || { error: 'Falha ao atualizar OS' };
        toast.error(`Erro: ${error.error || 'Falha ao atualizar OS'}`);
      }
    } catch (err) { 
      toast.error('Erro de rede ao tentar salvar');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = useCallback((val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest animate-pulse">Sincronizando dados da OS...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Header Fino */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/os/${id}`} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">OFICINA PRO <span className="text-zinc-700 mx-2">|</span> EDITAR OS #{ordem?.numero}</h1>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] leading-none mt-1">ATUALIZAÇÃO DE REGISTRO TÉCNICO</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Indicador de Autosave Premium */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950/40 border border-zinc-900 rounded-xl h-10">
            {autosaveStatus === 'saving' ? (
              <>
                <Loader2 size={12} className="text-orange-500 animate-spin" />
                <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest font-mono">Salvando...</span>
              </>
            ) : autosaveStatus === 'saved' ? (
              <>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest font-mono">Autosalvo</span>
              </>
            ) : autosaveStatus === 'error' ? (
              <>
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest font-mono">Erro ao salvar</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full" />
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono">Rascunho Ativo</span>
              </>
            )}
          </div>

          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer h-10 ${
              status === 'FINALIZADA' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
              status === 'EM_EXECUCAO' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
              status === 'CANCELADA' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              'bg-orange-500/10 text-orange-500 border-orange-500/20'
            }`}
          >
            <option value="ABERTA">Abertura</option>
            <option value="EM_DIAGNOSTICO">Em Diagnóstico</option>
            <option value="AGUARDANDO_PECAS">Aguardando Peças</option>
            <option value="EM_EXECUCAO">Em Manutenção</option>
            <option value="AGUARDANDO_APROVACAO">Aguardando Aprovação</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition shadow-lg shadow-orange-950/20 disabled:opacity-50 h-10 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            SALVAR ALTERAÇÕES
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA 1: DADOS FIXOS */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-7 space-y-6 shadow-xl">
            {/* Escolha Obrigatória de Tipo de OS - Sem Reload e Mantendo Peças e Serviços Intactos */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">TIPO DE ATENDIMENTO</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setTipoOS('OFICINA');
                    setTipoAtendimento('OFICINA');
                  }}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    tipoOS === 'OFICINA'
                      ? 'bg-blue-600 border border-blue-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  🏭 OFICINA
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipoOS('CAMPO');
                    setTipoAtendimento('CAMPO');
                  }}
                  className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    tipoOS === 'CAMPO'
                      ? 'bg-amber-600 border border-amber-500 text-white shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  🌾 CAMPO
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                 <div className={`w-1.5 h-4 rounded-full ${tipoOS === 'CAMPO' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                 <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Informações</h2>
              </div>
              <p className="text-[10px] text-zinc-650 font-bold uppercase tracking-widest px-1">Dados de Atendimento e Fluxo Técnico</p>
            </div>
            
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-1">
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest flex items-center gap-1">
                    <User size={10} /> Cliente Responsável
                  </p>
                  <p className="text-xs font-black text-white uppercase truncate">{ordem?.cliente?.nome}</p>
                </div>

                <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl space-y-1">
                  <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest flex items-center gap-1">
                    <Car size={10} /> Veículo em Manutenção
                  </p>
                  <p className="text-xs font-black text-white uppercase truncate">{ordem?.veiculo?.marca} {ordem?.veiculo?.modelo}</p>
                  <p className="text-[10px] font-mono text-orange-500 font-bold">{ordem?.veiculo?.placa}</p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Mecânico Atribuído</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[11px] text-white outline-none focus:border-orange-500 font-bold uppercase transition"
                  value={selectedMecanico}
                  onChange={(e) => setSelectedMecanico(e.target.value)}
                >
                  <option value="">Atribuir MECÂNICO</option>
                  {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Previsão de Entrega</label>
                <div className="relative group/field">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within/field:text-orange-500 transition-colors" size={16} />
                  <input 
                    type="datetime-local" 
                    value={previsao}
                    onChange={(e) => setPrevisao(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs text-white outline-none focus:border-orange-500 font-black uppercase transition shadow-inner"
                  />
                </div>
              </div>

              {/* FLUXO EXCLUSIVO 1: OS DE OFICINA */}
              {tipoOS === 'OFICINA' && (
                <div className="space-y-4 pt-4 border-t border-zinc-800/60 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Wrench className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] text-white font-black tracking-widest uppercase">CONTRÔLE DE BOX & PRODUTIVIDADE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-600 uppercase font-bold px-1">Box / Elevador</label>
                      <input 
                        type="text"
                        placeholder="EX: BOX 04" 
                        value={boxElevador}
                        onChange={(e) => setBoxElevador(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white font-black uppercase outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold px-1">Tempo de Box</label>
                      <input 
                        type="text"
                        placeholder="EX: 4H 30M" 
                        value={tempoInterno}
                        onChange={(e) => setTempoInterno(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white font-black uppercase outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold px-1">Prioridade</label>
                      <select 
                        value={prioridade}
                        onChange={(e) => setPrioridade(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-[10px] text-white font-black uppercase cursor-pointer"
                      >
                        <option value="BAIXA">🟢 BAIXA</option>
                        <option value="NORMAL">🟡 NORMAL</option>
                        <option value="ALTA">🔴 CRÍTICA / SCR</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold px-1">Status Elevador</label>
                      <select 
                        value={statusElevador}
                        onChange={(e) => setStatusElevador(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-[10px] text-white font-black uppercase cursor-pointer"
                      >
                        <option value="LIVRE">LIVRE</option>
                        <option value="OCUPADO">OCUPADO</option>
                        <option value="MANUTENCAO">MANUTENÇÃO</option>
                      </select>
                    </div>
                  </div>

                  {/* Checklist Industrial de Oficina de Caminhões Pesados */}
                  <div className="bg-zinc-950/70 border border-zinc-900 rounded-xl p-4 space-y-3">
                    <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest border-b border-zinc-900 pb-2">CHECKLIST TÉCNICO DE ENTRADA</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(checklistOficina || {}).map((key) => {
                        const active = checklistOficina ? (checklistOficina as any)[key] : false;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setChecklistOficina(prev => ({ ...prev, [key]: !active }));
                            }}
                            className={`flex items-center gap-1.5 p-2 rounded-lg border text-[8px] font-black uppercase transition-all ${
                              active 
                                ? 'bg-blue-600/15 border-blue-500/40 text-blue-400' 
                                : 'bg-transparent border-zinc-900 text-zinc-700 hover:text-zinc-500'
                            }`}
                          >
                            <Check size={9} className={active ? 'opacity-100' : 'opacity-0'} />
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Testes Adicionais */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setLavagem(!lavagem)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase border rounded-xl transition-all ${
                        lavagem 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-zinc-950 border-zinc-850 text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      🧼 Lavagem de Chassi
                    </button>
                    <button
                      type="button"
                      onClick={() => setTesteFinal(!testeFinal)}
                      className={`flex-1 flex items-center justify-center gap-2 p-3 text-[9px] font-black uppercase border rounded-xl transition-all ${
                        testeFinal 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-zinc-950 border-zinc-850 text-zinc-600 hover:text-zinc-400'
                      }`}
                    >
                      🚚 Teste Estratégico
                    </button>
                  </div>
                </div>
              )}

              {/* FLUXO EXCLUSIVO 2: OS DE CAMPO / EXTERNA */}
              {tipoOS === 'CAMPO' && (
                <div className="space-y-4 pt-4 border-t border-zinc-800/60 animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Milestone className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] text-white font-black tracking-widest uppercase">LOGÍSTICA EXTREMA DE CAMPO</span>
                  </div>

                  {/* Geolocalização */}
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-zinc-650 uppercase px-1">1. Local & GPS</p>
                    <input 
                      type="text" 
                      placeholder="LOCAL ATENDIMENTO (ENDEREÇO)..." 
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none focus:border-amber-500" 
                      value={localAtendimento} 
                      onChange={(e) => setLocalAtendimento(e.target.value)} 
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="text" 
                        placeholder="CIDADE..." 
                        className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none focus:border-amber-500" 
                        value={localCidade} 
                        onChange={(e) => setLocalCidade(e.target.value)} 
                      />
                      <input 
                        type="text" 
                        placeholder="UF..." 
                        className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none focus:border-amber-500" 
                        value={localEstado} 
                        maxLength={2} 
                        onChange={(e) => setLocalEstado(e.target.value)} 
                      />
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="COORDENADAS GPS..." 
                        className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-[10px] text-white font-mono outline-none focus:border-amber-500" 
                        value={localGps} 
                        onChange={(e) => setLocalGps(e.target.value)} 
                      />
                      <button 
                        type="button" 
                        onClick={capturarGps} 
                        className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl px-4 transition text-[9px] font-black uppercase"
                      >
                        📍 GPS
                      </button>
                    </div>
                  </div>

                  {/* Informações de Veículo de Apoio e Cronograma */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-950">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold">Veículo de Apoio</label>
                      <input 
                        type="text"
                        placeholder="PLACA / PREFIXO" 
                        value={veiculoApoio}
                        onChange={(e) => setVeiculoApoio(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white font-black uppercase outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold">Tempo de Viagem</label>
                      <input 
                        type="text"
                        placeholder="EX: 1H 40M" 
                        value={tempoDeslocamento}
                        onChange={(e) => setTempoDeslocamento(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white font-black uppercase outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold">Horário Saída</label>
                      <input 
                        type="time" 
                        value={horarioSaidaEquipe}
                        onChange={(e) => setHorarioSaidaEquipe(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-bold">Horário Chegada</label>
                      <input 
                        type="time" 
                        value={horarioChegadaEquipe}
                        onChange={(e) => setHorarioChegadaEquipe(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Controle de KM */}
                  <div className="space-y-3 pt-3 border-t border-zinc-950">
                    <p className="text-[8px] font-black text-zinc-650 uppercase">2. Painel Logístico de KM Rodados ({kmTotal} KM total)</p>
                    
                    {/* Grid de Cards de UX Profissional (Responsivo) */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 my-3">
                      {/* KM Ida */}
                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                        <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">KM Ida</span>
                        <p className="text-sm font-bold text-white font-mono">{kmSaida} <span className="text-[9px] text-zinc-600">KM</span></p>
                      </div>

                      {/* KM Volta */}
                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                        <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">KM Volta</span>
                        <p className="text-sm font-bold text-white font-mono">{kmRetorno} <span className="text-[9px] text-zinc-600">KM</span></p>
                      </div>

                      {/* Total Rodado */}
                      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 flex flex-col justify-between space-y-1 animate-pulse">
                        <span className="text-[8px] text-emerald-500 font-extrabold uppercase tracking-widest">Total Rodado</span>
                        <p className="text-sm font-black text-emerald-400 font-mono">{kmTotal} <span className="text-[9px] text-emerald-600">KM</span></p>
                      </div>

                      {/* Valor/KM */}
                      <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                        <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">Valor / KM</span>
                        <p className="text-xs font-bold text-white font-mono">{formatCurrency(parseFloat(valorKm as any) || 0)}</p>
                      </div>

                      {/* Total Deslocamento */}
                      <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3 flex flex-col justify-between space-y-1 col-span-2 lg:col-span-1">
                        <span className="text-[8px] text-amber-500 font-extrabold uppercase tracking-widest">Custo Deslocamento</span>
                        <p className="text-xs font-black text-amber-400 font-mono">{formatCurrency(totalDeslocamento)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase">KM Ida</label>
                        <input 
                          type="number" 
                          placeholder="Saída/Ida" 
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono" 
                          value={kmSaida || ''} 
                          onChange={(e) => setKmSaida(Math.max(0, parseFloat(e.target.value) || 0))} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase">KM Volta</label>
                        <input 
                          type="number" 
                          placeholder="Retorno/Volta" 
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono" 
                          value={kmRetorno || ''} 
                          onChange={(e) => setKmRetorno(Math.max(0, parseFloat(e.target.value) || 0))} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-650 uppercase">Valor por KM (R$)</label>
                      <input 
                        type="number" 
                        placeholder="Valor por KM" 
                        step="0.01" 
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono/5" 
                        value={valorKm || ''} 
                        onChange={(e) => setValorKm(parseFloat(e.target.value) || 0)} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-amber-500 font-bold bg-amber-950/10 border border-amber-500/10 p-2.5 rounded-xl">
                      <span>Faturamento KM:</span>
                      <span>{formatCurrency(totalDeslocamento)}</span>
                    </div>
                  </div>

                  {/* Mão de Obra Externa */}
                  <div className="space-y-3 pt-3 border-t border-zinc-950">
                    <p className="text-[8px] font-black text-zinc-650 uppercase">3. Hora Técnica Externa</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase">Quant de Horas</label>
                        <input 
                          type="number" 
                          placeholder="Horas" 
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono" 
                          value={maoObraExternaHoras || ''} 
                          onChange={(e) => setMaoObraExternaHoras(parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase">Valor/Hora (R$)</label>
                        <input 
                          type="number" 
                          placeholder="Valor/Hora" 
                          className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono" 
                          value={maoObraExternaValor || ''} 
                          onChange={(e) => setMaoObraExternaValor(parseFloat(e.target.value) || 0)} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-650 uppercase">Equipe Adicional / Apoio de Campo</label>
                      <input 
                        type="text" 
                        placeholder="EX: CLAUDIOMIRO (SOS), HELDER..." 
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-[10px] text-white uppercase outline-none focus:border-amber-500" 
                        value={mecanicosAdicionaisInput} 
                        onChange={(e) => setMecanicosAdicionaisInput(e.target.value)} 
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-amber-500 font-bold bg-amber-950/10 border border-amber-500/10 p-2.5 rounded-xl">
                      <span>Total Extra M.O:</span>
                      <span>{formatCurrency(maoObraExternaTotal)}</span>
                    </div>
                  </div>

                  {/* Despesas de Campo */}
                  <div className="space-y-3 pt-3 border-t border-zinc-950">
                    <p className="text-[8px] font-black text-zinc-650 uppercase">4. Despesas Reembolsáveis</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase flex items-center gap-1">🏦 Pedágio</label>
                        <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaPedagio || ''} onChange={(e) => setDespesaPedagio(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase flex items-center gap-1">⛽ Combustível</label>
                        <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaCombustivel || ''} onChange={(e) => setDespesaCombustivel(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase flex items-center gap-1">🛏️ Hospedagem</label>
                        <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaHospedagem || ''} onChange={(e) => setDespesaHospedagem(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase flex items-center gap-1">🍔 Alimentação</label>
                        <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaAlimentacao || ''} onChange={(e) => setDespesaAlimentacao(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase">🛠️ Diária Técnica</label>
                        <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaDiariaTecnica || ''} onChange={(e) => setDespesaDiariaTecnica(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-zinc-650 uppercase">🚛 Guincho</label>
                        <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaGuincho || ''} onChange={(e) => setDespesaGuincho(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] text-zinc-650 uppercase">Outras Despesas</label>
                      <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono" value={despesaOutros || ''} onChange={(e) => setDespesaOutros(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-900">
                      <span>Total Outras Despesas:</span>
                      <span>{formatCurrency(totalDespesas)}</span>
                    </div>
                  </div>

                  {/* Levantamento Fotográfico do Técnico em Campo (Opcional p/ Evitar Erros) */}
                  <div className="space-y-3 pt-3 border-t border-zinc-950">
                    <p className="text-[8px] font-black text-zinc-650 uppercase">5. Registro Fotográfico de Campo</p>
                    <label className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-850 hover:border-amber-500 border-dashed rounded-xl p-4 cursor-pointer transition select-none">
                      <span className="text-xl">📸</span>
                      <span className="text-[9px] font-black text-white uppercase tracking-wider mt-1.5">Enviar Fotos de Serviço</span>
                      <span className="text-[7px] text-zinc-600 font-black tracking-widest leading-none mt-1">PNG, JPG ATÉ 5MB CADA</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={handleFotoChange} 
                      />
                    </label>
                    {fotosCampo.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                        {fotosCampo.map((f, idx) => (
                          <div key={idx} className="relative aspect-square bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f} alt="Campo" className="w-full h-full object-cover rounded-xl" />
                            <button 
                              type="button" 
                              onClick={() => removerFoto(idx)} 
                              className="absolute inset-0 bg-red-650/80 text-white font-black text-[8px] uppercase tracking-widest flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assinatura de Aceite Técnico Formal do Cliente */}
                  <div className="space-y-3 pt-2 border-t border-zinc-950">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-zinc-650 uppercase">6. Assinatura Digital do Motorista</p>
                      <button 
                        type="button" 
                        onClick={clearSignature} 
                        className="text-[8px] text-red-500 hover:text-red-400 underline uppercase font-black"
                      >
                        Limpar Assinatura
                      </button>
                    </div>

                    <div className="w-full bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden relative shadow-inner touch-none select-none">
                      <canvas 
                        ref={canvasRef}
                        width={500}
                        height={220}
                        className="w-full h-[180px] sm:h-[220px] bg-zinc-950 cursor-crosshair blockTouchScroll touch-none overflow-hidden select-none"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      {!assinaturaCampo && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[8px] text-zinc-650 uppercase font-black tracking-widest bg-zinc-950/20">
                          Desenhe a assinatura aqui
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="bg-zinc-900 border border-zinc-805 rounded-[2rem] p-7 space-y-4 shadow-xl">
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
              <Info size={14} className={tipoOS === 'CAMPO' ? 'text-amber-500' : 'text-blue-500'} /> RESUMO GERAL
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                <p className="text-[8px] text-zinc-600 uppercase font-black">Serviços</p>
                <p className="text-xs font-bold text-white font-mono">{formatCurrency(totalServicos)}</p>
              </div>
              <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                <p className="text-[8px] text-zinc-600 uppercase font-black">Peças</p>
                <p className="text-xs font-bold text-white font-mono">{formatCurrency(totalPecas)}</p>
              </div>
              {tipoOS === 'CAMPO' && (
                <>
                  <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                    <p className="text-[8px] text-zinc-600 uppercase font-black">Deslocamento</p>
                    <p className="text-xs font-bold text-amber-500 font-mono">{formatCurrency(totalDeslocamento)}</p>
                  </div>
                  <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-805">
                    <p className="text-[8px] text-zinc-600 uppercase font-black">Diárias/Hosp</p>
                    <p className="text-xs font-bold text-amber-500 font-mono">{formatCurrency(totalDespesas + maoObraExternaTotal)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA 2: SERVIÇOS E DIAGNÓSTICO */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-zinc-800/50 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl">
                   <Wrench size={18} />
                 </div>
                 <div>
                    <h2 className="text-base font-black text-white uppercase italic tracking-tight">MANUTENÇÃO / SERVIÇOS</h2>
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">Escopo de Trabalho e Mão de Obra</p>
                 </div>
              </div>
              <button 
                onClick={addServico}
                className="p-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition shadow-lg cursor-pointer"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="hidden lg:block min-h-[200px]">
               <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-950 border-b border-zinc-800">
                      <th className="p-3.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest w-20">Tipo</th>
                      <th className="p-3.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Procedimento</th>
                      <th className="p-3.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">Cálculo/Total</th>
                      <th className="p-3.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    <AnimatePresence>
                      {servicos.length > 0 ? servicos.map((s) => (
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                          key={s.id} 
                          className="hover:bg-zinc-800/20 group transition-colors"
                        >
                          <td className="p-3.5 align-top">
                            <div className="flex flex-col gap-1">
                              <button 
                                type="button"
                                onClick={() => updateServico(s.id, 'tipo_cobranca', 'HORA')}
                                className={`px-2.5 py-1 rounded text-[8px] font-black uppercase transition cursor-pointer ${
                                  s.tipo_cobranca === 'HORA' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
                                }`}
                              >
                                Hora
                              </button>
                              <button 
                                type="button"
                                onClick={() => updateServico(s.id, 'tipo_cobranca', 'PACOTE')}
                                className={`px-2.5 py-1 rounded text-[8px] font-black uppercase transition cursor-pointer ${
                                  s.tipo_cobranca === 'PACOTE' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-zinc-900 text-zinc-600 border border-zinc-800 hover:text-zinc-400'
                                }`}
                              >
                                Pacote
                              </button>
                            </div>
                          </td>
                          <td className="p-3.5 align-top">
                            <input 
                              type="text" 
                              value={s.descricao}
                              onChange={(e) => updateServico(s.id, 'descricao', e.target.value)}
                              placeholder="Descrição do serviço"
                              className="bg-transparent border border-zinc-800/60 focus:border-orange-500 rounded-lg px-2.5 py-1.5 text-xs font-black text-white w-full placeholder:text-zinc-800 outline-none uppercase transition-colors"
                            />
                          </td>
                          <td className="p-3.5 align-top">
                            {s.tipo_cobranca === 'HORA' ? (
                              <div className="flex flex-col gap-1.5 items-end">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[7px] text-zinc-600 font-black">HRS</span>
                                  <input 
                                    type="text" 
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
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-right text-[10px] font-black font-mono text-white w-14 outline-none"
                                  />
                                  <span className="text-[7px] text-zinc-600 font-black">R$/H</span>
                                  <input 
                                    type="number" 
                                    value={s.valor_hora}
                                    onChange={(e) => updateServico(s.id, 'valor_hora', e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-right text-[10px] font-black font-mono text-white w-16 outline-none"
                                  />
                                </div>
                                <span className="text-[10px] font-black text-green-400 font-mono italic">{formatCurrency(s.valor_total)}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5 items-end">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[7px] text-zinc-600 font-black">R$</span>
                                  <input 
                                    type="number" 
                                    value={s.valor_pacote}
                                    onChange={(e) => updateServico(s.id, 'valor_pacote', e.target.value)}
                                    className="bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-right text-[10px] font-black font-mono text-white w-24 outline-none"
                                  />
                                </div>
                                <span className="text-[10px] font-black text-green-400 font-mono italic">{formatCurrency(s.valor_total)}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-center align-top">
                             <button onClick={() => removeServico(s.id)} className="text-zinc-800 hover:text-red-500 transition p-1 hover:bg-red-500/10 rounded-lg cursor-pointer"><Trash2 size={14} /></button>
                          </td>
                        </motion.tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="p-12 text-center opacity-10">
                            <div className="flex flex-col items-center gap-4">
                              <Wrench size={40} />
                              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Sem serviços registrados</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </tbody>
               </table>
            </div>

            {/* Services Mobile Cards View */}
            <div className="block lg:hidden p-4 space-y-4 max-h-[500px] overflow-y-auto">
              <AnimatePresence>
                {servicos.length > 0 ? (
                  servicos.map((s) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      key={s.id}
                      className="bg-zinc-950/60 border border-zinc-850 rounded-2xl p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                        <div className="flex p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateServico(s.id, 'tipo_cobranca', 'HORA')}
                            className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition cursor-pointer ${
                              s.tipo_cobranca === 'HORA'
                                ? 'bg-blue-600 text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Hora
                          </button>
                          <button
                            type="button"
                            onClick={() => updateServico(s.id, 'tipo_cobranca', 'PACOTE')}
                            className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition cursor-pointer ${
                              s.tipo_cobranca === 'PACOTE'
                                ? 'bg-blue-600 text-white'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            Pacote
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeServico(s.id)}
                          className="w-11 h-11 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                          title="Remover serviço"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Descrição do Procedimento</label>
                        <input
                          type="text"
                          value={s.descricao || ''}
                          onChange={(e) => updateServico(s.id, 'descricao', e.target.value)}
                          placeholder="EX: TROCA DE FILTRO E ÓLEO"
                          className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs font-black text-white outline-none focus:border-orange-500 placeholder:text-zinc-800 uppercase"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        {s.tipo_cobranca === 'HORA' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Horas (H:MM)</label>
                              <input
                                type="text"
                                value={s.horas || ''}
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
                                className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs font-bold font-mono text-white text-center outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Valor Hora (R$)</label>
                              <input
                                type="number"
                                value={s.valor_hora || ''}
                                onChange={(e) => updateServico(s.id, 'valor_hora', e.target.value)}
                                className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs font-bold font-mono text-white text-center outline-none"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="col-span-2 space-y-1">
                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Valor do Pacote (R$)</label>
                            <input
                              type="number"
                              value={s.valor_pacote || ''}
                              onChange={(e) => updateServico(s.id, 'valor_pacote', e.target.value)}
                              className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 rounded-xl px-3 text-xs font-bold font-mono text-white text-left outline-none"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-zinc-900/60 font-mono">
                        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider">Total do Item</span>
                        <span className="text-sm font-black text-green-400 italic tracking-tight">{formatCurrency(s.valor_total)}</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center opacity-10">
                    <div className="flex flex-col items-center gap-2">
                      <Wrench size={32} />
                      <p className="text-[9px] font-black uppercase tracking-[0.3em]">Sem serviços registrados</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-6 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between shadow-inner">
               <span className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] font-mono italic">Subtotal Mão de Obra</span>
               <span className="text-2xl font-black text-white italic tracking-tighter tabular-nums">{formatCurrency(totalServicos)}</span>
            </div>
          </section>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-4">
             <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-orange-600 rounded-full" />
               <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Relatório Técnico / Diagnóstico</h2>
             </div>
             <textarea 
               value={diagnostico}
               onChange={(e) => setDiagnostico(e.target.value)}
               className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-sm text-zinc-300 outline-none focus:border-orange-500 min-h-[160px] transition font-mono leading-relaxed"
               placeholder="Sintomas relatados e diagnóstico evolutivo..."
             />
          </div>
        </div>

        {/* COLUNA 3: PEÇAS E FECHAMENTO */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-7 border-b border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-orange-500 flex-shrink-0" />
                <div>
                  <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Requisição de Peças</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Almoxarifado e insumos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(true)}
                className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-orange-950/40 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                Adicionar peça do estoque
              </button>
            </div>

            <div className="p-6 bg-zinc-950/20 space-y-6">
               <div className="relative group">
                 <div className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-800 group-focus-within:text-orange-500 transition-colors pointer-events-none">
                   <Search size={16} />
                 </div>
                 <input 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-14 pr-6 text-[11px] text-white outline-none focus:border-orange-500 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-800"
                    placeholder="BUSCAR NO ALMOXARIFADO..."
                    value={pecaSearchTerm}
                    onChange={(e) => { const val = e.target.value; setPecaSearchTerm(val); if (!val || val.trim().length < 2) setAvailablePecas([]); }}
                  />
                  {pecasLoading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-orange-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  
                  {pecaSearchTerm && pecaSearchTerm.trim().length >= 2 && (
                    <div className="absolute z-40 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl max-h-80 overflow-y-auto overflow-x-hidden">
                      {pecasLoading ? (
                        <div className="p-6 text-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                          <Loader2 className="w-5 h-5 text-orange-500 animate-spin mx-auto mb-2" />
                          Pesquisando no estoque...
                        </div>
                      ) : availablePecas.length === 0 ? (
                        <div className="p-6 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                          Nenhuma peça encontrada
                        </div>
                      ) : (
                        availablePecas.map(p => (
                          <button 
                            key={p.id}
                            type="button"
                            onClick={() => {
                              addPeca(p);
                              setPecaSearchTerm('');
                              setAvailablePecas([]);
                            }}
                            className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-800/50 transition-colors border-b border-zinc-800 last:border-0"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-white uppercase">{p.descricao}</span>
                              <span className="text-[9px] text-zinc-650 font-bold tracking-widest mt-1">CÓD: {p.codigo || 'S/ COD'} • ESTOQUE: {p.quantidade} {p.unidadeMedida || 'un'}</span>
                            </div>
                            <span className="text-[10px] font-black text-green-500 font-mono italic">{formatCurrency(p.preco_venda)}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {(!pecaSearchTerm || pecaSearchTerm.trim().length < 2) && (
                    <div className="mt-2 text-center text-zinc-650 text-[8px] font-black uppercase tracking-widest italic">
                      Digite para pesquisar peças (Mínimo 2 caracteres)
                    </div>
                  )}
               </div>

               <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence mode="popLayout">
                    {pecas.length > 0 ? pecas.map((p) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        key={p.id} 
                        className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl md:flex md:items-center md:justify-between group/item hover:border-zinc-700 transition-all border-l-2 border-l-zinc-800 hover:border-l-orange-500 flex flex-col gap-4 md:gap-0"
                      >
                        <div className="space-y-2 w-full md:w-auto">
                          <p className="text-[11px] font-black text-zinc-200 uppercase tracking-tight break-all">{p.descricao}</p>
                          <div className="flex flex-wrap items-center gap-3">
                             <input 
                               type="number" 
                               step="any"
                               value={p.quantidade}
                               onChange={(e) => updatePeca(p.id, 'quantidade', parseFloat(e.target.value) || 0)}
                               className="hidden sm:block w-12 bg-zinc-900 border border-zinc-800 text-[10px] font-black text-orange-500 p-1 text-center focus:outline-none rounded font-mono"
                             />
                             <div className="flex sm:hidden items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-850">
                               <button
                                 type="button"
                                 onClick={() => updatePeca(p.id, 'quantidade', Math.max(0, p.quantidade - 1))}
                                 className="w-11 min-h-[44px] flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg font-bold text-lg cursor-pointer"
                               >
                                 -
                               </button>
                               <input 
                                 type="number" 
                                 step="any"
                                 value={p.quantidade}
                                 onChange={(e) => updatePeca(p.id, 'quantidade', parseFloat(e.target.value) || 0)}
                                 className="w-12 text-center text-xs font-black text-orange-500 bg-transparent outline-none font-mono"
                               />
                               <button
                                 type="button"
                                 onClick={() => updatePeca(p.id, 'quantidade', p.quantidade + 1)}
                                 className="w-11 min-h-[44px] flex items-center justify-center bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg font-bold text-lg cursor-pointer"
                               >
                                 +
                               </button>
                             </div>
                             <select 
                               className="bg-zinc-900 text-zinc-500 text-[8px] font-black uppercase outline-none cursor-pointer border border-zinc-805 px-1.5 py-1 focus:text-white"
                               value={p.unidade || 'un'} 
                               onChange={(e) => updatePeca(p.id, 'unidade', e.target.value)}
                             >
                               {(p.compativeis && p.compativeis.length > 0 ? p.compativeis : [{ sigla: p.unidade || 'un' }]).map((u: any) => (
                                 <option key={u.sigla} value={u.sigla} className="bg-zinc-950 text-white uppercase font-black">{u.sigla.toUpperCase()}</option>
                               ))}
                             </select>
                             <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">✕ {formatCurrency(p.valor_unit)}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t border-zinc-900/60 pt-3 md:border-0 md:pt-0 font-mono">
                          <span className="text-[8px] font-black text-zinc-500 md:hidden uppercase tracking-wider">Subtotal Item</span>
                          <div className="flex items-center gap-4">
                            <p className="text-sm font-black text-green-400 tracking-tighter tabular-nums">{formatCurrency(p.valor_total)}</p>
                            <button 
                              type="button"
                              onClick={() => removePeca(p.id)} 
                              className="w-11 h-11 flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                              title="Remover peça"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="py-12 text-center flex flex-col items-center gap-3 opacity-10">
                        <Package size={40} className="text-white" />
                        <p className="text-[9px] font-black uppercase tracking-[0.4em]">Insumos vázios</p>
                      </div>
                    )}
                  </AnimatePresence>
               </div>

               <div className="pt-6 mt-2 border-t border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-700 uppercase font-black tracking-widest italic font-mono">Total em Peças</span>
                  <span className="text-xl font-black text-white italic tracking-tighter tabular-nums">{formatCurrency(totalPecas)}</span>
               </div>
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 opacity-[0.03] bg-white w-40 h-40 rounded-full" />
            
            <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-5 mb-6">
              <DollarSign size={16} className="text-orange-500" />
              <h2 className="text-xs font-black text-white uppercase italic tracking-widest">FECHAMENTO</h2>
            </div>
            
            <div className="space-y-6">
               <div className="flex justify-between items-center text-xs text-zinc-500 font-bold uppercase">
                 <span>Subtotal</span>
                 <span className="font-mono">{formatCurrency(subtotal)}</span>
               </div>

               <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Forma de Pagamento</label>
                    <select 
                      value={formaPagamento}
                      onChange={(e) => {
                        setFormaPagamento(e.target.value);
                        if (e.target.value === 'BOLETO PARCELADO' && numParcelas < 2) setNumParcelas(3);
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white font-bold uppercase outline-none focus:border-orange-500 transition shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="DINHEIRO">DINHEIRO</option>
                      <option value="PIX">PIX</option>
                      <option value="CARTÃO DÉBITO">CARTÃO DÉBITO</option>
                      <option value="CARTÃO CRÉDITO">CARTÃO CRÉDITO</option>
                      <option value="BOLETO À VISTA">BOLETO À VISTA</option>
                      <option value="BOLETO PARCELADO">BOLETO PARCELADO</option>
                    </select>
                  </div>

                  {formaPagamento === 'BOLETO PARCELADO' && (
                    <div className="grid grid-cols-1 gap-4 pt-4 border-t border-zinc-800/30">
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
                      <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-2">
                          <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Simulação de Parcelas</h4>
                          <span className="text-[8px] font-mono text-zinc-600">Total: {formatCurrency(totalGeral)}</span>
                        </div>
                        {Array.from({ length: numParcelas }).map((_, i) => {
                          const vlrParcela = totalGeral / numParcelas;
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

               <div className="flex items-center justify-between gap-4">
                 <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest italic">Abatimento</span>
                 <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-orange-950 italic">R$</span>
                   <input 
                     type="number" 
                     value={desconto}
                     onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                     className="bg-zinc-950 border border-orange-500/10 rounded-xl p-3 pl-8 text-right text-xs font-black font-mono text-orange-500 w-32 focus:border-orange-500 outline-none transition"
                   />
                 </div>
               </div>

               <div className="pt-6 flex justify-between items-end border-t border-zinc-800">
                  <div className="space-y-1">
                     <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] font-mono leading-none italic">VALOR ATUALIZADO</p>
                     <p className="text-4xl font-black text-white tracking-tighter tabular-nums italic drop-shadow-lg">{formatCurrency(totalGeral)}</p>
                  </div>
               </div>

               <div className="p-5 bg-zinc-950/80 border border-zinc-800 rounded-[1.5rem] space-y-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic flex items-center gap-2">
                    <FileText size={14} className="text-zinc-800" /> ADENDOS / NOTAS
                  </h3>
                  <textarea 
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-[12px] text-zinc-600 italic min-h-[100px] resize-none leading-relaxed placeholder:text-zinc-900"
                    placeholder="Notas complementares..."
                  />
               </div>
            </div>
          </section>
        </div>

      </div>

      {/* Sticky Bottom Bar for Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 p-4 z-50 md:hidden flex items-center justify-between gap-3 pb-safe pb-5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 active:scale-[0.98] text-white rounded-xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-orange-950/20 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          SALVAR ALTERAÇÕES
        </button>
      </div>

      {/* Modal de Almoxarifado / Adicionar Peças do Estoque */}
      <StockPartsModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onAddPart={handleAddPartFromStockModal}
        existingParts={pecas}
        colorScheme="orange"
        isEditing={true}
      />

    </div>
  );
}
