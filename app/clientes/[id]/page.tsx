'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, Edit, Trash2, User, Building2, 
  Phone, Mail, MapPin, Car, FileText, 
  Calendar, DollarSign, ExternalLink, Package,
  AlertTriangle, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';
import { BRANDING } from '@/lib/branding';

export default function ClienteDetalhesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const res = await fetch(`/api/clientes/${id}`);
        if (res.ok) {
          setCliente(await res.json());
        } else {
          toast.error('Cliente não encontrado');
          router.push('/clientes');
        }
      } catch (err) {
        toast.error('Erro ao buscar dados do cliente');
      } finally {
        setLoading(false);
      }
    };
    fetchCliente();
  }, [id, router]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Cliente excluído com sucesso');
        router.push('/clientes');
      } else {
        toast.error(data.error || 'Erro ao excluir cliente');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 italic">Recuperando Dossiê...</p>
      </div>
    </div>
  );

  if (!cliente) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 italic">Dossiê não encontrado ou erro na carga.</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 space-y-8 pb-20 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clientes" className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition shadow-sm flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px]">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">Dossiê do Cliente <span className="text-zinc-700 mx-2">|</span> #{cliente?.id?.slice(-6).toUpperCase() || '------'}</h1>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.3em] leading-none mt-1">SISTEMA DE INTELIGÊNCIA {BRANDING.name}</p>
          </div>
        </div>
        <div className="flex flex-row flex-wrap md:flex-nowrap items-center gap-3 w-full md:w-auto">
          <Link 
            href={`/clientes/${id}/editar`}
            className="flex-1 md:flex-initial px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Edit size={14} /> EDITAR
          </Link>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="flex-1 md:flex-initial px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
          >
            <Trash2 size={14} /> EXCLUIR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: PERFIL E DADOS */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden group">
            
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-8 bg-zinc-950 border-4 border-zinc-900 rounded-[2.5rem] shadow-2xl relative">
                {cliente?.tipo === 'PF' ? <User size={50} className="text-orange-500" /> : <Building2 size={50} className="text-purple-500" />}
                <div className="absolute -bottom-2 -right-2 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  {cliente?.tipo || '---'}
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic truncate max-w-full break-words">{cliente?.nome || 'Cliente sem Nome'}</h2>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1 truncate max-w-full italic">{cliente?.email || 'SEM E-MAIL REGISTRADO'}</p>
              </div>

              <div className="w-full flex items-center justify-center gap-3 bg-zinc-950/40 p-3 rounded-2xl border border-zinc-800">
                <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Status:</span>
                <StatusBadge status={cliente?.status} />
              </div>

              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 border-y border-zinc-800/50 text-left">
                <div className="space-y-1">
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Documento</p>
                  <p className="text-xs font-black text-zinc-300 font-mono tracking-tighter italic break-all">{cliente?.cpf_cnpj || '---'}</p>
                </div>
                <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-zinc-800/50 pt-3 sm:pt-0 sm:pl-4">
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Telefone</p>
                  <p className="text-xs font-black text-zinc-300 font-mono tracking-tighter italic">{cliente?.telefone || '---'}</p>
                </div>
              </div>

              <div className="w-full space-y-4 pt-2">
                <div className="flex items-start gap-4 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl group/loc transition hover:border-blue-500/20">
                  <div className="p-2 bg-blue-600/10 text-blue-500 rounded-xl group-hover/loc:scale-110 transition-transform">
                    <MapPin size={18} />
                  </div>
                  <div className="text-left space-y-1 min-w-0 flex-1">
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Localização Técnica</p>
                    <p className="text-[11px] font-bold text-zinc-400 leading-relaxed uppercase break-words">{cliente?.endereco || 'Endereço não detalhado'}, {cliente?.cidade || ''} - {cliente?.uf || ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Rápidos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-5 space-y-2">
              <div className="p-2 bg-orange-600/10 text-orange-500 rounded-xl w-fit">
                <Car size={16} />
              </div>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Frota Vinculada</p>
              <h3 className="text-2xl font-black text-white italic tracking-tighter font-mono">{cliente?.veiculos?.length || 0}</h3>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-[1.5rem] p-5 space-y-2">
              <div className="p-2 bg-green-600/10 text-green-500 rounded-xl w-fit">
                <FileText size={16} />
              </div>
              <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Ordens de Serviço</p>
              <h3 className="text-2xl font-black text-white italic tracking-tighter font-mono">{cliente?.ordens?.length || 0}</h3>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: FROTA E HISTÓRICO */}
        <div className="lg:col-span-8 space-y-8">
          {/* FROTA */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-600/10 text-orange-500 rounded-xl">
                  <Car size={20} />
                </div>
                <div>
                   <h2 className="text-base font-black text-white uppercase italic tracking-tight">FROTA REGISTRADA</h2>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Veículos vinculados a este dossiê</p>
                </div>
              </div>
              <Link href={`/veiculos/novo?cliente_id=${cliente?.id}`} className="w-full sm:w-auto px-5 py-3 bg-zinc-950 border border-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white hover:border-zinc-700 rounded-xl transition uppercase tracking-widest flex items-center justify-center gap-2 min-h-[44px]">
                ADICIONAR VEÍCULO
              </Link>
            </div>
            
            <div className="p-6 sm:p-8">
              {/* Desktop layout: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-950/20 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <th className="p-4">Placa</th>
                      <th className="p-4">Modelo</th>
                      <th className="p-4">Marca</th>
                      <th className="p-4">Ano</th>
                      <th className="p-4">Métrica</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                     {cliente?.veiculos?.length > 0 ? (cliente.veiculos || []).map((v: any) => (
                       <tr key={v.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="p-4">
                             <span className="bg-zinc-950 text-white px-3 py-1 rounded-lg text-[10px] font-black border border-zinc-800 font-mono tracking-widest">
                               {v.placa}
                             </span>
                          </td>
                          <td className="p-4 font-black text-white italic text-xs uppercase">{v.modelo}</td>
                          <td className="p-4 text-[10px] text-zinc-500 font-black uppercase tracking-widest">{v.marca}</td>
                          <td className="p-4 text-[10px] font-mono font-bold text-zinc-500">{v.ano}</td>
                          <td className="p-4 text-[10px] font-mono text-zinc-400">
                             {v.quilometragem ? `${v.quilometragem.toLocaleString()} KM` : (v.horimetro_atual ? `${v.horimetro_atual}h` : '0 KM')}
                          </td>
                          <td className="p-4 text-right">
                             <Link href={`/veiculos/${v.id}`} className="px-4 py-2.5 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-zinc-800 transition min-h-[44px] inline-flex items-center">
                               Ver Ficha
                             </Link>
                          </td>
                       </tr>
                     )) : (
                       <tr><td colSpan={6} className="p-8 text-center text-zinc-500 text-[10px] uppercase font-black italic">Nenhum Veículo Vinculado</td></tr>
                     )}
                  </tbody>
                </table>
              </div>

              {/* Mobile layout: Cards */}
              <div className="block md:hidden space-y-4">
                {cliente?.veiculos?.length > 0 ? (cliente.veiculos || []).map((v: any) => (
                  <div key={v.id} className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                     <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                           <h4 className="text-sm font-black text-white uppercase italic">{v.modelo}</h4>
                           <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{v.marca} | {v.ano}</span>
                        </div>
                        <span className="bg-zinc-900 text-white px-3 py-1 rounded-lg text-[10px] font-black border border-zinc-800 font-mono tracking-widest">
                          {v.placa}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 gap-4 py-3 border-y border-zinc-800 bg-zinc-900/10 px-2 rounded-xl text-left">
                        <div>
                           <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">Quilometragem</p>
                           <p className="text-xs font-black font-mono text-blue-500 mt-1">
                             {v.quilometragem ? `${v.quilometragem?.toLocaleString()} KM` : (v.horimetro_atual ? `${v.horimetro_atual}h` : '0 KM')}
                           </p>
                        </div>
                        <div>
                           <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest font-bold">Protocolo Ref</p>
                           <p className="text-xs font-black font-mono text-orange-500 mt-1 uppercase">
                             {`#${v.id?.slice(-4).toUpperCase() || '---'}`}
                           </p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <Link href={`/veiculos/${v.id}`} className="flex-1">
                           <button type="button" className="w-full min-h-[44px] bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition cursor-pointer">
                             Visualizar
                           </button>
                        </Link>
                        <Link href={`/os/nova?cliente_id=${cliente?.id}&veiculo_id=${v.id}`} className="flex-1">
                           <button type="button" className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition cursor-pointer">
                             Nova OS
                           </button>
                        </Link>
                     </div>
                  </div>
                )) : (
                   <div className="py-8 text-center bg-zinc-950/20 border border-dashed border-zinc-800 rounded-2xl opacity-60">
                      <p className="text-[10px] font-black uppercase tracking-widest italic text-zinc-500">Nenhum Veículo Vinculado</p>
                   </div>
                )}
              </div>
            </div>
          </section>

          {/* HISTÓRICO DE OS */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 sm:p-8 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                   <h2 className="text-base font-black text-white uppercase italic tracking-tight">HISTÓRICO OPERACIONAL</h2>
                   <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Registro cronológico de intervenções</p>
                </div>
              </div>
            </div>

            {/* Desktop layout: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-950/50 border-b border-zinc-800 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    <th className="p-6">Nº OS</th>
                    <th className="p-6">Veículo</th>
                    <th className="p-6">Status</th>
                    <th className="p-6">Data</th>
                    <th className="p-6 text-right">Valor Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {cliente?.ordens?.length > 0 ? (cliente.ordens || []).map((os: any) => (
                    <tr 
                      key={os.id} 
                      onClick={() => router.push(`/os/${os.id}`)}
                      className="hover:bg-orange-500/[0.02] cursor-pointer group transition-colors"
                    >
                      <td className="p-6">
                        <span className="text-xs font-black font-mono text-orange-500 italic">#{os.numero || '---'}</span>
                      </td>
                      <td className="p-6">
                        <span className="text-[11px] font-black text-zinc-300 uppercase italic truncate">{os.veiculo?.modelo || 'VEÍCULO REMOVIDO'}</span>
                      </td>
                      <td className="p-6">
                        <StatusBadge status={os.status} />
                      </td>
                      <td className="p-6">
                        <span className="text-[10px] font-mono font-bold text-zinc-500">{os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '---'}</span>
                      </td>
                      <td className="p-6 text-right">
                        <span className="text-xs font-black text-white font-mono tracking-tighter">
                          {(os.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="p-16 text-center opacity-30 font-bold uppercase text-[10px] text-zinc-500">Nenhum registro encontrado</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile layout: Timeline */}
            <div className="block md:hidden p-6">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
                {cliente?.ordens?.length > 0 ? (cliente.ordens || []).map((os: any) => (
                   <div key={os.id} className="relative group">
                      <div className="absolute -left-[23px] top-3.5 w-3 h-3 rounded-full bg-zinc-950 border-4 border-orange-600 group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(234,88,12,0.3)]" />
                      
                      <Link href={`/os/${os.id}`} className="block">
                         <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3 group-hover:border-zinc-700 transition">
                            <div className="flex items-center justify-between gap-2">
                               <div className="flex items-center gap-2">
                                  <div className="p-2 bg-orange-600/10 text-orange-500 rounded-lg">
                                     <FileText size={14} />
                                  </div>
                                  <div className="text-left">
                                     <h4 className="text-xs font-black text-white font-mono uppercase italic">OS #{os.numero || '---'}</h4>
                                     <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wide truncate max-w-[145px] italic">
                                       {os.veiculo?.modelo || 'VEÍCULO'}
                                     </p>
                                  </div>
                               </div>
                               <StatusBadge status={os.status} />
                            </div>
                            <div className="flex items-center justify-between border-t border-zinc-900 pt-3 text-[10px] font-mono">
                               <div className="flex items-center gap-1.5 text-zinc-500">
                                  <Calendar size={12} />
                                  <span>{os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : '---'}</span>
                               </div>
                               <span className="font-black text-emerald-500 tracking-tight">
                                 {(os.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                               </span>
                            </div>
                            <div className="pt-1 flex items-center justify-end text-[8px] font-black uppercase text-zinc-500 group-hover:text-orange-500 transition-colors tracking-widest gap-1">
                               VER O.S. <ExternalLink size={10} />
                            </div>
                         </div>
                      </Link>
                   </div>
                )) : (
                   <div className="py-12 text-center opacity-40 font-black uppercase text-[10px] italic text-zinc-500">Nenhum registro encontrado</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE EXCLUSÃO */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-red-950/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">Excluir Cliente</h3>
                  <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">Ação irreversível</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm text-zinc-300 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o dossiê de <strong className="text-white">{cliente?.nome}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-6 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-[2] px-6 py-4 bg-red-600 hover:bg-red-500 disabled:bg-red-900/30 disabled:text-zinc-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-xl shadow-red-950/20 flex items-center justify-center gap-3"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Confirmar Exclusão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
