'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Save, Loader2, CheckCircle2, XCircle, 
  Camera, FileText, Hash, User, ClipboardCheck, 
  AlertCircle, ChevronRight, AlertTriangle, XOctagon,
  PenTool, RefreshCw, Eye, ShieldAlert, Check, CheckSquare,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  descricao: string;
  tipo: 'SIM_NAO' | 'FOTO' | 'TEXTO' | 'NUMERICO' | 'NUMERO';
  obrigatorio: boolean;
}

interface Checklist {
  id: string;
  nome: string;
  itens: ChecklistItem[];
}

const TIPO_VEICULOS = [
  { id: 'CAVALO_MECANICO', label: '🚚 Cavalo Mecânico' },
  { id: 'CARRETA', label: '🚛 Carreta' },
  { id: 'ONIBUS', label: '🚌 Ônibus / Coletivo' },
  { id: 'CAMINHAO_PESADO', label: '🚚 Caminhão Pesado (Truck)' },
  { id: 'UTILITARIO', label: '🚐 Utilitário / Van' },
  { id: 'ESCAVADEIRA_HIDRAULICA', label: '🚜 Escavadeira / Máquinas' },
  { id: 'OUTROS', label: '🚗 Outros' }
];

function normalizarChecklist(raw: any): Checklist | null {
  if (!raw || !raw.id) return null;
  const itensBrutos = raw?.itens ?? raw?.ChecklistItem ?? [];
  const itens = Array.isArray(itensBrutos) ? itensBrutos : [];
  return {
    id: String(raw.id),
    nome: String(raw.nome ?? '—'),
    itens: itens.map((i: any) => ({
      id: String(i.id),
      descricao: String(i.descricao ?? ''),
      tipo: i.tipo || 'TEXTO',
      obrigatorio: i.obrigatorio !== false,
    })),
  };
}

function isTipoNumerico(tipo: string): boolean {
  return tipo === 'NUMERO' || tipo === 'NUMERICO';
}

