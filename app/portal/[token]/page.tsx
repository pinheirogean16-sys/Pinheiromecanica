'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { 
  Loader2, AlertTriangle, CheckCircle2, 
  Calendar, PenTool, Eraser, ShieldCheck, TrendingUp, Gauge, Clock, X, History, Wrench, Maximize2, ShieldAlert, Sparkles, ChevronRight, Check
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
    ctx.lineWidth = 3;
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
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center gap-6 px-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-zinc-200 border-t-orange-500 animate-spin" />
          <ShieldCheck className="absolute inset-0 m-auto text-orange-500 w-8 h-8 opacity-50" />
        </div>
        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em] text-center animate-pulse">Validando Documento Seguro</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-24 h-24 bg-red-50 rounded-[2rem] flex items-center justify-center border border-red-100 shadow-xl shadow-red-100/50">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-tight">Acesso Negado</h1>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto font-medium">Este link é inválido, expirou ou o documento foi removido do sistema.</p>
        </div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-4">Solicite um novo link à oficina</p>
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
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-600',
    dot: 'bg-emerald-500',
    icon: <CheckCircle2 size={14} className="text-emerald-500" />,
    label: 'Em Dia'
  };
  
  if (showKm && alvoKm && veiculo.km) {
    const kmRestante = alvoKm - veiculo.km;
    const margemAlerta = data.intervalo_km ? data.intervalo_km * 0.1 : 1000;
    if (kmRestante <= 0) {
      statusConfig = { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-600', dot: 'bg-red-500', icon: <AlertTriangle size={14} className="text-red-500" />, label: 'Vencida' };
    } else if (kmRestante <= margemAlerta) {
      statusConfig = { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600', dot: 'bg-amber-500', icon: <Clock size={14} className="text-amber-500" />, label: 'Próxima' };
    }
  } else if (showHoras && alvoHoras && veiculo.horimetro) {
    const horasRestante = alvoHoras - veiculo.horimetro;
    const margemAlerta = data.intervalo_horas ? data.intervalo_horas * 0.1 : 50; 
    if (horasRestante <= 0) {
      statusConfig = { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-600', dot: 'bg-red-500', icon: <AlertTriangle size={14} className="text-red-500" />, label: 'Vencida' };
    } else if (horasRestante <= margemAlerta) {
      statusConfig = { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-600', dot: 'bg-amber-500', icon: <Clock size={14} className="text-amber-500" />, label: 'Próxima' };
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F5F7] py-6 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900 pb-24 w-full overflow-x-hidden selection:bg-orange-200 selection:text-orange-900">
        
        <div className="max-w-5xl mx-auto w-full space-y-6 sm:space-y-8">
          
          {/* CABEÇALHO IMERSIVO (DARK MODE PREMIUM) */}
          <div className="bg-zinc-950 rounded-[2.5rem] p-8 sm:p-12 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden w-full flex flex-col items-center justify-center text-center">
            {/* Efeitos de luz no fundo */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-lg bg-orange-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-zinc-800 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center space-y-5">
              {logo ? (
                <div className="bg-white/5 p-4 rounded-3xl backdrop-blur-xl border border-white/10 shadow-2xl">
                  <img src={logo} alt={empresa?.nome_fantasia} className="h-14 sm:h-20 object-contain" />
                </div>
              ) : (
                <h1 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tighter">{empresa?.nome_fantasia || BRANDING.name}</h1>
              )}
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md">
                  <Sparkles size={12} className="text-orange-400" />
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">Relatório Oficial</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Ficha de Serviço</h2>
                <p className="text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-widest">
                  Emitido em {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            
            {/* COLUNA ESQUERDA */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-8 w-full">
              
              {/* DADOS DO VEÍCULO (ESTILO CRACHÁ) */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Identificação do Veículo</p>
                    <p className="text-xl sm:text-2xl font-black text-zinc-900 uppercase break-words leading-tight">{veiculo.marca} <br className="sm:hidden" /> {veiculo.modelo}</p>
                    <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {cliente.nome}
                    </p>
                  </div>
                  
                  {/* PLACA MERCOSUL REALISTA */}
                  <div className="inline-flex flex-col min-w-[130px] border border-zinc-300 rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
                    <div className="bg-[#003399] text-[7px] text-white font-black tracking-[0.2em] px-2.5 py-1 flex items-center justify-between uppercase">
                      <span>Brasil</span>
                      <span className="w-2 h-1.5 bg-yellow-400 rounded-[1px]" />
                    </div>
                    <div className="bg-white text-zinc-900 font-black font-mono text-xl text-center py-1.5 px-4 tracking-[0.15em] border-t border-zinc-200">
                      {veiculo.placa}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full pt-6 mt-6 border-t border-zinc-100">
                  {showKm && (
                    <div className="bg-zinc-50 rounded-2xl p-4 flex flex-col justify-center w-full border border-zinc-100">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Gauge size={10} /> Quilometragem
                      </span>
                      <span className="font-mono font-black text-lg text-zinc-800">
                        {veiculo.km ? veiculo.km.toLocaleString('pt-BR') : '---'} <span className="text-xs text-zinc-400 font-sans">km</span>
                      </span>
                    </div>
                  )}
                  
                  {showHoras && (
                    <div className="bg-zinc-50 rounded-2xl p-4 flex flex-col justify-center w-full border border-zinc-100">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Clock size={10} /> Horímetro
                      </span>
                      <span className="font-mono font-black text-lg text-zinc-800">
                        {veiculo.horimetro ? veiculo.horimetro : '0'} <span className="text-xs text-zinc-400 font-sans">h</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* SERVIÇO EXECUTADO E PEÇAS */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6 w-full relative">
                
                {/* SELO DE STATUS FLUTUANTE */}
                <div className={`absolute top-6 right-6 px-3 py-1.5 rounded-full border backdrop-blur-md flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm ${statusConfig.bg} ${statusConfig.text}`}>
                  <div className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`} />
                  {statusConfig.label}
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block">Procedimento</span>
                    <h3 className="text-lg sm:text-2xl font-black uppercase leading-tight break-words pr-20 text-zinc-900">{data.nome}</h3>
                  </div>
                </div>
                
                {data.descricao && (
                  <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 relative">
                    <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed italic break-words">
                      "{data.descricao}"
                    </p>
                  </div>
                )}

                {/* MATERIAIS UTILIZADOS (ESTILO RECIBO DE LUXO) */}
                {pecasUsadas && pecasUsadas.length > 0 && (
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-zinc-50/80 px-5 py-3 border-b border-zinc-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench size={14} className="text-orange-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Insumos e Materiais</span>
                      </div>
                      <span className="text-[9px] font-black text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-200">{pecasUsadas.length} itens</span>
                    </div>
                    <div className="divide-y divide-dashed divide-zinc-200 bg-white">
                      {pecasUsadas.map((peca: any, idx: number) => (
                        <div key={idx} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-zinc-50 transition-colors">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-400 font-black text-[10px]">
                              {peca.quantidade}x
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-zinc-800 uppercase break-words leading-tight">{peca.descricao}</p>
                              {peca.codigo && <p className="text-[9px] font-mono font-bold text-zinc-400 mt-1">CÓD: {peca.codigo}</p>}
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg whitespace-nowrap border border-orange-100">
                            {peca.unidade}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* PRÓXIMAS TROCAS (DESTAQUE MÁXIMO) */}
                <div className="grid grid-cols-1 gap-4 pt-2 w-full">
                  {showKm && (alvoKm || data.intervalo_km) && (
                    <div className="bg-zinc-900 p-5 rounded-2xl w-full relative overflow-hidden flex items-center justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={80} className="text-white" /></div>
                      <div className="relative z-10">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Próxima Troca (Alvo KM)</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white font-mono">{alvoKm ? alvoKm.toLocaleString('pt-BR') : '---'}</span>
                          <span className="text-sm font-bold text-zinc-400">KM</span>
                        </div>
                      </div>
                      {data.intervalo_km && (
                        <div className="relative z-10 bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-center">
                          <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Intervalo</span>
                          <span className="text-xs font-bold text-white">{data.intervalo_km.toLocaleString('pt-BR')} KM</span>
                        </div>
                      )}
                    </div>
                  )}

                  {showHoras && (alvoHoras || data.intervalo_horas) && (
                    <div className="bg-zinc-900 p-5 rounded-2xl w-full relative overflow-hidden flex items-center justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={80} className="text-white" /></div>
                      <div className="relative z-10">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Próxima Troca (Alvo Horas)</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-white font-mono">{alvoHoras ? alvoHoras : '---'}</span>
                          <span className="text-sm font-bold text-zinc-400">H</span>
                        </div>
                      </div>
                      {data.intervalo_horas && (
                        <div className="relative z-10 bg-white/10 border border-white/10 px-3 py-2 rounded-xl text-center">
                          <span className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Intervalo</span>
                          <span className="text-xs font-bold text-white">{data.intervalo_horas} h</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-white border border-zinc-200 p-4 rounded-2xl w-full shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-zinc-100 text-zinc-500 rounded-xl">
                        <Calendar size={18} />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">Data Estimada</span>
                    </div>
                    <span className="text-sm font-black text-zinc-900 bg-zinc-50 px-4 py-1.5 rounded-lg border border-zinc-100">
                      {data.proxima_data ? new Date(data.proxima_data).toLocaleDateString('pt-BR') : 'A definir'}
                    </span>
                  </div>
                </div>
              </div>

              {/* HISTÓRICO PREVENTIVO (TIMELINE LUXO) */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6 w-full">
                <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
                  <History size={18} className="text-zinc-400" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Histórico Clínico</span>
                </div>

                {(!historico || historico.length === 0) ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Primeira Manutenção Registrada</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-zinc-100 ml-4 pl-8 space-y-8">
                    {historico.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="relative group">
                        <div className="absolute -left-[41px] top-1 w-6 h-6 rounded-full bg-white border-[5px] border-orange-500 shadow-sm group-hover:scale-110 transition-transform" />
                        
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
                          
                          <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-xl flex items-center justify-between">
                            <p className="text-xs sm:text-sm text-zinc-600 font-medium leading-relaxed">
                              {item.observacoes || 'Manutenção preventiva executada conforme plano.'}
                            </p>
                            <ChevronRight size={16} className="text-zinc-300" />
                          </div>
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
                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-4 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Galeria de Evidências</span>
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
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6 w-full">
                <div className="text-center space-y-1">
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-zinc-800">Homologação</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Assinatura digital do cliente</p>
                </div>

                {assinaturaFeita ? (
                  <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-8 text-center space-y-4 w-full relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-60" />
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto relative z-10 drop-shadow-sm" />
                    <div className="relative z-10">
                      <h4 className="text-sm font-black text-emerald-800 uppercase tracking-wider">Documento Assinado</h4>
                      <p className="text-xs text-emerald-600 mt-1 font-medium">Sua assinatura foi registrada.</p>
                    </div>
                    {data.assinatura_cliente && (
                      <div className="bg-white p-4 rounded-2xl border border-emerald-100 inline-block shadow-sm mt-2 relative z-10">
                        <img src={data.assinatura_cliente} alt="Assinatura" className="max-h-24 mix-blend-multiply opacity-90" />
                      </div>
                    )}
                  </div>
                ) : isSigning ? (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 w-full">
                    <div className="border-2 border-dashed border-zinc-300 rounded-2xl bg-white relative overflow-hidden w-full shadow-inner group">
                      {/* Linhas guias da assinatura */}
                      <div className="absolute inset-0 flex flex-col justify-end p-8 pointer-events-none opacity-20">
                        <div className="border-b-2 border-zinc-400 w-full mb-1" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Assine sobre a linha</span>
                      </div>
                      
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
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <button
                        type="button"
                        onClick={handleConfirmarAssinatura}
                        disabled={submitting}
                        className="w-full sm:flex-1 py-4 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-xl shadow-orange-600/30 active:scale-95 disabled:opacity-50"
                      >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        {submitting ? 'Salvando...' : 'Confirmar Assinatura'}
                      </button>
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="w-full sm:w-auto py-4 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Eraser size={16} /> Limpar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSigning(true)}
                    className="w-full py-5 bg-zinc-900 hover:bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl shadow-zinc-900/20 active:scale-95 group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    <PenTool size={20} className="group-hover:rotate-12 transition-transform" /> Assinar Documento
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RODAPÉ */}
          <div className="text-center pt-8 pb-8 space-y-4 w-full flex flex-col items-center">
            <div className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white rounded-full border border-zinc-200 shadow-sm">
              <ShieldCheck size={16} className="text-emerald-500" />
              <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em]">
                Documento Autenticado
              </p>
            </div>
            <p className="text-[9px] text-zinc-400 font-mono break-words px-4 uppercase tracking-[0.1em] text-center max-w-sm mx-auto leading-relaxed">
              Gerado por <strong className="text-zinc-500">{BRANDING.name}</strong> <br/>
              {empresa?.telefone && `Tel: ${empresa.telefone}`}
              {empresa?.endereco && ` • ${empresa.endereco}`}
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
            className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-[110] backdrop-blur-md border border-white/10 active:scale-95"
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
