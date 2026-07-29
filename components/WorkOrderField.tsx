'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, Car, Wrench, Package, 
  Search, ChevronLeft, Clock, FileText, Trash2, Plus,
  PenTool as Tool, Loader2, Save, Calendar, Milestone, Navigation
} from 'lucide-react';
import { parseHoras } from '@/lib/utils';
import { obterUnidadesCompativeis, converterUnidade } from '@/lib/unidades';
import { useFieldWorkOrderCalculations } from '@/hooks/useFieldWorkOrderCalculations';

interface WorkOrderFieldProps {
  onBack: () => void;
}

export default function WorkOrderField({ onBack }: WorkOrderFieldProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    setPecas(prev => [
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
    ]);
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
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 md:px-6 space-y-8 pb-20 overflow-hidden animate-in fade-in duration-300">
      
      {/* HEADER DE CONTROLES */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-805 p-6 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              PINHEIRO DIESEL PRO <span className="text-zinc-700">|</span> <span className="text-amber-500">Fluxo de Campo (Móvel)</span>
            </h1>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em] leading-none mt-1">LOGÍSTICA DE RESGATE E ATENDIMENTOS FORA DE ESTRADA</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest font-mono">
            🌾 OPERAÇÃO EXTERNA ATIVA
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA 1: IDENTIFICAÇÃO E LOGÍSTICA DE ATENDIMENTO EXTERNO (Tamanho 3/12) */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-zinc-900 border border-amber-500/15 rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
              <Milestone className="w-4 h-4 text-amber-500" />
              <p className="text-xs font-black text-white uppercase tracking-wider italic">LOGÍSTICA DE VIAGEM & SOS</p>
            </div>

            <div className="space-y-5">
              {/* Proprietário */}
              <div className="space-y-1.5 relative">
                <label className="text-[10px] text-zinc-550 uppercase font-black tracking-widest px-1">Cliente Solicitante</label>
                <div 
                  onClick={() => setShowClientList(!showClientList)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none transition cursor-pointer flex items-center justify-between shadow-inner group hover:border-amber-550"
                >
                  <span className="font-bold uppercase tracking-tight transition-colors group-hover:text-amber-500">
                    {selectedCliente?.nome || 'LOCALIZAR NO SISTEMA...'}
                  </span>
                  <Search size={14} className="text-zinc-700 transition-colors group-hover:text-amber-550" />
                </div>
                
                {showClientList && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800">
                      <input 
                        autoFocus 
                        type="text" 
                        placeholder="BUSCAR CLIENTE..." 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none font-bold uppercase tracking-widest transition focus:border-amber-500" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {clientesLoading ? (
                         <div className="p-8 text-center">
                           <Loader2 className="w-5 h-5 text-amber-550 animate-spin mx-auto mb-1 animate-ping" />
                           <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Buscando Proprietários...</p>
                         </div>
                      ) : (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).length === 0 ? (
                         <div className="p-8 text-center text-zinc-500 text-xs uppercase font-extrabold font-mono">Nenhum resultado</div>
                      ) : (
                        (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).map(c => (
                          <button 
                            key={c.id} 
                            type="button"
                            onClick={() => { handleClienteChange(c.id); setShowClientList(false); setSearchTerm(''); }} 
                            className="w-full p-5 text-left text-xs font-black uppercase text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all border-b border-zinc-800/50 last:border-0 italic"
                          >
                            {c.nome} <span className="text-[9px] text-zinc-700 ml-2 font-mono">({c.cpf_cnpj})</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Veículo atendido */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-550 uppercase font-black tracking-widest px-1">Ativo em Resgate</label>
                <div className="relative group">
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-10 text-xs text-white outline-none transition font-black uppercase tracking-widest cursor-pointer shadow-inner appearance-none disabled:opacity-25 focus:border-amber-500" 
                    value={selectedVeiculo?.id || ''} 
                    onChange={(e) => { const v = veiculos.find(v => v.id === e.target.value); if (v) setSelectedVeiculo(v); }} 
                    disabled={!selectedCliente}
                  >
                    <option value="">SELECIONAR CARRO/CAMINHÃO...</option>
                    {(veiculos || []).map(v => <option key={v.id} value={v.id}>{v.placa} • {v.modelo} • {v.marca}</option>)}
                  </select>
                  <Car size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none transition-colors group-hover:text-amber-500" />
                </div>
              </div>

              {/* Técnico Responsável */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-550 uppercase font-black tracking-widest px-1">Líder do Resgate</label>
                <div className="relative group">
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-10 text-xs text-white outline-none transition font-black uppercase tracking-widest cursor-pointer shadow-inner appearance-none focus:border-amber-500" 
                    value={selectedMecanico} 
                    onChange={(e) => setSelectedMecanico(e.target.value)}
                  >
                    <option value="">ATRIBUIR TÉCNICO LÍDER...</option>
                    {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                  <Wrench size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none transition-colors group-hover:text-amber-500" />
                </div>
              </div>

              {/* Geolocalização e Endereço */}
              <div className="bg-zinc-950/70 border border-zinc-805 rounded-[1.8rem] p-6 space-y-4 shadow-inner">
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-white uppercase tracking-wider">1. Local do Atendimento</p>
                  <input 
                    type="text" 
                    placeholder="ENDEREÇO COMPLETO..." 
                    className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none focus:border-amber-500 transition" 
                    value={localAtendimento} 
                    onChange={(e) => setLocalAtendimento(e.target.value)} 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="CIDADE..." 
                      className="bg-zinc-900 border border-zinc-805 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none focus:border-amber-500 transition" 
                      value={localCidade} 
                      onChange={(e) => setLocalCidade(e.target.value)} 
                    />
                    <input 
                      type="text" 
                      placeholder="ESTADO (UF)" 
                      className="bg-zinc-900 border border-zinc-805 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none focus:border-amber-500 transition text-center" 
                      value={localEstado} 
                      maxLength={2} 
                      onChange={(e) => setLocalEstado(e.target.value)} 
                    />
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="COORDENADAS GPS..." 
                      className="flex-1 bg-zinc-900 border border-zinc-815 rounded-xl p-3 text-[10px] text-white font-mono outline-none focus:border-amber-500 transition text-center" 
                      value={localGps} 
                      onChange={(e) => setLocalGps(e.target.value)} 
                    />
                    <button 
                      type="button" 
                      onClick={capturarGps} 
                      className="bg-zinc-800 hover:bg-amber-550 hover:text-zinc-950 text-white rounded-xl px-2.5 transition text-[8px] font-black uppercase"
                    >
                      GPS📍
                    </button>
                  </div>
                </div>

                {/* Veículo de Apoio */}
                <div className="space-y-3 pt-3 border-t border-zinc-900">
                   <p className="text-[9px] font-black text-white uppercase tracking-wider">2. Logs Técnicos de Apoio</p>
                   <div>
                     <label className="text-[8px] text-zinc-650 uppercase font-black">Identif. Carro de Apoio / Placa</label>
                     <input 
                       type="text" 
                       placeholder="EX: FORD TRANSIT SOS PLACA OK..." 
                       className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-3 text-[10px] text-white uppercase outline-none focus:border-amber-500 transition" 
                       value={veiculoApoio} 
                       onChange={(e) => setVeiculoApoio(e.target.value)} 
                     />
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                       <label className="text-[8px] text-zinc-650 uppercase font-black">Saída Sede</label>
                       <input 
                         type="text" 
                         placeholder="08:00" 
                         className="w-full bg-zinc-900 border border-zinc-855 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-center" 
                         value={horarioSaidaEquipe} 
                         onChange={(e) => setHorarioSaidaEquipe(e.target.value)} 
                       />
                     </div>
                     <div className="space-y-1">
                       <label className="text-[8px] text-zinc-650 uppercase font-black">Chegada Campo</label>
                       <input 
                         type="text" 
                         placeholder="09:15" 
                         className="w-full bg-zinc-900 border border-zinc-855 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-center" 
                         value={horarioChegadaEquipe} 
                         onChange={(e) => setHorarioChegadaEquipe(e.target.value)} 
                       />
                     </div>
                   </div>
                   <div>
                     <label className="text-[8px] text-zinc-655 uppercase font-black">Tempo Total Deslocado</label>
                     <input 
                       type="text" 
                       placeholder="EX: 1H 15MIN..." 
                       className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-bold" 
                       value={tempoDeslocamento} 
                       onChange={(e) => setTempoDeslocamento(e.target.value)} 
                     />
                   </div>
                </div>

                {/* Visualização de Métricas de Campo (UX Avançado) */}
                <div className="space-y-4 pt-4 border-t border-zinc-900 leading-none">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-white uppercase tracking-wider">3. Painel Logístico de KM Rodados</p>
                    <span className="text-[8px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold font-mono uppercase tracking-wider">
                      Cálculo Dinâmico
                    </span>
                  </div>

                  {/* Grid de Cards de UX Profissional (Responsivo) */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {/* KM Ida */}
                    <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                      <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">KM Ida</span>
                      <p className="text-sm font-bold text-white font-mono">{parsedKmIda} <span className="text-[9px] text-zinc-600">KM</span></p>
                    </div>

                    {/* KM Volta */}
                    <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                      <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">KM Volta</span>
                      <p className="text-sm font-bold text-white font-mono">{parsedKmVolta} <span className="text-[9px] text-zinc-600">KM</span></p>
                    </div>

                    {/* Total Rodado */}
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 flex flex-col justify-between col-span-2 md:col-span-1 space-y-1">
                      <span className="text-[8px] text-emerald-500 font-extrabold uppercase tracking-widest">Total Rodado</span>
                      <p className="text-sm font-black text-emerald-400 font-mono">{kmTotal} <span className="text-[9px] text-emerald-600">KM</span></p>
                    </div>

                    {/* Valor/KM */}
                    <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between space-y-1">
                      <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">Valor / KM</span>
                      <p className="text-xs font-bold text-white font-mono">{formatCurrency(parseFloat(valorKm as any) || 0)}</p>
                    </div>

                    {/* Total Deslocamento */}
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-3 flex flex-col justify-between col-span-2 sm:col-span-1 space-y-1">
                      <span className="text-[8px] text-amber-500 font-extrabold uppercase tracking-widest">Custo Deslocamento</span>
                      <p className="text-xs font-black text-amber-400 font-mono">{formatCurrency(totalDeslocamento)}</p>
                    </div>

                    {/* Valor Final OS */}
                    <div className="bg-blue-950/20 border border-blue-500/20 rounded-2xl p-3 flex flex-col justify-between col-span-2 sm:col-span-1 space-y-1">
                      <span className="text-[8px] text-blue-500 font-extrabold uppercase tracking-widest">Valor Final OS</span>
                      <p className="text-xs font-black text-blue-400 font-mono">{formatCurrency(totalGeral)}</p>
                    </div>
                  </div>

                  {/* Inputs Formulário de KM */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-zinc-650 uppercase font-black">KM Ida</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="0" 
                        className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-2 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right transition"
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
                      <label className="text-[8px] text-zinc-650 uppercase font-black">KM Volta</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        placeholder="0" 
                        className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-2 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right transition"
                        value={kmVolta} 
                        onChange={(e) => {
                          const val = e.target.value.replace(',', '.');
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setKmVolta(val);
                          }
                        }} 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] text-zinc-650 uppercase font-black">Reembolso por KM (R$)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="Valor por KM" 
                      className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right transition" 
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
              </div>
            </div>
          </section>
        </div>

        {/* COLUNA 2: MÃO DE OBRA E EXECUÇÃO DE SERVIÇOS CAMPO (Tamanho 5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-amber-500 shadow-inner">
                  <Tool size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Serviços e Atividades de Campo</h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Trabalho Técnico Realizado ao Vivo</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={addServico} 
                className="p-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl transition shadow-lg active:scale-95 group cursor-pointer"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Listagem de Serviços */}
            <div className="flex-1 overflow-y-auto max-h-[600px] p-6 space-y-4 custom-scrollbar">
              {servicos.map((servico) => (
                <div key={servico.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 group relative space-y-4 hover:border-amber-500/20 transition-all">
                  <button 
                    type="button"
                    onClick={() => removeServico(servico.id)} 
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-650 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all shadow-xl z-20 hover:scale-110"
                  >
                    <Trash2 size={13} />
                  </button>
                  
                  {/* Tipo de Cobrança */}
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => updateServico(servico.id, 'tipo_cobranca', 'HORA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition ${
                        servico.tipo_cobranca === 'HORA' 
                          ? 'bg-amber-500 text-zinc-950 font-black' 
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800/80'
                      }`}
                    >
                      Tempo de Execução
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateServico(servico.id, 'tipo_cobranca', 'PACOTE')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition ${
                        servico.tipo_cobranca === 'PACOTE' 
                          ? 'bg-amber-500 text-zinc-950 font-black' 
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800/80'
                      }`}
                    >
                      Preço Fechado
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-650 uppercase tracking-widest">Procedimento Efetuado</label>
                    <input 
                      type="text" 
                      placeholder="DESCREVA A CORREÇÃO DE ESTRADA..." 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-amber-500 font-black uppercase tracking-widest" 
                      value={servico.descricao} 
                      onChange={(e) => updateServico(servico.id, 'descricao', e.target.value)} 
                    />
                  </div>

                  {servico.tipo_cobranca === 'HORA' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-zinc-650 uppercase tracking-widest text-right block">Horas (H:MM)</label>
                        <input 
                          type="text" 
                          placeholder="1:30"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-500 font-mono font-black text-right shadow-inner"
                          value={servico.horas}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^0-9:]/g, '');
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
                        <label className="text-[9px] font-black text-zinc-655 uppercase tracking-widest text-right block">Preço/Hora (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-550 font-mono font-black text-right shadow-inner"
                          value={servico.valor_hora}
                          onChange={(e) => updateServico(servico.id, 'valor_hora', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-650 uppercase tracking-widest text-right block">Subtotal Fechado (R$)</label>
                      <input 
                        type="number" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-amber-550 font-mono font-black text-right shadow-inner"
                        value={servico.valor_pacote}
                        onChange={(e) => updateServico(servico.id, 'valor_pacote', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  <div className="text-right text-xs text-amber-500 font-extrabold font-mono italic leading-none">
                    M.O. SUBTOTAL: {formatCurrency(servico.valor_total)}
                  </div>
                </div>
              ))}
              
              {servicos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-10 space-y-4 italic">
                  <Tool size={55} className="text-zinc-600 animate-pulse" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-center text-zinc-600">Nenhum Serviço Listado</p>
                </div>
              )}
            </div>

            {/* Totalizador de Serviços executados */}
            <div className="p-8 border-t border-zinc-800 bg-zinc-950/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Serviços em Campo</p>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{servicos.length} Operações Listadas</p>
                </div>
                <p className="text-xl font-black text-white italic font-mono">{formatCurrency(totalServicos)}</p>
              </div>
            </div>
          </section>
        </div>

        {/* COLUNA 3: ALMOXARIFADO, DESPESAS, ASSINATURA E PROTOCOLAMENTO FINANCEIRO (Tamanho 4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* PEÇAS E MATERIAIS USADOS EM CAMPO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-xs font-black text-white uppercase italic tracking-tighter">Peças / Troca Rápida</h4>
                <p className="text-[8px] text-zinc-650 font-black uppercase tracking-widest leading-none mt-1">Materiais Levados na Van/SOS</p>
              </div>
              <Package size={16} className="text-zinc-700" />
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-amber-500 transition-colors" size={14} />
                <input 
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-10 text-[10px] text-white font-black uppercase tracking-widest outline-none focus:border-amber-500 transition shadow-inner placeholder:text-zinc-800"
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
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}

                {/* Busca resultado */}
                {pecaSearchQuery && pecaSearchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-56 overflow-y-auto custom-scrollbar">
                    {pecasLoading ? (
                      <div className="p-6 text-center text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin mx-auto mb-1.5" />
                        Buscando Estoque...
                      </div>
                    ) : availablePecas.length === 0 ? (
                      <div className="p-6 text-center text-zinc-655 text-[9px] font-bold uppercase tracking-widest">
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
                          className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-800 transition-colors border-b border-zinc-800 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase">{p.descricao}</span>
                            <span className="text-[8px] text-zinc-650 font-mono font-bold tracking-widest mt-0.5 uppercase">CÓD: {p.codigo || 'S/ CÓD'} • QUANT: {p.quantidade} {p.unidadeMedida || 'un'}</span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-green-500">{formatCurrency(p.preco_venda)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Relação de peças adicionadas */}
              <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pt-2">
                {pecas.map(peca => (
                  <div key={peca.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-amber-500/20 hover:border-l-amber-500 transition-all leading-none">
                    <div className="flex-1 mr-2 min-w-0">
                      <p className="text-[10px] font-black text-white uppercase italic truncate">{peca.descricao}</p>
                      <p className="text-[8px] text-zinc-600 font-mono mt-1 font-bold">UNIT: {formatCurrency(peca.valor_unit)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1.5 rounded-lg border border-zinc-800">
                        <input 
                          type="number" 
                          step="any" 
                          className="w-10 bg-transparent text-white text-[10px] font-mono font-black text-center outline-none" 
                          value={peca.quantidade} 
                          onChange={(e) => updatePeca(peca.id, 'quantidade', parseFloat(e.target.value) || 0)} 
                        />
                        <select 
                          className="bg-zinc-900 text-zinc-500 text-[8px] font-black uppercase outline-none cursor-pointer border-0 p-0"
                          value={peca.unidade || 'un'} 
                          onChange={(e) => updatePeca(peca.id, 'unidade', e.target.value)}
                        >
                          {(peca.compativeis && peca.compativeis.length > 0 ? peca.compativeis : [{ sigla: peca.unidade || 'un' }]).map((u: any) => (
                            <option key={u.sigla} value={u.sigla} className="bg-zinc-950 text-white text-[8px] uppercase">{u.sigla}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" onClick={() => removePeca(peca.id)} className="text-zinc-700 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {pecas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 opacity-10 border border-dashed border-zinc-800 rounded-xl italic">
                    <Package size={28} className="text-zinc-650" />
                    <p className="text-[8px] font-black uppercase mt-1 leading-none tracking-wider">Nenhum Material Levado</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HORA TÉCNICA E TÉCNICOS ADICIONAIS (Resgate Campo) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden space-y-4">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic leading-none">4. Hora Técnica Externa / Equipe</p>
            <div className="grid grid-cols-2 gap-3 leading-none">
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-600 font-bold uppercase">Quant. de Horas</label>
                <input 
                  type="number" 
                  className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-center" 
                  value={maoObraExternaHoras || ''} 
                  onChange={(e) => setMaoObraExternaHoras(parseFloat(e.target.value) || 0)} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-600 font-bold uppercase">Valor/Hora (R$)</label>
                <input 
                  type="number" 
                  className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500 font-mono text-right" 
                  value={maoObraExternaValor || ''} 
                  onChange={(e) => setMaoObraExternaValor(parseFloat(e.target.value) || 0)} 
                />
              </div>
            </div>
            <div>
              <label className="text-[8px] text-zinc-650 uppercase font-bold">Auxiliares de Apoio (Nomes separados por vírgula)</label>
              <input 
                type="text" 
                placeholder="EX: CLAUDIOMIRO, HELDER SILVA..." 
                className="w-full bg-zinc-950 border border-zinc-805 rounded-xl p-3 text-[10px] text-white uppercase outline-none focus:border-amber-500" 
                value={mecanicosAdicionaisInput} 
                onChange={(e) => setMecanicosAdicionaisInput(e.target.value)} 
              />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-amber-500 font-black bg-amber-950/15 border border-amber-500/10 p-2 rounded-xl">
              <span>EXTRA DESLOCAMENTO MÔVEL:</span>
              <span>{formatCurrency(maoObraExternaTotal)}</span>
            </div>
          </div>

          {/* REEMBOLSO DE TARIFAS E DESPESAS DE CAMPO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden space-y-4">
            <p className="text-[10px] font-black text-zinc-550 uppercase tracking-widest leading-none">5. Despesas Reembolsáveis em Viagem</p>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-zinc-500 leading-none">
              <div className="space-y-1">
                <label className="uppercase">Pedágios</label>
                <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaPedagio || ''} onChange={(e) => setDespesaPedagio(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <label className="uppercase">Relação Combustível</label>
                <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaCombustivel || ''} onChange={(e) => setDespesaCombustivel(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-zinc-500 leading-none">
              <div className="space-y-1">
                <label className="uppercase font-semibold">Alimentação</label>
                <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaAlimentacao || ''} onChange={(e) => setDespesaAlimentacao(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <label className="uppercase font-semibold">Hospedagem</label>
                <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaHospedagem || ''} onChange={(e) => setDespesaHospedagem(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-zinc-500 leading-none">
              <div className="space-y-1">
                <label className="uppercase font-semibold">Diária Técnica</label>
                <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaDiariaTecnica || ''} onChange={(e) => setDespesaDiariaTecnica(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1">
                <label className="uppercase font-semibold">Guinchos</label>
                <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaGuincho || ''} onChange={(e) => setDespesaGuincho(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <label className="text-[8px] text-zinc-650 font-bold uppercase block mb-1">Outras despesas em trânsito</label>
              <input type="number" placeholder="R$ 0,00" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono text-right" value={despesaOutros || ''} onChange={(e) => setDespesaOutros(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-400 bg-zinc-950/40 p-2 rounded-xl">
              <span>DIÁRIAS E SEGUROS TOTAL:</span>
              <span>{formatCurrency(totalDespesas)}</span>
            </div>
          </div>

          {/* GALERIA DE EVIDÊNCIAS DE CAMPO */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <h4 className="text-xs font-black text-white uppercase italic tracking-tighter mb-4">Fotos de Evidência em Campo</h4>
            <div className="flex flex-col gap-3">
              <label className="w-full p-4 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                <span className="text-xl">📸</span>
                <span className="text-[9px] font-black text-white uppercase tracking-widest mt-1 font-sans">Anexar Comprovações</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFotoChange} />
              </label>
              
              {fotosCampo.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {fotosCampo.map((foto, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group">
                      <img src={foto} alt={`campo-${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removerFoto(idx)} 
                        className="absolute top-1 right-1 bg-red-650 hover:bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ASSINATURA ELETRÔNICA DO CLIENTE (MÓVEL) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest font-mono">Assinatura Eletrônica do Cliente</p>
              <button 
                type="button" 
                onClick={clearSignature} 
                className="text-[8px] text-red-500 hover:text-red-400 font-extrabold uppercase underline"
              >
                Limpar Painel
              </button>
            </div>

            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden relative shadow-inner">
              <canvas 
                ref={canvasRef}
                width={300}
                height={120}
                className="w-full h-[120px] bg-zinc-950 cursor-crosshair blockTouchScroll touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!assinaturaCampo && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[8px] text-zinc-700 uppercase font-black tracking-widest bg-zinc-950/20">
                  Valide com rubrica do cliente
                </div>
              )}
            </div>
          </div>

          {/* DIAGNÓSTICO E RELAÇÃO DE AVARIAS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic px-1 block mb-1">Previsões do Atendimento / Triagem</label>
            <textarea 
              placeholder="DESREVA A SITUAÇÃO GERAL DE ENTRADA DO VEÍCULO, DIAGNÓSTICOS, PROBLEMAS CONSTATADOS E SOLUÇÕES EFETUADAS..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] text-white outline-none focus:border-zinc-700 transition font-bold uppercase tracking-widest shadow-inner h-28 resize-none placeholder:text-zinc-800 leading-relaxed" 
              value={diagnostico} 
              onChange={(e) => setDiagnostico(e.target.value)} 
            />
          </div>

          {/* FECHAMENTO FINANCEIRO E PROTOCOLO GERAL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-green-500 shadow-inner">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase italic tracking-tighter">Faturamento SOS Campo</h3>
                <p className="text-[9px] text-zinc-650 font-bold uppercase tracking-widest">Compilação Operacional Direta</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-[1.8rem] p-6 space-y-4 shadow-inner">
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Insumos / Peças em trânsito</span>
                <span className="text-white font-mono">{formatCurrency(totalPecas)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Trabalhos efetuados</span>
                <span className="text-white font-mono">{formatCurrency(totalServicos)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Logística Quilometragem (KM)</span>
                <span className="text-white font-mono">{formatCurrency(totalDeslocamento)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Extra Deslocação / M.O. Externa</span>
                <span className="text-white font-mono">{formatCurrency(maoObraExternaTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Gastos Reembolsáveis</span>
                <span className="text-white font-mono">{formatCurrency(totalDespesas)}</span>
              </div>
              
              {/* Desconto */}
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-650 uppercase font-black">Conceder Desconto (R$)</label>
                <input 
                  type="number" 
                  step="any"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 px-3 text-xs text-white font-mono outline-none text-right focus:border-amber-500" 
                  value={desconto || ''} 
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} 
                />
              </div>

              <div className="h-px bg-zinc-900 my-1" />

              {/* Condição de Cobrança */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Cobrança e Faturamento</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => {
                    setFormaPagamento(e.target.value);
                    if (e.target.value === 'BOLETO PARCELADO' && numParcelas < 2) setNumParcelas(3);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white font-bold uppercase outline-none focus:border-amber-500 transition shadow-inner"
                >
                  <option value="DINHEIRO font-bold">DINHEIRO (PIX DIRETO)</option>
                  <option value="PIX">FATURADO PIX PJ</option>
                  <option value="CARTÃO DÉBITO">CARTÃO DÉBITO</option>
                  <option value="CARTÃO CRÉDITO">CARTÃO CRÉDITO</option>
                  <option value="BOLETO À VISTA">BOLETO À VISTA</option>
                  <option value="BOLETO PARCELADO">BOLETO INDÚSTRIA PARCELADO</option>
                </select>
              </div>

              {formaPagamento === 'BOLETO PARCELADO' && (
                <div className="space-y-3 pt-2 border-t border-zinc-900 leading-none">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-650 uppercase">Parcelas</label>
                      <input 
                        type="number" 
                        min="2" 
                        max="24"
                        value={numParcelas}
                        onChange={(e) => setNumParcelas(parseInt(e.target.value) || 2)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-zinc-650 uppercase">Intervalo (dias)</label>
                      <input 
                        type="number" 
                        min="1"
                        value={diasEntreParcelas}
                        onChange={(e) => setDiasEntreParcelas(parseInt(e.target.value) || 28)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-zinc-650 uppercase">Primeiro Vencimento</label>
                    <input 
                      type="date"
                      value={dataPrimeiraParcela}
                      onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="h-px bg-zinc-900 my-1" />
              
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic">Faturamento Total do Atendimento</span>
                <span className="text-3xl font-black text-white italic font-mono leading-none tracking-tighter tabular-nums">{formatCurrency(totalGeral)}</span>
              </div>
            </div>

            {/* Previsão de entrega */}
            <div className="space-y-1.5 animate-in">
              <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest px-1">Previsão Fechamento de Viagem</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none" size={14} />
                <input 
                  type="datetime-local" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-white outline-none focus:border-amber-505 transition font-black uppercase tracking-widest cursor-pointer" 
                  value={previsao} 
                  onChange={(e) => setPrevisao(e.target.value)} 
                />
              </div>
            </div>

            {/* Gravar no Banco */}
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_20px_40px_-10px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 italic cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
              PROTOCOLAR OS DE CAMPO
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