export default function ExecutarFormPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const osIdFromQuery = searchParams?.get('osId') || searchParams?.get('os_id');

  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [executadoPor, setExecutadoPor] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [ordens, setOrdens] = useState<any[]>([]);
  const [osId, setOsId] = useState<string>(osIdFromQuery || '');

  const [tipoVeiculo, setTipoVeiculo] = useState('CAVALO_MECANICO');
  const [laudoVeredito, setLaudoVeredito] = useState<'CONFORME' | 'NAO_CONFORME'>('CONFORME');
  const [signatureDrawing, setSignatureDrawing] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    fetch('/api/ordens', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : data.items || [];
        setOrdens(lista);
      })
      .catch(() => {});
  }, []);

  const fetchChecklist = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checklist/${id}`, { credentials: 'include' });
      if (res.ok) {
        const raw = await res.json();
        const normalizado = normalizarChecklist(raw);
        if (!normalizado) {
          toast.error('Protocolo de inspeção inválido.');
          router.push('/checklist/executar');
          return;
        }
        setChecklist(normalizado);
      } else {
        toast.error('Erro ao carregar protocolo de inspeção.');
        router.push('/checklist/executar');
      }
    } catch {
      toast.error('Falha de comunicação com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  useEffect(() => {
    if (!loading && id) {
      const savedDraft = sessionStorage.getItem(`checklist_draft_${id}`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.respostas) setRespostas(parsed.respostas);
          if (parsed.executadoPor) setExecutadoPor(parsed.executadoPor);
          if (parsed.observacoes) setObservacoes(parsed.observacoes);
          if (parsed.tipoVeiculo) setTipoVeiculo(parsed.tipoVeiculo);
          if (parsed.laudoVeredito) setLaudoVeredito(parsed.laudoVeredito);
          toast.success('Rascunho de inspeção recuperado.');
        } catch {
          // ignora rascunho corrompido
        }
      }
    }
  }, [loading, id]);

  useEffect(() => {
    if (!loading && id && checklist) {
      const interval = setInterval(() => {
        try {
          sessionStorage.setItem(
            `checklist_draft_${id}`,
            JSON.stringify({
              respostas,
              executadoPor,
              observacoes,
              tipoVeiculo,
              laudoVeredito,
            })
          );
        } catch {
          // sessionStorage pode estar indisponível
        }
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [loading, id, checklist, respostas, executadoPor, observacoes, tipoVeiculo, laudoVeredito]);

  const handleRespostaChange = (itemId: string, valor: any) => {
    const oldVal = respostas[itemId];
    if (oldVal && typeof oldVal === 'string' && oldVal.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(oldVal);
      } catch {
        // ignora
      }
    }
    setRespostas((prev) => ({ ...prev, [itemId]: valor }));
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#f97316';

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setSignatureDrawing(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignatureDrawing(null);
      }
    }
  };

  const handleFinalizar = async () => {
    if (!executadoPor.trim()) {
      toast.error('Informe o nome do técnico executor.');
      return;
    }

    if (checklist) {
      const faltantes = checklist.itens.filter((item) => {
        if (!item.obrigatorio) return false;
        const resp = respostas[item.id];
        return resp === undefined || resp === null || resp === '';
      });

      if (faltantes.length > 0) {
        toast.error(`Preencha os itens obrigatórios: ${faltantes.map(i => i.descricao).join(', ')}`);
        return;
      }
    }

    setSaving(true);
    try {
      const finalRespostas = {
        ...respostas,
        __meta_tipo_veiculo: tipoVeiculo,
        __meta_veredito_laudo: laudoVeredito,
        __meta_assinatura_digital: signatureDrawing || '',
      };

      const res = await fetch('/api/checklist/executar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist_id: id,
          os_id: osId || null,
          executado_por: executadoPor,
          observacoes,
          respostas: finalRespostas,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: null }));
        throw new Error(err.error || 'Erro ao salvar execução.');
      }

      const data = await res.json();
      const newExecucaoId = data.id;

      const pendingItemIds = Object.keys(pendingFiles);
      if (pendingItemIds.length > 0) {
        toast.loading('Sincronizando evidências fotográficas...', { id: 'upload-toast' });

        const uploadPromises = pendingItemIds.map(async (itemId) => {
          const file = pendingFiles[itemId];
          const formData = new FormData();
          formData.append('foto', file);
          formData.append('execucao_id', newExecucaoId);
          formData.append('item_id', itemId);

          await fetch('/api/checklist/upload-foto', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });
        });

        await Promise.all(uploadPromises);
        toast.success('Fotos enviadas com sucesso!', { id: 'upload-toast' });
      }

      try {
        sessionStorage.removeItem(`checklist_draft_${id}`);
      } catch {}

      toast.success('Inspeção finalizada com sucesso!');
      router.push(`/checklist/resultado/${newExecucaoId}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar finalização.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4 text-white bg-zinc-950">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] italic">
          Preparando Formulário Técnico...
        </p>
      </div>
    );
  }

  if (!checklist) return null;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-10 pb-20 py-4 sm:py-8 overflow-hidden text-white min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/checklist/executar"
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter line-clamp-1">
              {checklist.nome}
            </h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">
              EXECUÇÃO DE INSPEÇÃO
            </p>
          </div>
        </div>

        <button
          onClick={handleFinalizar}
          disabled={saving}
          className="hidden md:flex bg-orange-600 hover:bg-orange-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-2xl active:scale-95 disabled:opacity-50 items-center justify-center gap-3 italic shadow-orange-950/20 shrink-0"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={20} />}
          FINALIZAR E PUBLICAR LAUDO
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* RESPONSÁVEL E INFO */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-8 shadow-2xl lg:sticky lg:top-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-tight">
                Veredito do Mecânico
              </h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Técnico Mecânico Executor
                </label>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    type="text"
                    value={executadoPor}
                    onChange={(e) => setExecutadoPor(e.target.value)}
                    placeholder="DIGITE NOME"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 pl-14 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Especificador Veicular
                </label>
                <div className="relative">
                  <select
                    value={tipoVeiculo}
                    onChange={(e) => setTipoVeiculo(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-5 text-xs text-white font-bold cursor-pointer transition appearance-none outline-none focus:border-orange-500 pr-10"
                  >
                    {TIPO_VEICULOS.map((tv) => (
                      <option key={tv.id} value={tv.id}>
                        {tv.label.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Veredito do Veículo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setLaudoVeredito('CONFORME')}
                    className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition border ${
                      laudoVeredito === 'CONFORME'
                        ? 'bg-green-500/20 text-green-400 border-green-500/40 shadow-lg'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white'
                    }`}
                  >
                    CONFORME / APROVADO
                  </button>
                  <button
                    type="button"
                    onClick={() => setLaudoVeredito('NAO_CONFORME')}
                    className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition border ${
                      laudoVeredito === 'NAO_CONFORME'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-lg'
                        : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:text-white'
                    }`}
                  >
                    MEDIDAS / REPROVADO
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Observações Técnicas
                </label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="OBSERVAÇÕES ADICIONAIS..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-medium tracking-wide placeholder:text-zinc-700 resize-none leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                    Assinatura Digital
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[8px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Limpar caneta
                  </button>
                </div>
                <div className="relative border border-zinc-800 bg-zinc-950 rounded-2xl overflow-hidden h-32">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={128}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={endDrawing}
                    onMouseLeave={endDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={endDrawing}
                    className="w-full h-full cursor-crosshair touch-none"
                  />
                  {!signatureDrawing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-30">
                      <PenTool size={18} className="text-orange-500 mb-1" />
                      <p className="text-[8px] font-black uppercase tracking-widest">
                        Assine com o dedo ou mouse
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 text-[9px] text-zinc-500 font-black uppercase text-center flex items-center justify-center gap-2">
            <CheckSquare className="text-green-500 shrink-0" size={14} /> Salvamento automático a cada 4 segundos.
          </div>
        </div>

        {/* LISTA DE ITENS */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl mb-6">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">
              Vincular a Ordem de Serviço (Opcional)
            </label>
            <div className="relative">
              <select
                value={osId}
                onChange={(e) => setOsId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white font-bold outline-none focus:border-orange-500 cursor-pointer transition shadow-inner appearance-none pr-10"
              >
                <option value="">SEM VÍNCULO</option>
                {ordens.map((os) => (
                  <option key={os.id} value={os.id}>
                    OS #{os.numero} - {os.cliente?.nome}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {checklist.itens.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-12 text-center">
              <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-sm font-black text-white uppercase tracking-widest italic">
                Este checklist não tem itens cadastrados
              </p>
              <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-2">
                Edite o template e adicione itens antes de executar.
              </p>
            </div>
          )}

          {checklist.itens.map((item, index) => (
            <div
              key={item.id}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 sm:p-8 space-y-6 hover:border-orange-500/20 transition relative group shadow-xl"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center bg-zinc-950 border border-zinc-800 w-12 h-12 rounded-2xl shadow-inner shrink-0 group-hover:bg-orange-500/10 transition-colors">
                    <span className="text-xl font-black text-zinc-800 font-mono italic group-hover:text-orange-500/50 transition">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-white uppercase italic tracking-tight line-clamp-2">
                      {item.descricao}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest bg-zinc-950 px-2 py-1 rounded-full border border-zinc-800">
                        TIPO: {item.tipo.replace('_', ' ')}
                      </span>
                      {item.obrigatorio && (
                        <span className="text-[8px] text-orange-600 font-black uppercase tracking-widest border border-orange-600/30 px-2 py-0.5 rounded italic">
                          Obrigatório
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-900/50 rounded-3xl p-4 sm:p-6 min-h-24 flex items-center justify-center shadow-inner">
                {item.tipo === 'SIM_NAO' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                    <button
                      onClick={() => handleRespostaChange(item.id, 'OK')}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all min-h-[70px] ${
                        respostas[item.id] === 'OK'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-lg'
                          : 'bg-zinc-900 text-zinc-600 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <CheckCircle2 size={20} /> OK
                    </button>
                    <button
                      onClick={() => handleRespostaChange(item.id, 'MEDIO')}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all min-h-[70px] ${
                        respostas[item.id] === 'MEDIO'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-lg'
                          : 'bg-zinc-900 text-zinc-600 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <AlertTriangle size={20} /> MÉDIO
                    </button>
                    <button
                      onClick={() => handleRespostaChange(item.id, 'RUIM')}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all min-h-[70px] ${
                        respostas[item.id] === 'RUIM'
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-lg'
                          : 'bg-zinc-900 text-zinc-600 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <AlertCircle size={20} /> RUIM
                    </button>
                    <button
                      onClick={() => handleRespostaChange(item.id, 'CRITICO')}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all min-h-[70px] ${
                        respostas[item.id] === 'CRITICO'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg'
                          : 'bg-zinc-900 text-zinc-600 border border-transparent hover:bg-zinc-800'
                      }`}
                    >
                      <XOctagon size={20} /> CRÍTICO
                    </button>
                  </div>
                )}

                {item.tipo === 'FOTO' && (
                  <div className="w-full max-w-md space-y-4">
                    {respostas[item.id] && (
                      <div className="relative group">
                        <img
                          src={respostas[item.id]}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-2xl border border-zinc-800"
                        />
                        <button
                          onClick={() => handleRespostaChange(item.id, null)}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition shadow-lg"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-800 rounded-3xl hover:border-orange-500/40 transition cursor-pointer group">
                      <Camera className="mb-2 text-zinc-700 group-hover:text-orange-500 transition" size={32} />
                      <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest text-center">
                        {respostas[item.id] ? 'Trocar Imagem' : 'Capturar / Selecionar Foto'}
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const previewUrl = URL.createObjectURL(file);
                          handleRespostaChange(item.id, previewUrl);
                          setPendingFiles((prev) => ({ ...prev, [item.id]: file }));
                        }}
                      />
                    </label>
                  </div>
                )}

                {item.tipo === 'TEXTO' && (
                  <textarea
                    value={respostas[item.id] || ''}
                    onChange={(e) => handleRespostaChange(item.id, e.target.value)}
                    placeholder="DESCREVA O ESTADO DESTE ITEM..."
                    rows={3}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs text-white outline-none focus:border-orange-500 transition font-medium tracking-wide placeholder:text-zinc-700"
                  />
                )}

                {isTipoNumerico(item.tipo) && (
                  <div className="relative w-full max-w-xs group">
                    <Hash
                      className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors"
                      size={18}
                    />
                    <input
                      type="number"
                      value={respostas[item.id] || ''}
                      onChange={(e) => handleRespostaChange(item.id, e.target.value)}
                      placeholder="00.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-6 pl-16 pr-6 text-2xl font-black text-white font-mono outline-none focus:border-orange-500 transition text-center shadow-inner italic"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pt-6">
            <button
              onClick={handleFinalizar}
              disabled={saving}
              className="w-full group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400 transform translate-y-full group-hover:translate-y-0 transition duration-500" />
              <div className="relative bg-orange-600/10 border border-orange-600/30 group-hover:border-orange-500 py-10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition">
                {saving ? (
                  <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                ) : (
                  <Save size={32} className="text-orange-500 group-hover:text-white transition" />
                )}
                <div className="text-center">
                  <p className="text-[10px] text-orange-500 group-hover:text-white font-black uppercase tracking-[0.4em] transition">
                    Inspeção completa e validada
                  </p>
                  <p className="text-2xl font-black text-white uppercase italic tracking-tighter">
                    FINALIZAR E GERAR LAUDO
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
