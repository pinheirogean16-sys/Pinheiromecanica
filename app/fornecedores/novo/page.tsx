'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Save, User, Building2, Phone, Mail, MapPin, Terminal, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, estado: formData.uf }),
        credentials: 'include'
      });
      
      if (res.ok) {
        toast.success('Fornecedor cadastrado com sucesso!');
        router.push('/fornecedores');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Falha na validação do registro');
      }
    } catch (error) {
      toast.error('Interrupção na rede de dados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 space-y-10 pb-24 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/fornecedores" className="p-4 bg-zinc-900 border border-zinc-800 rounded-[1.5rem] text-zinc-500 hover:text-white transition group shadow-2xl">
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Novo Fornecedor</h1>
            <p className="text-[11px] text-zinc-600 font-black uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
               Registro de Protocolo de Parceiro
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'PF', tipo_pessoa: 'FISICA' })}
              className={`py-6 rounded-[2rem] flex flex-col items-center gap-2 transition-all ${
                formData.tipo === 'PF' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400 grayscale'
              }`}
            >
              <User size={24} className={formData.tipo === 'PF' ? 'text-blue-500' : 'text-zinc-700'} />
              <span className="block text-[10px] font-black uppercase tracking-widest italic">Pessoa Física</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'PJ', tipo_pessoa: 'JURIDICA' })}
              className={`py-6 rounded-[2rem] flex flex-col items-center gap-2 transition-all ${
                formData.tipo === 'PJ' ? 'bg-zinc-800 text-white shadow-xl' : 'text-zinc-600 hover:text-zinc-400 grayscale'
              }`}
            >
              <Building2 size={24} className={formData.tipo === 'PJ' ? 'text-blue-500' : 'text-zinc-700'} />
              <span className="block text-[10px] font-black uppercase tracking-widest italic">Pessoa Jurídica</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'ATIVO' })}
              className={`py-6 rounded-[2rem] transition-all ${formData.status === 'ATIVO' ? 'bg-green-600/10 text-green-500 border border-green-600/20' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <span className="block text-[10px] font-black tracking-widest italic">ATIVO</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'INATIVO' })}
              className={`py-6 rounded-[2rem] transition-all ${formData.status === 'INATIVO' ? 'bg-red-600/10 text-red-500 border border-red-600/20' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              <span className="block text-[10px] font-black tracking-widest italic">INATIVO</span>
            </button>
          </div>
        </div>

        <section className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-10 shadow-2xl space-y-8">
           <div className="flex items-center gap-4 mb-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Identificação do Fornecedor</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Nome / Razão Social</label>
                <input
                  type="text" required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none font-black uppercase italic"
                />
              </div>

              {formData.tipo === 'PJ' && (
                <>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Razão Social Completa</label>
                    <input
                      type="text"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none font-black uppercase italic"
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Insc. Estadual</label>
                    <input
                      type="text"
                      value={formData.inscricao_estadual}
                      onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none font-mono"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{formData.tipo === 'PF' ? 'CPF' : 'CNPJ'}</label>
                <input
                  type="text" required
                  value={formData.cpf_cnpj}
                  onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Telefone</label>
                <input
                  type="tel" required
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none font-mono"
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">E-mail</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Endereço Secundário/Localização */}
              <div className="md:col-span-3 h-[1px] bg-zinc-900 my-4" />

              <div className="md:col-span-3 space-y-2">
                <span className="text-[10px] text-orange-500 uppercase font-black tracking-widest italic block mb-3">
                  Localização Técnica / Endereço
                </span>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest px-1">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 pl-12 pr-6 text-xs text-white focus:border-blue-500 outline-none uppercase"
                    placeholder="AVENIDA BRASIL, 123"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none uppercase"
                  placeholder="CIDADE"
                />
              </div>

              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Estado (UF)</label>
                <input
                  type="text"
                  value={formData.uf}
                  maxLength={2}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-5 px-6 text-xs text-white focus:border-blue-500 outline-none text-center uppercase font-mono"
                  placeholder="UF"
                />
              </div>

              <div className="md:col-span-3 h-[1px] bg-zinc-900 my-4" />

              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Observações</label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-xs text-white focus:border-blue-500 outline-none min-h-[100px] resize-none uppercase"
                />
              </div>
           </div>
        </section>

        <div className="flex flex-col sm:flex-row gap-6 pt-10">
          <Link href="/fornecedores" className="flex-1">
            <button type="button" className="w-full py-8 text-zinc-600 hover:text-zinc-400 font-black uppercase text-[11px] tracking-[0.4em] transition">
              Cancelar
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-sm tracking-[0.3em] py-8 rounded-[2.5rem] transition-all flex items-center justify-center gap-6 italic"
          >
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : <Save size={24} />}
            Cadastrar Fornecedor
          </button>
        </div>
      </form>
    </div>
  );
}
