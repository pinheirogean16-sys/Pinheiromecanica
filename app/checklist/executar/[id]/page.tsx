'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Save, Loader2, CheckCircle2, XCircle, 
  Camera, Hash, User, AlertCircle, AlertTriangle, 
  XOctagon, PenTool, RefreshCw, Check, Calendar,
  ChevronDown, FileText, CheckSquare
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
  { id: 'CAVALO_MECANICO', label: 'Cavalo Mecânico' },
  { id: 'CARRETA', label: 'Carreta' },
  { id: 'ONIBUS', label: 'Ônibus / Coletivo' },
  { id: 'CAMINHAO_PESADO', label: 'Caminhão Pesado' },
  { id: 'UTILITARIO', label: 'Utilitário / Van' },
  { id: 'ESCAVADEIRA_HIDRAULICA', label: 'Escavadeira / Máquinas' },
  { id: 'OUTROS', label: 'Outros' }
];

function normalizarChecklist(raw: any): Checklist | null {
  if (!raw || !raw.id) return null;
  const itensBrutos = raw?.itens ?? raw?.ChecklistItem ?? [];
  return {
    id: String(raw.id),
    nome: String(raw.nome ?? '—'),
    itens: Array.isArray(itensBrutos) ? itensBrutos.map((i: any) => ({
      id: String(i.id),
      descricao: String(i.descricao ?? ''),
      tipo: i.tipo || 'TEXTO',
      obrigatorio: i.obrigatorio !== false,
    })) : [],
  };
}

