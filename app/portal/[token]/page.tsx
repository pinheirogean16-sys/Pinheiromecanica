'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  Loader2, AlertTriangle, CheckCircle2, 
  Calendar, PenTool, Eraser, ShieldCheck, TrendingUp, Gauge, Clock
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

    ctx.strokeStyle = '#0f172a';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center justify-center gap-4 px-4">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin" />
        <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest text-center">Abrindo documento...</p>
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

  // ✅ REGRA PARA MOSTRAR KM OU HORÍMETRO
  // Verifica se o tipo é KM/HORAS, se tem intervalo ou se tem o próximo alvo definido
  const temKm = data.tipo_controle === 'KM' || data.tipo_controle === 'MISTO' || !!data.intervalo_km || !!data.proximo_km;
  const temHoras = data.tipo_controle === 'HORAS' || data.tipo_controle === 'MISTO' || !!data.intervalo_horas || !!data.proximo_horimetro;

  return (
    <div className="min-h-screen bg-zinc-100 py-6 px-3 sm:px-6 font-sans text-zinc-900 pb-20 w-full overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-4 w-full">
        
        {/* CABEÇALHO */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 text-center space-y-3 relative overflow-hidden w-full">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-600" />
          
          {logo ? (
            <img src={logo} alt={empresa?.nome_fantasia} className="h-14 sm:h-16 mx-auto object-contain" />
          ) : (
            <h1 className="text-xl sm:text-2xl font-black uppercase">{empresa?.nome_fantasia || BRANDING.name}</h1>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-800">Relatório de Serviço</h2>
            <p className="text-[10px] sm:text-xs text-zinc-500 font-mono mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* DADOS DO VEÍCULO */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 space-y-4 w-full">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-400">Veículo</span>
            <span className="bg-zinc-900 text-white px-2 py-1 rounded text-xs font-bold font-mono tracking-widest flex-shrink-0">{veiculo.placa}</span>
          </div>
          
          <div className="w-full">
            <p className="text-base font-black text-zinc-900 uppercase break-words leading-tight">{veiculo.marca} {veiculo.modelo}</p>
            <p className="text-xs text-zinc-500 font-medium mt-1 break-words">Proprietário: {cliente.nome}</p>
          </div>
          
          {/* ✅ MOSTRA KM E/OU HORÍMETRO ATUAL */}
          <div className="grid grid-cols-1 gap-2 w-full">
            {temKm && (
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge size={16} className="text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">KM Atual</span>
                </div>
                <span className="font-mono font-black text-sm text-zinc-800">
                  {veiculo.km ? `${veiculo.km.toLocaleString('pt-BR')} KM` : 'Não reg.'}
                </span>
              </div>
            )}
            
            {temHoras && (
              <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Horímetro Atual</span>
                </div>
                <span className="font-mono font-black text-sm text-zinc-800">
                  {veiculo.horimetro ? `${veiculo.horimetro} h` : '0 h'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SERVIÇO REALIZADO */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 space-y-4 w-full">
          <div className="flex items-center gap-2 text-orange-600">
            <ShieldCheck size={20} className="flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">Serviço Executado</span>
          </div>
          
          <h3 className="text-base sm:text-lg font-black uppercase leading-tight break-words">{data.nome}</h3>
          
          {data.descricao && (
            <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-xl border border-zinc-100 italic break-words">
              "{data.descricao}"
            </p>
          )}
          
          {/* ✅ PRÓXIMAS TROCAS E DATA */}
          <div className="flex flex-col gap-2 pt-2 w-full">
            {temKm && (data.proximo_km || data.intervalo_km) && (
              <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100 w-full overflow-hidden">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Próxima Troca (KM)</span>
                  <span className="text-xs font-bold text-zinc-700 truncate">
                    Alvo: {data.proximo_km ? `${data.proximo_km.toLocaleString('pt-BR')} KM` : 'A definir'}
                    {data.intervalo_km ? ` (a cada ${data.intervalo_km.toLocaleString('pt-BR')} KM)` : ''}
                  </span>
                </div>
              </div>
            )}

            {temHoras && (data.proximo_horimetro || data.intervalo_horas) && (
              <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100 w-full overflow-hidden">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                  <TrendingUp size={16} />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Próxima Troca (Horas)</span>
                  <span className="text-xs font-bold text-zinc-700 truncate">
                    Alvo: {data.proximo_horimetro ? `${data.proximo_horimetro} h` : 'A definir'}
                    {data.intervalo_horas ? ` (a cada ${data.intervalo_horas} h)` : ''}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100 w-full overflow-hidden">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                <Calendar size={16} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase">Data Prevista</span>
                <span className="text-xs font-bold text-zinc-700 truncate">
                  {data.proxima_data ? new Date(data.proxima_data).toLocaleDateString('pt-BR') : 'A definir'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GALERIA DE FOTOS */}
        {data.fotos && data.fotos.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 space-y-3 w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Registro Fotográfico</span>
              <span className="text-[10px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{data.fotos.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              {data.fotos.map((foto: string, idx: number) => (
                <a key={idx} href={foto} target="_blank" rel="noreferrer" className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group block">
                  <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA DE ASSINATURA */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-zinc-200 space-y-4 w-full">
          <div className="text-center">
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800">Assinatura do Cliente</h3>
            <p className="text-[11px] text-zinc-500 mt-1">Assine abaixo para confirmar a entrega e aprovação do serviço.</p>
          </div>

          {assinaturaFeita ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3 w-full">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-black text-emerald-700 uppercase">Documento Assinado</h4>
              <p className="text-xs text-emerald-600">A assinatura foi registrada e anexada com sucesso.</p>
              {data.assinatura_cliente && (
                <img src={data.assinatura_cliente} alt="Assinatura" className="max-h-20 mx-auto mix-blend-multiply opacity-80" />
              )}
            </div>
          ) : isSigning ? (
            <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300 w-full">
              <div className="border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 relative overflow-hidden w-full">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={200}
                  className="w-full h-40 touch-none cursor-crosshair bg-transparent relative z-10"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 text-zinc-300 font-bold uppercase tracking-widest text-xs text-center px-4">
                  Assine com o dedo aqui
                </div>
              </div>
              
              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={handleConfirmarAssinatura}
                  disabled={submitting}
                  className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {submitting ? 'Enviando...' : 'Confirmar Assinatura'}
                </button>
                <button
                  type="button"
                  onClick={clearSignature}
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <Eraser size={16} /> Limpar Assinatura
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
        <div className="text-center pb-8 space-y-2 w-full">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            Gerado por {BRANDING.name}
          </p>
          <p className="text-[10px] text-zinc-400 font-mono break-words px-4">
            {empresa?.telefone && `Tel: ${empresa.telefone}`}
            {empresa?.endereco && ` • ${empresa.endereco}`}
          </p>
        </div>

      </div>
    </div>
  );
}
