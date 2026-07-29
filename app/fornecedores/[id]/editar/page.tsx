'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, User, Building2, Phone, Mail, MapPin, Terminal, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditarFornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    tipo: 'PJ' as 'PF' | 'PJ',
    tipo_pessoa: 'JURIDICA',
    nome: '',
    razao_social: '',
    nome_fantasia: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    telefone: '',
    contato: '',
    email: '',
    status: 'ATIVO',
    perfil: 'FORNECEDOR' as 'CLIENTE' | 'FORNECEDOR' | 'AMBOS',
    endereco: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });

  useEffect(() => {
    const fetchFornecedor = async () => {
      try {
        const res = await fetch(`/api/clientes/${id}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setFormData({
            tipo: data.tipo || 'PJ',
            tipo_pessoa: data.tipo_pessoa || (data.tipo === 'PF' ? 'FISICA' : 'JURIDICA'),
            nome: data.nome || '',
            razao_social: data.razao_social || '',
            nome_fantasia: data.nome_fantasia || '',
            cpf_cnpj: data.cpf_cnpj || '',
            inscricao_estadual: data.inscricao_estadual || '',
            telefone: data.telefone || '',
            contato: data.contato || '',
            email: data.email || '',
            status: data.status || 'ATIVO',
            perfil: data.perfil || 'FORNECEDOR',
            endereco: data.endereco || '',
            cidade: data.cidade || '',
            uf: data.uf || data.estado || '',
            observacoes: data.observacoes || ''
          });
        }
      } catch (error) {
        toast.error('Erro ao buscar dados do fornecedor');
      } finally {
        setFetching(false);
      }
    };

    fetchFornecedor();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`/api/clientes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, estado: formData.uf }),
        credentials: 'include'
      });
      
      if (res.ok) {
        toast.success('Fornecedor atualizado com sucesso!');
        router.push('/fornecedores');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar fornecedor');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">Resgatando Registro...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/fornecedores" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Editar Fornecedor</h1>
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Manutenção de Dados de Suprimentos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo: 'PF', tipo_pessoa: 'FISICA' })}
                  className={`py-3 rounded-xl transition-all ${formData.tipo === 'PF' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}
                >
                  PF
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipo: 'PJ', tipo_pessoa: 'JURIDICA' })}
                  className={`py-3 rounded-xl transition-all ${formData.tipo === 'PJ' ? 'bg-zinc-800 text-white' : 'text-zinc-600'}`}
                >
                  PJ
                </button>
             </div>
             <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'ATIVO' })}
                  className={`py-3 rounded-xl transition-all ${formData.status === 'ATIVO' ? 'bg-green-600/20 text-green-500' : 'text-zinc-600'}`}
                >
                  ATIVO
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: 'INATIVO' })}
                  className={`py-3 rounded-xl transition-all ${formData.status === 'INATIVO' ? 'bg-red-600/20 text-red-500' : 'text-zinc-600'}`}
                >
                  INATIVO
                </button>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome / Razão Social</label>
              <input
                type="text" required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-blue-500 outline-none uppercase font-black"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Perfil</label>
              <select 
                value={formData.perfil}
                onChange={(e) => setFormData({...formData, perfil: e.target.value as any})}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-blue-500 outline-none"
              >
                <option value="FORNECEDOR">FORNECEDOR</option>
                <option value="CLIENTE">CLIENTE</option>
                <option value="AMBOS">AMBOS</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">CPF / CNPJ</label>
              <input
                type="text" required
                value={formData.cpf_cnpj}
                onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="h-[1px] bg-zinc-850 my-6" />

          <div className="space-y-2">
            <span className="text-[10px] text-orange-500 uppercase font-black tracking-widest italic block">
              Localização Técnica / Endereço
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Endereço</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:border-blue-500 outline-none uppercase font-bold"
                  placeholder="AVENIDA BRASIL, 123"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Cidade</label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-blue-500 outline-none uppercase"
                placeholder="RUA, CEP, CIDADE"
              />
            </div>

            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Estado (UF)</label>
              <input
                type="text"
                value={formData.uf}
                maxLength={2}
                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:border-blue-500 outline-none text-center uppercase font-mono"
                placeholder="UF"
              />
            </div>
          </div>
        </section>

        <div className="flex gap-4">
          <Link href="/fornecedores" className="flex-1">
            <button type="button" className="w-full py-5 border border-zinc-800 rounded-3xl text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:bg-zinc-900 transition-all">
              Cancelar
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-[0.3em] py-5 rounded-3xl transition-all shadow-xl shadow-blue-950/20 disabled:opacity-50 flex items-center justify-center gap-4"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
