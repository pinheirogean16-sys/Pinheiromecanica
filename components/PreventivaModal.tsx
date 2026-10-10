'use client';

import { useState } from 'react';
import { X, Wrench, Calendar, Gauge, Clock, ShieldCheck, AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PreventivaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  veiculos: any[];
  initialVeiculoId?: string;
  preventivaToEdit?: any;
}

const SERVICOS_SUGESTOES = [
  'Troca de Óleo do Motor e Filtro',
  'Troca de Filtros (Combustível, Ar e Racor)',
  'Revisão Preventiva Geral de Rodagem',
  'Inspeção do Sistema de Freios e Lonas',
  'Troca de Óleo do Diferencial e Transmissão',
  'Revisão de Caixa de Câmbio',
  'Engraxamento e Lubrificação de Chassis',
  'Revisão da Suspensão e Molas',
  'Verificação de Compressor de Ar e Válvulas',
  'Regulagem de Válvulas e Injetores Diesel',
  'Inspeção de Turbina e Intercooler',
  'Troca de Correias Dentada / Poly-V e Tensores',
  'Revisão do Sistema Hidráulico e Mangueiras'
];

export default function PreventivaModal({
  isOpen,
  onClose,
  onSuccess,
  veiculos,
  initialVeiculoId = '',
  preventivaToEdit
}: PreventivaModalProps) {
  const isEditing = !!preventivaToEdit;

  const [veiculoId, setVeiculoId] = useState(
    preventivaToEdit?.veiculo_id || initialVeiculoId || ''
  );
  const [nome, setNome] = useState(preventivaToEdit?.nome || '');
  const [servico, setServico] = useState(preventivaToEdit?.servico || '');
  const [componente, setComponente] = useState(preventivaToEdit?.componente || 'REVISAO');
  const [descricao, setDescricao] = useState(preventivaToEdit?.descricao || '');
  const [observacoes, setObservacoes] = useState(preventivaToEdit?.observacoes || '');

  // Tipo de controle: DATA, KM, HORAS ou COMBINADO
  const [tipoControle, setTipoControle] = useState<string>(
    preventivaToEdit?.tipo_controle || 'KM'
  );

  // Intervalos
  const [intervaloDias, setIntervaloDias] = useState(
    preventivaToEdit?.intervalo_dias ? String(preventivaToEdit.intervalo_dias) : ''
  );
  const [intervaloKm, setIntervaloKm] = useState(
    preventivaToEdit?.intervalo_km ? String(preventivaToEdit.intervalo_km) : ''
  );
  const [intervaloHoras, setIntervaloHoras] = useState(
    preventivaToEdit?.intervalo_horas ? String(preventivaToEdit.intervalo_horas) : ''
  );

  // Última manutenção realizada
  const [ultimaData, setUltimaData] = useState(
    preventivaToEdit?.ultima_data ? new Date(preventivaToEdit.ultima_data).toISOString().split('T')[0] : ''
  );
  const [ultimoKm, setUltimoKm] = useState(
    preventivaToEdit?.ultimo_km ? String(preventivaToEdit.ultimo_km) : ''
  );
  const [ultimoHorimetro, setUltimoHorimetro] = useState(
    preventivaToEdit?.ultimo_horimetro ? String(preventivaToEdit.ultimo_horimetro) : ''
  );

  // Próximos limites previstos
  const [proximaData, setProximaData] = useState(
    preventivaToEdit?.proxima_data || preventivaToEdit?.data_limite
      ? new Date(preventivaToEdit.proxima_data || preventivaToEdit.data_limite).toISOString().split('T')[0]
      : ''
  );
  const [proximoKm, setProximoKm] = useState(
    preventivaToEdit?.proximo_km || preventivaToEdit?.km_limite
      ? String(preventivaToEdit.proximo_km || preventivaToEdit.km_limite)
      : ''
  );
  const [proximoHorimetro, setProximoHorimetro] = useState(
    preventivaToEdit?.proximo_horimetro ? String(preventivaToEdit.proximo_horimetro) : ''
  );

  // Antecedência de alertas
  const [antecedenciaDias, setAntecedenciaDias] = useState(
    String(preventivaToEdit?.antecedencia_dias ?? 15)
  );
  const [antecedenciaKm, setAntecedenciaKm] = useState(
    String(preventivaToEdit?.antecedencia_km ?? 1500)
  );
  const [antecedenciaHoras, setAntecedenciaHoras] = useState(
    String(preventivaToEdit?.antecedencia_horas ?? 50)
  );

  const [ativo, setAtivo] = useState(preventivaToEdit?.ativo !== false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedVeiculo = veiculos.find((v) => v.id === veiculoId);
  const usaHorimetro = selectedVeiculo?.tipo === 'MAQUINA_AGRICOLA' || 
                       selectedVeiculo?.tipo === 'TRATOR' || 
                       (selectedVeiculo?.horimetro_atual !== null && selectedVeiculo?.horimetro_atual !== undefined);

  // Recalcular projeções quando intervalos ou valores base mudam
  const recalcularProjecao = () => {
    if (intervaloDias) {
      const base = ultimaData ? new Date(ultimaData) : new Date();
      base.setDate(base.getDate() + Number(intervaloDias));
      setProximaData(base.toISOString().split('T')[0]);
    }
    if (intervaloKm) {
      const baseKm = ultimoKm ? Number(ultimoKm) : (selectedVeiculo?.quilometragem || 0);
      setProximoKm(String(baseKm + Number(intervaloKm)));
    }
    if (intervaloHoras) {
      const baseH = ultimoHorimetro ? Number(ultimoHorimetro) : (selectedVeiculo?.horimetro_atual || 0);
      setProximoHorimetro(String((baseH + Number(intervaloHoras)).toFixed(1)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!veiculoId) {
      toast.warning('Selecione o veículo ou máquina vinculada');
      return;
    }

    const nomeFinal = nome.trim() || servico.trim();
    if (!nomeFinal) {
      toast.warning('Informe o nome do plano ou o serviço preventivo');
      return;
    }

    // Pelo menos um limite deve ser estipulado
    const temControle = proximaData || proximoKm || proximoHorimetro || intervaloDias || intervaloKm || intervaloHoras;
    if (!temControle) {
      toast.warning('Informe ao menos uma previsão por data, quilometragem ou horímetro');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        veiculo_id: veiculoId,
        nome: nomeFinal,
        servico: servico.trim() || nomeFinal,
        componente: componente || 'REVISAO',
        descricao: descricao.trim(),
        observacoes: observacoes.trim(),
        tipo_controle: tipoControle,
        intervalo_dias: intervaloDias ? parseInt(intervaloDias, 10) : null,
        intervalo_km: intervaloKm ? parseInt(intervaloKm, 10) : null,
        intervalo_horas: intervaloHoras ? parseFloat(intervaloHoras) : null,
        ultima_data: ultimaData || null,
        ultimo_km: ultimoKm ? parseInt(ultimoKm, 10) : null,
        ultimo_horimetro: ultimoHorimetro ? parseFloat(ultimoHorimetro) : null,
        proxima_data: proximaData || null,
        proximo_km: proximoKm ? parseInt(proximoKm, 10) : null,
        proximo_horimetro: proximoHorimetro ? parseFloat(proximoHorimetro) : null,
        antecedencia_dias: antecedenciaDias ? parseInt(antecedenciaDias, 10) : 15,
        antecedencia_km: antecedenciaKm ? parseInt(antecedenciaKm, 10) : 1500,
        antecedencia_horas: antecedenciaHoras ? parseFloat(antecedenciaHoras) : 50,
        ativo,
        // Compatibilidade
        km_limite: proximoKm ? parseInt(proximoKm, 10) : null,
        data_limite: proximaData || null
      };

      const url = isEditing ? `/api/preventivas/${preventivaToEdit.id}` : '/api/preventivas';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar plano preventivo');
      }

      toast.success(isEditing ? 'Plano preventivo atualizado com sucesso!' : 'Novo plano preventivo cadastrado com sucesso!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar operação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
                {isEditing ? 'Editar Plano de Manutenção Preventiva' : 'Cadastrar Novo Plano de Manutenção'}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                Controle inteligente por Data, Quilometragem (KM) e Horímetro para frotas diesel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          {/* SEÇÃO 1: VÍNCULO DO VEÍCULO E CLIENTE */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4" /> 1. Veículo ou Máquina Diesel
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Veículo / Equipamento Alvo *
                </label>
                <select
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  disabled={isEditing}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white uppercase focus:border-orange-500 focus:outline-none disabled:opacity-50"
                  required
                >
                  <option value="">Selecione o veículo ou equipamento...</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa ? `[${v.placa}] ` : ''}{v.marca} {v.modelo} {v.ano ? `(${v.ano})` : ''} — Cliente: {v.cliente?.nome || v.Cliente?.nome || 'Não definido'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedVeiculo && (
                <div className="col-span-2 p-3 bg-black/60 border border-zinc-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Cliente</span>
                    <span className="text-zinc-200 font-bold truncate block">
                      {selectedVeiculo.cliente?.nome || selectedVeiculo.Cliente?.nome || 'Sem cliente'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Tipo</span>
                    <span className="text-zinc-200 font-bold block">{selectedVeiculo.tipo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">KM Atual</span>
                    <span className="text-orange-400 font-black block">
                      {selectedVeiculo.quilometragem ? `${selectedVeiculo.quilometragem.toLocaleString('pt-BR')} KM` : 'Não registrado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Horímetro Atual</span>
                    <span className="text-amber-400 font-black block">
                      {selectedVeiculo.horimetro_atual ? `${selectedVeiculo.horimetro_atual} h` : 'Não registrado'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 2: IDENTIFICAÇÃO DO SERVIÇO */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 2. Identificação do Plano Preventivo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Nome do Plano *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troca de Óleo Motor 15W40 + Filtros"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white uppercase focus:border-orange-500 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Serviço Preventivo
                </label>
                <input
                  type="text"
                  list="sugestoes-servicos"
                  placeholder="Selecione ou digite o serviço..."
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white uppercase focus:border-orange-500 focus:outline-none"
                />
                <datalist id="sugestoes-servicos">
                  {SERVICOS_SUGESTOES.map((s, idx) => (
                    <option key={idx} value={s} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Componente / Subsistema
                </label>
                <select
                  value={componente}
                  onChange={(e) => setComponente(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white uppercase focus:border-orange-500 focus:outline-none"
                >
                  <option value="OLEO">ÓLEO DO MOTOR</option>
                  <option value="FILTROS">FILTROS E FLUIDOS</option>
                  <option value="REVISAO">REVISÃO GERAL PREVENTIVA</option>
                  <option value="FREIOS">SISTEMA DE FREIOS</option>
                  <option value="DIFERENCIAL">DIFERENCIAL</option>
                  <option value="CAIXA">CAIXA DE CÂMBIO</option>
                  <option value="SUSPENSAO">SUSPENSÃO E MOLAS</option>
                  <option value="COMPRESSOR">COMPRESSOR E PNEUMÁTICA</option>
                  <option value="TURBINA">TURBINA E INJEÇÃO</option>
                  <option value="HIDRAULICA">HIDRÁULICA E MANGUEIRAS</option>
                  <option value="ARREFECIMENTO">ARREFECIMENTO E RADIADOR</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Tipo de Controle
                </label>
                <select
                  value={tipoControle}
                  onChange={(e) => setTipoControle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white uppercase focus:border-orange-500 focus:outline-none"
                >
                  <option value="KM">POR QUILOMETRAGEM (KM)</option>
                  <option value="HORAS">POR HORÍMETRO (HORAS DE USO)</option>
                  <option value="DATA">POR DATA (DIAS / TEMPO)</option>
                  <option value="COMBINADO">COMBINADO (O QUE OCORRER PRIMEIRO)</option>
                </select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Descrição e Recomendações Técnicas
                </label>
                <textarea
                  rows={2}
                  placeholder="Especificações do óleo, marcas recomendadas de filtros, torques, procedimentos de aperto..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white uppercase focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: HISTÓRICO DA ÚLTIMA INTERVENÇÃO & INTERVALOS */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4" /> 3. Intervalos e Última Manutenção
              </h3>
              <button
                type="button"
                onClick={recalcularProjecao}
                className="text-[10px] text-orange-400 font-bold uppercase tracking-wider hover:underline cursor-pointer"
              >
                Recalcular Projeção
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Intervalos */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Intervalo em Dias
                </label>
                <input
                  type="number"
                  placeholder="Ex: 90 ou 180 dias"
                  value={intervaloDias}
                  onChange={(e) => setIntervaloDias(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Intervalo em KM
                </label>
                <input
                  type="number"
                  placeholder="Ex: 10000 ou 20000 km"
                  value={intervaloKm}
                  onChange={(e) => setIntervaloKm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Intervalo em Horas
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 250 ou 500 horas"
                  value={intervaloHoras}
                  onChange={(e) => setIntervaloHoras(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Última intervenção realizada */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Última Data Realizada
                </label>
                <input
                  type="date"
                  value={ultimaData}
                  onChange={(e) => setUltimaData(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  KM da Última Troca
                </label>
                <input
                  type="number"
                  placeholder="Ex: 180000"
                  value={ultimoKm}
                  onChange={(e) => setUltimoKm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Horímetro da Última Troca
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 1250.5"
                  value={ultimoHorimetro}
                  onChange={(e) => setUltimoHorimetro(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: PRÓXIMAS METAS & ANTECEDÊNCIA DE ALERTAS */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4" /> 4. Próxima Manutenção e Alertas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Próxima Data Prevista
                </label>
                <input
                  type="date"
                  value={proximaData}
                  onChange={(e) => setProximaData(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Próximo KM Previsto
                </label>
                <input
                  type="number"
                  placeholder="Ex: 195000"
                  value={proximoKm}
                  onChange={(e) => setProximoKm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Próximo Horímetro Previsto
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 1500.0"
                  value={proximoHorimetro}
                  onChange={(e) => setProximoHorimetro(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Antecedência de alertas */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Alerta com Antecedência (Dias)
                </label>
                <input
                  type="number"
                  value={antecedenciaDias}
                  onChange={(e) => setAntecedenciaDias(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Alerta com Antecedência (KM)
                </label>
                <input
                  type="number"
                  value={antecedenciaKm}
                  onChange={(e) => setAntecedenciaKm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Alerta com Antecedência (Horas)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={antecedenciaHoras}
                  onChange={(e) => setAntecedenciaHoras(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Situação Ativa / Inativa */}
            <div className="flex items-center gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 uppercase">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-orange-600 focus:ring-orange-500"
                />
                Plano Ativo (Gera notificações e monitoramento)
              </label>
            </div>
          </div>

          {/* AÇÕES DO FORMULÁRIO */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-black uppercase tracking-widest transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-widest transition cursor-pointer flex items-center gap-2 shadow-lg shadow-orange-950/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Gravando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Plano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
