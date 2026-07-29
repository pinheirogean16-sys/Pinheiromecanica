'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, Edit, Trash2, User, 
  MapPin, Car, FileText, Calendar, 
  Activity, Wrench, PenTool, ExternalLink, 
  Settings, ShieldAlert, History, ShieldCheck, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';

const tipoVeiculoLabels: Record<string, string> = {
  CAVALO_MECANICO: 'Cavalo Mecânico',
  CARRETA: 'Carreta',
  ONIBUS: 'Ônibus',
  UTILITARIO: 'Utilitário',
  CAMINHAO_LEVE: 'Caminhão Leve',
  CAMINHAO_PESADO: 'Caminhão Pesado',
  CAMINHONETE: 'Caminhonete',
  VAN: 'Van',
  RETROESCAVADEIRA: 'Retroescavadeira',
  ESCAVADEIRA_HIDRAULICA: 'Escavadeira Hidráulica',
  PA_CARREGADEIRA: 'Pá Carregadeira',
  MOTONIVELADORA: 'Motoniveladora',
  TRATOR_ESTEIRA: 'Trator Esteira',
  ROLO_COMPACTADOR: 'Rolo Compactador',
  VIBROACABADORA: 'Vibroacabadora',
  FRESADORA: 'Fresadora',
  USINA_ASFALTO: 'Usina de Asfalto',
  EMPILHADEIRA: 'Empilhedeira',
  GUINDASTE: 'Guindaste',
  PERFURATRIZ: 'Perfuratriz',
  TRATOR_AGRICOLA: 'Trator Agrícola',
  CAMINHAO_PIPA: 'Caminhão Pipa',
  CAMINHAO_MUNCK: 'Caminhão Munck',
  EQUIPAMENTO_ASFALTO: 'Equipamento Asfalto',
  OUTROS: 'Outros',
};

const EQUIPAMENTOS = [
  'RETROESCAVADEIRA',
  'ESCAVADEIRA_HIDRAULICA',
  'PA_CARREGADEIRA',
  'MOTONIVELADORA',
  'ROLO_COMPACTADOR',
  'TRATOR_ESTEIRA',
  'VIBROACABADORA',
  'FRESADORA',
  'USINA_ASFALTO',
  'EMPILHADEIRA',
  'GUINDASTE',
  'PERFURATRIZ',
  'TRATOR_AGRICOLA',
  'CAMINHAO_PIPA',
  'CAMINHAO_MUNCK',
  'EQUIPAMENTO_ASFALTO'
];

