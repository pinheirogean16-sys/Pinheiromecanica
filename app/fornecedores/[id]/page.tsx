'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, Edit, Trash2, User, Building2, 
  Phone, Mail, MapPin, FileText, 
  Settings, ShieldAlert, Truck
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/StatusBadge';

export default function FornecedorDetalhesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [fornecedor, setFornecedor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFornecedor = async () => {
      try {
        const res = await fetch(`/api/clientes/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.perfil === 'CLIENTE') {
             toast.error('Este registro é um cliente, não um fornecedor.');
             router.push('/fornecedores');
             return;
          }
          setFornecedor(data);
        } else {
          toast.error('Fornecedor não encontrado');
          router.push('/fornecedores');
        }
      } catch (err) {
        toast.error('Erro ao buscar dados do fornecedor');
      } finally {
        setLoading(false);
      }
    };
    fetchFornecedor();
  }, [id, router]);

  const handleDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir o registro de "${fornecedor?.nome}"?`)) return;
    
    try {
      const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Fornecedor excluído com sucesso');
        router.push('/fornecedores');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir fornecedor');
      }
    } catch (err) {
      toast.error('Erro de conexão');
    }
  };

  if (loading) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!fornecedor) return (
    <div className="min-h-[400px] flex items-center justify-center">
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 italic">Fornecedor não encontrado.</p>
    </div>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto px-3 sm:px-6 space-y-8 pb-20 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/fornecedores" className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">Dossiê do Fornecedor <span className="text-zinc-700 mx-2">|</span> #{fornecedor.id.slice(-6).toUpperCase()}</h1>
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] mt-1">SISTEMA DE SUPRIMENTOS PINHEIRO DIESEL</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href={`/fornecedores/${id}/editar`}
            className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition"
          >
            EDITAR CADASTRO
          </Link>
          <button 
            onClick={handleDelete}
            className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
          >
            EXCLUIR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center text-center space-y-6">
           <div className="p-8 bg-zinc-950 border-4 border-zinc-900 rounded-[2.5rem] shadow-2xl relative">
             <Truck size={60} className="text-blue-500" />
           </div>
           <div>
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter truncate">{fornecedor.nome}</h2>
             <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.2em] mt-1 truncate">{fornecedor.razao_social || 'CONTA COMERCIAL'}</p>
           </div>
           <div className="w-full grid grid-cols-1 gap-4 py-6 border-t border-zinc-800/50">
             <div className="text-left space-y-1">
               <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Documento</p>
               <p className="text-xs font-black text-zinc-300 font-mono tracking-tighter italic">{fornecedor.cpf_cnpj}</p>
             </div>
             <div className="text-left space-y-1">
               <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Telefone</p>
               <p className="text-xs font-black text-zinc-300 font-mono tracking-tighter italic">{fornecedor.telefone}</p>
             </div>
             <div className="text-left space-y-1">
               <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">E-mail</p>
               <p className="text-xs font-black text-zinc-300 tracking-tighter italic truncate">{fornecedor.email || 'N/A'}</p>
             </div>
           </div>
        </section>

        <section className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 shadow-2xl space-y-8">
           <div className="flex items-center gap-4 mb-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Informações de Suporte</h2>
           </div>
           <div className="grid grid-cols-1 gap-6 text-zinc-400">
              <div className="space-y-2 p-6 bg-zinc-950 rounded-2xl border border-zinc-800">
                 <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Endereço Fiscal</p>
                 <p className="text-xs font-bold uppercase italic line-clamp-3">{fornecedor.endereco || 'Não informado'}</p>
              </div>
              <div className="space-y-2 p-6 bg-zinc-950 rounded-2xl border border-zinc-800">
                 <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Observações Operacionais</p>
                 <p className="text-xs italic uppercase line-clamp-3">{fornecedor.observacoes || 'Nenhuma nota registrada'}</p>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}
