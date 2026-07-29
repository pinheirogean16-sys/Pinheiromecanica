'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User as UserIcon, Car, Wrench, Package, 
  Search, ChevronLeft, Clock, FileText, Trash2, Plus,
  PenTool as Tool, Loader2, Save, Calendar, Check
} from 'lucide-react';
import Link from 'next/link';
import { parseHoras } from '@/lib/utils';
import { obterUnidadesCompativeis, converterUnidade } from '@/lib/unidades';

interface WorkOrderOfficeProps {
  onBack: () => void;
}

export default function WorkOrderOffice({ onBack }: WorkOrderOfficeProps) {
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
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 md:px-6 space-y-8 pb-20 overflow-hidden animate-in fade-in duration-300">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic flex items-center gap-2">
              PINHEIRO DIESEL PRO <span className="text-zinc-700">|</span> <span className="text-blue-500">Fluxo de Oficina</span>
            </h1>
            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.3em] leading-none mt-1">PROCESSO E PRODUTIVIDADE DE PÁTIO INTERNO</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest font-mono">
            🏭 MODELO INTERNO ATIVO
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA 1: IDENTIFICAÇÃO E PROPRIEDADES (Tamanho 3/12) */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
              <div className="w-1.5 h-4 rounded-full bg-blue-600" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Ativo & Proprietário</h2>
            </div>
            
            <div className="space-y-6">
              {/* Pesquisar Cliente */}
              <div className="space-y-2 relative">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Localizar Proprietário</label>
                <div className="relative">
                  <div 
                    onClick={() => setShowClientList(!showClientList)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none transition cursor-pointer flex items-center justify-between shadow-inner group hover:border-blue-500/30"
                  >
                    <span className="font-bold uppercase tracking-tight transition-colors group-hover:text-blue-500">
                      {selectedCliente?.nome || 'BUSCAR NO BANCO...'}
                    </span>
                    <Search size={14} className="text-zinc-700 transition-colors group-hover:text-blue-500" />
                  </div>
                  
                  {showClientList && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="p-4 border-b border-zinc-800">
                        <input 
                          autoFocus 
                          type="text" 
                          placeholder="FILTRAR POR NOME OU DOCUMENTO..." 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none font-bold uppercase tracking-widest transition focus:border-blue-500" 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                      </div>
                      <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {clientesLoading ? (
                           <div className="p-8 text-center animate-pulse">
                             <Loader2 className="w-6 h-6 text-blue-500 animate-spin mx-auto mb-2" />
                             <p className="text-[10px] text-zinc-500">Acessando banco...</p>
                           </div>
                        ) : clientesError ? (
                           <div className="p-8 text-center text-red-400 text-xs">⚠️ Erro ao obter clientes</div>
                        ) : (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).length === 0 ? (
                           <div className="p-8 text-center text-zinc-500 text-xs">Nenhum proprietário localizado</div>
                        ) : (
                          (clientes || []).filter(c => c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || c.cpf_cnpj?.includes(searchTerm)).map(c => (
                            <button 
                              key={c.id} 
                              type="button"
                              onClick={() => { handleClienteChange(c.id); setShowClientList(false); setSearchTerm(''); }} 
                              className="w-full p-5 text-left text-xs font-black uppercase text-zinc-500 hover:bg-zinc-800 hover:text-white transition-all border-b border-zinc-800/50 last:border-0 italic"
                            >
                              {c.nome} <span className="text-[9px] text-zinc-700 ml-2 font-mono tracking-tighter">({c.cpf_cnpj})</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Vincular Veículo */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Ativo em Operação</label>
                <div className="relative group">
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-10 text-xs text-white outline-none transition font-black uppercase tracking-widest cursor-pointer shadow-inner appearance-none disabled:opacity-20 focus:border-blue-500" 
                    value={selectedVeiculo?.id || ''} 
                    onChange={(e) => { const v = veiculos.find(v => v.id === e.target.value); if (v) setSelectedVeiculo(v); }} 
                    disabled={!selectedCliente}
                  >
                    <option value="">SELECIONAR VEÍCULO...</option>
                    {(veiculos || []).map(v => <option key={v.id} value={v.id}>{v.placa} • {v.modelo}</option>)}
                  </select>
                  <Car size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none transition-colors group-hover:text-blue-500" />
                </div>
              </div>

              {/* Selecionar Mecânico de Pátio */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Mecânico Responsável</label>
                <div className="relative group">
                  <select 
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-10 text-xs text-white outline-none transition font-black uppercase tracking-widest cursor-pointer shadow-inner appearance-none focus:border-blue-500" 
                    value={selectedMecanico} 
                    onChange={(e) => setSelectedMecanico(e.target.value)}
                  >
                    <option value="">ATRIBUIR TÉCNICO...</option>
                    {mecanicos.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                  </select>
                  <Wrench size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none transition-colors group-hover:text-blue-500" />
                </div>
              </div>

              {/* Dados Técnicos Decorativos de Oficina */}
              <div className="bg-zinc-950/80 border border-zinc-805 rounded-[1.8rem] p-6 space-y-5 shadow-inner">
                <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                   <p className="text-[9px] font-black text-white uppercase tracking-widest">PATIOPRO MONITOR</p>
                </div>

                {/* Box do Elevador */}
                <div className="space-y-1">
                  <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Nº Box / Elevador</label>
                  <input 
                    type="text" 
                    placeholder="EX: LIFT 3 / BOX PESADO..." 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white font-black uppercase outline-none focus:border-blue-500 transition" 
                    value={boxElevador} 
                    onChange={(e) => setBoxElevador(e.target.value)} 
                  />
                </div>

                {/* Status elevador e prioridade */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Estado Box</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none"
                      value={statusElevador}
                      onChange={(e) => setStatusElevador(e.target.value)}
                    >
                      <option value="LIVRE">LIVRE</option>
                      <option value="OCUPADO">OCUPADO</option>
                      <option value="MANUTENCAO">MANUTENÇÃO</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Prioridade</label>
                    <select 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-[10px] text-white font-bold uppercase outline-none"
                      value={prioridade}
                      onChange={(e) => setPrioridade(e.target.value)}
                    >
                      <option value="BAIXA">BAIXA</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="ALTA">ALTA</option>
                      <option value="URGENTE">⚠️ URGENTE</option>
                    </select>
                  </div>
                </div>

                {/* Horários Oficina */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Horário Entrada</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 px-3 text-[9px] text-white font-mono outline-none focus:border-blue-500" 
                      value={horarioEntrada} 
                      onChange={(e) => setHorarioEntrada(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Horário Saída</label>
                    <input 
                      type="datetime-local" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 px-3 text-[9px] text-white font-mono outline-none focus:border-blue-500" 
                      value={horarioSaida} 
                      onChange={(e) => setHorarioSaida(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Tempo Interno (HH:MM)</label>
                   <input 
                     type="text" 
                     placeholder="EX: 04:30" 
                     className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-blue-500" 
                     value={tempoInterno} 
                     onChange={(e) => setTempoInterno(e.target.value)} 
                   />
                </div>

                {/* Flags extras */}
                <div className="flex items-center gap-4 pt-1">
                   <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase font-bold text-zinc-400 select-none">
                     <input 
                       type="checkbox" 
                       className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0 cursor-pointer" 
                       checked={lavagem}
                       onChange={(e) => setLavagem(e.target.checked)}
                     />
                     Lavagem ok
                   </label>
                   <label className="flex items-center gap-2 cursor-pointer text-[10px] uppercase font-bold text-zinc-400 select-none">
                     <input 
                       type="checkbox" 
                       className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0 cursor-pointer" 
                       checked={testeFinal}
                       onChange={(e) => setTesteFinal(e.target.checked)}
                     />
                     Teste Estrada
                   </label>
                </div>

                {/* Checklist de Oficina */}
                <div className="space-y-2 pt-3 border-t border-zinc-900">
                   <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest">Checklist de Entrada Oficina</p>
                   <div className="grid grid-cols-2 gap-2 text-[9px] font-semibold text-zinc-400">
                      <label className="flex items-center gap-1.5 cursor-pointer leading-none">
                        <input type="checkbox" className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0" checked={checklistOficina.fluidos} onChange={(e) => setChecklistOficina({ ...checklistOficina, fluidos: e.target.checked })} />
                        Nível Óleos
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer leading-none">
                        <input type="checkbox" className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0" checked={checklistOficina.filtros} onChange={(e) => setChecklistOficina({ ...checklistOficina, filtros: e.target.checked })} />
                        Filtros Ar
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer leading-none">
                        <input type="checkbox" className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0" checked={checklistOficina.freios} onChange={(e) => setChecklistOficina({ ...checklistOficina, freios: e.target.checked })} />
                        Sist. Freios
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer leading-none">
                        <input type="checkbox" className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0" checked={checklistOficina.suspensao} onChange={(e) => setChecklistOficina({ ...checklistOficina, suspensao: e.target.checked })} />
                        Suspensão
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer leading-none">
                        <input type="checkbox" className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0" checked={checklistOficina.bateria} onChange={(e) => setChecklistOficina({ ...checklistOficina, bateria: e.target.checked })} />
                        Bateria 24V
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer leading-none">
                        <input type="checkbox" className="rounded bg-zinc-900 border-zinc-800 text-blue-600 focus:ring-0" checked={checklistOficina.iluminacao} onChange={(e) => setChecklistOficina({ ...checklistOficina, iluminacao: e.target.checked })} />
                        Iluminação
                      </label>
                   </div>
                </div>
              </div>

              {/* Histórico do Cliente */}
              {selectedCliente && (
                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-[2rem] space-y-6 shadow-inner relative overflow-hidden">
                   <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Histórico LTV</p>
                      <UserIcon size={12} className="text-zinc-700" />
                   </div>
                   <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] text-zinc-650 font-black uppercase tracking-widest leading-none">Gasto Acumulado</span>
                      <span className="text-xl font-black text-white font-mono italic tracking-tighter">{formatCurrency(clienteHistorico?.totalGasto || 0)}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-850">
                         <span className="text-[8px] text-zinc-650 font-black uppercase">Última OS</span>
                         <span className="block text-xs font-black text-white italic mt-1">#{clienteHistorico?.ultimaOSNumero || '---'}</span>
                      </div>
                      <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-850">
                         <span className="text-[8px] text-zinc-650 font-black uppercase">Atendimentos</span>
                         <span className="block text-xs font-black text-white italic mt-1">{clienteHistorico?.totalOS || 0}</span>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* COLUNA 2: MÃO DE OBRA E CRONOGRAMA DE TRABALHOS (Tamanho 5/12) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl flex flex-col min-h-[500px]">
            <div className="p-8 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-blue-500 shadow-inner">
                  <Tool size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Mão de Obra e Procedimentos</h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Instruções e Tempo Técnico</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={addServico} 
                className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition shadow-lg active:scale-95 group cursor-pointer"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            {/* Serviços Items sem scroll estourando o container */}
            <div className="flex-1 overflow-y-auto max-h-[600px] p-6 space-y-4 custom-scrollbar">
              {servicos.map((servico) => (
                <div key={servico.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 group relative space-y-4 hover:border-blue-500/30 transition-all">
                  <button 
                    type="button"
                    onClick={() => removeServico(servico.id)} 
                    className="absolute -top-2 -right-2 w-7 h-7 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all shadow-xl z-20 hover:scale-110 active:scale-90"
                  >
                    <Trash2 size={14} />
                  </button>
                  
                  {/* Tipo de Cobrança */}
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => updateServico(servico.id, 'tipo_cobranca', 'HORA')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition ${
                        servico.tipo_cobranca === 'HORA' 
                          ? 'bg-blue-600 text-white font-black' 
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800/80'
                      }`}
                    >
                      Por Hora
                    </button>
                    <button 
                      type="button"
                      onClick={() => updateServico(servico.id, 'tipo_cobranca', 'PACOTE')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition ${
                        servico.tipo_cobranca === 'PACOTE' 
                          ? 'bg-blue-600 text-white font-black' 
                          : 'bg-zinc-900 text-zinc-500 border border-zinc-800/80'
                      }`}
                    >
                      Tabela Fechada
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest px-1">Natureza do Serviço</label>
                    <input 
                      type="text" 
                      placeholder="EX: RETÍFICA DE CABEÇOTE..." 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-black uppercase tracking-widest transition shadow-inner placeholder:text-zinc-800" 
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
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono font-black transition text-right tabular-nums shadow-inner"
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
                        <label className="text-[9px] font-black text-zinc-655 uppercase tracking-widest text-right block">Valor/Hora (R$)</label>
                        <input 
                          type="number" 
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono font-black transition text-right tabular-nums shadow-inner"
                          value={servico.valor_hora}
                          onChange={(e) => updateServico(servico.id, 'valor_hora', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-650 uppercase tracking-widest text-right block">Preço Pacote (R$)</label>
                      <input 
                        type="number" 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-blue-500 font-mono font-black transition text-right tabular-nums shadow-inner"
                        value={servico.valor_pacote}
                        onChange={(e) => updateServico(servico.id, 'valor_pacote', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  <div className="text-right text-xs text-green-400 font-black font-mono italic">
                    SUBTOTAL: {formatCurrency(servico.valor_total)}
                  </div>
                </div>
              ))}
              
              {servicos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 opacity-10 space-y-4 italic">
                  <Tool size={60} className="text-zinc-600" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">Nossa Mão de Obra está vazia</p>
                </div>
              )}
            </div>

            {/* Rodapé Interno da Caixa de Serviços */}
            <div className="p-8 border-t border-zinc-800 bg-zinc-950/20">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] italic">Serviços Totais</p>
                  <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">{servicos.length} de Oficina</p>
                </div>
                <p className="text-xl font-black text-white italic font-mono">{formatCurrency(totalServicos)}</p>
              </div>
            </div>
          </section>
        </div>

        {/* COLUNA 3: ALMOXARIFADO, RESUMO E SALVAMENTO (Tamanho 4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* PAINEL DE INSUMOS & REPOSIÇÃO (Estoque de Peças) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-xs font-black text-white uppercase italic tracking-tighter">Insumos & Reposição</h4>
                <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest leading-none mt-1">Requisição Almoxarifado Direto</p>
              </div>
              <Package size={16} className="text-zinc-700" />
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-blue-500 transition-colors" size={14} />
                <input 
                  type="text"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-10 text-[10px] text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition shadow-inner placeholder:text-zinc-800"
                  placeholder="CONSULTAR PEÇA POR NOME..."
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
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}

                {/* Resultado Busca de Peças */}
                {pecaSearchQuery && pecaSearchQuery.trim().length >= 2 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-3 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                    {pecasLoading ? (
                      <div className="p-6 text-center text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin mx-auto mb-2" />
                        Acessando Prateleiras...
                      </div>
                    ) : availablePecas.length === 0 ? (
                      <div className="p-6 text-center text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                        Sem resultados no estoque
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
                            <span className="text-[8px] text-zinc-650 font-mono font-bold tracking-widest mt-1 uppercase">CÓD: {p.codigo || 'S/ CÓD'} • DISP: {p.quantidade} {p.unidadeMedida || 'un'}</span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-green-500">{formatCurrency(p.preco_venda)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Peças vinculadas no estado */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pt-2">
                {pecas.map(peca => (
                  <div key={peca.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-blue-600/30 hover:border-l-blue-500 transition-all">
                    <div className="flex-1 mr-2 min-w-0">
                      <p className="text-[10px] font-black text-white uppercase italic truncate">{peca.descricao}</p>
                      <p className="text-[8px] text-zinc-600 font-mono mt-0.5 font-bold">UNIT: {formatCurrency(peca.valor_unit)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
                        <input 
                          type="number" 
                          step="any" 
                          className="w-10 bg-transparent text-white text-[10px] font-mono font-black text-center outline-none p-0 focus:ring-0" 
                          value={peca.quantidade} 
                          onChange={(e) => updatePeca(peca.id, 'quantidade', parseFloat(e.target.value) || 0)} 
                        />
                        <select 
                          className="bg-zinc-900 text-zinc-500 text-[8px] font-black uppercase outline-none cursor-pointer p-0 border-0 focus:text-white"
                          value={peca.unidade || 'un'} 
                          onChange={(e) => updatePeca(peca.id, 'unidade', e.target.value)}
                        >
                          {(peca.compativeis && peca.compativeis.length > 0 ? peca.compativeis : [{ sigla: peca.unidade || 'un' }]).map((u: any) => (
                            <option key={u.sigla} value={u.sigla} className="bg-zinc-950 text-white text-[8px] uppercase">{u.sigla}</option>
                          ))}
                        </select>
                      </div>
                      <button type="button" onClick={() => removePeca(peca.id)} className="text-zinc-700 hover:text-red-500 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                
                {pecas.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-10 border border-dashed border-zinc-800 rounded-2xl italic space-y-1">
                    <Package size={30} className="text-zinc-600" />
                    <p className="text-[8px] font-black uppercase tracking-widest text-center mt-1">Sem insumos vinculados</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FOTOS DE COMPROVAÇÃO DE TRABALHOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <h4 className="text-xs font-black text-white uppercase italic tracking-tighter mb-4">Galeria de Evidências (Fotos)</h4>
            <div className="flex flex-col gap-3">
              <label className="w-full p-4 bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition">
                <span className="text-xl">📸</span>
                <span className="text-[9px] font-black text-white uppercase tracking-widest mt-1">Vincular Imagens</span>
                <span className="text-[8px] text-zinc-600 mt-0.5 lowercase">& Arraste fotos</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFotoChange} />
              </label>
              
              {fotosOficina.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {fotosOficina.map((foto, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group">
                      <img src={foto} alt={`oficina-${idx}`} className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removerFoto(idx)} 
                        className="absolute top-1 right-1 bg-red-650 hover:bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-lg"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* DIAGNÓSTICO E TRIAGEM */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic px-1">Instruções de Diagnóstico / Reclamação</label>
            <textarea 
              placeholder="DESCREVA OS VÍCIOS APRESENTADOS, AVALIAÇÃO PRELIMINAR E RECURSOS TÉCNICOS NECESSÁRIOS..." 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-[10px] text-white outline-none focus:border-zinc-700 transition font-bold uppercase tracking-widest shadow-inner h-28 resize-none placeholder:text-zinc-800 leading-relaxed" 
              value={diagnostico} 
              onChange={(e) => setDiagnostico(e.target.value)} 
            />
          </div>

          {/* LIQUIDAÇÃO FINANCEIRA */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-green-500 shadow-inner">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase italic tracking-tighter">Liquidação Financeira</h3>
                <p className="text-[9px] text-zinc-650 font-bold uppercase tracking-widest">Resumo Consolidado</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 rounded-[1.8rem] p-6 space-y-4 shadow-inner">
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Insumos Almoxarifado</span>
                <span className="text-white font-mono">{formatCurrency(totalPecas)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest italic">
                <span>Mão de Obra</span>
                <span className="text-white font-mono">{formatCurrency(totalServicos)}</span>
              </div>
              
              {/* Descontos aplicados */}
              <div className="space-y-1">
                <label className="text-[8px] text-zinc-650 uppercase font-black tracking-widest">Desconto direto (R$)</label>
                <input 
                  type="number" 
                  step="any"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 px-3 text-xs text-white font-mono outline-none text-right focus:border-blue-500" 
                  value={desconto || ''} 
                  onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)} 
                />
              </div>

              <div className="h-px bg-zinc-900 my-1" />

              {/* Forma de Pagamento */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Condição de Pagamento</label>
                <select 
                  value={formaPagamento}
                  onChange={(e) => {
                    setFormaPagamento(e.target.value);
                    if (e.target.value === 'BOLETO PARCELADO' && numParcelas < 2) setNumParcelas(3);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white font-bold uppercase outline-none focus:border-blue-500 transition shadow-inner"
                >
                  <option value="DINHEIRO">DINHEIRO</option>
                  <option value="PIX">PIX (MÓVEL)</option>
                  <option value="CARTÃO DÉBITO">CARTÃO DÉBITO</option>
                  <option value="CARTÃO CRÉDITO">CARTÃO CRÉDITO</option>
                  <option value="BOLETO À VISTA">BOLETO À VISTA</option>
                  <option value="BOLETO PARCELADO">BOLETO PARCELADO</option>
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
                    <label className="text-[8px] font-bold text-zinc-650 uppercase">Data 1º Boleto</label>
                    <input 
                      type="date"
                      value={dataPrimeiraParcela}
                      onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  {/* Simulação rápida */}
                  <div className="pt-2 max-h-40 overflow-y-auto custom-scrollbar space-y-1.5 border-t border-zinc-900">
                    <div className="flex items-center justify-between opacity-50 text-[8px] uppercase tracking-widest mb-1">
                      <span>Parcelas simuladas</span>
                      <span>Valor: {formatCurrency(totalGeral / numParcelas)}</span>
                    </div>
                    {Array.from({ length: numParcelas }).map((_, i) => {
                      const dt = new Date(dataPrimeiraParcela);
                      dt.setDate(dt.getDate() + (i * diasEntreParcelas));
                      return (
                        <div key={i} className="flex justify-between items-center text-[9px] font-mono text-zinc-400 bg-zinc-900/30 p-2 rounded-xl">
                          <span className="text-zinc-600 font-bold">P {i + 1}/{numParcelas}</span>
                          <span>{dt.toLocaleDateString('pt-BR')}</span>
                          <span className="text-white font-black">{formatCurrency(totalGeral / numParcelas)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="h-px bg-zinc-900 my-1" />
              
              <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Consolidado Geral</span>
                <span className="text-3xl font-black text-white italic font-mono leading-none tracking-tighter tabular-nums">{formatCurrency(totalGeral)}</span>
              </div>
            </div>

            {/* Previsão de Entrega */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Previsão Entrega do Veículo</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 font-mono pointer-events-none" size={14} />
                <input 
                  type="datetime-local" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs text-white outline-none focus:border-blue-550 transition font-black uppercase tracking-widest shadow-inner cursor-pointer" 
                  value={previsao} 
                  onChange={(e) => setPrevisao(e.target.value)} 
                />
              </div>
            </div>

            {/* Ação salvar */}
            <button 
              type="button"
              onClick={handleSubmit} 
              disabled={loading} 
              className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 italic cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
              PROTOCOLAR OS OFICINA
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
