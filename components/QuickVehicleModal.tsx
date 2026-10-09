'use client';

import { useState, useEffect } from 'react';
import { X, Car, User, Wrench, Gauge, Clock, Loader2, Check, AlertCircle, Plus } from 'lucide-react';
import { maskPlaca } from '@/lib/masks';
import { isValidPlacaOrIdentifier } from '@/lib/validators';

interface QuickVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vehicle: any) => void;
  selectedClientId?: string;
  selectedClientName?: string;
  clients?: any[];
  onOpenNewClientModal?: () => void;
}

const TIPOS_VEICULOS = [
  { group: 'Linha Pesada & Rodoviária', items: [
    { value: 'CAVALO_MECANICO', label: 'Cavalo Mecânico' },
    { value: 'CAMINHAO_PESADO', label: 'Caminhão Pesado (Truck/Traçado)' },
    { value: 'CAMINHAO_LEVE', label: 'Caminhão Leve / Médio (Toco/3/4)' },
    { value: 'CARRETA', label: 'Carreta / Reboque / Semirreboque' },
    { value: 'CAMINHAO_MUNCK', label: 'Caminhão Munck / Guindauto' },
    { value: 'CAMINHAO_PIPA', label: 'Caminhão Pipa' },
  ]},
  { group: 'Máquinas Pesadas & Terraplenagem', items: [
    { value: 'ESCAVADEIRA_HIDRAULICA', label: 'Escavadeira Hidráulica' },
    { value: 'RETROESCAVADEIRA', label: 'Retroescavadeira' },
    { value: 'PA_CARREGADEIRA', label: 'Pá Carregadeira' },
    { value: 'MOTONIVELADORA', label: 'Motoniveladora (Patrola)' },
    { value: 'TRATOR_ESTEIRA', label: 'Trator de Esteira' },
    { value: 'ROLO_COMPACTADOR', label: 'Rolo Compactador' },
    { value: 'VIBROACABADORA', label: 'Vibroacabadora' },
    { value: 'FRESADORA', label: 'Fresadora de Asfalto' },
    { value: 'USINA_ASFALTO', label: 'Usina de Asfalto' },
    { value: 'EQUIPAMENTO_ASFALTO', label: 'Equipamento de Asfalto' },
    { value: 'GUINDASTE', label: 'Guindaste' },
    { value: 'EMPILHADEIRA', label: 'Empilhadeira' },
    { value: 'PERFURATRIZ', label: 'Perfuratriz' },
    { value: 'TRATOR_AGRICOLA', label: 'Trator Agrícola' },
  ]},
  { group: 'Comerciais Leves & Utilitários', items: [
    { value: 'CAMINHONETE', label: 'Caminhonete (Hilux, Ranger, S10)' },
    { value: 'VAN', label: 'Van / Furgão' },
    { value: 'UTILITARIO', label: 'Utilitário (Kangoo, Strada, Saveiro)' },
    { value: 'ONIBUS', label: 'Ônibus / Micro-ônibus' },
    { value: 'OUTROS', label: 'Outros Equipamentos Diesel' },
  ]}
];

const MAQUINAS_SET = new Set([
  'ESCAVADEIRA_HIDRAULICA', 'RETROESCAVADEIRA', 'PA_CARREGADEIRA',
  'MOTONIVELADORA', 'TRATOR_ESTEIRA', 'ROLO_COMPACTADOR', 'VIBROACABADORA',
  'FRESADORA', 'USINA_ASFALTO', 'EQUIPAMENTO_ASFALTO', 'GUINDASTE',
  'EMPILHADEIRA', 'PERFURATRIZ', 'TRATOR_AGRICOLA'
]);

