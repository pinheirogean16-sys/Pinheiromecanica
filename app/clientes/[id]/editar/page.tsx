'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, User, Building2, Phone, Mail, MapPin, Terminal, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
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
    perfil: 'CLIENTE' as 'CLIENTE' | 'FORNECEDOR' | 'AMBOS',
    endereco: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });

  useEffect(() => {
    const fetchCliente = async () => {
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
            perfil: data.perfil || 'CLIENTE',
            endereco: data.endereco || '',
            cidade: data.cidade || '',
            uf: data.uf || data.estado || '',
            observacoes: data.observacoes || ''
          });
        }
      } catch (error) {
        toast.error('Erro ao buscar dados do cliente');
      } finally {
        setFetching(false);
      }
    };

    fetchCliente();
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
        toast.success('Registro atualizado com sucesso!');
        router.push('/clientes');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao atualizar registro');
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
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.3em]">Resgatando Registro...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/clientes" className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white transition">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">Atualizar Registro de Cliente</h1>
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Edição de Dossiê de Frota</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Segmentação & Status Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'PF', tipo_pessoa: 'FISICA' })}
              className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer ${
                formData.tipo === 'PF' 
                  ? 'bg-zinc-800 text-white shadow-xl border border-zinc-700' 
                  : 'text-zinc-650 hover:text-zinc-450'
              }`}
            >
              <User size={20} className={formData.tipo === 'PF' ? 'text-orange-500' : 'text-zinc-700'} />
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-widest italic">Pessoa Física</span>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({ ...formData, tipo: 'PJ', tipo_pessoa: 'JURIDICA' })}
              className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer ${
                formData.tipo === 'PJ' 
                  ? 'bg-zinc-800 text-white shadow-xl border border-zinc-700' 
                  : 'text-zinc-650 hover:text-zinc-450'
              }`}
            >
              <Building2 size={20} className={formData.tipo === 'PJ' ? 'text-orange-500' : 'text-zinc-700'} />
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-widest italic">Pessoa Jurídica</span>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'ATIVO' })}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                formData.status === 'ATIVO' 
                  ? 'bg-green-650/10 text-green-500 shadow-xl border border-green-600/20' 
                  : 'text-zinc-650 hover:text-zinc-400'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest italic">ATIVO</span>
            </button>
            
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'INATIVO' })}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                formData.status === 'INATIVO' 
                  ? 'bg-red-650/10 text-red-500 shadow-xl border border-red-650/20' 
                  : 'text-zinc-650 hover:text-zinc-400'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest italic">INATIVO</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Main Info Section */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">
             <div className="flex items-center gap-4 mb-2">
                <div className="w-1 h-6 bg-orange-600 rounded-full" />
                <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Identificação Civil (Protocolo: {id.substring(0, 8)})</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-full lg:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome Completo / Razão <span className="text-orange-500">*</span></label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-bold uppercase tracking-widest placeholder:text-zinc-850 shadow-inner"
                    placeholder="NOME COMPLETO OU RAZÃO SOCIAL..."
                    required
                  />
                </div>

                {formData.tipo === 'PJ' && (
                  <>
                    <div className="col-span-full md:col-span-2 space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Razão Social Oficial</label>
                      <input
                        type="text"
                        value={formData.razao_social}
                        onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-black uppercase tracking-widest placeholder:text-zinc-850 shadow-inner"
                        placeholder="RAZÃO SOCIAL DA EMPRESA..."
                      />
                    </div>
                    <div className="col-span-full md:col-span-1 space-y-2">
                      <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Nome Fantasia comercial</label>
                      <input
                        type="text"
                        value={formData.nome_fantasia}
                        onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-black uppercase tracking-widest placeholder:text-zinc-850 shadow-inner"
                        placeholder="NOME FANTASIA..."
                      />
                    </div>
                  </>
                )}

                <div className="col-span-full md:col-span-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">{formData.tipo === 'PF' ? 'CPF' : 'CNPJ'} <span className="text-orange-500">*</span></label>
                  <input
                    type="text"
                    value={formData.cpf_cnpj}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner"
                    placeholder={formData.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                    required
                  />
                </div>
                {formData.tipo === 'PJ' && (
                  <div className="col-span-full md:col-span-1 space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Insc. Estadual</label>
                    <input
                      type="text"
                      value={formData.inscricao_estadual}
                      onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner"
                      placeholder="000000000-0"
                    />
                  </div>
                )}
                
                <div className="col-span-full md:col-span-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Contato Ref.</label>
                  <input
                    type="text"
                    value={formData.contato}
                    onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-bold shadow-inner uppercase"
                    placeholder="NOME CONTATO"
                  />
                </div>

                <div className="col-span-full md:col-span-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Telefone Principal <span className="text-orange-500">*</span></label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors" size={14} />
                    <input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-5 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner"
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                </div>

                <div className="col-span-full md:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Endereço de E-mail <span className="text-orange-500">*</span></label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors" size={14} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-5 text-xs text-white focus:border-orange-500 outline-none transition font-black lowercase shadow-inner"
                      placeholder="contato@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="col-span-full space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Observações Internas</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition min-h-[140px] resize-y shadow-inner uppercase"
                    placeholder="NOTAS SOBRE O CLIENTE..."
                  />
                </div>
             </div>
          </section>

          {/* Localization Section */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
             <div className="flex items-center gap-4 mb-2">
                <div className="w-1 h-6 bg-blue-600 rounded-full" />
                <h2 className="text-sm font-black text-white uppercase italic tracking-widest">Localização Técnica</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-full md:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Endereço Completo <span className="text-orange-500">*</span></label>
                  <div className="relative group animate-none">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-blue-500 transition-colors" size={14} />
                    <input
                      type="text"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-5 text-xs text-white focus:border-blue-500 outline-none transition font-black uppercase italic shadow-inner animate-none"
                      placeholder="AVENIDA BRASIL..."
                      required
                    />
                  </div>
                </div>
                <div className="col-span-full md:col-span-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Cidade <span className="text-orange-500">*</span></label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-black uppercase shadow-inner"
                    placeholder="CIDADE"
                    required
                  />
                </div>
                <div className="col-span-full md:col-span-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">Estado <span className="text-orange-500">*</span></label>
                  <input
                    type="text"
                    value={formData.uf}
                    maxLength={2}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-black text-center shadow-inner uppercase"
                    placeholder="UF"
                    required
                  />
                </div>
             </div>
          </section>
        </div>

        {/* DESKTOP ACTIONS FOOTER */}
        <div className="hidden sm:flex flex-row gap-6 pt-10">
          <Link href="/clientes" className="flex-1">
            <button type="button" className="w-full py-6 text-zinc-550 hover:text-zinc-350 font-black uppercase text-[10px] tracking-[0.2em] transition border border-zinc-800 rounded-2xl italic cursor-pointer">
              Descartar Alterações
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs tracking-[0.2em] py-6 rounded-2xl transition-all shadow-xl shadow-orange-950/20 disabled:opacity-50 flex items-center justify-center gap-3 italic transform active:scale-95 cursor-pointer"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            Confirmar Alterações
          </button>
        </div>

        {/* MOBILE STICKY LOWER DOCK */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-850 p-3 flex gap-2 z-50">
          <Link href="/clientes" className="flex-1">
            <button 
              type="button" 
              className="w-full min-h-[50px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center cursor-pointer"
            >
              Voltar
            </button>
          </Link>
          <Link href={`/os/nova?cliente_id=${id}`} className="flex-1">
            <button 
              type="button" 
              className="w-full min-h-[50px] bg-zinc-900 text-orange-500 border border-orange-950/20 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center cursor-pointer"
            >
              Nova OS
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-2 min-h-[50px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
            Confirmar
          </button>
        </div>
      </form>
    </div>
  );
}
