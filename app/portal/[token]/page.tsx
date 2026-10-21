'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  Loader2, AlertTriangle, CheckCircle2, 
  Calendar, Gauge, PenTool, Eraser, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { BRANDING } from '@/lib/branding';

export default function PortalClientePage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assinaturaFeita, setAssinaturaFeita] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/portal/${token}`, { signal });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Erro ao carregar');

      setData(json);
      if (json.assinatura_cliente) {
        setAssinaturaFeita(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // ============================================================
  // LÓGICA DE DESENHO NO CANVAS (ASSINATURA)
  // ============================================================
  const startDrawing = (e: any) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a'; // Azul escuro para parecer caneta
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e: any) => {
    if (!isDrawing.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleConfirmarAssinatura = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    // Verifica se o canvas está em branco (truque básico checando a string base64)
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error('Por favor, assine no quadro antes de confirmar.');
      return;
    }

    const base64 = canvas.toDataURL('image/png');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/portal/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assinatura_base64: base64 }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao assinar');

      toast.success('Documento assinado com sucesso!');
      setAssinaturaFeita(true);
      setIsSigning(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro de conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // RENDERIZAÇÃO
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Abrindo documento...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center p-6 text-center gap-4">
        <AlertTriangle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-black text-zinc-900 uppercase">Link Inválido</h1>
        <p className="text-sm text-zinc-600">Este link expirou ou não existe. Solicite um novo link à oficina.</p>
      </div>
    );
  }

  const { empresa, veiculo, cliente } = data;
  const logo = empresa?.logo_url || BRANDING?.logo?.url;

  return (
    <div className="min-h-screen bg-zinc-100 py-6 px-4 font-sans text-zinc-900 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* CABEÇALHO */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 text-center space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-600" />
          
          {logo ? (
            <img src={logo} alt={empresa?.nome_fantasia} className="h-16 mx-auto object-contain" />
          ) : (
            <h1 className="text-2xl font-black uppercase">{empresa?.nome_fantasia || BRANDING.name}</h1>
          )}
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight text-zinc-800">Relatório de Serviço</h2>
            <p className="text-xs text-zinc-500 font-mono mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* DADOS DO VEÍCULO */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Veículo</span>
            <span className="bg-zinc-900 text-white px-3 py-1 rounded text-sm font-bold font-mono tracking-widest">{veiculo.placa}</span>
          </div>
          <div>
            <p className="text-lg font-black text-zinc-900 uppercase">{veiculo.marca} {veiculo.modelo}</p>
            <p className="text-sm text-zinc-500 font-medium">Proprietário: {cliente.nome}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase">KM Registrado</span>
              <span className="font-mono font-black text-lg">{veiculo.km?.toLocaleString('pt-BR') || '---'}</span>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
              <span className="block text-[10px] font-bold text-zinc-400 uppercase">Horímetro</span>
              <span className="font-mono font-black text-lg">{veiculo.horimetro || '0'}h</span>
            </div>
          </div>
        </div>

        {/* SERVIÇO REALIZADO */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 space-y-3">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <ShieldCheck size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Serviço Executado</span>
          </div>
          <h3 className="text-xl font-black uppercase leading-tight">{data.nome}</h3>
          {data.descricao && (
            <p className="text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100 italic">
              "{data.descricao}"
            </p>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Calendar size={16} className="text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500 uppercase">
              Próxima Revisão: {data.proxima_data ? new Date(data.proxima_data).toLocaleDateString('pt-BR') : 'A definir'}
            </span>
          </div>
        </div>

        {/* GALERIA DE FOTOS */}
        {data.fotos && data.fotos.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Registro Fotográfico</span>
              <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{data.fotos.length} fotos</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.fotos.map((foto: string, idx: number) => (
                <a key={idx} href={foto} target="_blank" rel="noreferrer" className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group">
                  <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA DE ASSINATURA */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200 space-y-4">
          <div className="text-center">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800">Assinatura do Cliente</h3>
            <p className="text-[11px] text-zinc-500 mt-1">Assine abaixo para confirmar a entrega e aprovação do serviço.</p>
          </div>

          {assinaturaFeita ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-emerald-700 uppercase">Documento Assinado</h4>
              <p className="text-xs text-emerald-600">A assinatura foi registrada com sucesso e já está anexada à Ordem de Serviço.</p>
              {data.assinatura_cliente && (
                <img src={data.assinatura_cliente} alt="Assinatura" className="max-h-24 mx-auto mix-blend-multiply opacity-80" />
              )}
            </div>
          ) : isSigning ? (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 relative overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full h-48 touch-none cursor-crosshair bg-transparent relative z-10"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 text-zinc-300 font-bold uppercase tracking-widest text-sm">
                  Assine com o dedo aqui
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="px-4 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <Eraser size={16} /> Limpar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarAssinatura}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting ? 'Enviando...' : 'Confirmar Assinatura'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsSigning(true)}
              className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition shadow-xl"
            >
              <PenTool size={18} /> Assinar Documento
            </button>
          )}
        </div>

        {/* RODAPÉ */}
        <div className="text-center pb-8 space-y-2">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            Gerado por {BRANDING.name}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono">
            {empresa?.telefone && `Tel: ${empresa.telefone}`}
            {empresa?.endereco && ` • ${empresa.endereco}`}
          </p>
        </div>

      </div>
    </div>
  );
}