export default function VeiculoDetalhesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [veiculo, setVeiculo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVeiculo = async () => {
      try {
        const res = await fetch(`/api/veiculos/${id}`);
        if (res.ok) {
          setVeiculo(await res.json());
        } else {
          toast.error('Veículo não encontrado');
          router.push('/veiculos');
        }
      } catch (err) {
        toast.error('Erro ao buscar dados técnicos');
      } finally {
        setLoading(false);
      }
    };
    fetchVeiculo();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja remover o veículo "${veiculo?.modelo}" da frota?`)) return;
    
    try {
      const res = await fetch(`/api/veiculos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Ativo removido com sucesso');
        router.push('/veiculos');
      } else {
        toast.error(data.error || 'Erro ao excluir veículo');
      }
    } catch (err) {
      toast.error('Erro de conexão ao servidor');
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!veiculo) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 italic">Ativo não encontrado ou erro na carga.</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 pb-32 overflow-hidden">
      {/* Header Fino */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/veiculos" className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic break-words flex flex-wrap items-center gap-2">
              Ficha Técnica do Ativo <span className="text-zinc-700 hidden sm:inline">|</span> 
              <span className="text-orange-500">{veiculo?.placa || '---'}</span>
            </h1>
            <p className="text-[10px] text-zinc-655 font-black uppercase tracking-[0.3em] leading-none mt-1">SISTEMA DE ENGENHARIA PINHEIRO DIESEL PRO</p>
          </div>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-3 w-full md:w-auto h-auto">
          <Link 
            href={`/veiculos/${id}/editar`}
            className="flex-1 md:flex-initial px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Settings size={14} /> EDITAR CADASTRO
          </Link>
          <button 
            onClick={handleDelete}
            className="flex-1 md:flex-initial px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Trash2 size={14} /> EXCLUIR REGISTRO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA ESQUERDA: PERFIL DO VEÍCULO */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden group">
             <div className="flex flex-col items-center text-center space-y-6">
                
                {/* Placa em destaque */}
                <div className="p-8 bg-zinc-950 border-4 border-zinc-900 rounded-[2.5rem] shadow-2xl relative">
                  <Activity size={60} className="text-orange-500 animate-pulse" />
                  
                  {/* Mercado Plate Placa Mercosul premium */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex flex-col min-w-[120px] border border-blue-600/50 rounded-lg overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] text-zinc-900 leading-tight select-none">
                    <div className="bg-blue-600 text-[6px] text-white font-black tracking-widest px-2.5 py-0.5 uppercase flex items-center justify-between gap-1 select-none leading-none">
                      <span>BRASIL</span>
                      <span className="w-1.5 h-1 bg-yellow-400 rounded-sm italic text-[3px] flex items-center justify-center font-serif text-blue-900 border border-blue-900">BR</span>
                    </div>
                    <div className="bg-white text-zinc-950 font-black font-mono text-[12px] text-center py-1 px-4 tracking-widest uppercase">
                      {veiculo?.placa || '---'}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                   <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter truncate max-w-full break-words">{veiculo?.modelo || 'Veículo'}</h2>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-1 truncate max-w-full">{veiculo?.marca || '---'}</p>
                </div>

                <div className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl p-5 grid grid-cols-2 gap-4 relative">
                   <div className="absolute inset-0 bg-orange-500/5 opacity-50 pointer-events-none" />
                   <div className="relative z-10 text-center space-y-1">
                      <p className="text-[9px] text-zinc-550 font-black uppercase tracking-widest leading-none">Ano / Modelo</p>
                      <p className="text-sm font-black text-white font-mono italic">{veiculo?.ano || '---'}</p>
                   </div>
                   <div className="relative z-10 text-center space-y-1 border-l border-zinc-850">
                      {EQUIPAMENTOS.includes(veiculo?.tipo || '') ? (
                        <>
                          <p className="text-[9px] text-zinc-550 font-black uppercase tracking-widest leading-none">Horímetro Atual</p>
                          <p className="text-sm font-black text-white font-mono italic">{veiculo?.horimetro_atual || '0'}h</p>
                        </>
                      ) : (
                        <>
                          <p className="text-[9px] text-zinc-550 font-black uppercase tracking-widest leading-none">Quilometragem</p>
                          <p className="text-sm font-black text-white font-mono italic">{veiculo?.quilometragem?.toLocaleString() || '---'} km</p>
                        </>
                      )}
                   </div>
                </div>

                <div className="w-full grid grid-cols-1 gap-4">
                   <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-850 rounded-2xl group transition-all hover:border-blue-500/20">
                      <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl">
                        <User size={18} />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                         <p className="text-[9px] text-zinc-650 font-black uppercase tracking-widest">Proprietário / Titular</p>
                         <p className="text-[12px] font-black text-zinc-200 uppercase tracking-tight truncate max-w-full break-words">{veiculo?.cliente?.nome || 'Não vinculado'}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-4 p-4 bg-zinc-950 border border-zinc-850 rounded-2xl">
                      <div className="p-2.5 bg-purple-600/10 text-purple-500 rounded-xl">
                        <PenTool size={18} />
                      </div>
                      <div className="text-left min-w-0 flex-1">
                         <p className="text-[9px] text-zinc-650 font-black uppercase tracking-widest">Categoria de Ativo</p>
                         <p className="text-[12px] font-black text-zinc-200 uppercase tracking-tight truncate max-w-full break-words">{tipoVeiculoLabels[veiculo?.tipo || ''] || veiculo?.tipo || '---'}</p>
                      </div>
                   </div>
                </div>
             </div>
          </section>

          {/* CHECKLIST RECENTES (EMPRESA / INSPEÇÃO DE CAMPO) */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-850 pb-3">
              <ShieldCheck className="text-emerald-500" size={18} />
              <h3 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest italic">Checklist Recente de Campo</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-950/20 rounded-lg">
                <span className="font-extrabold text-zinc-400">Inspeção Hidráulica</span>
                <span className="text-[9px] px-2 py-0.5 bg-green-500/10 text-green-400 font-bold uppercase rounded-md">Conforme</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-950/20 rounded-lg">
                <span className="font-extrabold text-zinc-400">Sistema de Freios</span>
                <span className="text-[9px] px-2 py-0.5 bg-orange-500/10 text-orange-400 font-bold uppercase rounded-md">Atenção</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-950/20 rounded-lg">
                <span className="font-extrabold text-zinc-400">Lubrificantes & Níveis</span>
                <span className="text-[9px] px-2 py-0.5 bg-green-500/10 text-green-400 font-bold uppercase rounded-md">Conforme</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 bg-zinc-950/20 rounded-lg">
                <span className="font-extrabold text-zinc-400">Instrumentação e Painel</span>
                <span className="text-[9px] px-2 py-0.5 bg-green-500/10 text-green-400 font-bold uppercase rounded-md">Conforme</span>
              </div>
            </div>
          </section>
        </div>

        {/* COLUNA DIREITA: HISTÓRICO E REVISÕES */}
        <div className="lg:col-span-8 space-y-8">
           <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
              <div className="p-6 sm:p-8 border-b border-zinc-850 bg-zinc-900/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-600/10 text-red-500 rounded-2xl">
                    <History size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tighter leading-tight">REGISTRO DE MANUTENÇÕES</h2>
                    <p className="text-[10px] text-zinc-650 font-black uppercase tracking-[0.3em]">Histórico cronológico de reparos e ordens</p>
                  </div>
                </div>
                <Link 
                  href={`/os/nova?veiculo_id=${veiculo?.id}&cliente_id=${veiculo?.cliente_id}`} 
                  className="w-full sm:w-auto px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg text-center min-h-[44px] flex items-center justify-center cursor-pointer active:scale-95"
                >
                  ABRIR NOVA OS
                </Link>
              </div>

              {/* Desktop layout: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-950/40 border-b border-zinc-800 text-[10px] font-black text-zinc-650 uppercase tracking-widest">
                      <th className="p-5">Protocolo</th>
                      <th className="p-5">Diagnóstico / Escopo</th>
                      <th className="p-5">Status Atual</th>
                      <th className="p-5">Data de Abertura</th>
                      <th className="p-5 text-right">Investimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {veiculo?.ordens?.length > 0 ? (veiculo.ordens || []).map((os: any) => (
                      <tr 
                         key={os.id} 
                         onClick={() => router.push(`/os/${os.id}`)}
                         className="hover:bg-orange-500/[0.02] cursor-pointer group transition-all"
                      >
                        <td className="p-5">
                           <span className="text-xs font-black font-mono text-orange-500 italic tracking-tighter">#{os.numero || '---'}</span>
                        </td>
                        <td className="p-5 max-w-xs min-w-0">
                           <p className="text-[11px] font-bold text-zinc-300 uppercase leading-relaxed line-clamp-1 group-hover:text-white transition-colors truncate">{os.diagnostico || 'MANUTENÇÃO DE ROTINA'}</p>
                        </td>
                        <td className="p-5">
                          <StatusBadge status={os.status} />
                        </td>
                        <td className="p-5">
                           <span className="text-[10px] font-mono font-bold text-zinc-500">{os.created_at ? new Date(os.created_at).toLocaleDateString() : '---'}</span>
                        </td>
                        <td className="p-5 text-right">
                           <span className="text-xs font-black text-white font-mono tracking-tighter">
                             {(os.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="p-20 text-center opacity-30">
                           <div className="flex flex-col items-center gap-3">
                             <FileText size={40} className="text-zinc-600" />
                             <p className="text-[10px] font-mono font-black uppercase tracking-widest">Sem Histórico Operacional</p>
                           </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile layout: Timeline Vertical */}
              <div className="block md:hidden p-5">
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
                  {veiculo?.ordens?.length > 0 ? (veiculo.ordens || []).map((os: any) => (
                    <div key={os.id} className="relative group">
                      
                      {/* Timeline Bullet node */}
                      <div className="absolute -left-[23px] top-3 w-3 h-3 rounded-full bg-zinc-950 border-4 border-orange-500 group-hover:scale-125 transition-transform" />

                      <Link href={`/os/${os.id}`} className="block">
                        <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-3 group-hover:border-zinc-750 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black font-mono text-orange-500 italic">#{os.numero || '---'}</span>
                            <StatusBadge status={os.status} />
                          </div>
                          
                          <p className="text-[11px] font-black text-zinc-300 uppercase leading-relaxed break-words">{os.diagnostico || 'MANUTENÇÃO DE ROTINA'}</p>
                          
                          <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] font-mono mt-1">
                            <span className="text-zinc-550">{os.created_at ? new Date(os.created_at).toLocaleDateString() : '---'}</span>
                            <span className="font-black text-zinc-200">
                              {(os.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )) : (
                    <div className="py-8 text-center text-zinc-650 text-[10px] font-black uppercase italic">Nenhum registro no histórico</div>
                  )}
                </div>
              </div>
           </section>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              <section className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-6 space-y-4">
                 <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic border-b border-zinc-850 pb-3">Última Revisão</h3>
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Calendar className="text-orange-500" size={16} />
                       <span className="text-xs font-bold text-zinc-400">Data Base:</span>
                    </div>
                    <span className="text-sm font-black text-white italic">
                      {veiculo?.ordens?.[0] ? new Date(veiculo.ordens[0].created_at).toLocaleDateString() : 'Sem registros'}
                    </span>
                 </div>
              </section>
              <section className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-6 space-y-4">
                 <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic border-b border-zinc-850 pb-3">Status de Segurança</h3>
                 <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)] animate-pulse" />
                    <span className="text-xs sm:text-sm font-black text-zinc-200 uppercase tracking-widest italic">Operacional / Apto</span>
                 </div>
              </section>
           </div>
        </div>
      </div>

      {/* DOCK FIXO MOBILE (BARRA MOBILE) */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-zinc-950/95 border-t border-zinc-800 p-3.5 flex gap-2 z-40 backdrop-blur-md">
        <Link 
          href="/veiculos" 
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <ChevronLeft size={16} /> VOLTAR
        </Link>
        <Link 
          href={`/veiculos/${id}/editar`}
          className="flex-1 min-h-[48px] bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer"
        >
          <Settings size={16} /> EDITAR
        </Link>
        <Link 
          href={`/os/nova?veiculo_id=${veiculo?.id}&cliente_id=${veiculo?.cliente_id}`}
          className="flex-1 min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-1 cursor-pointer shadow-lg font-bold"
        >
          <Wrench size={16} /> NOVA OS
        </Link>
      </div>
    </div>
  );
}
