'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Plus, Trash2, Printer, Terminal, Package } from 'lucide-react';
import Link from 'next/link';

export default function NovaOrdemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [pecas, setPecas] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    clienteId: '',
    veiculoId: '',
    mecanicoId: '',
    diagnostico: '',
    data_previsao: '',
    status: 'ABERTA'
  });

  const [servicos, setServicos] = useState<any[]>([]);
  const [pecasAplicadas, setPecasAplicadas] = useState<any[]>([]);

  const fetchClientes = useCallback(async () => {
    try {
      const res = await fetch('/api/clientes');
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  }, []);

  const fetchMecanicos = useCallback(async () => {
    try {
      const res = await fetch('/api/usuarios?role=MECANICO');
      const data = await res.json();
      setMecanicos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar mecânicos:', error);
    }
  }, []);

  const fetchPecas = useCallback(async () => {
    try {
      const res = await fetch('/api/pecas');
      const data = await res.json();
      setPecas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchClientes(), fetchMecanicos(), fetchPecas()]);
    };
    init();
  }, [fetchClientes, fetchMecanicos, fetchPecas]);

  const fetchVeiculosByCliente = useCallback(async (clienteId: string) => {
    try {
      const res = await fetch(`/api/clientes/${clienteId}/veiculos`);
      const data = await res.json();
      setVeiculos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao buscar veículos:', error);
    }
  }, []);

  const handleClienteChange = (clienteId: string) => {
    setFormData({ ...formData, clienteId, veiculoId: '' });
    if (clienteId) {
      fetchVeiculosByCliente(clienteId);
    } else {
      setVeiculos([]);
    }
  };

  const addServico = () => {
    setServicos([...servicos, { descricao: '', horas: 1, valor_hora: 150, valor_total: 150 }]);
  };

  const removeServico = (index: number) => {
    setServicos(servicos.filter((_, i) => i !== index));
  };

  const updateServico = (index: number, field: string, value: any) => {
    const updated = [...servicos];
    updated[index][field] = value;
    if (field === 'horas' || field === 'valor_hora') {
      updated[index].valor_total = (updated[index].horas || 0) * (updated[index].valor_hora || 0);
    }
    setServicos(updated);
  };

  const addPeca = () => {
    setPecasAplicadas([...pecasAplicadas, { pecaId: '', quantidade: 1, valor_unit: 0, valor_total: 0 }]);
  };

  const removePeca = (index: number) => {
    setPecasAplicadas(pecasAplicadas.filter((_, i) => i !== index));
  };

  const updatePeca = (index: number, field: string, value: any) => {
    const updated = [...pecasAplicadas];
    updated[index][field] = value;
    if (field === 'pecaId') {
      const peca = pecas.find(p => p.id === value);
      if (peca) {
        updated[index].valor_unit = peca.preco_venda;
        updated[index].valor_total = updated[index].quantidade * peca.preco_venda;
      }
    }
    if (field === 'quantidade') {
      const peca = pecas.find(p => p.id === updated[index].pecaId);
      if (peca) {
        updated[index].valor_total = value * peca.preco_venda;
      }
    }
    setPecasAplicadas(updated);
  };

  const calcularTotal = () => {
    const totalServicos = servicos.reduce((acc, s) => acc + (s.valor_total || 0), 0);
    const totalPecas = pecasAplicadas.reduce((acc, p) => acc + (p.valor_total || 0), 0);
    return totalServicos + totalPecas;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clienteId || !formData.veiculoId) {
      alert('Favor selecionar cliente e veículo.');
      return;
    }
    setLoading(true);
    
    try {
      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          servicos,
          pecas: pecasAplicadas
        })
      });
      
      if (res.ok) {
        router.push('/os');
      } else {
        const errorData = await res.json();
        alert('Erro ao criar OS: ' + (errorData.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao criar OS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/os">
            <button className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center hover:bg-zinc-800 transition-all shadow-lg text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              Nova Ordem de Serviço
            </h2>
            <p className="text-zinc-500 text-xs font-mono uppercase tracking-[0.2em] mt-1">Sessão: OS_INIT_{new Date().getTime().toString().slice(-6)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card Principal: Dados da OS */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 lg:p-8 space-y-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest font-black">Proprietário / Cliente</label>
              <select
                value={formData.clienteId}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
                required
              >
                <option value="">Selecione o Cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} ({c.cpf_cnpj})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest font-black">Veículo Vinculado</label>
              <select
                value={formData.veiculoId}
                onChange={(e) => setFormData({ ...formData, veiculoId: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer disabled:opacity-30"
                required
                disabled={!formData.clienteId}
              >
                <option value="">Selecione o Veículo</option>
                {veiculos.map(v => (
                  <option key={v.id} value={v.id}>[{v.placa}] {v.modelo}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest font-black">Técnico Responsável</label>
              <select
                value={formData.mecanicoId}
                onChange={(e) => setFormData({ ...formData, mecanicoId: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-zinc-300 focus:border-orange-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">A Definir / Pendente</option>
                {mecanicos.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest font-black">Meta de Entrega (Previsão)</label>
              <input
                type="date"
                value={formData.data_previsao}
                onChange={(e) => setFormData({ ...formData, data_previsao: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white focus:border-orange-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest font-black">Diagnóstico Preliminar e Queixas</label>
            <textarea
              value={formData.diagnostico}
              onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
              rows={4}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white resize-none focus:border-orange-500 outline-none transition-all"
              placeholder="Descreva detalhadamente os sintomas reportados ou diagnóstico inicial..."
            />
          </div>
        </div>

        {/* Seção de Serviços */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              Mão de Obra e Serviços
            </h3>
            <button 
              type="button" 
              onClick={addServico} 
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-zinc-700"
            >
              <Plus className="w-3 h-3" /> Novo Item
            </button>
          </div>
          
          <div className="space-y-4">
            {servicos.length === 0 && (
              <p className="text-center py-8 text-zinc-600 font-mono text-xs uppercase tracking-widest">Nenhum serviço registrado</p>
            )}
            {servicos.map((s, i) => (
              <div key={i} className="flex flex-col lg:flex-row gap-4 items-end bg-zinc-950/30 p-4 rounded-2xl border border-zinc-800/50">
                <div className="flex-1 space-y-1 w-full">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase">Descrição do Serviço</label>
                  <input
                    type="text"
                    placeholder="Ex: Revisão de Bicos Injetores"
                    value={s.descricao}
                    onChange={(e) => updateServico(i, 'descricao', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-orange-500 outline-none"
                    required
                  />
                </div>
                <div className="w-full lg:w-24 space-y-1">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase text-center block">Qtd (Hrs)</label>
                  <input
                    type="number"
                    value={s.horas}
                    onChange={(e) => updateServico(i, 'horas', parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-center text-white focus:border-orange-500 outline-none"
                    step="0.5"
                    required
                  />
                </div>
                <div className="w-full lg:w-32 space-y-1">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase text-center block">Vlr/Hora (R$)</label>
                  <input
                    type="number"
                    value={s.valor_hora}
                    onChange={(e) => updateServico(i, 'valor_hora', parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-center text-white focus:border-orange-500 outline-none"
                    required
                  />
                </div>
                <div className="w-full lg:w-32 space-y-1 text-center">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase block">Subtotal</label>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-400">
                    R$ {(s.valor_total || 0).toFixed(2)}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => removeServico(i)} 
                  className="p-3 bg-zinc-900 hover:bg-red-950/20 text-zinc-500 hover:text-red-500 rounded-xl transition border border-zinc-800"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Seção de Peças */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Peças Aplicadas e Peças
            </h3>
            <button 
              type="button" 
              onClick={addPeca} 
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-zinc-700"
            >
              <Plus className="w-3 h-3" /> Requisitar Peça
            </button>
          </div>
          
          <div className="space-y-4">
            {pecasAplicadas.length === 0 && (
              <p className="text-center py-8 text-zinc-600 font-mono text-xs uppercase tracking-widest">Nenhuma peça aplicada</p>
            )}
            {pecasAplicadas.map((p, i) => (
              <div key={i} className="flex flex-col lg:flex-row gap-4 items-end bg-zinc-950/30 p-4 rounded-2xl border border-zinc-800/50">
                <div className="flex-1 space-y-1 w-full">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase">Localizar por SKU / Descrição</label>
                  <select
                    value={p.pecaId}
                    onChange={(e) => updatePeca(i, 'pecaId', e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:text-white focus:border-orange-500 outline-none"
                    required
                  >
                    <option value="">Selecione a Peça no Estoque</option>
                    {pecas.map(pec => (
                      <option key={pec.id} value={pec.id}>
                        {pec.codigo} - {pec.descricao} (Disponível: {pec.quantidade} un)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full lg:w-24 space-y-1">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase text-center block">Qtd</label>
                  <input
                    type="number"
                    value={p.quantidade}
                    onChange={(e) => updatePeca(i, 'quantidade', parseInt(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-center text-white focus:border-orange-500 outline-none"
                    min="1"
                    required
                  />
                </div>
                <div className="w-full lg:w-32 space-y-1 text-center">
                  <label className="text-[9px] font-mono text-zinc-600 uppercase block">Vlr Unit</label>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-zinc-400">
                    R$ {(p.valor_unit || 0).toFixed(2)}
                  </div>
                </div>
                <div className="w-full lg:w-32 space-y-1 text-center">
                  <label className="text-[9px] font-mono text-green-600 uppercase block">Total Peça</label>
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm font-bold text-green-500/80">
                    R$ {(p.valor_total || 0).toFixed(2)}
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => removePeca(i)} 
                  className="p-3 bg-zinc-900 hover:bg-red-950/20 text-zinc-500 hover:text-red-500 rounded-xl transition border border-zinc-800"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Final e Totalizador */}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-6 lg:p-8 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-600/10 border border-orange-500/20 rounded-2xl flex items-center justify-center text-orange-500">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-zinc-500 tracking-widest">Valor Consolidado</p>
                <p className="text-3xl font-black text-white">R$ {calcularTotal().toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter block">Svc: R$ {(servicos.reduce((acc, s) => acc + (s.valor_total || 0), 0)).toFixed(2)}</span>
              <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-tighter block">Pcs: R$ {(pecasAplicadas.reduce((acc, p) => acc + (p.valor_total || 0), 0)).toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="md:w-72 bg-orange-600 hover:bg-orange-500 text-white font-black py-4 rounded-3xl transition-all transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-orange-900/40 text-xs uppercase tracking-[0.2em]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Terminal className="w-4 h-4" />
                Fechar Protocolo
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
