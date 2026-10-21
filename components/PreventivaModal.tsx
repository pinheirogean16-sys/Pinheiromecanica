'use client';

import { useState, useMemo } from 'react';
import { 
  X, Wrench, Clock, ShieldCheck, Save, 
  Camera, Loader2, TrendingUp 
} from 'lucide-react';
import { toast } from 'sonner';
import { CldUploadWidget } from 'next-cloudinary'; // ✅ Import do Widget do Cloudinary

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

  // Tipo de controle
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

  // Última manutenção (opcional)
  const [ultimaData, setUltimaData] = useState(
    preventivaToEdit?.ultima_data ? new Date(preventivaToEdit.ultima_data).toISOString().split('T')[0] : ''
  );
  const [ultimoKm, setUltimoKm] = useState(
    preventivaToEdit?.ultimo_km ? String(preventivaToEdit.ultimo_km) : ''
  );
  const [ultimoHorimetro, setUltimoHorimetro] = useState(
    preventivaToEdit?.ultimo_horimetro ? String(preventivaToEdit.ultimo_horimetro) : ''
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
  
  // ✅ Estado das fotos
  const [fotos, setFotos] = useState<string[]>(preventivaToEdit?.fotos || []);
  
  const [submitting, setSubmitting] = useState(false);

  const selectedVeiculo = useMemo(() => veiculos.find((v) => v.id === veiculoId), [veiculos, veiculoId]);

  // Cálculos automáticos para mostrar a projeção
  const baseKm = Number(ultimoKm) || selectedVeiculo?.quilometragem || 0;
  const baseHorimetro = Number(ultimoHorimetro) || selectedVeiculo?.horimetro_atual || 0;
  
  const projecaoKm = intervaloKm ? baseKm + Number(intervaloKm) : null;
  const projecaoHoras = intervaloHoras ? baseHorimetro + Number(intervaloHoras) : null;

  const removerFoto = (index: number) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
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

    if (!intervaloDias && !intervaloKm && !intervaloHoras && !ultimaData) {
      toast.warning('Informe pelo menos um intervalo (Dias, KM ou Horas)');
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
        
        antecedencia_dias: antecedenciaDias ? parseInt(antecedenciaDias, 10) : 15,
        antecedencia_km: antecedenciaKm ? parseInt(antecedenciaKm, 10) : 1500,
        antecedencia_horas: antecedenciaHoras ? parseFloat(antecedenciaHoras) : 50,
        ativo,
        fotos // ✅ Envia o array de fotos para o banco de dados
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

      toast.success(isEditing ? 'Plano atualizado!' : 'Novo plano cadastrado!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Falha ao processar operação');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">
                {isEditing ? 'Editar Plano Preventivo' : 'Novo Plano Preventivo'}
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium">
                Cálculo automático inteligente baseado no veículo.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 font-sans">
          
          {/* SEÇÃO 1: VEÍCULO */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <Wrench className="w-4 h-4" /> 1. Selecione o Veículo
            </h3>
            <div className="grid grid-cols-1 gap-4">
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
                    {v.placa ? `[${v.placa}] ` : ''}{v.marca} {v.modelo} — {v.cliente?.nome || v.Cliente?.nome || 'Sem cliente'}
                  </option>
                ))}
              </select>

              {selectedVeiculo && (
                <div className="bg-black/60 border border-zinc-800 rounded-xl p-3 flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">KM Atual do Veículo</span>
                    <span className="text-orange-400 font-black">{selectedVeiculo.quilometragem ? `${selectedVeiculo.quilometragem.toLocaleString('pt-BR')} KM` : 'Não registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold">Horímetro Atual</span>
                    <span className="text-amber-400 font-black">{selectedVeiculo.horimetro_atual ? `${selectedVeiculo.horimetro_atual} h` : 'Não registrado'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 2: IDENTIFICAÇÃO */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> 2. Identificação do Serviço
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Nome do Plano *</label>
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
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Serviço Sugerido</label>
                <input
                  type="text"
                  list="sugestoes-servicos"
                  placeholder="Selecione ou digite..."
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white uppercase focus:border-orange-500 focus:outline-none"
                />
                <datalist id="sugestoes-servicos">
                  {SERVICOS_SUGESTOES.map((s, idx) => <option key={idx} value={s} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">Componente Principal</label>
                <select
                  value={componente}
                  onChange={(e) => setComponente(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-bold text-white uppercase focus:border-orange-500 focus:outline-none"
                >
                  <option value="OLEO">ÓLEO DO MOTOR</option>
                  <option value="FILTROS">FILTROS E FLUIDOS</option>
                  <option value="REVISAO">REVISÃO GERAL</option>
                  <option value="FREIOS">SISTEMA DE FREIOS</option>
                  <option value="DIFERENCIAL">DIFERENCIAL</option>
                  <option value="CAIXA">CAIXA DE CÂMBIO</option>
                  <option value="SUSPENSAO">SUSPENSÃO E MOLAS</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: CÁLCULO AUTOMÁTICO */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4" /> 3. Regra de Intervalo (Automático)
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase">
              Digite o intervalo. O sistema usará o KM/Horímetro atual do veículo para calcular a próxima data/alvo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">A cada quantos KM?</label>
                <input
                  type="number"
                  placeholder="Ex: 10000"
                  value={intervaloKm}
                  onChange={(e) => setIntervaloKm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">A cada quantas Horas?</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 250"
                  value={intervaloHoras}
                  onChange={(e) => setIntervaloHoras(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">A cada quantos Dias?</label>
                <input
                  type="number"
                  placeholder="Ex: 180"
                  value={intervaloDias}
                  onChange={(e) => setIntervaloDias(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs font-mono font-bold text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Painel de Projeção Inteligente */}
            {(projecaoKm || projecaoHoras) && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <TrendingUp size={16} /> Projeção de Alvo
                </div>
                <div className="flex flex-wrap gap-6 text-sm font-mono text-emerald-300">
                  {projecaoKm && (
                    <span>Próximo KM: <strong className="text-white">{projecaoKm.toLocaleString('pt-BR')} KM</strong></span>
                  )}
                  {projecaoHoras && (
                    <span>Próximo Horímetro: <strong className="text-white">{projecaoHoras.toFixed(1)} h</strong></span>
                  )}
                </div>
                <p className="text-[9px] text-emerald-500/70 uppercase font-bold mt-1">
                  * A data limite será recalculada com base no histórico de rodagem.
                </p>
              </div>
            )}
          </div>

          {/* SEÇÃO 4: FOTO E OBSERVAÇÕES */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4" /> 4. Anexos e Observações
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Fotos de Referência (Opcional)
                </label>
                
                {/* ✅ GRADE DE FOTOS */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {fotos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden group">
                      <img src={url} alt={`Foto ${idx+1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removerFoto(idx)}
                        className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {/* ✅ WIDGET DO CLOUDINARY */}
                  {/* @ts-ignore */}
                  <CldUploadWidget 
                    uploadPreset="vehlox_preset"
                    cloudName="krdgekwz" 
                    options={{ multiple: true, maxFiles: 5 }}
                    onSuccess={(result: any) => {
                      if (result?.info?.secure_url) {
                        setFotos(prev => [...prev, result.info.secure_url]);
                        toast.success('Foto anexada com sucesso!');
                      }
                    }}
                  >
                    {({ open }) => {
                      return (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-zinc-800 hover:border-orange-500/50 bg-zinc-950 rounded-xl cursor-pointer transition-colors"
                        >
                          <Camera className="w-6 h-6 text-zinc-600 mb-1" />
                          <span className="text-[9px] font-black uppercase text-zinc-500 text-center px-2">Anexar Fotos</span>
                        </button>
                      );
                    }}
                  </CldUploadWidget>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Observações Internas
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalhes do procedimento, marcas de peças, torques..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white uppercase focus:border-orange-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Alertas e Ativo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                  Avisar com antecedência (KM)
                </label>
                <input
                  type="number"
                  value={antecedenciaKm}
                  onChange={(e) => setAntecedenciaKm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs font-mono text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3 sm:justify-end h-full">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300 uppercase">
                  <input
                    type="checkbox"
                    checked={ativo}
                    onChange={(e) => setAtivo(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-orange-600 focus:ring-orange-500"
                  />
                  Plano Ativo
                </label>
              </div>
            </div>
          </div>

          {/* Ações */}
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
