'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, Loader2, ClipboardCheck, 
  CheckCircle2, Camera, XCircle, AlertCircle, Check, TriangleAlert, Minus,
  ChevronDown // 👈 CORREÇÃO: import adicionado
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import FotoUpload from '@/components/checklist/FotoUpload';

export default function ExecutarChecklistPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osIdParam = searchParams.get('osId');
  const { id } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checklist, setChecklist] = useState<any>(null);
  const [ordens, setOrdens] = useState<any[]>([]);
  const [osId, setOsId] = useState(osIdParam || '');
  const [observacoes, setObservacoes] = useState('');
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [execucaoId, setExecucaoId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const progressStats = useMemo(() => {
    if (!checklist?.itens) return { total: 0, answered: 0, percent: 0 };
    const total = checklist.itens.length;
    const answered = checklist.itens.filter((item: any) => {
      const resp = respostas[item.id];
      return resp !== null && resp !== undefined && resp !== '';
    }).length;
    const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
    return { total, answered, percent };
  }, [checklist, respostas]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [cRes, oRes] = await Promise.all([
          fetch(`/api/checklist/${id}`),
          fetch('/api/ordens')
        ]);
        
        if (cRes.ok) {
          const data = await cRes.json();
          setChecklist(data);
          const initialRespostas: Record<string, any> = {};
          data.itens.forEach((item: any) => {
            initialRespostas[item.id] = item.tipo === 'SIM_NAO' ? null : '';
          });
          setRespostas(initialRespostas);
        } else {
          setError(true);
        }
        
        if (oRes.ok) {
          const data = await oRes.json();
          setOrdens(data.items || data || []);
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const startExecution = async () => {
    if (execucaoId) return execucaoId;
    
    try {
      const res = await fetch(`/api/checklist/${id}/executar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          osId: osId || null,
          respostas: {},
          observacoes: '',
          executadoPor: 'Mecânico'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setExecucaoId(data.id);
        return data.id;
      }
    } catch (err) {
      console.error('Falha ao iniciar execução:', err);
    }
    return null;
  };

  const handleResposta = (itemId: string, val: any) => {
    setRespostas(prev => ({ ...prev, [itemId]: val }));
  };

  const handleFocus = (e: React.FocusEvent<any>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSavePartial = async () => {
    let currentExecId = execucaoId;
    if (!currentExecId) {
      currentExecId = await startExecution();
      if (!currentExecId) {
        toast.error('Não foi possível iniciar o registro de protocolo.');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/execucao/${currentExecId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          osId: osId || null,
          respostas,
          observacoes,
          executadoPor: 'Mecânico'
        })
      });
      if (res.ok) {
        toast.success('Rascunho de protocolo guardado com sucesso!');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Falha ao salvar rascunho');
      }
    } catch (error) {
      console.error('Erro de rede ao salvar rascunho:', error);
      toast.error('Erro de conexão ao servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    let currentExecId = execucaoId;
    if (!currentExecId) {
        currentExecId = await startExecution();
        if (!currentExecId) {
          toast.error('Não foi possível iniciar o registro de protocolo.');
          return;
        }
    }

    const missing = checklist.itens.filter((item: any) => 
      item.obrigatorio && (respostas[item.id] === null || respostas[item.id] === '')
    );

    if (missing.length > 0) {
      toast.error(`Preencha os itens obrigatórios: ${missing.map((m: any) => m.descricao).join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/checklist/execucao/${currentExecId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          osId: osId || null,
          respostas,
          observacoes,
          executadoPor: 'Mecânico'
        })
      });

      if (res.ok) {
        toast.success('Checklist finalizado com sucesso!');
        router.push('/checklist');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Falha ao salvar execução');
      }
    } catch (error) {
      console.error('Erro ao salvar execução:', error);
      toast.error('Erro de conexão ao servidor');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-zinc-500 font-black uppercase tracking-[0.4em] italic text-xs">Carregando Protocolo...</p>
      </div>
    );
  }

  if (error || !checklist) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-xl font-black text-white uppercase">Protocolo não encontrado</h2>
        <Link href="/checklist" className="text-orange-500 font-bold uppercase text-xs tracking-widest mt-4">
          Voltar para listagem
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-950 min-h-screen text-white pb-32 md:pb-20">
      {/* STICKY PROGRESS BAR */}
      <div className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 py-3.5 px-4 shadow-xl">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between gap-4">
          
          <div className="flex flex-col md:hidden leading-none min-w-0">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Procedimento</span>
            <span className="text-xs font-black text-white font-mono mt-0.5 truncate">Fase {progressStats.answered} de {progressStats.total}</span>
          </div>

          <div className="flex flex-col md:hidden text-right leading-none shrink-0 border-l border-zinc-800 pl-4">
            <span className="text-xs font-black text-orange-500 font-mono">{progressStats.percent}%</span>
            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5">CONCLUÍDO</span>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="leading-none">
              <p className="text-xs font-black text-white uppercase tracking-tight">Inspeção em Andamento</p>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Protocolo industrial ativo</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-right shrink-0 leading-none">
            <span className="text-xs font-bold text-zinc-300 font-mono">{progressStats.answered} de {progressStats.total} respondidos</span>
            <span className="text-xs font-black text-orange-500 font-mono bg-orange-950/20 border border-orange-900/40 px-2.5 py-1 rounded-lg">{progressStats.percent}%</span>
          </div>

          <div className="hidden sm:block flex-1 md:max-w-[200px] h-2 bg-zinc-900 w-full rounded-full overflow-hidden border border-zinc-800 self-center">
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-300"
              style={{ width: `${progressStats.percent}%` }}
            />
          </div>

        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 space-y-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link href="/checklist" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group">
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter line-clamp-1">{checklist.nome}</h1>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">EMISSÃO DE LAUDO TÉCNICO</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="hidden md:flex bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 items-center justify-center gap-3 italic disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            Finalizar Protocolo
          </button>
        </div>

        {/* OS Selection Context */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
             <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Vincular Ordem de Serviço</h2>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">OS (Opcional)</label>
            <div className="relative">
              <select 
                value={osId} 
                onFocus={handleFocus}
                onChange={(e) => setOsId(e.target.value)} 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-blue-500 transition font-black uppercase tracking-widest appearance-none cursor-pointer shadow-inner pr-10"
              >
                <option value="">Sem vínculo</option>
                {ordens.map((os: any) => (
                  <option key={os.id} value={os.id}>OS #{os.numero} - {os.cliente?.nome || 'Cliente'}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Execution Items */}
        <div className="space-y-4">
          {checklist.itens.map((item: any, index: number) => (
            <div 
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-start gap-4 hover:border-orange-500/20 transition-all group"
            >
              <div className="flex items-center justify-center bg-zinc-950 border border-zinc-800 w-12 h-12 rounded-xl shadow-inner shrink-0 group-hover:border-orange-500/30">
                 <span className="text-lg font-black text-zinc-800 font-mono italic group-hover:text-orange-500/30 transition-colors">{(index + 1).toString().padStart(2, '0')}</span>
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                 <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-tight break-words pr-2">{item.descricao}</h3>
                    {item.obrigatorio && (
                      <span className="text-[8px] bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border border-red-500/20 shrink-0">Obrigatório</span>
                    )}
                 </div>
                 <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest leading-none">Canal: {item.tipo.replace('_', ' ')}</p>

                 <div className="pt-2 w-full">
                   {item.tipo === 'SIM_NAO' && (
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                        <button 
                          type="button"
                          onClick={() => handleResposta(item.id, true)}
                          className={`flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl font-black uppercase tracking-wider text-xs italic transition-all border cursor-pointer ${
                            respostas[item.id] === true 
                            ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-950/30' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Check size={14} className="shrink-0" />
                          Conforme
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleResposta(item.id, false)}
                          className={`flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl font-black uppercase tracking-wider text-xs italic transition-all border cursor-pointer ${
                            respostas[item.id] === false 
                            ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-950/30' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <TriangleAlert size={14} className="shrink-0" />
                          Inconforme
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleResposta(item.id, 'NA')}
                          className={`flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl font-black uppercase tracking-wider text-xs italic transition-all border cursor-pointer ${
                            respostas[item.id] === 'NA' 
                            ? 'bg-zinc-700 border-zinc-600 text-white' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <Minus size={14} className="shrink-0" />
                          N/A
                        </button>
                     </div>
                   )}

                   {item.tipo === 'TEXTO' && (
                     <input 
                       type="text"
                       onFocus={handleFocus}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest shadow-inner placeholder:text-zinc-700 min-h-[48px]"
                       placeholder="DIGITE O RESULTADO TÉCNICO..."
                       value={respostas[item.id] || ''}
                       onChange={(e) => handleResposta(item.id, e.target.value)}
                     />
                   )}

                   {(item.tipo === 'NUMERO' || item.tipo === 'NUMERICO') && (
                     <input 
                       type="number"
                       onFocus={handleFocus}
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black italic shadow-inner placeholder:text-zinc-700 text-right tabular-nums min-h-[48px]"
                       placeholder="VALOR MEDIDO"
                       value={respostas[item.id] || ''}
                       onChange={(e) => handleResposta(item.id, e.target.value)}
                     />
                   )}

                   {item.tipo === 'FOTO' && (
                     <div className="space-y-4">
                        {!execucaoId ? (
                            <div className="p-6 bg-zinc-950 border border-zinc-800 border-dashed rounded-xl flex flex-col items-center gap-3 text-center">
                                <AlertCircle size={20} className="text-zinc-700" />
                                <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest italic">Inicie o protocolo antes de enviar fotos</p>
                                <button 
                                    type="button"
                                    onClick={startExecution}
                                    className="px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:border-orange-500 transition-all min-h-[44px]"
                                >Primeiro passo: Iniciar Protocolo</button>
                            </div>
                        ) : (
                            <FotoUpload 
                                execucaoId={execucaoId} 
                                itemId={item.id}
                                onUploadComplete={(url) => handleResposta(item.id, url)}
                            />
                        )}
                     </div>
                   )}
                 </div>
              </div>
            </div>
          ))}

          {/* OBSERVATIONS AND BOTTOM PANEL */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
             <div className="flex items-center gap-3">
                <div className="w-1.5 h-4 bg-zinc-700 rounded-full" />
                <h2 className="text-sm font-black text-white uppercase italic tracking-tight">Observações Adicionais</h2>
             </div>
             <textarea 
               onFocus={handleFocus}
               placeholder="REGISTRE AQUI DETALHES TÉCNICOS ADICIONAIS OU ANOMALIAS NÃO LISTADAS..."
               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-5 text-xs text-white outline-none focus:border-zinc-700 transition font-medium tracking-wide shadow-inner min-h-[120px] h-32 placeholder:text-zinc-700 resize-y"
               value={observacoes}
               onChange={(e) => setObservacoes(e.target.value)}
             />
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM DOCK FOR MOBILE ACTIONS */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-4 z-40 md:hidden flex items-center justify-between gap-3 pb-safe pb-5 shadow-2xl">
        <button
          type="button"
          onClick={handleSavePartial}
          disabled={saving}
          className="flex-1 min-h-[50px] flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          SALVAR RASCUNHO
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 min-h-[50px] flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition active:scale-[0.98] shadow-lg shadow-orange-950/20 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          CONCLUIR PROTOCOLO
        </button>
      </div>
    </div>
  );
}
