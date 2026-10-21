'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  Loader2, AlertTriangle, CheckCircle2, 
  Calendar, PenTool, Eraser, ShieldCheck, TrendingUp, Gauge, Clock, X, History, Wrench, Maximize2, ShieldAlert, Sparkles
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
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        </div>
        <p className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] text-center animate-pulse">Abrindo documento seguro...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center border border-red-100">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Link Expirado</h1>
          <p className="text-sm text-zinc-500 mt-2 max-w-xs mx-auto">Este link de acesso não é mais válido. Por favor, solicite um novo link à oficina.</p>
        </div>
      </div>
    );
  }

  const { empresa, veiculo, cliente, historico, pecasUsadas } = data;
  const logo = empresa?.logo_url || BRANDING?.logo?.url;

  const tipo = (data.tipo_controle || 'KM').toUpperCase();
  
  const isKmType = tipo === 'KM' || tipo === 'MISTO' || tipo === 'COMBINADO';
  const isHorasType = tipo === 'HORAS' || tipo === 'MISTO' || tipo === 'COMBINADO';
  
  const hasKmData = !!data.intervalo_km || !!data.proximo_km;
  const hasHorasData = !!data.intervalo_horas || !!data.proximo_horimetro;

  const showKm = isKmType && (hasKmData || tipo === 'KM');
  const showHoras = isHorasType && (hasHorasData || tipo === 'HORAS');

  const alvoKm = data.proximo_km || (veiculo.km && data.intervalo_km ? veiculo.km + data.intervalo_km : null);
  const alvoHoras = data.proximo_horimetro || (veiculo.horimetro && data.intervalo_horas ? veiculo.horimetro + data.intervalo_horas : null);

  // Configuração do Status Visual
  let statusConfig = {
    bg: 'bg-emerald-50/80 border-emerald-200/50',
    text: 'text-emerald-700',
    icon: <CheckCircle2 size={16} />,
    label: 'Em Dia'
  };
  
  if (showKm && alvoKm && veiculo.km) {
    const kmRestante = alvoKm - veiculo.km;
    const margemAlerta = data.intervalo_km ? data.intervalo_km * 0.1 : 1000;
    if (kmRestante <= 0) {
      statusConfig = { bg: 'bg-red-50/80 border-red-200/50', text: 'text-red-700', icon: <AlertTriangle size={16} />, label: 'Vencida' };
    } else if (kmRestante <= margemAlerta) {
      statusConfig = { bg: 'bg-amber-50/80 border-amber-200/50', text: 'text-amber-700', icon: <Clock size={16} />, label: 'Próxima' };
    }
  } else if (showHoras && alvoHoras && veiculo.horimetro) {
    const horasRestante = alvoHoras - veiculo.horimetro;
    const margemAlerta = data.intervalo_horas ? data.intervalo_horas * 0.1 : 50; 
    if (horasRestante <= 0) {
      statusConfig = { bg: 'bg-red-50/80 border-red-200/50', text: 'text-red-700', icon: <AlertTriangle size={16} />, label: 'Vencida' };
    } else if (horasRestante <= margemAlerta) {
      statusConfig = { bg: 'bg-amber-50/80 border-amber-200/50', text: 'text-amber-700', icon: <Clock size={16} />, label: 'Próxima' };
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-200 py-8 px-3 sm:px-6 lg:px-8 font-sans text-zinc-900 pb-24 w-full overflow-x-hidden">
        
        <div className="max-w-5xl mx-auto w-full space-y-8">
          
          {/* CABEÇALHO PREMIUM */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white relative overflow-hidden w-full">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-zinc-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              {logo ? (
                <img src={logo} alt={empresa?.nome_fantasia} className="h-16 sm:h-24 mx-auto object-contain drop-shadow-sm" />
              ) : (
                <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter">{empresa?.nome_fantasia || BRANDING.name}</h1>
              )}
              <div className="space-y-1">
                <h2 className="text-lg sm:text-3xl font-black uppercase tracking-tight text-zinc-800">Relatório de Serviço</h2>
                <p className="text-[10px] sm:text-sm text-zinc-400 font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  <Sparkles size={14} className="text-orange-500" />
                  Emitido em {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 w-full">
              
              {/* DADOS DO VEÍCULO */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-5 w-full">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Veículo Identificado</span>
                  <span className="bg-zinc-900 text-white px-4 py-1.5 rounded-lg text-xs sm:text-sm font-black font-mono tracking-widest shadow-md">
                    {veiculo.placa}
                  </span>
                </div>
                
                <div className="w-full">
                  <p className="text-xl sm:text-2xl font-black text-zinc-900 uppercase break-words leading-tight">{veiculo.marca} {veiculo.modelo}</p>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1.5 break-words">Proprietário: <span className="text-zinc-700 font-bold">{cliente.nome}</span></p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
                  {showKm && (
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-md shadow-sm border border-zinc-100">
                          <Gauge size={16} className="text-orange-500" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">KM Atual</span>
                      </div>
                      <span className="font-mono font-black text-base sm:text-lg text-zinc-800">
                        {veiculo.km ? `${veiculo.km.toLocaleString('pt-BR')}` : '---'}
                      </span>
                    </div>
                  )}
                  
                  {showHoras && (
                    <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-100 flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white rounded-md shadow-sm border border-zinc-100">
                          <Clock size={16} className="text-orange-500" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">Horímetro</span>
                      </div>
                      <span className="font-mono font-black text-base sm:text-lg text-zinc-800">
                        {veiculo.horimetro ? `${veiculo.horimetro}` : '0'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SERVIÇO REALIZADO E PEÇAS */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-5 w-full relative">
                
                {/* SELO DE STATUS FLUTUANTE */}
                <div className={`absolute top-6 right-6 px-3 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-sm ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </div>

                <div className="flex items-center gap-2 text-orange-600">
                  <ShieldCheck size={24} className="flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">Serviço Executado</span>
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black uppercase leading-tight break-words pr-20 text-zinc-800">{data.nome}</h3>
                
                {data.descricao && (
                  <div className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-200 rounded-full" />
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed pl-3 italic break-words">
                      "{data.descricao}"
                    </p>
                  </div>
                )}

                {/* MATERIAIS UTILIZADOS (ESTILO RECIBO) */}
                {pecasUsadas && pecasUsadas.length > 0 && (
                  <div className="mt-6 border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-zinc-50 px-5 py-3 border-b border-zinc-200 flex items-center gap-2">
                      <Wrench size={16} className="text-orange-500" />
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Materiais e Filtros Aplicados</span>
                    </div>
                    <div className="divide-y divide-dashed divide-zinc-200 bg-white">
                      {pecasUsadas.map((peca: any, idx: number) => (
                        <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-black text-zinc-800 uppercase break-words">{peca.descricao}</p>
                            {peca.codigo && <p className="text-[10px] font-mono font-bold text-zinc-400 mt-1">CÓD: {peca.codigo}</p>}
                          </div>
                          <span className="text-xs font-black text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-lg whitespace-nowrap shadow-sm">
                            {peca.quantidade} {peca.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* PRÓXIMAS TROCAS */}
                <div className="flex flex-col gap-3 pt-4 w-full">
                  {showKm && (alvoKm || data.intervalo_km) && (
                    <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 w-full overflow-hidden">
                      <div className="p-3 bg-white text-orange-500 rounded-xl shadow-sm border border-zinc-100 flex-shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Próxima Troca (KM)</span>
                        <span className="text-sm sm:text-base font-black text-zinc-800 truncate mt-0.5">
                          Alvo: {alvoKm ? `${alvoKm.toLocaleString('pt-BR')} KM` : 'A definir'}
                          {data.intervalo_km ? <span className="text-zinc-400 font-semibold text-xs ml-1">(a cada {data.intervalo_km.toLocaleString('pt-BR')})</span> : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {showHoras && (alvoHoras || data.intervalo_horas) && (
                    <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 w-full overflow-hidden">
                      <div className="p-3 bg-white text-orange-500 rounded-xl shadow-sm border border-zinc-100 flex-shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Próxima Troca (Horas)</span>
                        <span className="text-sm sm:text-base font-black text-zinc-800 truncate mt-0.5">
                          Alvo: {alvoHoras ? `${alvoHoras} h` : 'A definir'}
                          {data.intervalo_horas ? <span className="text-zinc-400 font-semibold text-xs ml-1">(a cada {data.intervalo_horas})</span> : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 w-full overflow-hidden">
                    <div className="p-3 bg-white text-orange-500 rounded-xl shadow-sm border border-zinc-100 flex-shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest">Data Prevista</span>
                      <span className="text-sm sm:text-base font-black text-zinc-800 truncate mt-0.5">
                        {data.proxima_data ? new Date(data.proxima_data).toLocaleDateString('pt-BR') : 'A definir'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO PREVENTIVO (TIMELINE) */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6 w-full">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                  <History size={20} className="text-zinc-400" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Histórico de Manutenções</span>
                </div>

                {(!historico || historico.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Nenhuma manutenção anterior</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-zinc-100 ml-3 pl-6 space-y-8">
                    {historico.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="relative group">
                        <div className="absolute -left-[33px] top-1 w-5 h-5 rounded-full bg-white border-[4px] border-orange-500 shadow-sm group-hover:scale-110 transition-transform" />
                        
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-black text-zinc-800 uppercase tracking-wide">
                              {new Date(item.data_conclusao).toLocaleDateString('pt-BR')}
                            </span>
                            <div className="flex gap-2">
                              {item.km_conclusao && (
                                <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2.5 py-1 rounded-md">
                                  {item.km_conclusao.toLocaleString('pt-BR')} KM
                                </span>
                              )}
                              {item.horimetro_conclusao && (
                                <span className="bg-zinc-100 text-zinc-600 text-[10px] font-bold px-2.5 py-1 rounded-md">
                                  {item.horimetro_conclusao} h
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed bg-zinc-50/50 p-3 rounded-lg border border-zinc-100/50">
                            {item.observacoes || 'Manutenção preventiva executada conforme plano.'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* COLUNA DIREITA */}
            <div className="lg:col-span-5 space-y-6 sm:space-y-8 w-full">
              
              {/* GALERIA DE FOTOS PREMIUM */}
              {data.fotos && data.fotos.length > 0 && (
                <div className="bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Registro Fotográfico</span>
                    <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full border border-orange-100">{data.fotos.length} Fotos</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 w-full">
                    {data.fotos.map((foto: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => setFotoAmpliada(foto)}
                        className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 group block w-full cursor-pointer hover:border-orange-500 transition-all shadow-sm"
                      >
                        <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <Maximize2 className="text-white w-6 h-6 drop-shadow-lg" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ÁREA DE ASSINATURA PREMIUM */}
              <div className="bg-white rounded-[2rem] p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-5 w-full">
                <div className="text-center space-y-1">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-zinc-800">Assinatura do Cliente</h3>
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider">Confirme a entrega e aprovação</p>
                </div>

                {assinaturaFeita ? (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4 w-full relative overflow-hidden">
                    <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-100 rounded-full blur-2xl opacity-50" />
                    <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto relative z-10" />
                    <div className="relative z-10">
                      <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider">Documento Assinado</h4>
                      <p className="text-xs text-emerald-600 mt-1 font-medium">Assinatura registrada e anexada com sucesso.</p>
                    </div>
                    {data.assinatura_cliente && (
                      <div className="bg-white p-3 rounded-xl border border-emerald-100 inline-block shadow-sm mt-2">
                        <img src={data.assinatura_cliente} alt="Assinatura" className="max-h-24 mix-blend-multiply opacity-80" />
                      </div>
                    )}
                  </div>
                ) : isSigning ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl bg-zinc-50 relative overflow-hidden w-full ring-4 ring-zinc-100/50">
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
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 text-zinc-300 gap-2">
                        <PenTool size={24} className="opacity-50" />
                        <span className="font-bold uppercase tracking-[0.2em] text-[10px] sm:text-xs">Assine no quadro acima</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <button
                        type="button"
                        onClick={handleConfirmarAssinatura}
                        disabled={submitting}
                        className="w-full sm:flex-1 py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-600/20 active:scale-95 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {submitting ? 'Enviando...' : 'Confirmar Assinatura'}
                      </button>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="w-full sm:w-auto py-3.5 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Eraser size={16} /> Limpar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSigning(true)}
                    className="w-full py-5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-zinc-900/20 active:scale-95"
                  >
                    <PenTool size={20} /> Assinar Documento
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RODAPÉ */}
          <div className="text-center pt-8 pb-4 space-y-3 w-full">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white rounded-full border border-zinc-200 shadow-sm">
              <ShieldCheck size={14} className="text-emerald-500" />
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Documento Protegido
              </p>
            </div>
            <p className="text-[9px] text-zinc-400 font-mono break-words px-4 uppercase tracking-wider">
              Gerado por {BRANDING.name} {empresa?.telefone && `• ${empresa.telefone}`}{empresa?.endereco && ` • ${empresa.endereco}`}
            </p>
          </div>

        </div>
      </div>

      {/* MODAL LIGHTBOX PARA AS FOTOS */}
      {fotoAmpliada && (
        <div 
          className="fixed inset-0 z-[100] bg-zinc-950/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setFotoAmpliada(null)}
        >
          <button 
            onClick={() => setFotoAmpliada(null)}
            className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[110] backdrop-blur-md border border-white/10"
          >
            <X size={24} />
          </button>
          
          <img 
            src={fotoAmpliada} 
            alt="Foto Ampliada" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-90 duration-300" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
}
