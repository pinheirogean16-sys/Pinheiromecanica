'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Calendar, 
  ChevronRight, 
  Truck, 
  User,
  ClipboardList
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NewOSForm({ 
  initialClients, 
  initialMechanics 
}: { 
  initialClients: any[], 
  initialMechanics: any[] 
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    clienteId: '',
    veiculoId: '',
    mecanicoId: '',
    diagnostico: '',
    previsao: '',
  });

  const selectedClient = initialClients.find(c => c.id === formData.clienteId);
  const vehicles = selectedClient?.veiculos || [];

  // ============================================================
  // SUBMIT — cria a OS com tratamento completo de erros
  // ============================================================
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ordens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      // Tenta ler o JSON da resposta (sucesso ou erro)
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Resposta sem corpo JSON — ignora
      }

      if (!res.ok) {
        // ============================================================
        // ERRO DA API (400, 401, 403, 500, etc.)
        // ============================================================
        const mensagem =
          data?.error ||
          data?.message ||
          `Erro ${res.status}: ${res.statusText}`;

        toast.error('Não foi possível criar a OS', {
          description: mensagem,
        });
        return;
      }

      // ============================================================
      // SUCESSO
      // ============================================================
      toast.success('OS criada com sucesso!', {
        description: data?.numeroOS
          ? `Ordem ${data.numeroOS} gerada.`
          : 'Redirecionando...',
      });

      router.push('/os');
      router.refresh();
    } catch (err: any) {
      // ============================================================
      // ERRO DE REDE (sem internet, servidor fora do ar, etc.)
      // ============================================================
      toast.error('Falha de conexão', {
        description:
          'Não foi possível contatar o servidor. Verifique sua internet e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/os">
          <button className="p-3 bg-zinc-950 hover:bg-zinc-900 rounded-xl transition-all border border-zinc-800 text-zinc-500 hover:text-white group active:scale-95">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </Link>
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white uppercase tracking-tight">ABERTURA DE CHAMADO</h2>
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.2em] leading-none">FLUXO DE TRIAGEM OPERACIONAL E DIAGNÓSTICO</p>
        </div>
      </div>

      {/* Responsive step indicator (wizard) */}
      <div className="hidden md:flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-mono font-black border transition-all ${step >= s ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-950/20' : 'bg-zinc-950 border-zinc-800 text-zinc-700'}`}>
              0{s}
            </div>
            {s < 3 && <div className={`w-12 h-1 rounded-full ${step > s ? 'bg-orange-600' : 'bg-zinc-900'}`} />}
          </div>
        ))}
      </div>

      <div className="md:hidden flex flex-col gap-2 mb-6 bg-zinc-900/30 p-4 border border-zinc-800/60 rounded-2xl">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono">
          <span>Etapa {step} de 3</span>
          <span className="text-orange-500 font-bold">
            {step === 1 ? 'SELECIONAR CLIENTE' : step === 2 ? 'VINCULAR VEÍCULO' : 'DIAGNÓSTICO E PREVISÃO'}
          </span>
        </div>
        <div className="relative w-full h-1.5 bg-zinc-950 border border-zinc-800 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-orange-600 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <div className="text-right text-[8px] font-mono text-zinc-500 tracking-widest uppercase mt-0.5">
          {Math.round((step / 3) * 100)}% concluído
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
           <ClipboardList className="w-48 h-48" />
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2 italic">
                <User className="w-3 h-3 text-orange-500" /> 01. SELECIONAR CLIENTE
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {initialClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setFormData({ ...formData, clienteId: client.id })}
                    className={`text-left p-6 rounded-2xl border transition-all relative overflow-hidden min-h-[80px] cursor-pointer ${formData.clienteId === client.id ? 'bg-zinc-950 border-orange-500 ring-1 ring-orange-500 shadow-xl' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <p className={`text-sm font-black uppercase tracking-tight italic break-words ${formData.clienteId === client.id ? 'text-orange-500' : 'text-white'}`}>{client.nome}</p>
                    <p className={`text-[9px] font-mono mt-2 flex flex-wrap items-center gap-2 ${formData.clienteId === client.id ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      <span>{client.cpf_cnpj}</span>
                      <span>•</span>
                      <span>{client.veiculos.length} VEÍCULOS</span>
                    </p>
                    {formData.clienteId === client.id && (
                      <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    )}
                  </button>
                ))}
                <button type="button" className="text-left p-6 rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-605 hover:bg-zinc-800/10 transition-all flex flex-col items-center justify-center gap-2 py-8 min-h-[100px] cursor-pointer group/btn">
                  <Plus className="w-5 h-5 text-zinc-750 group-hover/btn:text-zinc-400 transition-colors" />
                  <span className="text-[9px] font-mono text-zinc-600 group-hover/btn:text-zinc-400 uppercase tracking-widest text-center">Registrar Novo Cliente</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-zinc-800/50">
              <button
                disabled={!formData.clienteId}
                onClick={() => setStep(2)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-12 py-5 rounded-2xl flex items-center gap-3 transition-all disabled:opacity-20 uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-950/20 active:scale-95"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2 italic">
                <Truck className="w-3 h-3 text-orange-500" /> 02. VINCULAR VEÍCULO DE ATENDIMENTO
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
                {vehicles.length > 0 ? vehicles.map((vehicle: any) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setFormData({ ...formData, veiculoId: vehicle.id })}
                    className={`text-left p-6 rounded-2xl border transition-all relative overflow-hidden min-h-[100px] cursor-pointer ${formData.veiculoId === vehicle.id ? 'bg-zinc-950 border-orange-500 ring-1 ring-orange-500 shadow-xl' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'}`}
                  >
                     <div className="text-[10px] font-mono font-black text-orange-500 flex flex-wrap items-center gap-2 mb-3">
                       <span className="bg-orange-600/20 px-2 py-0.5 rounded border border-orange-600/30 tracking-widest">{vehicle.placa}</span>
                     </div>
                     <p className={`text-sm font-black uppercase italic break-all ${formData.veiculoId === vehicle.id ? 'text-white' : 'text-zinc-300'}`}>{vehicle.marca} • {vehicle.modelo}</p>
                     <p className="text-[9px] text-zinc-650 font-mono mt-2 uppercase">{vehicle.ano} • {vehicle.tipo}</p>
                  </button>
                )) : (
                  <div className="col-span-full py-12 px-6 text-center bg-zinc-950/50 border border-zinc-800/80 rounded-2xl italic text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] break-words">
                    CUIDADO: CLIENTE SEM ATIVOS VINCULADOS
                  </div>
                )}
                <button type="button" className="text-left p-6 rounded-2xl border border-dashed border-zinc-800 hover:border-zinc-650 hover:bg-zinc-800/10 transition-all flex flex-col items-center justify-center gap-2 py-8 min-h-[120px] cursor-pointer group/btn">
                  <Plus className="w-5 h-5 text-zinc-750 group-hover/btn:text-zinc-400 transition-colors" />
                  <span className="text-[9px] font-mono text-zinc-600 group-hover/btn:text-zinc-400 uppercase tracking-widest text-center">Vincular Novo Veículo</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-zinc-800/50">
              <button
                onClick={() => setStep(1)}
                className="text-zinc-600 hover:text-white font-black px-8 py-5 rounded-2xl transition-all uppercase tracking-widest text-[10px] border border-zinc-800 hover:bg-zinc-900 group active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> ETAPA ANTERIOR
                </div>
              </button>
              <button
                disabled={!formData.veiculoId}
                onClick={() => setStep(3)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-12 py-5 rounded-2xl flex items-center gap-3 transition-all disabled:opacity-20 uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-950/20 active:scale-95"
              >
                Continuar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2 italic">
                  <User className="w-3 h-3 text-orange-500" /> CORPO TÉCNICO (MECÂNICO)
                </label>
                <div className="relative">
                  <select
                    value={formData.mecanicoId}
                    onChange={(e) => setFormData({ ...formData, mecanicoId: e.target.value })}
                    className="w-full min-h-[48px] bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-10 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 transition-all font-black uppercase tracking-widest appearance-none cursor-pointer truncate"
                  >
                    <option value="">A DEFINIR (ESCRAVOS DA GRAXA)</option>
                    {initialMechanics.map(m => (
                      <option key={m.id} value={m.id}>{m.name.toUpperCase()} • {m.especialidade || 'MECÂNICA GERAL'}</option>
                    ))}
                  </select>
                  <ChevronRight className="w-4 h-4 text-zinc-650 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2 italic">
                  <Calendar className="w-3 h-3 text-orange-500" /> TETO DE ENTREGA (PREVISÃO)
                </label>
                <input
                  type="date"
                  value={formData.previsao}
                  onChange={(e) => setFormData({ ...formData, previsao: e.target.value })}
                  className="w-full min-h-[48px] bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 transition-all font-mono uppercase tracking-widest text-center"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-mono uppercase text-zinc-500 tracking-[0.2em] flex items-center gap-2 italic">
                <ClipboardList className="w-3 h-3 text-orange-500" /> LAUDO TÉCNICO / DIAGNÓSTICO PRELIMINAR
              </label>
              <textarea
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                rows={5}
                placeholder="REGISTRE AS FALHAS RELATADAS E CONTRAPONTOS TÉCNICOS..."
                className="w-full min-h-[140px] bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 transition-all resize-y shadow-inner font-mono tracking-tight"
              />
            </div>

            <div className="flex justify-between pt-6 border-t border-zinc-800/50">
              <button
                onClick={() => setStep(2)}
                className="text-zinc-600 hover:text-white font-black px-8 py-5 rounded-2xl transition-all uppercase tracking-widest text-[10px] border border-zinc-800 hover:bg-zinc-900 group active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> ETAPA ANTERIOR
                </div>
              </button>
              <button
                disabled={loading}
                onClick={handleSubmit}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-12 py-5 rounded-2xl flex items-center gap-3 transition-all disabled:bg-zinc-900 disabled:text-zinc-700 uppercase tracking-[0.2em] text-xs shadow-xl shadow-orange-950/20 active:scale-95"
              >
                {loading ? 'MODULANDO...' : 'FINALIZAR E GERAR ORDEM'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
