'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  Loader2, AlertTriangle, CheckCircle2, 
  Calendar, PenTool, Eraser, ShieldCheck, TrendingUp, Gauge, Clock, X, History, Package, Wrench
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
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

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

  const { empresa, veiculo, cliente, historico, pecasUsadas } = data;
  const logo = empresa?.logo_url || BRANDING?.logo?.url;

  const tipo = (data.tipo_controle || 'KM').toUpperCase();
  const showKm = tipo === 'KM' || tipo === 'MISTO' || tipo === 'COMBINADO' || (!data.tipo_controle && !!data.intervalo_km);
  const showHoras = tipo === 'HORAS' || tipo === 'MISTO' || tipo === 'COMBINADO' || (!data.tipo_controle && !!data.intervalo_horas);

  const alvoKm = data.proximo_km || (veiculo.km && data.intervalo_km ? veiculo.km + data.intervalo_km : null);
  const alvoHoras = data.proximo_horimetro || (veiculo.horimetro && data.intervalo_horas ? veiculo.horimetro + data.intervalo_horas : null);

  let statusCor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
  let statusTexto = 'Em Dia';
  
  if (showKm && alvoKm && veiculo.km) {
    const kmRestante = alvoKm - veiculo.km;
    const margemAlerta = data.intervalo_km ? data.intervalo_km * 0.1 : 1000;
    if (kmRestante <= 0) {
      statusCor = 'bg-red-100 text-red-700 border-red-200';
      statusTexto = 'Vencida';
    } else if (kmRestante <= margemAlerta) {
      statusCor = 'bg-amber-100 text-amber-700 border-amber-200';
      statusTexto = 'Próxima';
    }
  } else if (showHoras && alvoHoras && veiculo.horimetro) {
    const horasRestante = alvoHoras - veiculo.horimetro;
    const margemAlerta = data.intervalo_horas ? data.intervalo_horas * 0.1 : 50; 
    if (horasRestante <= 0) {
      statusCor = 'bg-red-100 text-red-700 border-red-200';
      statusTexto = 'Vencida';
    } else if (horasRestante <= margemAlerta) {
      statusCor = 'bg-amber-100 text-amber-700 border-amber-200';
      statusTexto = 'Próxima';
    }
  }

  return (
    <>
      <div className="min-h-screen bg-zinc-100 py-6 px-3 sm:px-6 lg:px-8 font-sans text-zinc-900 pb-20 w-full overflow-x-hidden">
        
        <div className="max-w-5xl mx-auto w-full space-y-6">
          
          {/* CABEÇALHO */}
          <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-zinc-200 text-center space-y-3 relative overflow-hidden w-full">
            <div className="absolute top-0 left-0 w-full h-2 bg-orange-600" />
            
            {logo ? (
              <img src={logo} alt={empresa?.nome_fantasia} className="h-14 sm:h-20 mx-auto object-contain" />
            ) : (
              <h1 className="text-xl sm:text-3xl font-black uppercase">{empresa?.nome_fantasia || BRANDING.name}</h1>
            )}
            <div>
              <h2 className="text-base sm:text-2xl font-black uppercase tracking-tight text-zinc-800">Relatório de Serviço</h2>
              <p className="text-[10px] sm:text-sm text-zinc-500 font-mono mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-7 space-y-6 w-full">
              
              {/* DADOS DO VEÍCULO */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-zinc-200 space-y-4 w-full">
                <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-3 gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-400">Veículo</span>
                  <span className="bg-zinc-900 text-white px-3 py-1 rounded text-xs sm:text-sm font-bold font-mono tracking-widest">{veiculo.placa}</span>
                </div>
                
                <div className="w-full">
                  <p className="text-lg sm:text-xl font-black text-zinc-900 uppercase break-words leading-tight">{veiculo.marca} {veiculo.modelo}</p>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1 break-words">Proprietário: {cliente.nome}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
                  {showKm && (
                    <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Gauge size={18} className="text-zinc-400" />
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase">KM Atual</span>
                      </div>
                      <span className="font-mono font-black text-sm sm:text-base text-zinc-800">
                        {veiculo.km ? `${veiculo.km.toLocaleString('pt-BR')} KM` : '---'}
                      </span>
                    </div>
                  )}
                  
                  {showHoras && (
                    <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Clock size={18} className="text-zinc-400" />
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase">Horímetro</span>
                      </div>
                      <span className="font-mono font-black text-sm sm:text-base text-zinc-800">
                        {veiculo.horimetro ? `${veiculo.horimetro} h` : '0 h'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SERVIÇO REALIZADO E PEÇAS */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-zinc-200 space-y-4 w-full relative">
                
                <div className={`absolute top-5 right-5 px-3 py-1 rounded-full border text-[10px] sm:text-xs font-black uppercase tracking-wider ${statusCor}`}>
                  {statusTexto}
                </div>

                <div className="flex items-center gap-2 text-orange-600">
                  <ShieldCheck size={22} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Serviço Executado</span>
                </div>
                
                <h3 className="text-lg sm:text-2xl font-black uppercase leading-tight break-words pr-16">{data.nome}</h3>
                
                {data.descricao && (
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100 italic break-words">
                    "{data.descricao}"
                  </p>
                )}

                {/* ✅ MATERIAIS UTILIZADOS (DESTAQUE) */}
                {pecasUsadas && pecasUsadas.length > 0 && (
                  <div className="mt-6 border-2 border-zinc-100 rounded-xl overflow-hidden">
                    <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center gap-2">
                      <Wrench size={18} className="text-orange-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-700">Materiais e Filtros Aplicados</span>
                    </div>
                    <div className="divide-y divide-zinc-100 bg-white">
                      {pecasUsadas.map((peca: any, idx: number) => (
                        <div key={idx} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-zinc-800 uppercase break-words">{peca.descricao}</p>
                            {peca.codigo && <p className="text-[10px] font-mono text-zinc-400 mt-0.5">CÓD: {peca.codigo}</p>}
                          </div>
                          <span className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            {peca.quantidade} {peca.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-3 pt-4 w-full">
                  {showKm && (alvoKm || data.intervalo_km) && (
                    <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 w-full overflow-hidden">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                        <TrendingUp size={18} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase">Próxima Troca (KM)</span>
                        <span className="text-sm font-bold text-zinc-700 truncate">
                          Alvo: {alvoKm ? `${alvoKm.toLocaleString('pt-BR')} KM` : 'A definir'}
                          {data.intervalo_km ? ` (a cada ${data.intervalo_km.toLocaleString('pt-BR')} KM)` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {showHoras && (alvoHoras || data.intervalo_horas) && (
                    <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 w-full overflow-hidden">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                        <TrendingUp size={18} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase">Próxima Troca (Horas)</span>
                        <span className="text-sm font-bold text-zinc-700 truncate">
                          Alvo: {alvoHoras ? `${alvoHoras} h` : 'A definir'}
                          {data.intervalo_horas ? ` (a cada ${data.intervalo_horas} h)` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-100 w-full overflow-hidden">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg flex-shrink-0">
                      <Calendar size={18} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase">Data Prevista</span>
                      <span className="text-sm font-bold text-zinc-700 truncate">
                        {data.proxima_data ? new Date(data.proxima_data).toLocaleDateString('pt-BR') : 'A definir'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO PREVENTIVO (TIMELINE) */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-zinc-200 space-y-6 w-full">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                  <History size={20} className="text-zinc-400" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-400">Histórico de Manutenções</span>
                </div>

                {(!historico || historico.length === 0) ? (
                  <div className="text-center py-6">
                    <p className="text-xs text-zinc-500 font-medium">Nenhuma manutenção anterior registrada para este plano.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-zinc-200 ml-3 pl-6 space-y-6">
                    {historico.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="relative">
                        <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-4 border-orange-500 shadow-sm" />
                        
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-black text-zinc-800 uppercase tracking-wide">
                              {new Date(item.data_conclusao).toLocaleDateString('pt-BR')}
                            </span>
                            {item.km_conclusao && (
                              <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                {item.km_conclusao.toLocaleString('pt-BR')} KM
                              </span>
                            )}
                            {item.horimetro_conclusao && (
                              <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2 py-0.5 rounded">
                                {item.horimetro_conclusao} h
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-zinc-600 font-medium">
                            {item.observacoes || 'Manutenção preventiva executada.'}
                          </p>
                          
                          {item.os_id && (
                            <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">
                              Ref. OS: #{item.os_id.slice(0, 6).toUpperCase()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* COLUNA DIREITA */}
            <div className="lg:col-span-5 space-y-6 w-full">
              
              {/* GALERIA DE FOTOS */}
              {data.fotos && data.fotos.length > 0 && (
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-zinc-200 space-y-4 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-400">Registro Fotográfico</span>
                    <span className="text-[10px] sm:text-xs font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{data.fotos.length} fotos</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 w-full">
                    {data.fotos.map((foto: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => setFotoAmpliada(foto)}
                        className="relative aspect-square rounded-xl overflow-hidden border border-zinc-200 group block w-full cursor-pointer hover:border-orange-500 transition-colors"
                      >
                        <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ÁREA DE ASSINATURA */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-zinc-200 space-y-4 w-full">
                <div className="text-center">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-zinc-800">Assinatura do Cliente</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-500 mt-1">Assine abaixo para confirmar a entrega e aprovação do serviço.</p>
                </div>

                {assinaturaFeita ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3 w-full">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h4 className="text-sm sm:text-base font-black text-emerald-700 uppercase">Documento Assinado</h4>
                    <p className="text-xs text-emerald-600">A assinatura foi registrada e anexada com sucesso.</p>
                    {data.assinatura_cliente && (
                      <img src={data.assinatura_cliente} alt="Assinatura" className="max-h-24 mx-auto mix-blend-multiply opacity-80" />
                    )}
                  </div>
                ) : isSigning ? (
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 relative overflow-hidden w-full">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={250}
                        className="w-full h-48 sm:h-56 touch-none cursor-crosshair bg-transparent relative z-10"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 text-zinc-300 font-bold uppercase tracking-widest text-xs sm:text-sm text-center px-4">
                        Assine com o dedo ou mouse aqui
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button
                        type="button"
                        onClick={handleConfirmarAssinatura}
                        disabled={submitting}
                        className="w-full sm:flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-orange-500/30 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {submitting ? 'Enviando...' : 'Confirmar Assinatura'}
                      </button>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="w-full sm:w-auto py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                      >
                        <Eraser size={16} /> Limpar
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
            </div>
          </div>

          {/* RODAPÉ */}
          <div className="text-center pt-8 pb-4 space-y-2 w-full">
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

      {/* MODAL LIGHTBOX PARA AS FOTOS */}
      {fotoAmpliada && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setFotoAmpliada(null)}
        >
          <button 
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-4 right-4 p-3 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded-full transition-colors z-[110]"
          >
            <X size={24} />
          </button>
          
          <img 
            src={fotoAmpliada} 
            alt="Foto Ampliada" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
