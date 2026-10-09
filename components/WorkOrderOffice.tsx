'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, Car, Wrench, Package, 
  Search, ChevronLeft, FileText, Trash2, Plus,
  PenTool as Tool, Loader2, Save, Calendar
} from 'lucide-react';
import { parseHoras } from '@/lib/utils';
import { obterUnidadesCompativeis, converterUnidade } from '@/lib/unidades';
import QuickClientModal from '@/components/QuickClientModal';
import QuickVehicleModal from '@/components/QuickVehicleModal';

interface WorkOrderOfficeProps {
  onBack: () => void;
}

export default function WorkOrderOffice({ onBack }: WorkOrderOfficeProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Modais de Cadastro Rápido
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  
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

  // Campos específicos de Oficina
  const [boxElevador, setBoxElevador] = useState('');
  const [prioridade, setPrioridade] = useState('NORMAL');
  const [statusElevador, setStatusElevador] = useState('LIVRE');
  const [lavagem, setLavagem] = useState(false);
  const [testeFinal, setTesteFinal] = useState(false);
  const [tempoInterno, setTempoInterno] = useState('');
  
  // Horas técnicas de Entrada e Saída
  const [horarioEntrada, setHorarioEntrada] = useState('');
  const [horarioSaida, setHorarioSaida] = useState('');

  const [checklistOficina, setChecklistOficina] = useState({
    fluidos: false,
    filtros: false,
    freios: false,
    suspensao: false,
    bateria: false,
    iluminacao: false
  });

  const [fotosOficina, setFotosOficina] = useState<string[]>([]);

  // Financeiro
  const [formaPagamento, setFormaPagamento] = useState('DINHEIRO');
  const [numParcelas, setNumParcelas] = useState(1);
  const [diasEntreParcelas, setDiasEntreParcelas] = useState(28);
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(new Date().toISOString().split('T')[0]);

  // Peças e Serviços locais
  const [servicos, setServicos] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);

  // Buscadores
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientList, setShowClientList] = useState(false);
  const [pecaSearchQuery, setPecaSearchQuery] = useState('');
  const [pecasLoading, setPecasLoading] = useState(false);

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

  // Busca dinámica de peças com Debounce
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

  // Recupera o rascunho de nova OS Oficina ao montar o componente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('os-draft-new-oficina');
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
              if (draft.boxElevador) setBoxElevador(draft.boxElevador);
              if (draft.prioridade) setPrioridade(draft.prioridade);
              if (draft.statusElevador) setStatusElevador(draft.statusElevador);
              if (draft.tempoInterno) setTempoInterno(draft.tempoInterno);
              if (draft.horarioEntrada) setHorarioEntrada(draft.horarioEntrada);
              if (draft.horarioSaida) setHorarioSaida(draft.horarioSaida);
              if (draft.lavagem !== undefined) setLavagem(draft.lavagem);
              if (draft.testeFinal !== undefined) setTesteFinal(draft.testeFinal);
              if (draft.checklistOficina) setChecklistOficina(draft.checklistOficina);
              if (draft.formaPagamento) setFormaPagamento(draft.formaPagamento);
              if (draft.numParcelas) setNumParcelas(draft.numParcelas);
              if (draft.diasEntreParcelas) setDiasEntreParcelas(draft.diasEntreParcelas);
              if (draft.dataPrimeiraParcela) setDataPrimeiraParcela(draft.dataPrimeiraParcela);
              if (draft.fotosOficina) setFotosOficina(draft.fotosOficina);
              
              // Se tiver cliente, carregar veículos dele
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

              console.log('Rascunho de OS Oficina carregado!');
              isLoadedRef.current = true;
            }, 100);
            return;
          }
        }
      } catch (err) {
        console.error('Falha ao restaurar rascunho de nova OS Oficina:', err);
      }
      isLoadedRef.current = true;
    }
  }, []);

  // Salvar rascunho ao mudar dados relevantes
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
          boxElevador,
          prioridade,
          statusElevador,
          lavagem,
          testeFinal,
          tempoInterno,
          horarioEntrada,
          horarioSaida,
          checklistOficina,
          formaPagamento,
          numParcelas,
          diasEntreParcelas,
          dataPrimeiraParcela,
          fotosOficina
        };
        localStorage.setItem('os-draft-new-oficina', JSON.stringify(draft));
      } catch (err) {
        console.error('Erro ao salvar rascunho de nova OS Oficina:', err);
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
    boxElevador,
    prioridade,
    statusElevador,
    lavagem,
    testeFinal,
    tempoInterno,
    horarioEntrada,
    horarioSaida,
    checklistOficina,
    formaPagamento,
    numParcelas,
    diasEntreParcelas,
    dataPrimeiraParcela,
    fotosOficina
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
        setFotosOficina(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removerFoto = (index: number) => {
    setFotosOficina(prev => prev.filter((_, i) => i !== index));
  };

  const totalServicos = useMemo(() => {
    return servicos.reduce((acc, s) => acc + (parseFloat(s.valor_total) || 0), 0);
  }, [servicos]);

  const totalPecas = useMemo(() => {
    return pecas.reduce((acc, p) => acc + (parseFloat(p.valor_total) || 0), 0);
  }, [pecas]);

  const totalGeral = useMemo(() => {
    return Math.max(0, totalServicos + totalPecas - discountValue(desconto));
  }, [totalServicos, totalPecas, desconto]);

  function discountValue(val: any) {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  }

  const formatCurrency = useCallback((val: number) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  const handleSubmit = async () => {
    if (!selectedCliente || !selectedVeiculo) {
      alert('Selecione o proprietário e o veículo do atendimento.');
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
        tipoOS: 'OFICINA',
        diagnostico,
        observacoes: JSON.stringify({
          boxElevador,
          prioridade,
          statusElevador,
          lavagem,
          testeFinal,
          tempoInterno,
          checklistOficina,
          horarioEntrada,
          horarioSaida,
          fotosOficina
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
        desconto: parseFloat(discountValue(desconto) as any) || 0,
        valor_total: totalGeral,
        forma_pagamento: formaPagamento === 'BOLETO PARCELADO' ? 'PARCELADO' : formaPagamento,
        numero_parcelas: formaPagamento === 'BOLETO PARCELADO' ? numParcelas : 1,
        dias_entre_parcelas: formaPagamento === 'BOLETO PARCELADO' ? diasEntreParcelas : null,
        data_vencimento_primeira: formaPagamento === 'BOLETO PARCELADO' && dataPrimeiraParcela ? new Date(dataPrimeiraParcela).toISOString() : null,

        // Campos de Atendimento Oficina Fixos
        tipo_atendimento: 'OFICINA',
        km_saida: 0,
        km_retorno: 0,
        km_total: 0,
        valor_km: 0,
        total_deslocamento: 0
      };

      console.log("Payload Final OS (Oficina)", rawPayload);

      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawPayload)
      });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('os-draft-new-oficina');
        }
        router.push('/os');
        router.refresh();
      } else {
        const error = await res.json();
        alert(`Erro: ${error.error || 'Falha ao salvar a OS'}`);
      }
    } catch (err) { 
      alert('Erro de conexão com o banco.'); 
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-6 pb-24 animate-in fade-in duration-300">
      
      {/* HEADER DE CONTROLE */}
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
              PINHEIRO DIESEL PRO <span className="text-zinc-700">|</span> <span className="text-blue-500">Fluxo de Oficina</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] leading-none mt-1">
              Processo e Produtividade de Pátio Interno
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="px-3.5 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest font-mono">
            🏭 MODELO INTERNO ATIVO
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="hidden lg:flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:scale-95 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition shadow-lg shadow-orange-950/30 disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            SALVAR OS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* COLUNA PRINCIPAL: OPERACIONAL E SERVIÇOS (7/12) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          
          {/* CARD 1: ATIVO, PROPRIETÁRIO & AGENDAMENTO */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
              <div className="w-1.5 h-4 rounded-full bg-blue-600" />
              <div>
                <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Ativo & Proprietário</h2>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Identificação do cliente, veículo e agendamento</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Linha 1: Cliente e Veículo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pesquisar Cliente */}
                <div className="space-y-1.5 relative">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Proprietário / Cliente</label>
                    <button
                      type="button"
                      onClick={() => setIsClientModalOpen(true)}
                      className="text-[9px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition hover:underline"
                    >
                      <Plus size={11} />
                      Novo Cliente
                    </button>
                  </div>
                  <div className="relative">
                    <div 
                      onClick={() => setShowClientList(!showClientList)}
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none transition cursor-pointer flex items-center justify-between shadow-inner group hover:border-blue-500/50"
                    >
                      <span className="font-bold uppercase tracking-tight truncate mr-2 transition-colors group-hover:text-blue-400">
                        {selectedCliente?.nome || 'SELECIONAR CLIENTE...'}
                      </span>
                      <Search size={15} className="text-zinc-600 transition-colors group-hover:text-blue-500 flex-shrink-0" />
                    </div>
                    
                    {showClientList && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-3 border-b border-zinc-800">
                          <input 
                            autoFocus 
                            type="text" 
                            placeholder="FILTRAR POR NOME OU DOCUMENTO..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none font-bold uppercase tracking-wider transition focus:border-blue-500" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                          />
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                          {clientesLoading ? (
                            <div className="p-6 text-center animate-pulse">
                              <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto mb-2" />
                              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Acessando banco...</p>
                            </div>
                          ) : clientesError ? (
                            <div className="p-6 text-center text-red-400 text-xs">⚠️ Erro ao obter clientes</div>
                          ) : (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).length === 0 ? (
                            <div className="p-6 text-center text-zinc-500 text-xs">Nenhum proprietário localizado</div>
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

                {/* Vincular Veículo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Ativo em Operação</label>
                    <button
                      type="button"
                      onClick={() => setIsVehicleModalOpen(true)}
                      className="text-[9px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition hover:underline"
                    >
                      <Plus size={11} />
                      Novo Veículo / Máquina
                    </button>
                  </div>
                  <div className="relative group">
                    <select 
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-white outline-none transition font-bold uppercase cursor-pointer shadow-inner appearance-none disabled:opacity-30 focus:border-blue-500" 
                      value={selectedVeiculo?.id || ''} 
                      onChange={(e) => { const v = veiculos.find(v => v.id === e.target.value); if (v) setSelectedVeiculo(v); }} 
                      disabled={!selectedCliente}
                    >
                      <option value="">{selectedCliente ? 'SELECIONAR VEÍCULO...' : 'AGUARDANDO CLIENTE...'}</option>
                      {(veiculos || []).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.placa} • {v.marca} {v.modelo}
                        </option>
                      ))}
                    </select>
                    <Car size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none transition-colors group-hover:text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Linha 2: Mecânico e Previsão de Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Selecionar Mecânico de Pátio */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">Mecânico Responsável</label>
                  <div className="relative group">
                    <select 
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-white outline-none transition font-bold uppercase cursor-pointer shadow-inner appearance-none focus:border-blue-500" 
                      value={selectedMecanico} 
                      onChange={(e) => setSelectedMecanico(e.target.value)} 
                    >
                      <option value="">ATRIBUIR TÉCNICO RESPONSÁVEL...</option>
                      {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                    </select>
                    <Wrench size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none transition-colors group-hover:text-blue-500" />
                  </div>
                </div>

                {/* Previsão de Entrega */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">Previsão de Entrega</label>
                  <div className="relative group">
                    <input 
                      type="datetime-local" 
                      className="w-full min-h-[46px] bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-white outline-none focus:border-blue-500 transition font-mono uppercase shadow-inner cursor-pointer" 
                      value={previsao} 
                      onChange={(e) => setPrevisao(e.target.value)} 
                    />
                    <Calendar size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none transition-colors group-hover:text-blue-500" />
                  </div>
                </div>
              </div>

              {/* Histórico do Cliente (LTV) */}
              {selectedCliente && (
                <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <UserIcon size={12} className="text-zinc-500" />
                      Histórico do Proprietário
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">{selectedCliente.nome}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase block">Gasto Acumulado</span>
                      <span className="text-sm font-black text-white font-mono italic mt-0.5 block">{formatCurrency(clienteHistorico?.totalGasto || 0)}</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase block">Última OS</span>
                      <span className="text-sm font-black text-white italic mt-0.5 block">#{clienteHistorico?.ultimaOSNumero || '---'}</span>
                    </div>
                    <div className="bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60">
                      <span className="text-[8px] text-zinc-500 font-bold uppercase block">Atendimentos</span>
                      <span className="text-sm font-black text-white italic mt-0.5 block">{clienteHistorico?.totalOS || 0}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* DADOS TÉCNICOS DE PÁTIO / PATIOPRO */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    PATIOPRO • MONITORAMENTO DE BOX
                  </p>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">Gestão Operacional</span>
                </div>

                {/* Box, Estado, Prioridade, Tempo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Nº Box / Elevador</label>
                    <input 
                      type="text" 
                      placeholder="EX: BOX 03" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 transition" 
                      value={boxElevador} 
                      onChange={(e) => setBoxElevador(e.target.value.toUpperCase())} 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Estado Box</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 cursor-pointer"
                      value={statusElevador}
                      onChange={(e) => setStatusElevador(e.target.value)}
                    >
                      <option value="LIVRE">LIVRE</option>
                      <option value="OCUPADO">OCUPADO</option>
                      <option value="MANUTENCAO">MANUTENÇÃO</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Prioridade</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 cursor-pointer"
                      value={prioridade}
                      onChange={(e) => setPrioridade(e.target.value)}
                    >
                      <option value="BAIXA">BAIXA</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="ALTA">ALTA</option>
                      <option value="URGENTE">⚠️ URGENTE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Tempo Box (HH:MM)</label>
                    <input 
                      type="text" 
                      placeholder="EX: 04:30" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-blue-500 transition" 
                      value={tempoInterno} 
                      onChange={(e) => setTempoInterno(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Horários Oficina */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Horário Entrada Pátio</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white font-mono outline-none focus:border-blue-500" 
                      value={horarioEntrada} 
                      onChange={(e) => setHorarioEntrada(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-zinc-400 uppercase font-black">Horário Saída Previsto</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white font-mono outline-none focus:border-blue-500" 
                      value={horarioSaida} 
                      onChange={(e) => setHorarioSaida(e.target.value)} 
                    />
                  </div>
                </div>

                {/* Flags extras */}
                <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-zinc-900">
                  <label className="flex items-center gap-2 cursor-pointer text-xs uppercase font-bold text-zinc-300 select-none">
                    <input 
                      type="checkbox" 
                      className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4" 
                      checked={lavagem}
                      onChange={(e) => setLavagem(e.target.checked)}
                    />
                    Lavagem Chassi Concluída
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs uppercase font-bold text-zinc-300 select-none">
                    <input 
                      type="checkbox" 
                      className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0 cursor-pointer w-4 h-4" 
                      checked={testeFinal}
                      onChange={(e) => setTesteFinal(e.target.checked)}
                    />
                    Teste de Estrada / Dinamômetro
                  </label>
                </div>

                {/* Checklist de Entrada Oficina */}
                <div className="space-y-2 pt-2 border-t border-zinc-900">
                  <p className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">Checklist de Entrada Oficina</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-semibold text-zinc-300">
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition">
                      <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 w-3.5 h-3.5" checked={checklistOficina.fluidos} onChange={(e) => setChecklistOficina({ ...checklistOficina, fluidos: e.target.checked })} />
                      Nível Óleos
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition">
                      <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 w-3.5 h-3.5" checked={checklistOficina.filtros} onChange={(e) => setChecklistOficina({ ...checklistOficina, filtros: e.target.checked })} />
                      Filtros Ar/Combustível
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition">
                      <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 w-3.5 h-3.5" checked={checklistOficina.freios} onChange={(e) => setChecklistOficina({ ...checklistOficina, freios: e.target.checked })} />
                      Sist. Freios / Pneumático
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition">
                      <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 w-3.5 h-3.5" checked={checklistOficina.suspensao} onChange={(e) => setChecklistOficina({ ...checklistOficina, suspensao: e.target.checked })} />
                      Suspensão / Feixe Molas
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition">
                      <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 w-3.5 h-3.5" checked={checklistOficina.bateria} onChange={(e) => setChecklistOficina({ ...checklistOficina, bateria: e.target.checked })} />
                      Bateria / Elétrica 24V
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/60 hover:border-zinc-700 transition">
                      <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-0 w-3.5 h-3.5" checked={checklistOficina.iluminacao} onChange={(e) => setChecklistOficina({ ...checklistOficina, iluminacao: e.target.checked })} />
                      Iluminação / Sinalização
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CARD 2: DIAGNÓSTICO E QUEIXA TÉCNICA (DEFEITO RECLAMADO) */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 space-y-3 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <FileText size={16} className="text-orange-500" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Diagnóstico & Defeito Reclamado</h2>
            </div>
            <textarea 
              placeholder="DESCREVA OS VÍCIOS APRESENTADOS, AVALIAÇÃO PRELIMINAR, ANÁLISE DE CÓDIGOS DE FALHA (DTC) E SERVIÇOS SOLICITADOS PELO CLIENTE..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-blue-500 transition font-medium tracking-wide shadow-inner h-28 resize-none placeholder:text-zinc-650 leading-relaxed uppercase" 
              value={diagnostico} 
              onChange={(e) => setDiagnostico(e.target.value)} 
            />
          </section>

          {/* CARD 3: MÃO DE OBRA E PROCEDIMENTOS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-6 sm:p-7 border-b border-zinc-800 bg-zinc-950/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-blue-500 shadow-inner">
                  <Tool size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Mão de Obra e Procedimentos</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Serviços técnicos e tempo de execução</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={addServico} 
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-lg active:scale-95 cursor-pointer"
              >
                <Plus size={16} />
                <span>Adicionar Serviço</span>
              </button>
            </div>

            {/* Lista de Serviços */}
            <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
              {servicos.map((servico) => (
                <div key={servico.id} className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-3">
                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => updateServico(servico.id, 'tipo_cobranca', 'HORA')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          servico.tipo_cobranca === 'HORA' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        Por Hora
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateServico(servico.id, 'tipo_cobranca', 'PACOTE')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                          servico.tipo_cobranca === 'PACOTE' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                        }`}
                      >
                        Tabela Fechada
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
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Natureza do Serviço</label>
                    <input 
                      type="text" 
                      placeholder="EX: RETÍFICA DE CABEÇOTE, TROCA DE EMBREAGEM..." 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 text-xs text-white outline-none focus:border-blue-500 font-bold uppercase transition" 
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
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono font-bold transition text-right tabular-nums"
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
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Valor Hora (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono font-bold transition text-right tabular-nums"
                          value={servico.valor_hora}
                          onChange={(e) => updateServico(servico.id, 'valor_hora', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Preço Pacote (R$)</label>
                      <input 
                        type="number" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono font-bold transition text-right tabular-nums"
                        value={servico.valor_pacote}
                        onChange={(e) => updateServico(servico.id, 'valor_pacote', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-900/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Subtotal do Procedimento:</span>
                    <span className="text-xs text-green-400 font-black font-mono">{formatCurrency(servico.valor_total)}</span>
                  </div>
                </div>
              ))}
              
              {servicos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 opacity-30 space-y-2">
                  <Tool size={40} className="text-zinc-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Nenhum serviço adicionado ainda</p>
                </div>
              )}
            </div>

            {/* Rodapé da Caixa de Serviços */}
            <div className="p-5 sm:p-6 border-t border-zinc-800 bg-zinc-950/40 flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Total de Mão de Obra</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase">{servicos.length} procedimento(s) listado(s)</p>
              </div>
              <p className="text-xl font-black text-white italic font-mono">{formatCurrency(totalServicos)}</p>
            </div>
          </section>

          {/* CARD 4: FOTOS DE EVIDÊNCIA */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-black text-white uppercase italic tracking-tight">Galeria de Evidências (Fotos)</h4>
              <span className="text-[10px] font-bold text-zinc-500 uppercase font-mono">{fotosOficina.length} imagem(ns)</span>
            </div>
            
            <div className="space-y-4">
              <label className="w-full p-6 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-800 hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                <span className="text-2xl">📸</span>
                <span className="text-xs font-black text-white uppercase tracking-wider mt-1.5">Anexar Fotos do Pátio</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">Clique ou arraste imagens do veículo ou peças danificadas</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFotoChange} />
              </label>
              
              {fotosOficina.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                  {fotosOficina.map((foto, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 group">
                      <img src={foto} alt={`oficina-${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removerFoto(idx)} 
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg"
                        title="Remover foto"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* COLUNA LATERAL: INSUMOS, FINANCEIRO & FINALIZAÇÃO (5/12) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          
          {/* CARD 1: INSUMOS & REPOSIÇÃO (ALMOXARIFADO) */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div>
                <h4 className="text-sm font-black text-white uppercase italic tracking-tight">Insumos & Reposição</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Peças requisitadas do estoque</p>
              </div>
              <Package size={18} className="text-blue-500" />
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={15} />
                <input 
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-11 pr-10 text-xs text-white font-bold uppercase tracking-wider outline-none focus:border-blue-500 transition shadow-inner placeholder:text-zinc-600"
                  placeholder="CONSULTAR PEÇA POR CÓDIGO OU NOME..."
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
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}

                {/* Dropdown de Busca */}
                {pecaSearchQuery && pecaSearchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {pecasLoading ? (
                      <div className="p-5 text-center text-zinc-400 text-xs">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-auto mb-2" />
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

              {/* Peças vinculadas */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pt-1">
                {pecas.map(peca => (
                  <div key={peca.id} className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 flex items-center justify-between gap-3 border-l-4 border-l-blue-600/50 hover:border-l-blue-500 transition-all">
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
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Nenhum insumo vinculado</p>
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

          {/* CARD 2: LIQUIDAÇÃO FINANCEIRA */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl md:rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-3">
              <FileText size={16} className="text-green-500" />
              <div>
                <h3 className="text-sm font-black text-white uppercase italic tracking-tight">Liquidação Financeira</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Fechamento de valores e cobrança</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-3.5 shadow-inner">
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Mão de Obra</span>
                <span className="text-white font-mono font-bold">{formatCurrency(totalServicos)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-400 font-semibold uppercase">
                <span>Insumos Almoxarifado</span>
                <span className="text-white font-mono font-bold">{formatCurrency(totalPecas)}</span>
              </div>
              
              {/* Desconto */}
              <div className="space-y-1 pt-1 border-t border-zinc-900">
                <label className="text-[10px] text-zinc-400 uppercase font-black">Conceder Desconto (R$)</label>
                <input 
                  type="number" 
                  step="any"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 px-3 text-xs text-white font-mono outline-none text-right focus:border-blue-500 transition" 
                  value={desconto || ''} 
                  placeholder="0,00"
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} 
                />
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1 pt-2 border-t border-zinc-900">
                <label className="text-[10px] text-zinc-400 uppercase font-black">Condição de Pagamento</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => {
                    setFormaPagamento(e.target.value);
                    if (e.target.value === 'BOLETO PARCELADO' && numParcelas < 2) setNumParcelas(3);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 transition shadow-inner cursor-pointer"
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
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Data 1º Vencimento</label>
                    <input 
                      type="date"
                      value={dataPrimeiraParcela}
                      onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  {/* Simulação rápida de parcelas */}
                  <div className="pt-2 max-h-36 overflow-y-auto custom-scrollbar space-y-1 border-t border-zinc-900">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                      Parcelas Simuladas ({numParcelas}x de {formatCurrency(totalGeral / numParcelas)})
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
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider block">Consolidado Geral</span>
                  <span className="text-[9px] text-zinc-500 uppercase">Líquido a faturar</span>
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
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-xl shadow-orange-950/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                PROTOCOLAR OS OFICINA
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
    </div>
  );
}