export default function QuickVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  selectedClientId,
  selectedClientName,
  clients = [],
  onOpenNewClientModal
}: QuickVehicleModalProps) {
  const [clienteId, setClienteId] = useState(selectedClientId || '');
  const [tipo, setTipo] = useState('CAVALO_MECANICO');
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState<string>(new Date().getFullYear().toString());
  const [quilometragem, setQuilometragem] = useState('');
  const [horimetro, setHorimetro] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sincroniza cliente selecionado quando prop mudar
  useEffect(() => {
    if (selectedClientId) {
      setClienteId(selectedClientId);
    }
  }, [selectedClientId]);

  // Fechar com tecla ESC
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

  if (!isOpen) return null;

  const isMaquina = MAQUINAS_SET.has(tipo);

  const handlePlacaChange = (val: string) => {
    if (errorMsg) setErrorMsg(null);
    const cleaned = val.toUpperCase().trim();
    if (isMaquina) {
      // Máquinas podem usar prefixo, chassi ou número de série (ex: MAQ-01, CAT-320, TRATOR-01)
      setPlaca(cleaned.slice(0, 20));
    } else {
      // Placas Mercosul ou antigas
      if (cleaned.length <= 8) {
        setPlaca(maskPlaca(cleaned));
      } else {
        setPlaca(cleaned.slice(0, 20));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!clienteId) {
      setErrorMsg('Selecione ou cadastre o cliente proprietário do ativo.');
      return;
    }

    if (!placa.trim() || !isValidPlacaOrIdentifier(placa)) {
      setErrorMsg('Informe a placa ou identificador do ativo (mínimo 3 caracteres).');
      return;
    }

    if (!marca.trim() || marca.trim().length < 2) {
      setErrorMsg('Informe a marca do ativo (ex: Scania, Volvo, Caterpillar).');
      return;
    }

    if (!modelo.trim() || modelo.trim().length < 2) {
      setErrorMsg('Informe o modelo do ativo (ex: R450, FH 540, 320D).');
      return;
    }

    const parsedAno = parseInt(ano, 10);
    if (isNaN(parsedAno) || parsedAno < 1900 || parsedAno > 2035) {
      setErrorMsg('Informe um ano de fabricação válido (ex: 2022).');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        cliente_id: clienteId,
        tipo,
        placa: placa.trim().toUpperCase(),
        marca: marca.trim().toUpperCase(),
        modelo: modelo.trim().toUpperCase(),
        ano: parsedAno,
        quilometragem: quilometragem ? parseInt(quilometragem.replace(/\D/g, ''), 10) : null,
        horimetro_atual: horimetro ? parseFloat(horimetro.replace(',', '.')) : null
      };

      const res = await fetch('/api/veiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao cadastrar veículo. Verifique os dados informados.');
        return;
      }

      // Sucesso: notifica callback e fecha modal
      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error('Falha ao cadastrar veículo rápido:', err);
      setErrorMsg('Erro de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-quick-vehicle-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-black">
              <Car size={20} />
            </div>
            <div>
              <h2 id="modal-quick-vehicle-title" className="text-base font-black text-white uppercase italic tracking-tight">
                Novo Veículo ou Máquina Pesada
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                Vínculo imediato à Ordem de Serviço
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body com Rolagem Interna Segura */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-red-400 font-bold">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Proprietário / Cliente */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider flex items-center gap-1">
                <User size={12} className="text-zinc-500" />
                Proprietário do Ativo *
              </label>
              {onOpenNewClientModal && (
                <button
                  type="button"
                  onClick={onOpenNewClientModal}
                  className="text-[9px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest flex items-center gap-1 cursor-pointer transition hover:underline"
                >
                  <Plus size={11} />
                  Cadastrar Cliente
                </button>
              )}
            </div>

            {selectedClientId && selectedClientName ? (
              <div className="p-3 bg-zinc-950 border border-blue-500/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-black text-white uppercase truncate">
                    {selectedClientName}
                  </span>
                </div>
                <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-widest">
                  Cliente da OS
                </span>
              </div>
            ) : (
              <select
                required
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner cursor-pointer"
              >
                <option value="">SELECIONE O PROPRIETÁRIO...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.cpf_cnpj})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Equipamento / Veículo */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1 flex items-center gap-1">
              <Wrench size={12} className="text-zinc-500" />
              Tipo de Ativo *
            </label>
            <select
              required
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner cursor-pointer"
            >
              {TIPOS_VEICULOS.map((grupo) => (
                <optgroup key={grupo.group} label={grupo.group} className="bg-zinc-900 text-zinc-400 font-black">
                  {grupo.items.map((item) => (
                    <option key={item.value} value={item.value} className="bg-zinc-950 text-white font-bold">
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Placa / Identificador + Ano */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                {isMaquina ? 'Identificador / Prefixo / Série / Placa *' : 'Placa do Veículo *'}
              </label>
              <input
                type="text"
                required
                placeholder={isMaquina ? 'EX: CAT-320, MAQ-01, SERIE-580' : 'EX: BRA2E19 OU ABC-1234'}
                value={placa}
                onChange={(e) => handlePlacaChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-black font-mono text-white uppercase outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                Ano Fabricação *
              </label>
              <input
                type="number"
                required
                min="1900"
                max="2035"
                placeholder="2022"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-center font-mono text-white outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* Marca e Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                Marca / Fabricante *
              </label>
              <input
                type="text"
                required
                placeholder={isMaquina ? 'EX: CATERPILLAR, CASE, KOMATSU' : 'EX: SCANIA, VOLVO, MERCEDES-BENZ'}
                value={marca}
                onChange={(e) => setMarca(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1">
                Modelo do Ativo *
              </label>
              <input
                type="text"
                required
                placeholder={isMaquina ? 'EX: 320D, 580N, D6N' : 'EX: R450, FH 540, ACTROS 2651'}
                value={modelo}
                onChange={(e) => setModelo(e.target.value.toUpperCase())}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold text-white uppercase outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* Horímetro e Quilometragem (Métricas Operacionais) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1 flex items-center gap-1">
                <Clock size={12} className={isMaquina ? 'text-amber-500' : 'text-zinc-500'} />
                Horímetro Atual {isMaquina && <span className="text-amber-500 font-bold">(Recomendado)</span>}
              </label>
              <input
                type="text"
                placeholder="EX: 4850.5"
                value={horimetro}
                onChange={(e) => setHorimetro(e.target.value)}
                className={`w-full bg-zinc-950 border rounded-xl p-3 text-xs font-bold font-mono text-white outline-none transition shadow-inner ${
                  isMaquina ? 'border-amber-500/40 focus:border-amber-500' : 'border-zinc-800 focus:border-orange-500'
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider px-1 flex items-center gap-1">
                <Gauge size={12} className={!isMaquina ? 'text-blue-500' : 'text-zinc-500'} />
                Quilometragem (KM) {!isMaquina && <span className="text-blue-500 font-bold">(Recomendado)</span>}
              </label>
              <input
                type="text"
                placeholder="EX: 320000"
                value={quilometragem}
                onChange={(e) => setQuilometragem(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-bold font-mono text-white outline-none focus:border-orange-500 transition shadow-inner"
              />
            </div>
          </div>

          {/* Footer de Ações */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black text-xs uppercase tracking-widest transition shadow-lg shadow-orange-950/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando Veículo...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Cadastrar e Selecionar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
