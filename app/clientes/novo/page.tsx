'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, User, Building2, Phone, Mail, MapPin } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  maskCPF,
  maskCNPJ,
  maskPhone,
  maskCEP,
  apenasNumeros,
  validarCpfCnpj,
  validarTelefone,
  validarCEP,
} from '@/lib/masks';

export default function NovoClientePage() {
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
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    observacoes: ''
  });

  const mascaraCpfCnpj = (valor: string) => {
    return formData.tipo === 'PF' ? maskCPF(valor) : maskCNPJ(valor);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const cpfCnpjLimpo = apenasNumeros(formData.cpf_cnpj);

      if (!validarCpfCnpj(cpfCnpjLimpo)) {
        toast.error(
          formData.tipo === 'PF' ? 'CPF inválido' : 'CNPJ inválido',
          { description: 'Verifique o número digitado.' }
        );
        setLoading(false);
        return;
      }

      if (!validarTelefone(formData.telefone)) {
        toast.error('Telefone inválido', {
          description: 'Digite DDD + número (10 ou 11 dígitos).',
        });
        setLoading(false);
        return;
      }

      if (formData.cep && !validarCEP(formData.cep)) {
        toast.error('CEP inválido', {
          description: 'O CEP deve ter 8 dígitos.',
        });
        setLoading(false);
        return;
      }

      const payloadLimpo = {
        ...formData,
        cpf_cnpj: cpfCnpjLimpo,
        telefone: apenasNumeros(formData.telefone),
        cep: apenasNumeros(formData.cep),
      };

      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadLimpo),
        credentials: 'include'
      });

      if (res.ok) {
        toast.success('Cliente cadastrado com sucesso!');
        router.push('/clientes');
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
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/clientes"
            className="p-4 bg-zinc-900 border border-zinc-800 rounded-[1.5rem] text-zinc-500 hover:text-white transition group shadow-2xl"
          >
            <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              Novo Cliente
            </h1>
            <p className="text-[11px] text-zinc-500 font-black uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
              Registro de Protocolo de Entidade
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tipo (PF/PJ) e Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, tipo: 'PF', tipo_pessoa: 'FISICA', cpf_cnpj: '' })
              }
              className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer ${
                formData.tipo === 'PF'
                  ? 'bg-zinc-800 text-white shadow-xl border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <User size={20} className={formData.tipo === 'PF' ? 'text-orange-500' : 'text-zinc-700'} />
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-widest italic">
                  Pessoa Física
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, tipo: 'PJ', tipo_pessoa: 'JURIDICA', cpf_cnpj: '' })
              }
              className={`py-4 rounded-2xl flex flex-col items-center gap-2 transition-all cursor-pointer ${
                formData.tipo === 'PJ'
                  ? 'bg-zinc-800 text-white shadow-xl border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <Building2 size={20} className={formData.tipo === 'PJ' ? 'text-orange-500' : 'text-zinc-700'} />
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-widest italic">
                  Pessoa Jurídica
                </span>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 p-2 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'ATIVO' })}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                formData.status === 'ATIVO'
                  ? 'bg-green-500/10 text-green-500 shadow-xl border border-green-500/20'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest italic">ATIVO</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'INATIVO' })}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                formData.status === 'INATIVO'
                  ? 'bg-red-500/10 text-red-500 shadow-xl border border-red-500/20'
                  : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              <span className="block text-[10px] font-black uppercase tracking-widest italic">INATIVO</span>
            </button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Identificação */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-1 h-6 bg-orange-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">
                Identificação Civil
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="col-span-full lg:col-span-2 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Nome Completo / Razão <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-bold uppercase tracking-widest placeholder:text-zinc-700 shadow-inner"
                  placeholder="NOME COMPLETO OU RAZÃO SOCIAL..."
                  required
                />
              </div>

              {formData.tipo === 'PJ' && (
                <>
                  <div className="col-span-full md:col-span-2 space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                      Razão Social Oficial
                    </label>
                    <input
                      type="text"
                      value={formData.razao_social}
                      onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-black uppercase tracking-widest placeholder:text-zinc-700 shadow-inner"
                      placeholder="RAZÃO SOCIAL DA EMPRESA..."
                    />
                  </div>
                  <div className="col-span-full md:col-span-1 space-y-2">
                    <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                      Nome Fantasia Comercial
                    </label>
                    <input
                      type="text"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-black uppercase tracking-widest placeholder:text-zinc-700 shadow-inner"
                      placeholder="NOME FANTASIA..."
                    />
                  </div>
                </>
              )}

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  {formData.tipo === 'PF' ? 'CPF' : 'CNPJ'} <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={mascaraCpfCnpj(formData.cpf_cnpj)}
                  onChange={(e) =>
                    setFormData({ ...formData, cpf_cnpj: apenasNumeros(e.target.value) })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner placeholder:text-zinc-700"
                  placeholder={formData.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  maxLength={formData.tipo === 'PF' ? 14 : 18}
                  required
                />
              </div>

              {formData.tipo === 'PJ' && (
                <div className="col-span-full md:col-span-1 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                    Insc. Estadual
                  </label>
                  <input
                    type="text"
                    value={formData.inscricao_estadual}
                    onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner placeholder:text-zinc-700"
                    placeholder="000000000-0"
                  />
                </div>
              )}

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Contato Ref.
                </label>
                <input
                  type="text"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition font-bold shadow-inner uppercase placeholder:text-zinc-700"
                  placeholder="NOME DO CONTATO"
                />
              </div>

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Telefone Principal <span className="text-orange-500">*</span>
                </label>
                <div className="relative group">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors"
                    size={14}
                  />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={maskPhone(formData.telefone)}
                    onChange={(e) =>
                      setFormData({ ...formData, telefone: apenasNumeros(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-5 text-xs text-white focus:border-orange-500 outline-none transition font-mono font-black shadow-inner placeholder:text-zinc-700"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-2 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Endereço de E-mail <span className="text-orange-500">*</span>
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-orange-500 transition-colors"
                    size={14}
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-5 text-xs text-white focus:border-orange-500 outline-none transition font-black lowercase shadow-inner placeholder:text-zinc-700"
                    placeholder="contato@email.com"
                    required
                  />
                </div>
              </div>

              <div className="col-span-full space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Observações Internas
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-orange-500 outline-none transition min-h-[140px] resize-y shadow-inner placeholder:text-zinc-700"
                  placeholder="Notas sobre o cliente..."
                />
              </div>
            </div>
          </section>

          {/* Localização */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-1 h-6 bg-blue-600 rounded-full" />
              <h2 className="text-sm font-black text-white uppercase italic tracking-widest">
                Localização Técnica
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  CEP <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={maskCEP(formData.cep)}
                  onChange={(e) =>
                    setFormData({ ...formData, cep: apenasNumeros(e.target.value) })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-mono font-black shadow-inner placeholder:text-zinc-700"
                  placeholder="00000-000"
                  maxLength={9}
                  required
                />
              </div>

              <div className="col-span-full md:col-span-2 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Endereço Completo <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-black uppercase italic shadow-inner placeholder:text-zinc-700"
                  placeholder="AVENIDA BRASIL..."
                  required
                />
              </div>

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-black shadow-inner placeholder:text-zinc-700"
                  placeholder="S/N"
                />
              </div>

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-black uppercase shadow-inner placeholder:text-zinc-700"
                  placeholder="INDUSTRIAL"
                />
              </div>

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Cidade <span className="text-orange-500">*</span>
                </label>
                <div className="relative group">
                  <MapPin
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-blue-500 transition-colors"
                    size={14}
                  />
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 pl-12 pr-5 text-xs text-white focus:border-blue-500 outline-none transition font-black uppercase shadow-inner placeholder:text-zinc-700"
                    placeholder="CIDADE"
                    required
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1 space-y-2">
                <label className="text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                  Estado <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.uf}
                  maxLength={2}
                  onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-4 px-5 text-xs text-white focus:border-blue-500 outline-none transition font-black text-center shadow-inner uppercase placeholder:text-zinc-700"
                  placeholder="UF"
                  required
                />
              </div>
            </div>
          </section>
        </div>

        {/* Ações Desktop */}
        <div className="hidden sm:flex flex-row gap-6 pt-10">
          <Link href="/clientes" className="flex-1">
            <button
              type="button"
              className="w-full py-6 text-zinc-500 hover:text-zinc-300 font-black uppercase text-[10px] tracking-[0.2em] transition border border-zinc-800 rounded-2xl italic cursor-pointer"
            >
              Abortar Operação
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-orange-600 hover:bg-orange-500 text-white font-black uppercase text-xs tracking-[0.2em] py-6 rounded-2xl transition-all shadow-xl shadow-orange-950/20 disabled:opacity-50 flex items-center justify-center gap-3 italic transform active:scale-95 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            Sincronizar no Banco
          </button>
        </div>

        {/* Ações Mobile */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 p-3 flex gap-2 z-50">
          <Link href="/clientes" className="flex-1">
            <button
              type="button"
              className="w-full min-h-[50px] bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center cursor-pointer"
            >
              Cancelar
            </button>
          </Link>
          <Link href="/os/nova" className="flex-1">
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
            className="flex-[2] min-h-[50px] bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Salvar Cliente
          </button>
        </div>
      </form>
    </div>
  );
}
