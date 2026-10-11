'use client';

import { ShieldCheck, Gauge, Clock, AlertTriangle, CheckSquare, Square, Wrench, Info } from 'lucide-react';

interface PreventivaVinculoSelectorProps {
  veiculo: any;
  kmVeiculo: string;
  setKmVeiculo: (val: string) => void;
  horimetroVeiculo: string;
  setHorimetroVeiculo: (val: string) => void;
  selectedPreventivas: string[];
  setSelectedPreventivas: React.Dispatch<React.SetStateAction<string[]>>;
  confirmarSaltoKm: boolean;
  setConfirmarSaltoKm: (val: boolean) => void;
  confirmarSaltoHorimetro: boolean;
  setConfirmarSaltoHorimetro: (val: boolean) => void;
  autorizarReducaoKm: boolean;
  setAutorizarReducaoKm: (val: boolean) => void;
  autorizarReducaoHorimetro: boolean;
  setAutorizarReducaoHorimetro: (val: boolean) => void;
  justificativaAjuste: string;
  setJustificativaAjuste: (val: string) => void;
  preventivas: any[];
}

export default function PreventivaVinculoSelector({
  veiculo,
  kmVeiculo,
  setKmVeiculo,
  horimetroVeiculo,
  setHorimetroVeiculo,
  selectedPreventivas,
  setSelectedPreventivas,
  confirmarSaltoKm,
  setConfirmarSaltoKm,
  confirmarSaltoHorimetro,
  setConfirmarSaltoHorimetro,
  autorizarReducaoKm,
  setAutorizarReducaoKm,
  autorizarReducaoHorimetro,
  setAutorizarReducaoHorimetro,
  justificativaAjuste,
  setJustificativaAjuste,
  preventivas
}: PreventivaVinculoSelectorProps) {
  if (!veiculo) return null;

  const kmCadastrado = Number(veiculo.quilometragem || 0);
  const horimetroCadastrado = Number(veiculo.horimetro_atual || 0);

  const parsedKm = Number(kmVeiculo || 0);
  const parsedHoras = Number(horimetroVeiculo || 0);

  const isKmReducao = kmVeiculo !== '' && parsedKm > 0 && parsedKm < kmCadastrado;
  const isKmSalto = kmVeiculo !== '' && kmCadastrado > 0 && (parsedKm - kmCadastrado > 50000);

  const isHorasReducao = horimetroVeiculo !== '' && parsedHoras > 0 && parsedHoras < horimetroCadastrado;
  const isHorasSalto = horimetroVeiculo !== '' && horimetroCadastrado > 0 && (parsedHoras - horimetroCadastrado > 1000);

  const togglePreventiva = (id: string) => {
    setSelectedPreventivas(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
              Leituras do Veículo & Manutenção Preventiva
            </h4>
            <p className="text-[10px] text-zinc-500 font-medium">
              Veículo: <span className="text-zinc-300 font-bold uppercase">{veiculo.placa || 'S/P'} • {veiculo.modelo}</span>
            </p>
          </div>
        </div>

        {preventivas.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-xl w-fit">
            {preventivas.length} {preventivas.length === 1 ? 'plano cadastrado' : 'planos cadastrados'}
          </span>
        )}
      </div>

      {/* LEITURAS DE ODÔMETRO E HORÍMETRO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Odômetro KM */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider px-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <Gauge size={12} className="text-orange-500" /> Odômetro do Veículo (KM)
            </span>
            <span className="text-zinc-500">
              Atual: <strong className="text-zinc-300">{kmCadastrado.toLocaleString('pt-BR')} KM</strong>
            </span>
          </div>
          <input
            type="number"
            min="0"
            max="5000000"
            value={kmVeiculo}
            onChange={(e) => setKmVeiculo(e.target.value)}
            placeholder={`Ex: ${kmCadastrado > 0 ? kmCadastrado + 500 : '150000'}`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-orange-500 transition shadow-inner"
          />
        </div>

        {/* Horímetro Horas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider px-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <Clock size={12} className="text-orange-500" /> Horímetro Máquina/Veículo (h)
            </span>
            <span className="text-zinc-500">
              Atual: <strong className="text-zinc-300">{horimetroCadastrado.toLocaleString('pt-BR')} h</strong>
            </span>
          </div>
          <input
            type="number"
            step="0.1"
            min="0"
            max="100000"
            value={horimetroVeiculo}
            onChange={(e) => setHorimetroVeiculo(e.target.value)}
            placeholder={`Ex: ${horimetroCadastrado > 0 ? (horimetroCadastrado + 10).toFixed(1) : '2500'}`}
            className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-orange-500 transition shadow-inner"
          />
        </div>
      </div>

      {/* SINALIZADORES DE SEGURANÇA E CONFIRMAÇÕES DE ODÔMETRO */}
      {(isKmSalto || isKmReducao || isHorasSalto || isHorasReducao) && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-3.5 space-y-3">
          <div className="flex items-start gap-2 text-amber-400 text-xs font-bold">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
            <span>Validação de Integridade das Leituras Detectada:</span>
          </div>

          <div className="space-y-2 text-xs text-zinc-300">
            {isKmSalto && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-300">
                <input
                  type="checkbox"
                  checked={confirmarSaltoKm}
                  onChange={(e) => setConfirmarSaltoKm(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-amber-700 text-orange-600 focus:ring-orange-500"
                />
                Confirmar salto elevado de odômetro (+{(parsedKm - kmCadastrado).toLocaleString('pt-BR')} KM)
              </label>
            )}

            {isKmReducao && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-red-300">
                <input
                  type="checkbox"
                  checked={autorizarReducaoKm}
                  onChange={(e) => setAutorizarReducaoKm(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-red-700 text-orange-600 focus:ring-orange-500"
                />
                Autorizar redução de odômetro (troca de painel / correção autorizada)
              </label>
            )}

            {isHorasSalto && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-300">
                <input
                  type="checkbox"
                  checked={confirmarSaltoHorimetro}
                  onChange={(e) => setConfirmarSaltoHorimetro(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-amber-700 text-orange-600 focus:ring-orange-500"
                />
                Confirmar salto elevado de horímetro (+{(parsedHoras - horimetroCadastrado).toFixed(1)} h)
              </label>
            )}

            {isHorasReducao && (
              <label className="flex items-center gap-2 cursor-pointer font-bold text-red-300">
                <input
                  type="checkbox"
                  checked={autorizarReducaoHorimetro}
                  onChange={(e) => setAutorizarReducaoHorimetro(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-950 border-red-700 text-orange-600 focus:ring-orange-500"
                />
                Autorizar redução de horímetro (troca de horímetro / correção autorizada)
              </label>
            )}

            {(isKmReducao || isHorasReducao) && (
              <div className="pt-1">
                <label className="block text-[10px] font-black uppercase text-zinc-400 mb-1">
                  Justificativa Obrigatória para Redução de Odômetro/Horímetro:
                </label>
                <input
                  type="text"
                  value={justificativaAjuste}
                  onChange={(e) => setJustificativaAjuste(e.target.value)}
                  placeholder="Ex: Troca de painel de instrumentos por defeito elétrico na concessionária"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs text-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLANOS PREVENTIVOS DISPONÍVEIS PARA VINCULAÇÃO */}
      <div className="space-y-2 pt-1">
        <label className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">
          Planos Preventivos Executados Nesta OS (Avanço Oficial de Ciclo na Finalização):
        </label>

        {preventivas.length === 0 ? (
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Info size={14} /> Nenhum plano preventivo ativo cadastrado para este veículo.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {preventivas.map((p: any) => {
              const isSelected = selectedPreventivas.includes(p.id);
              let statusBadge = 'bg-zinc-800 text-zinc-400 border-zinc-700';
              if (p.status === 'VENCIDO') statusBadge = 'bg-red-500/10 text-red-400 border-red-500/30';
              else if (p.status === 'PROXIMO') statusBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
              else if (p.status === 'SAUDAVEL') statusBadge = 'bg-green-500/10 text-green-400 border-green-500/30';

              return (
                <div
                  key={p.id}
                  onClick={() => togglePreventiva(p.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    isSelected 
                      ? 'bg-orange-500/10 border-orange-500/60 shadow-sm shadow-orange-950/20' 
                      : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="mt-0.5 text-orange-500">
                    {isSelected ? <CheckSquare size={18} className="text-orange-500" /> : <Square size={18} className="text-zinc-600" />}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white uppercase truncate">
                        {p.nome || p.servico || p.componente}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${statusBadge}`}>
                        {p.status || 'EM DIA'}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-400 font-mono space-x-2">
                      {p.proximo_km && <span>Limite: {p.proximo_km.toLocaleString('pt-BR')} KM</span>}
                      {p.proximo_horimetro && <span>Limite: {p.proximo_horimetro} h</span>}
                      {p.proxima_data && <span>Data: {new Date(p.proxima_data).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
