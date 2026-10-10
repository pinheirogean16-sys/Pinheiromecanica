'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Car, Wrench, Package, 
  Search, ChevronLeft, FileText, Trash2, Plus,
  PenTool as Tool, Loader2, Save, Calendar, Milestone, Navigation
} from 'lucide-react';
import { parseHoras, roundDecimal } from '@/lib/utils';
import { obterUnidadesCompativeis, converterUnidade } from '@/lib/unidades';
import { useFieldWorkOrderCalculations } from '@/hooks/useFieldWorkOrderCalculations';
import QuickClientModal from '@/components/QuickClientModal';
import QuickVehicleModal from '@/components/QuickVehicleModal';
import StockPartsModal, { StockPartItem } from '@/components/StockPartsModal';

interface WorkOrderFieldProps {
  onBack: () => void;
}

export default function WorkOrderField({ onBack }: WorkOrderFieldProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Modais de Cadastro Rápido e Almoxarifado
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);

  // Catálogos e buscadores
  const [clientes, setClientes] = useState<any[]>([]);
  const [clientesLoading, setClientesLoading] = useState(false);
  const [clientesError, setClientesError] = useState(false);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [availablePecas, setAvailablePecas] = useState<any[]>([]);

  // Seleções principais
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState<any>(null);
  const [selectedMecanico, setSelectedMecanico] = useState('');
  const [clienteHistorico, setClienteHistorico] = useState<any>(null);

  // Campos Gerais
  const [diagnostico, setDiagnostico] = useState('');
  const [previsao, setPrevisao] = useState('');
  const [desconto, setDesconto] = useState(0);

  // Atributos de Campo/Externo
  const [localAtendimento, setLocalAtendimento] = useState('');
  const [localCidade, setLocalCidade] = useState('');
  const [localEstado, setLocalEstado] = useState('');
  const [localGps, setLocalGps] = useState('');

  const [veiculoApoio, setVeiculoApoio] = useState('');
  const [horarioSaidaEquipe, setHorarioSaidaEquipe] = useState('');
  const [horarioChegadaEquipe, setHorarioChegadaEquipe] = useState('');
  const [tempoDeslocamento, setTempoDeslocamento] = useState('');
  const [fotosCampo, setFotosCampo] = useState<string[]>([]);
  const [assinaturaCampo, setAssinaturaCampo] = useState('');

  // Controle de KM
  const [kmIda, setKmIda] = useState<string | number>(0);
  const [kmVolta, setKmVolta] = useState<string | number>(0);
  const [valorKm, setValorKm] = useState<string | number>(0);

  // Horas executadas (mão de obra externa)
  const [maoObraExternaHoras, setMaoObraExternaHoras] = useState(0);
  const [maoObraExternaValor, setMaoObraExternaValor] = useState(0);
  const [mecanicosAdicionaisInput, setMecanicosAdicionaisInput] = useState('');

  // Despesas adicionais
  const [despesaPedagio, setDespesaPedagio] = useState(0);
  const [despesaCombustivel, setDespesaCombustivel] = useState(0);
  const [despesaHospedagem, setDespesaHospedagem] = useState(0);
  const [despesaAlimentacao, setDespesaAlimentacao] = useState(0);
  const [despesaDiariaTecnica, setDespesaDiariaTecnica] = useState(0);
  const [despesaGuincho, setDespesaGuincho] = useState(0);
  const [despesaOutros, setDespesaOutros] = useState(0);

  // Financeiro geral
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [numParcelas, setNumParcelas] = useState(1);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  // Peças e Serviços locais
  const [servicos, setServicos] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);

  // Buscadores/Helpers
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [pecaSearchQuery, setPecaSearchQuery] = useState('');
  const [pecasLoading, setPecasLoading] = useState(false);

  // Signature Canvas Ref & Mouse controller
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const isLoadedRef = useRef(false);

  // Carregar dados básicos (Clientes e Mecânicos)
  useEffect(() => {
    const loadBasics = async () => {
      setClientesLoading(true);
      setClientesError(false);
      try {
        const [cRes, mRes] = await Promise.all([
          fetch('/api/clientes?limit=1000').catch(() => null),
          fetch('/api/usuarios?limit=1000').catch(() => null)
        ]);
        
        if (cRes && cRes.ok) {
          const data = await cRes.json();
          setClientes(data.items || []);
        } else {
          setClientesError(true);
        }
        
        if (mRes && mRes.ok) {
          const data = await mRes.json();
          const users = data.items || [];
          setMecanicos(users.filter((u: any) => u.role === 'MECANICO' || u.role === 'LIDER' || u.role === 'ADMIN'));
        }
      } catch (err) {
        console.error(err);
        setClientesError(true);
      } finally {
        setClientesLoading(false);
      }
    };
    loadBasics();
  }, []);

  // Pesquisar peças com debounce
  useEffect(() => {
    if (!pecaSearchQuery || pecaSearchQuery.trim().length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setPecasLoading(true);
      try {
        const res = await fetch(`/api/pecas?onlySearch=true&q=${encodeURIComponent(pecaSearchQuery.trim())}`, {
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
  }, [pecaSearchQuery]);

  // Recupera o rascunho de nova OS Campo ao montar o componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('os-draft-new-campo');
        if (cached) {
          const draft = JSON.parse(cached);
          if (draft) {
            setTimeout(() => {
              if (Array.isArray(draft.pecas)) setPecas(draft.pecas);
              if (Array.isArray(draft.servicos)) setServicos(draft.servicos);
              if (draft.diagnostico) setDiagnostico(draft.diagnostico);
              if (draft.previsao) setPrevisao(draft.previsao);
              if (draft.desconto) setDesconto(draft.desconto);
              if (draft.selectedCliente) setSelectedCliente(draft.selectedCliente);
              if (draft.selectedVeiculo) setSelectedVeiculo(draft.selectedVeiculo);
              if (draft.selectedMecanico) setSelectedMecanico(draft.selectedMecanico);
              
              if (draft.localAtendimento) setLocalAtendimento(draft.localAtendimento);
              if (draft.localCidade) setLocalCidade(draft.localCidade);
              if (draft.localEstado) setLocalEstado(draft.localEstado);
              if (draft.localGps) setLocalGps(draft.localGps);
              if (draft.veiculoApoio) setVeiculoApoio(draft.veiculoApoio);
              if (draft.horarioSaidaEquipe) setHorarioSaidaEquipe(draft.horarioSaidaEquipe);
              if (draft.horarioChegadaEquipe) setHorarioChegadaEquipe(draft.horarioChegadaEquipe);
              if (draft.tempoDeslocamento) setTempoDeslocamento(draft.tempoDeslocamento);
              if (draft.fotosCampo) setFotosCampo(draft.fotosCampo);
              if (draft.assinaturaCampo) setAssinaturaCampo(draft.assinaturaCampo);
              
              if (draft.kmIda !== undefined) setKmIda(draft.kmIda);
              else if (draft.kmSaida !== undefined) setKmIda(draft.kmSaida);

              if (draft.kmVolta !== undefined) setKmVolta(draft.kmVolta);
              else if (draft.kmRetorno !== undefined) setKmVolta(draft.kmRetorno);

              if (draft.valorKm) setValorKm(draft.valorKm);
              
              if (draft.maoObraExternaHoras) setMaoObraExternaHoras(draft.maoObraExternaHoras);
              if (draft.maoObraExternaValor) setMaoObraExternaValor(draft.maoObraExternaValor);
              if (draft.mecanicosAdicionaisInput) setMecanicosAdicionaisInput(draft.mecanicosAdicionaisInput);

              if (draft.despesaPedagio) setDespesaPedagio(draft.despesaPedagio);
              if (draft.despesaCombustivel) setDespesaCombustivel(draft.despesaCombustivel);
              if (draft.despesaHospedagem) setDespesaHospedagem(draft.despesaHospedagem);
              if (draft.despesaAlimentacao) setDespesaAlimentacao(draft.despesaAlimentacao);
              if (draft.despesaDiariaTecnica) setDespesaDiariaTecnica(draft.despesaDiariaTecnica);
              if (draft.despesaGuincho) setDespesaGuincho(draft.despesaGuincho);
              if (draft.despesaOutros) setDespesaOutros(draft.despesaOutros);

              if (draft.formaPagamento) setFormaPagamento(draft.formaPagamento);
              if (draft.numParcelas) setNumParcelas(draft.numParcelas);
              if (draft.diasEntreParcelas) setDiasEntreParcelas(draft.diasEntreParcelas);
              if (draft.dataPrimeiraParcela) setDataPrimeiraParcela(draft.dataPrimeiraParcela);

              // Carregar veículos vinculados
              if (draft.selectedCliente?.id) {
                fetch(`/api/veiculos?cliente_id=${draft.selectedCliente.id}`)
                  .then(res => res.json())
                  .then(data => setVeiculos(data.items || []))
                  .catch(console.error);

                fetch(`/api/clientes/${draft.selectedCliente.id}/historico`)
                  .then(res => res.json())
                  .then(setClienteHistorico)
                  .catch(console.error);
              }

              console.log('Rascunho de OS do Campo carregado!');
              isLoadedRef.current = true;
            }, 100);
            return;
          }
        }
      } catch (err) {
        console.error('Falha ao restaurar rascunho de nova OS Campo:', err);
      }
      isLoadedRef.current = true;
    }
  }, []);

  // Salvar rascunho ao mudar dados
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoadedRef.current) {
      try {
        const draft = {
          pecas,
          servicos,
          diagnostico,
          previsao,
          desconto,
          selectedCliente,
          selectedVeiculo,
          selectedMecanico,
          localAtendimento,
          localCidade,
          localEstado,
          localGps,
          veiculoApoio,
          horarioSaidaEquipe,
          horarioChegadaEquipe,
          tempoDeslocamento,
          fotosCampo,
          assinaturaCampo,
          kmIda,
          kmVolta,
          valorKm,
          maoObraExternaHoras,
          maoObraExternaValor,
          mecanicosAdicionaisInput,
          despesaPedagio,
          despesaCombustivel,
          despesaHospedagem,
          despesaAlimentacao,
          despesaDiariaTecnica,
          despesaGuincho,
          despesaOutros,
          formaPagamento,
          numParcelas,
          diasEntreParcelas,
          dataPrimeiraParcela
        };
        localStorage.setItem('os-draft-new-campo', JSON.stringify(draft));
      } catch (err) {
        console.error('Erro ao salvar rascunho de nova OS Campo:', err);
      }
    }
  }, [
    pecas,
    servicos,
    diagnostico,
    previsao,
    desconto,
    selectedCliente,
    selectedVeiculo,
    selectedMecanico,
    localAtendimento,
    localCidade,
    localEstado,
    localGps,
    veiculoApoio,
    horarioSaidaEquipe,
    horarioChegadaEquipe,
    tempoDeslocamento,
    fotosCampo,
    assinaturaCampo,
    kmIda,
    kmVolta,
    valorKm,
    maoObraExternaHoras,
    maoObraExternaValor,
    mecanicosAdicionaisInput,
    despesaPedagio,
    despesaCombustivel,
    despesaHospedagem,
    despesaAlimentacao,
    despesaDiariaTecnica,
    despesaGuincho,
    despesaOutros,
    formaPagamento,
    numParcelas,
    diasEntreParcelas,
    dataPrimeiraParcela
  ]);

  const handleClienteChange = async (id: string) => {
    const cliente = clientes.find(c => c.id === id);
    setSelectedCliente(cliente);
    setSelectedVeiculo(null);
    setVeiculos([]);
    setClienteHistorico(null);
    
    if (!id) return;

    try {
      const vRes = await fetch(`/api/veiculos?cliente_id=${id}`);
      if (vRes.ok) {
        const data = await vRes.json();
        setVeiculos(data.items || []);
      }

      const hRes = await fetch(`/api/clientes/${id}/historico`);
      if (hRes.ok) setClienteHistorico(await hRes.json());
      else setClienteHistorico({ totalOS: 0, totalGasto: 0 });
    } catch (err) { 
      console.error(err); 
    }
  };

  const handleQuickClientCreated = (newClient: any) => {
    setClientes(prev => {
      const exists = prev.some(c => c.id === newClient.id);
      return exists ? prev : [newClient, ...prev];
    });
    setSelectedCliente(newClient);
    setSelectedVeiculo(null);
    setVeiculos([]);
    fetch(`/api/veiculos?cliente_id=${newClient.id}`)
      .then(r => r.json())
      .then(data => setVeiculos(data.items || []))
      .catch(() => setVeiculos([]));
  };

  const handleQuickVehicleCreated = (newVehicle: any) => {
    setVeiculos(prev => {
      const exists = prev.some(v => v.id === newVehicle.id);
      return exists ? prev : [newVehicle, ...prev];
    });
    setSelectedVeiculo(newVehicle);
    if (newVehicle.cliente_id && (!selectedCliente || selectedCliente.id !== newVehicle.cliente_id)) {
      const matchingCliente = clientes.find(c => c.id === newVehicle.cliente_id) || newVehicle.cliente;
      if (matchingCliente) {
        setSelectedCliente(matchingCliente);
      }
    }
  };

  const addServico = useCallback(() => {
    setServicos(prev => [...prev, { 
      id: crypto.randomUUID(), 
      descricao: '', 
      tipo_cobranca: 'HORA',
      horas: '1:00', 
      valor_hora: 150, 
      valor_pacote: 0,
      valor_total: 150 
    }]);
  }, []);

  const updateServico = useCallback((sid: string, field: string, value: any) => {
    setServicos(prev => prev.map(s => {
      if (s.id === sid) {
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
          maxQuantidade: pecaRef.quantidade,
          original_preco_venda: pecaRef.preco_venda,
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
        const updated = { ...p, [field]: value };
        
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

  const handleFotoChange = (e: any) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: any) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotosCampo(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removerFoto = (index: number) => {
    setFotosCampo(prev => prev.filter((_, i) => i !== index));
  };

  // Canvas Drawing Actions para Assinatura Eletrônica
  const startDrawing = (e: any) => {
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e: any) => {
    if (!isDrawingRef.current) return;
    if (e.cancelable) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setAssinaturaCampo(canvas.toDataURL());
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setAssinaturaCampo('');
  };

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

  // Cálculos Automáticos de Campo por Hook Isolado
  const {
    totalServicos,
    totalPecas,
    kmTotal,
    totalDeslocamento,
    maoObraExternaTotal,
    totalDespesas,
    totalGeral,
    parsedKmIda,
    parsedKmVolta,
  } = useFieldWorkOrderCalculations({
    kmIda,
    kmVolta,
    valorKm,
    servicos,
    pecas,
    maoObraExternaHoras,
    maoObraExternaValor,
    desconto,
    despesaPedagio,
    despesaCombustivel,
    despesaHospedagem,
    despesaAlimentacao,
    despesaDiariaTecnica,
    despesaGuincho,
    despesaOutros,
  });

  const formatCurrency = useCallback((val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const handleSubmit = async () => {
    if (!selectedCliente || !selectedVeiculo) {
      alert('Selecione o proprietário e o ativo veículo para o atendimento.');
      return;
    }

    // Validar estoque somando ocorrências da mesma peça
    const pecasAgrupadas: Record<string, { totalQty: number; maxQty: number; descricao: string }> = {};
    for (const p of pecas) {
      const pId = p.peca_id;
      if (!pecasAgrupadas[pId]) {
        pecasAgrupadas[pId] = {
          totalQty: 0,
          maxQty: p.maxQuantidade !== undefined ? p.maxQuantidade : Infinity,
          descricao: p.descricao
        };
      }
      pecasAgrupadas[pId].totalQty += p.quantidade;
    }

    for (const pId in pecasAgrupadas) {
      const group = pecasAgrupadas[pId];
      if (group.maxQty < group.totalQty) {
        alert(`Estoque insuficiente para a peça: ${group.descricao}. Disponível no estoque: ${group.maxQty}, Solicitado na OS: ${group.totalQty}`);
        return;
      }
    }

    setLoading(true);
    try {
      const rawPayload = {
        cliente_id: selectedCliente.id,
        veiculo_id: selectedVeiculo.id,
        mecanico_id: selectedMecanico && selectedMecanico !== "" && selectedMecanico !== "null" && selectedMecanico !== "undefined" ? selectedMecanico : null,
        tipoOS: 'CAMPO',
        diagnostico,
        observacoes: JSON.stringify({
          veiculoApoio,
          horarioSaidaEquipe,
          horarioChegadaEquipe,
          tempoDeslocamento,
          fotosCampo,
          assinaturaCampo
        }),
        data_previsao: previsao,
        servicos: (servicos || []).map(s => ({
          descricao: s.descricao ? s.descricao.trim() : 'Serviço',
          tipo_cobranca: s.tipo_cobranca,
          horas: s.tipo_cobranca === 'HORA' ? parseHoras(s.horas.toString()) : null,
          valor_hora: s.tipo_cobranca === 'HORA' ? parseFloat(s.valor_hora || '0') : null,
          valor_pacote: s.tipo_cobranca === 'PACOTE' ? parseFloat(s.valor_pacote || '0') : null,
          valor_total: parseFloat(s.valor_total || '0')
        })),
        pecas: (pecas || [])
          .filter((p: any) => p.peca_id || p.pecaId)
          .map((p: any) => ({
            peca_id: p.peca_id || p.pecaId,
            descricao: p.descricao || 'Peça',
            quantidade: Math.max(1, Number(p.quantidade || 1)),
            unidade: p.unidade || 'un',
            valor_unit: parseFloat(p.valor_unit || '0'),
            valor_total: parseFloat(p.valor_total || '0'),
            origem: p.origem || 'OFICINA'
          })),
        desconto: parseFloat(desconto as any) || 0,
        valor_total: totalGeral,
        forma_pagamento: formaPagamento === 'BOLETO PARCELADO' ? 'PARCELADO' : formaPagamento,
        numero_parcelas: formaPagamento === 'BOLETO PARCELADO' ? numParcelas : 1,
        dias_entre_parcelas: formaPagamento === 'BOLETO PARCELADO' ? diasEntreParcelas : null,
        data_vencimento_primeira: formaPagamento === 'BOLETO PARCELADO' && dataPrimeiraParcela ? new Date(dataPrimeiraParcela).toISOString() : null,

        // Atributos Específicos de Campo e Atendimento Móvel
        tipo_atendimento: 'CAMPO',
        km_saida: parsedKmIda,
        km_retorno: parsedKmVolta,
        km_total: kmTotal,
        valor_km: parseFloat(valorKm as any) || 0,
        total_deslocamento: totalDeslocamento,

        despesa_pedagio: parseFloat(despesaPedagio as any) || 0,
        despesa_combustivel: parseFloat(despesaCombustivel as any) || 0,
        despesa_hospedagem: parseFloat(despesaHospedagem as any) || 0,
        despesa_alimentacao: parseFloat(despesaAlimentacao as any) || 0,
        despesa_diaria_tecnica: parseFloat(despesaDiariaTecnica as any) || 0,
        despesa_guincho: parseFloat(despesaGuincho as any) || 0,
        despesa_outros: parseFloat(despesaOutros as any) || 0,

        mao_obra_externa_horas: parseFloat(maoObraExternaHoras as any) || 0,
        mao_obra_externa_valor: parseFloat(maoObraExternaValor as any) || 0,
        mao_obra_externa_total: parseFloat(maoObraExternaTotal as any) || 0,
        mao_obra_equipe: mecanicosAdicionaisInput ? JSON.stringify(mecanicosAdicionaisInput.split(',').map(name => name.trim())) : '[]',

        local_atendimento: localAtendimento,
        local_cidade: localCidade,
        local_estado: localEstado,
        local_gps: localGps,

        timeline_viagem: JSON.stringify([
          { status: 'DRAFT_MÓVEL_SOS', descricao: `Iniciando atendimento de estrada Campo, saindo com KM Ida: ${parsedKmIda}`, timestamp: new Date().toISOString() }
        ])
      };

      console.log("Payload Final OS (Campo)", rawPayload);

      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawPayload)
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('os-draft-new-campo');
        }
        router.push('/os');
        router.refresh();
      } else {
        const error = await res.json();
        alert(`Erro: ${error.error || 'Falha ao salvar a OS Móvel de Campo'}`);
      }
    } catch (err) { 
      alert('Erro de conexão ao banco.'); 
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 pb-24 animate-in fade-in duration-300">
      
      {/* HEADER DE CONTROLES */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 sm:p-6 rounded-2xl md:rounded-3xl shadow-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            type="button"
            onClick={onBack} 
            className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm cursor-pointer"
            title="Voltar"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              PINHEIRO DIESEL PRO <span className="text-zinc-700">|</span> <span className="text-amber-500">Fluxo de Campo (Móvel / SOS)</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] leading-none mt-1">
              Logística de Resgate e Atendimentos Fora de Estrada
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest font-mono">
            🌾 OPERAÇÃO EXTERNA ATIVA
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="hidden lg:flex items-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition shadow-lg shadow-amber-950/30 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin text-zinc-950" /> : <Save size={14} />}
            SALVAR OS CAMPO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* COLUNA PRINCIPAL: OPERACIONAL, LOGÍSTICA & SERVIÇOS (7/12) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          
          {/* CARD 1: ATIVO, SOLICITANTE & LOGÍSTICA DO RESGATE */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
              <Milestone className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Logística de Viagem & Atendimento SOS</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Identificação do cliente, veículo em resgate e destino</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Linha 1: Cliente e Veículo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cliente Solicitante */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Cliente Solicitante</label>
                    <button
                      type="button"
                      onClick={() => setIsClientModalOpen(true)}
                      className="text-[9px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition hover:underline"
                    >
                      <Plus size={11} />
                      Novo Cliente
                    </button>
                  </div>
                  <div className="relative">
                    <div 
                      onClick={() => setShowClientList(!showClientList)}
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none transition cursor-pointer flex items-center justify-between shadow-inner group hover:border-amber-500/50"
                    >
                      <span className="font-bold uppercase tracking-tight truncate mr-2 transition-colors group-hover:text-amber-400">
                        {selectedCliente?.nome || 'LOCALIZAR NO SISTEMA...'}
                      </span>
                      <Search size={15} className="text-zinc-600 transition-colors group-hover:text-amber-500 flex-shrink-0" />
                    </div>
                    
                    {showClientList && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-3 border-b border-zinc-800">
                          <input 
                            autoFocus 
                            type="text" 
                            placeholder="BUSCAR CLIENTE..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none font-bold uppercase tracking-wider transition focus:border-amber-500" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {clientesLoading ? (
                            <div className="p-6 text-center animate-pulse">
                              <Loader2 className="w-5 h-5 text-amber-500 animate-spin mx-auto mb-2" />
                              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Buscando proprietários...</p>
                            </div>
                          ) : (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).length === 0 ? (
                            <div className="p-6 text-center text-zinc-500 text-xs">Nenhum resultado encontrado</div>
                          ) : (
                            (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).map(c => (
                              <button 
                                key={c.id} 
                                type="button"
                                onClick={() => { handleClienteChange(c.id); setShowClientList(false); setSearchTerm(''); }} 
                                className="w-full p-3.5 text-left text-xs font-bold uppercase text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all border-b border-zinc-800/50 last:border-0"
                              >
                                {c.nome} <span className="text-[10px] text-zinc-600 ml-2 font-mono">({c.cpf_cnpj})</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Veículo atendido */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Ativo em Resgate</label>
                    <button
                      type="button"
                      onClick={() => setIsVehicleModalOpen(true)}
                      className="text-[9px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition hover:underline"
                    >
                      <Plus size={11} />
                      Novo Veículo / Máquina
                    </button>
                  </div>
                  <div className="relative group">
                    <select 
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-white outline-none transition font-bold uppercase cursor-pointer shadow-inner appearance-none disabled:opacity-30 focus:border-amber-500" 
                      value={selectedVeiculo?.id || ''} 
                      onChange={(e) => { const v = veiculos.find(v => v.id === e.target.value); if (v) setSelectedVeiculo(v); }} 
                      disabled={!selectedCliente}
                    >
                      <option value="">{selectedCliente ? 'SELECIONAR VEÍCULO/MÁQUINA...' : 'AGUARDANDO CLIENTE...'}</option>
                      {(veiculos || []).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.placa} • {v.marca} {v.modelo}
                        </option>
                      ))}
                    </select>
                    <Car size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none transition-colors group-hover:text-amber-500" />
                  </div>
                </div>
              </div>

              {/* Linha 2: Técnico Líder e Previsão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Técnico Responsável */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">Líder do Resgate (Técnico)</label>
                  <div className="relative group">
                    <select 
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-white outline-none transition font-bold uppercase cursor-pointer shadow-inner appearance-none focus:border-amber-500" 
                      value={selectedMecanico} 
                      onChange={(e) => setSelectedMecanico(e.target.value)} 
                    >
                      <option value="">ATRIBUIR TÉCNICO LÍDER...</option>
                      {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                    </select>
                    <Wrench size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none transition-colors group-hover:text-amber-500" />
                  </div>
                </div>

                {/* Previsão de Fechamento de Viagem */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">Previsão Fechamento de Viagem</label>
                  <div className="relative group">
                    <input 
                      type="datetime-local" 
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-white outline-none focus:border-amber-500 transition font-mono uppercase shadow-inner cursor-pointer" 
                      value={previsao} 
                      onChange={(e) => setPrevisao(e.target.value)} 
                    />
                    <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none transition-colors group-hover:text-amber-500" />
                  </div>
                </div>
              </div>

              {/* BLOCO: LOCALIZAÇÃO E GEOLOCALIZAÇÃO */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Navigation size={13} className="text-amber-500" />
                    1. Destino do Atendimento & Coordenadas
                  </p>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Socorro Externo</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Endereço Completo / Ponto de Referência</label>
                    <input 
                      type="text" 
                      placeholder="EX: RODOVIA BR-163 KM 740, ENTRADA DA FAZENDA MODELO..." 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-amber-500 transition" 
                      value={localAtendimento} 
                      onChange={(e) => setLocalAtendimento(e.target.value)} 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">Cidade</label>
                      <input 
                        type="text" 
                        placeholder="CIDADE..." 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-amber-500 transition" 
                        value={localCidade} 
                        onChange={(e) => setLocalCidade(e.target.value)} 
                      />
                    </div>
                    
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">UF</label>
                      <input 
                        type="text" 
                        placeholder="UF" 
                        maxLength={2}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-amber-500 transition text-center" 
                        value={localEstado} 
                        onChange={(e) => setLocalEstado(e.target.value.toUpperCase())} 
                      />
                    </div>

                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">Coordenadas GPS</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="-12.123456, -55.123456" 
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none focus:border-amber-500 transition" 
                          value={localGps} 
                          onChange={(e) => setLocalGps(e.target.value)} 
                        />
                        <button 
                          type="button" 
                          onClick={capturarGps} 
                          className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-zinc-950 font-black rounded-xl px-3 transition text-[10px] uppercase flex items-center gap-1 cursor-pointer"
                          title="Capturar GPS atual"
                        >
                          GPS📍
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO: APOIO E CRONOGRAMA */}
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    2. Veículo de Apoio & Cronograma de Viagem
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">Veículo Apoio / Placa</label>
                      <input 
                        type="text" 
                        placeholder="EX: VAN SOS KANGOO" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white uppercase font-bold outline-none focus:border-amber-500 transition" 
                        value={veiculoApoio} 
                        onChange={(e) => setVeiculoApoio(e.target.value.toUpperCase())} 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">Saída da Sede</label>
                      <input 
                        type="text" 
                        placeholder="08:00" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center" 
                        value={horarioSaidaEquipe} 
                        onChange={(e) => setHorarioSaidaEquipe(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">Chegada em Campo</label>
                      <input 
                        type="text" 
                        placeholder="09:30" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center" 
                        value={horarioChegadaEquipe} 
                        onChange={(e) => setHorarioChegadaEquipe(e.target.value)} 
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-400 uppercase font-black">Tempo Viagem</label>
                      <input 
                        type="text" 
                        placeholder="EX: 1H 30M" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-bold" 
                        value={tempoDeslocamento} 
                        onChange={(e) => setTempoDeslocamento(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: PAINEL LOGÍSTICO DE KM RODADOS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 rounded-full bg-amber-500" />
                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Painel Logístico de KM Rodados</h3>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg font-bold font-mono uppercase tracking-wider">
                Cálculo Dinâmico
              </span>
            </div>

            {/* Grid de Métricas de KM - Amplo e sem estourar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between space-y-1 shadow-inner">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">KM Ida</span>
                <p className="text-sm font-bold text-white font-mono">{parsedKmIda} <span className="text-[9px] text-zinc-500">KM</span></p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between space-y-1 shadow-inner">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">KM Volta</span>
                <p className="text-sm font-bold text-white font-mono">{parsedKmVolta} <span className="text-[9px] text-zinc-500">KM</span></p>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex flex-col justify-between space-y-1 shadow-inner">
                <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">Total Rodado</span>
                <p className="text-sm font-black text-emerald-400 font-mono">{kmTotal} <span className="text-[9px] text-emerald-500">KM</span></p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col justify-between space-y-1 shadow-inner">
                <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Valor / KM</span>
                <p className="text-xs font-bold text-white font-mono">{formatCurrency(parseFloat(valorKm as any) || 0)}</p>
              </div>

              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex flex-col justify-between space-y-1 shadow-inner">
                <span className="text-[8px] text-amber-400 font-bold uppercase tracking-wider">Deslocamento</span>
                <p className="text-xs font-black text-amber-400 font-mono">{formatCurrency(totalDeslocamento)}</p>
              </div>

              <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-3 flex flex-col justify-between space-y-1 shadow-inner">
                <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider">Valor Final OS</span>
                <p className="text-xs font-black text-blue-400 font-mono">{formatCurrency(totalGeral)}</p>
              </div>
            </div>

            {/* Inputs de KM */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 uppercase font-black">KM Ida (Odômetro Saída)</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right transition"
                  value={kmIda} 
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setKmIda(val);
                    }
                  }} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 uppercase font-black">KM Volta (Odômetro Chegada)</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  placeholder="0" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right transition"
                  value={kmVolta} 
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setKmVolta(val);
                    }
                  }} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 uppercase font-black">Reembolso por KM (R$)</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  placeholder="Ex: 2,50" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right transition" 
                  value={valorKm} 
                  onChange={(e) => {
                    const val = e.target.value.replace(',', '.');
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setValorKm(val);
                    }
                  }} 
                />
              </div>
            </div>
          </section>

          {/* CARD 3: DIAGNÓSTICO & TRIAGEM DO RESGATE */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <FileText size={16} className="text-amber-500" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Diagnóstico & Situação no Local do Resgate</h2>
            </div>
            <textarea 
              placeholder="DESCREVA A SITUAÇÃO GERAL DE ENTRADA DO VEÍCULO, PANE CONSTATADA NA RODOVIA/CAMPO, RECURSOS UTILIZADOS E PROCEDIMENTOS EXECUTADOS..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-amber-500 transition font-medium tracking-wide shadow-inner h-28 resize-none placeholder:text-zinc-650 leading-relaxed uppercase" 
              value={diagnostico} 
              onChange={(e) => setDiagnostico(e.target.value)} 
            />
          </section>

          {/* CARD 4: SERVIÇOS & ATIVIDADES DE CAMPO */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-amber-500 shadow-inner">
                  <Tool size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Serviços e Atividades de Campo</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Trabalho técnico executado no local</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={addServico} 
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Adicionar Atividade</span>
              </button>
            </div>

            {/* Listagem de Serviços */}
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {servicos.map((servico) => (
                <div key={servico.id} className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => updateServico(servico.id, 'tipo_cobranca', 'HORA')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          servico.tipo_cobranca === 'HORA' 
                            ? 'bg-amber-500 text-zinc-950' 
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        Tempo de Execução
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateServico(servico.id, 'tipo_cobranca', 'PACOTE')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          servico.tipo_cobranca === 'PACOTE' 
                            ? 'bg-amber-500 text-zinc-950' 
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        Preço Fechado
                      </button>
                    </div>

                    <button 
                      type="button"
                      onClick={() => removeServico(servico.id)} 
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Remover serviço"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Procedimento Efetuado</label>
                    <input 
                      type="text" 
                      placeholder="EX: TROCA DE MANGUEIRA HIDRÁULICA, SANGRIA DE FREIOS..." 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none focus:border-amber-500 font-bold uppercase transition" 
                      value={servico.descricao} 
                      onChange={(e) => updateServico(servico.id, 'descricao', e.target.value)} 
                    />
                  </div>

                  {servico.tipo_cobranca === 'HORA' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Tempo (Horas H:MM)</label>
                        <input 
                          type="text" 
                          placeholder="1:30"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono font-bold transition text-right tabular-nums"
                          value={servico.horas}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9:]/g, '');
                            updateServico(servico.id, 'horas', val);
                          }}
                          onBlur={(e) => {
                            const val = e.target.value;
                            if (val && !val.includes(':')) {
                              updateServico(servico.id, 'horas', `${val}:00`);
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Preço / Hora (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono font-bold transition text-right tabular-nums"
                          value={servico.valor_hora}
                          onChange={(e) => updateServico(servico.id, 'valor_hora', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Subtotal Fechado (R$)</label>
                      <input 
                        type="number" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono font-bold transition text-right tabular-nums"
                        value={servico.valor_pacote}
                        onChange={(e) => updateServico(servico.id, 'valor_pacote', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-900/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">M.O. Subtotal:</span>
                    <span className="text-xs text-amber-400 font-black font-mono">{formatCurrency(servico.valor_total)}</span>
                  </div>
                </div>
              ))}
              
              {servicos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 space-y-2">
                  <Tool size={40} className="text-zinc-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nenhum serviço em campo adicionado</p>
                </div>
              )}
            </div>

            {/* Totalizador de Serviços executados */}
            <div className="p-5 sm:p-6 border-t border-zinc-800 bg-zinc-950/40 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total Serviços em Campo</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase">{servicos.length} operação(ões) listada(s)</p>
              </div>
              <p className="text-xl font-black text-white italic font-mono">{formatCurrency(totalServicos)}</p>
            </div>
          </section>

          {/* CARD 5: HORA TÉCNICA EXTERNA & DESPESAS REEMBOLSÁVEIS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
            {/* Hora Técnica Externa */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <p className="text-xs font-black text-white uppercase italic tracking-tight">Hora Técnica Externa / Equipe de Apoio</p>
                <span className="text-[10px] font-mono text-amber-400 font-bold">Extra M.O: {formatCurrency(maoObraExternaTotal)}</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-black">Quantidade de Horas</label>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-center" 
                    value={maoObraExternaHoras || ''} 
                    placeholder="0"
                    onChange={(e) => setMaoObraExternaHoras(parseFloat(e.target.value) || 0)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-black">Valor / Hora (R$)</label>
                  <input 
                    type="number" 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono text-right" 
                    value={maoObraExternaValor || ''} 
                    placeholder="0,00"
                    onChange={(e) => setMaoObraExternaValor(parseFloat(e.target.value) || 0)} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 uppercase font-black">Auxiliares de Apoio (Nomes separados por vírgula)</label>
                <input 
                  type="text" 
                  placeholder="EX: CLAUDIOMIRO, HELDER SILVA..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white uppercase outline-none focus:border-amber-500" 
                  value={mecanicosAdicionaisInput} 
                  onChange={(e) => setMecanicosAdicionaisInput(e.target.value)} 
                />
              </div>
            </div>

            {/* Despesas Reembolsáveis de Viagem */}
            <div className="space-y-4 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <p className="text-xs font-black text-white uppercase italic tracking-tight">Despesas Reembolsáveis em Viagem</p>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">Total Despesas: {formatCurrency(totalDespesas)}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold">Pedágios</label>
                  <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaPedagio || ''} onChange={(e) => setDespesaPedagio(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold">Combustível</label>
                  <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaCombustivel || ''} onChange={(e) => setDespesaCombustivel(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold">Alimentação</label>
                  <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaAlimentacao || ''} onChange={(e) => setDespesaAlimentacao(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold">Hospedagem</label>
                  <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaHospedagem || ''} onChange={(e) => setDespesaHospedagem(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold">Diária Técnica</label>
                  <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaDiariaTecnica || ''} onChange={(e) => setDespesaDiariaTecnica(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-zinc-400 uppercase font-bold">Guincho</label>
                  <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaGuincho || ''} onChange={(e) => setDespesaGuincho(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-zinc-400 uppercase font-bold">Outras Despesas em Trânsito</label>
                <input type="number" step="any" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono text-right" value={despesaOutros || ''} onChange={(e) => setDespesaOutros(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </section>

          {/* CARD 6: FOTOS & ASSINATURA ELETRÔNICA DO CLIENTE */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl space-y-6">
            {/* Fotos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <h4 className="text-xs font-black text-white uppercase italic tracking-tight">Fotos de Evidência em Campo</h4>
                <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">{fotosCampo.length} foto(s)</span>
              </div>
              
              <label className="w-full p-5 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-amber-500/50 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                <span className="text-xl">📸</span>
                <span className="text-xs font-black text-white uppercase tracking-wider mt-1">Anexar Comprovações de Resgate</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Fotos da peça danificada, quilometragem ou local da pane</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFotoChange} />
              </label>
              
              {fotosCampo.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                  {fotosCampo.map((foto, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group">
                      <img src={foto} alt={`campo-${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removerFoto(idx)} 
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg"
                        title="Remover foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assinatura */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-white uppercase italic tracking-tight">Assinatura Eletrônica do Solicitante / Motorista</p>
                <button 
                  type="button" 
                  onClick={clearSignature} 
                  className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase underline cursor-pointer"
                >
                  Limpar Assinatura
                </button>
              </div>

              <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative shadow-inner">
                <canvas 
                  ref={canvasRef}
                  width={600}
                  height={140}
                  className="w-full h-[140px] bg-zinc-950 cursor-crosshair blockTouchScroll touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!assinaturaCampo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[10px] text-zinc-650 uppercase font-black tracking-widest bg-zinc-950/20">
                    Rubrica ou assinatura do responsável no local
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>

        {/* COLUNA LATERAL: INSUMOS, FATURAMENTO SOS & PROTOCOLO (5/12) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          
          {/* CARD 1: PEÇAS E MATERIAIS LEVADOS NA VAN/SOS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2.5">
                <Package size={18} className="text-amber-500 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-black text-white uppercase italic tracking-tight">Peças / Troca Rápida</h4>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Materiais levados na Van/SOS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition cursor-pointer self-start sm:self-auto"
              >
                <Plus size={14} />
                Adicionar peça do estoque
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-amber-500 transition-colors" size={15} />
                <input 
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-10 text-xs text-white font-bold uppercase tracking-wider outline-none focus:border-amber-500 transition shadow-inner placeholder:text-zinc-600"
                  placeholder="BUSCAR PEÇA NO ALMOXARIFADO..."
                  value={pecaSearchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPecaSearchQuery(val);
                    if (!val || val.trim().length < 2) {
                      setAvailablePecas([]);
                    }
                  }}
                />
                
                {pecasLoading && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}

                {/* Dropdown de Busca */}
                {pecaSearchQuery && pecaSearchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {pecasLoading ? (
                      <div className="p-5 text-center text-zinc-400 text-xs">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin mx-auto mb-2" />
                        Consultando estoque...
                      </div>
                    ) : availablePecas.length === 0 ? (
                      <div className="p-5 text-center text-zinc-500 text-xs">
                        Nenhum insumo encontrado
                      </div>
                    ) : (
                      availablePecas.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            addPeca(p);
                            setPecaSearchQuery('');
                            setAvailablePecas([]);
                          }}
                          className="w-full p-3.5 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors border-b border-zinc-800/60 last:border-0"
                        >
                          <div className="flex flex-col pr-2 min-w-0">
                            <span className="text-xs font-bold text-white uppercase truncate">{p.descricao}</span>
                            <span className="text-[10px] text-zinc-400 font-mono mt-0.5">CÓD: {p.codigo || 'S/ CÓD'} • SALDO: {p.quantidade} {p.unidadeMedida || 'un'}</span>
                          </div>
                          <span className="text-xs font-mono font-black text-green-400 flex-shrink-0">{formatCurrency(p.preco_venda)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Relação de peças adicionadas */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pt-1">
                {pecas.map(peca => (
                  <div key={peca.id} className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 flex items-center justify-between gap-3 border-l-4 border-l-amber-500/50 hover:border-l-amber-500 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white uppercase truncate">{peca.descricao}</p>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Unit: {formatCurrency(peca.valor_unit)} • Total: <span className="text-green-400 font-black">{formatCurrency(peca.valor_total)}</span></p>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1.5 rounded-lg border border-zinc-800">
                        <input 
                          type="number" 
                          step="any" 
                          className="w-12 bg-transparent text-white text-xs font-mono font-bold text-center outline-none p-0 focus:ring-0" 
                          value={peca.quantidade} 
                          onChange={(e) => updatePeca(peca.id, 'quantidade', parseFloat(e.target.value) || 0)} 
                        />
                        <select 
                          className="bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase outline-none cursor-pointer p-0 border-0 focus:text-white"
                          value={peca.unidade || 'un'} 
                          onChange={(e) => updatePeca(peca.id, 'unidade', e.target.value)}
                        >
                          {(peca.compativeis && peca.compativeis.length > 0 ? peca.compativeis : [{ sigla: peca.unidade || 'un' }]).map((u: any) => (
                            <option key={u.sigla} value={u.sigla} className="bg-zinc-950 text-white uppercase">{u.sigla}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removePeca(peca.id)} 
                        className="p-1.5 text-zinc-600 hover:text-red-400 transition"
                        title="Remover peça"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {pecas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30 border border-dashed border-zinc-800 rounded-xl space-y-1">
                    <Package size={30} className="text-zinc-500" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nenhum material levado</p>
                  </div>
                )}
              </div>

              {pecas.length > 0 && (
                <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs">
                  <span className="text-zinc-400 font-bold uppercase">Subtotal Peças:</span>
                  <span className="text-sm font-black text-white font-mono">{formatCurrency(totalPecas)}</span>
                </div>
              )}
            </div>
          </section>

          {/* CARD 2: FATURAMENTO SOS CAMPO (FECHAMENTO FINANCEIRO) */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
              <FileText size={16} className="text-green-500" />
              <div>
                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Faturamento SOS Campo</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Compilação Operacional Direta</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-3.5 shadow-inner">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Peças em Trânsito</span>
                <span className="text-white font-mono font-bold">{formatCurrency(totalPecas)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Trabalhos Efetuados</span>
                <span className="text-white font-mono font-bold">{formatCurrency(totalServicos)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Logística KM</span>
                <span className="text-white font-mono font-bold">{formatCurrency(totalDeslocamento)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Extra M.O. Externa</span>
                <span className="text-white font-mono font-bold">{formatCurrency(maoObraExternaTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Gastos Reembolsáveis</span>
                <span className="text-white font-mono font-bold">{formatCurrency(totalDespesas)}</span>
              </div>
              
              {/* Desconto */}
              <div className="space-y-1 pt-1 border-t border-zinc-900">
                <label className="text-[10px] text-zinc-400 uppercase font-black">Conceder Desconto (R$)</label>
                <input 
                  type="number" 
                  step="any"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white font-mono outline-none text-right focus:border-amber-500 transition" 
                  value={desconto || ''} 
                  placeholder="0,00"
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} 
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1 pt-2 border-t border-zinc-900">
                <label className="text-[10px] text-zinc-400 uppercase font-black">Cobrança e Faturamento</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => {
                    setFormaPagamento(e.target.value);
                    if (e.target.value === 'BOLETO PARCELADO' && numParcelas < 2) setNumParcelas(3);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-amber-500 transition shadow-inner cursor-pointer"
                >
                  <option value="DINHEIRO">DINHEIRO (PIX DIRETO)</option>
                  <option value="PIX">FATURADO PIX PJ</option>
                  <option value="CARTÃO DÉBITO">CARTÃO DÉBITO</option>
                  <option value="CARTÃO CRÉDITO">CARTÃO CRÉDITO</option>
                  <option value="BOLETO À VISTA">BOLETO À VISTA</option>
                  <option value="BOLETO PARCELADO">BOLETO INDÚSTRIA PARCELADO</option>
                </select>
              </div>

              {formaPagamento === 'BOLETO PARCELADO' && (
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Nº Parcelas</label>
                      <input 
                        type="number" 
                        min="2" 
                        max="24"
                        value={numParcelas}
                        onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-400 uppercase">Intervalo (Dias)</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={diasEntreParcelas}
                        onChange={(e) => setDiasEntreParcelas(parseInt(e.target.value) || 28)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">1º Vencimento</label>
                    <input 
                      type="date"
                      value={dataPrimeiraParcela}
                      onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  {/* Simulação de Parcelas */}
                  <div className="pt-2 max-h-36 overflow-y-auto custom-scrollbar space-y-1 border-t border-zinc-900">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                      Simulação ({numParcelas}x de {formatCurrency(totalGeral / numParcelas)})
                    </span>
                    {Array.from({ length: numParcelas }).map((_, i) => {
                      const dt = new Date(dataPrimeiraParcela);
                      dt.setDate(dt.getDate() + (i * diasEntreParcelas));
                      return (
                        <div key={i} className="flex justify-between items-center text-[10px] font-mono text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/40">
                          <span className="text-zinc-500 font-bold">P {i + 1}/{numParcelas}</span>
                          <span>{dt.toLocaleDateString('pt-BR')}</span>
                          <span className="text-white font-bold">{formatCurrency(totalGeral / numParcelas)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total Geral Consolidado */}
              <div className="pt-3 border-t border-zinc-900 flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Faturamento Total SOS</span>
                  <span className="text-[9px] text-zinc-500 uppercase">Atendimento Concluído</span>
                </div>
                <span className="text-2xl sm:text-3xl font-black text-white italic font-mono tracking-tight tabular-nums">
                  {formatCurrency(totalGeral)}
                </span>
              </div>
            </div>

            {/* Ações de Envio */}
            <div className="space-y-3 pt-2">
              <button 
                type="button"
                onClick={handleSubmit} 
                disabled={loading} 
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-amber-950/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin text-zinc-950" /> : <Save size={16} />} 
                PROTOCOLAR OS DE CAMPO
              </button>
              
              <button
                type="button"
                onClick={onBack}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-bold uppercase text-[10px] tracking-wider transition border border-zinc-800/80 cursor-pointer"
              >
                Cancelar / Voltar
              </button>
            </div>
          </section>

        </div>

      </div>

      {/* Modais de Cadastro Rápido Integrados */}
      <QuickClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={handleQuickClientCreated}
      />

      <QuickVehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSuccess={handleQuickVehicleCreated}
        selectedClientId={selectedCliente?.id}
        selectedClientName={selectedCliente?.nome}
        clients={clientes}
        onOpenNewClientModal={() => {
          setIsVehicleModalOpen(false);
          setIsClientModalOpen(true);
        }}
      />

      {/* Modal de Almoxarifado / Adicionar Peças do Estoque */}
      <StockPartsModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onAddPart={handleAddPartFromStockModal}
        existingParts={pecas}
        colorScheme="amber"
      />
    </div>
  );
}