async function compressImage(file: File, maxWidth = 1280, quality = 0.8): Promise<File> {
  if (file.size <= 500 * 1024) return file;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(file);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) return resolve(file);
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', quality);
        } catch { resolve(file); }
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
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
  const [uploadProgress, setUploadProgress] = useState<string>('');

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
      .then((data) => setOrdens(Array.isArray(data) ? data : data.items || []))
      .catch(() => {});
  }, []);

  const fetchChecklist = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/checklist/${id}`, { 
        credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const normalizado = normalizarChecklist(await res.json());
        if (!normalizado) throw new Error();
        setChecklist(normalizado);
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Erro ao carregar checklist.');
      router.push('/checklist');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchChecklist(); }, [fetchChecklist]);

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
        } catch {}
      }
    }
  }, [loading, id]);

  useEffect(() => {
    if (!loading && id && checklist) {
      const interval = setInterval(() => {
        try {
          sessionStorage.setItem(`checklist_draft_${id}`, JSON.stringify({
            respostas, executadoPor, observacoes, tipoVeiculo, laudoVeredito,
          }));
        } catch {}
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [loading, id, checklist, respostas, executadoPor, observacoes, tipoVeiculo, laudoVeredito]);

  const handleRespostaChange = (itemId: string, valor: any) => {
    const oldVal = respostas[itemId];
    if (oldVal && typeof oldVal === 'string' && oldVal.startsWith('blob:')) {
      try { URL.revokeObjectURL(oldVal); } catch {}
    }
    setRespostas((prev) => ({ ...prev, [itemId]: valor }));
  };

  const startDrawing = (e: any) => {
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

  const draw = (e: any) => {
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
    if (canvas) setSignatureDrawing(canvas.toDataURL('image/png'));
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
        toast.error(`Preencha os obrigatórios: ${faltantes.map(i => i.descricao).join(', ')}`);
        return;
      }
    }

    setSaving(true);
    setUploadProgress('');

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
        toast.loading(`Enviando ${pendingItemIds.length} foto(s)...`, { id: 'upload-toast' });

        await Promise.all(pendingItemIds.map(async (itemId, idx) => {
          const file = pendingFiles[itemId];
          setUploadProgress(`${idx + 1}/${pendingItemIds.length}`);
          const compressedFile = await compressImage(file);
          const formData = new FormData();
          formData.append('foto', compressedFile);
          formData.append('execucao_id', newExecucaoId);
          formData.append('item_id', itemId);

          const uploadRes = await fetch('/api/checklist/upload-foto', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}));
            throw new Error(errData.error || 'Falha ao enviar foto.');
          }
        }));

        toast.success('Fotos enviadas!', { id: 'upload-toast' });
      }

      try { sessionStorage.removeItem(`checklist_draft_${id}`); } catch {}
      toast.success('Inspeção finalizada!');
      router.push(`/checklist/resultado/${newExecucaoId}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao finalizar.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  // ✅ CÁLCULO DE PROGRESSO
  const totalObrigatorios = useMemo(() => {
    return checklist?.itens.filter(i => i.obrigatorio).length || 0;
  }, [checklist]);

  const preenchidos = useMemo(() => {
    if (!checklist) return 0;
    return checklist.itens.filter(item => {
      const resp = respostas[item.id];
      return resp !== undefined && resp !== null && resp !== '';
    }).length;
  }, [checklist, respostas]);

  const progressoPercent = checklist ? Math.round((preenchidos / checklist.itens.length) * 100) : 0;

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 text-white bg-zinc-950">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] italic">Preparando Formulário...</p>
      </div>
    );
  }

  if (!checklist) return null;

  return (
    <div className="w-full max-w-[1300px] mx-auto pb-32 pt-6 px-4 sm:px-6 bg-zinc-950 min-h-screen text-white">
      
      {/* HEADER DO CHECKLIST */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/checklist" className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-0.5">Execução de Inspeção</p>
            <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter truncate max-w-[250px] sm:max-w-md">{checklist.nome}</h1>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Progresso da Inspeção</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-32 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progressoPercent}%` }} />
            </div>
            <span className="text-xs font-black text-white font-mono">{progressoPercent}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUNA ESQUERDA: CONTEXTO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl lg:sticky lg:top-6">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Informações de Pátio</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-2">
                  <User size={12} className="text-orange-500" /> Técnico Executor
                </label>
                <input
                  type="text"
                  value={executadoPor}
                  onChange={(e) => setExecutadoPor(e.target.value)}
                  placeholder="NOME DO MECÂNICO"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-black uppercase tracking-widest placeholder:text-zinc-700"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-2">
                  <CheckSquare size={12} className="text-orange-500" /> Tipo de Veículo
                </label>
                <div className="relative">
                  <select
                    value={tipoVeiculo}
                    onChange={(e) => setTipoVeiculo(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-bold uppercase tracking-wider appearance-none cursor-pointer"
                  >
                    {TIPO_VEICULOS.map((tv) => (
                      <option key={tv.id} value={tv.id}>{tv.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-2">
                  <FileText size={12} className="text-orange-500" /> Vincular à OS
                </label>
                <div className="relative">
                  <select
                    value={osId}
                    onChange={(e) => setOsId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition font-bold appearance-none cursor-pointer truncate"
                  >
                    <option value="">Nenhuma OS vinculada</option>
                    {ordens.map((os) => (
                      <option key={os.id} value={os.id}>OS #{os.numero} - {os.cliente?.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: CHECKLIST E ASSINATURA */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* ITENS DO CHECKLIST */}
          {checklist.itens.map((item, index) => {
            const isSelected = (val: string) => respostas[item.id] === val;
            
            // ✅ FEEDBACK VISUAL NA BORDA DO CARD
            let borderColor = 'border-l-zinc-600';
            if (isSelected('OK')) borderColor = 'border-l-green-500';
            else if (isSelected('MEDIO')) borderColor = 'border-l-yellow-500';
            else if (isSelected('RUIM')) borderColor = 'border-l-orange-500';
            else if (isSelected('CRITICO')) borderColor = 'border-l-red-500';
            else if (respostas[item.id]) borderColor = 'border-l-blue-500'; 

            return (
              <div key={item.id} className={`bg-zinc-900 border border-zinc-800 border-l-4 ${borderColor} rounded-2xl p-5 flex flex-col gap-5 shadow-lg transition-colors group`}>
                
                {/* Header do Item */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-zinc-400 font-mono">{(index + 1).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="text-sm font-black text-white uppercase tracking-wide leading-tight">{item.descricao}</h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-800 font-bold uppercase tracking-wider">{item.tipo.replace('_', ' ')}</span>
                      {item.obrigatorio && <span className="text-[9px] text-orange-500 font-black uppercase tracking-wider">* Obrigatório</span>}
                    </div>
                  </div>
                </div>

                {/* Corpo do Item (Ações) */}
                <div className="pl-14">
                  {item.tipo === 'SIM_NAO' && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button onClick={() => handleRespostaChange(item.id, 'OK')} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition border ${isSelected('OK') ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-inner' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}>
                        <CheckCircle2 size={16} /> OK
                      </button>
                      <button onClick={() => handleRespostaChange(item.id, 'MEDIO')} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition border ${isSelected('MEDIO') ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 shadow-inner' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}>
                        <AlertTriangle size={16} /> Médio
                      </button>
                      <button onClick={() => handleRespostaChange(item.id, 'RUIM')} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition border ${isSelected('RUIM') ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-inner' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}>
                        <AlertCircle size={16} /> Ruim
                      </button>
                      <button onClick={() => handleRespostaChange(item.id, 'CRITICO')} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition border ${isSelected('CRITICO') ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-inner' : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:bg-zinc-800'}`}>
                        <XOctagon size={16} /> Crítico
                      </button>
                    </div>
                  )}

                  {item.tipo === 'FOTO' && (
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {respostas[item.id] && (
                        <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden border border-zinc-700 group/img shrink-0">
                          <img src={respostas[item.id]} alt="Preview" className="w-full h-full object-cover" />
                          <button onClick={() => handleRespostaChange(item.id, null)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition shadow-lg"><XCircle size={14} /></button>
                        </div>
                      )}
                      <label className="flex flex-col items-center justify-center gap-1 w-full sm:w-48 h-24 bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-xl hover:border-orange-500/50 hover:bg-zinc-900 transition cursor-pointer shrink-0">
                        <Camera size={20} className="text-zinc-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">
                          {respostas[item.id] ? 'Trocar Foto' : 'Anexar Foto'}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleRespostaChange(item.id, URL.createObjectURL(file));
                          setPendingFiles((prev) => ({ ...prev, [item.id]: file }));
                        }} />
                      </label>
                    </div>
                  )}

                  {item.tipo === 'TEXTO' && (
                    <textarea
                      value={respostas[item.id] || ''}
                      onChange={(e) => handleRespostaChange(item.id, e.target.value)}
                      placeholder="Descreva o estado deste item..."
                      rows={2}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition resize-none placeholder:text-zinc-700"
                    />
                  )}

                  {(item.tipo === 'NUMERICO' || item.tipo === 'NUMERO') && (
                    <div className="relative w-full max-w-[200px]">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                      <input
                        type="number"
                        value={respostas[item.id] || ''}
                        onChange={(e) => handleRespostaChange(item.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-base font-black text-white font-mono outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* FOOTER: ASSINATURA E VEREDITO */}
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
              <div className="w-1.5 h-4 bg-orange-600 rounded-full" />
              <h2 className="text-sm font-black uppercase tracking-widest text-white">Fechamento do Laudo</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-3 block">Veredito Final do Veículo</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setLaudoVeredito('CONFORME')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition flex flex-col items-center gap-2 ${laudoVeredito === 'CONFORME' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                      <CheckCircle2 size={20} /> Aprovado
                    </button>
                    <button onClick={() => setLaudoVeredito('NAO_CONFORME')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition flex flex-col items-center gap-2 ${laudoVeredito === 'NAO_CONFORME' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-zinc-950 text-zinc-500 border-zinc-800'}`}>
                      <XCircle size={20} /> Reprovado
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest mb-2 block">Observações Finais</label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Parecer técnico adicional..."
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-white outline-none focus:border-orange-500 transition resize-none placeholder:text-zinc-700"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] text-zinc-400 uppercase font-black tracking-widest flex items-center gap-2">
                    <PenTool size={12} className="text-orange-500" /> Assinatura Digital
                  </label>
                  <button onClick={clearSignature} className="text-[9px] font-black text-orange-500 uppercase tracking-wider hover:underline">Limpar</button>
                </div>
                <div className="relative border-2 border-dashed border-zinc-700 bg-zinc-950 rounded-2xl overflow-hidden h-[200px] hover:border-zinc-600 transition">
                  <canvas
                    ref={canvasRef} width={400} height={200}
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={endDrawing} onMouseLeave={endDrawing}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={endDrawing}
                    className="w-full h-full cursor-crosshair touch-none"
                  />
                  {!signatureDrawing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
                      <PenTool size={24} className="text-white mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Assine no quadro acima</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* BOTÃO FIXO DE FINALIZAR (Mobile e Desktop) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800 z-50">
        <div className="max-w-[1300px] mx-auto flex flex-col sm:flex-row items-center gap-4">
          
          {/* Mobile Progress */}
          <div className="w-full sm:hidden flex items-center justify-between px-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Preenchidos: {preenchidos} de {checklist.itens.length}</span>
            <span className="text-[10px] font-black text-orange-500">{progressoPercent}%</span>
          </div>

          <button
            onClick={handleFinalizar}
            disabled={saving}
            className="w-full sm:flex-1 bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {saving ? (
              <>
                <Loader2 size={20} className="animate-spin" /> 
                {uploadProgress ? `Enviando Fotos (${uploadProgress})...` : 'Finalizando...'}
              </>
            ) : (
              <>
                <Save size={20} /> Finalizar e Gerar Laudo
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
