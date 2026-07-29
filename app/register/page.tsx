'use client';

import { useState } from 'react';
import { Lock, User, Building, Mail, CreditCard, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    empresa_nome: '',
    cnpj: '',
    nome_admin: '',
    email: '',
    senha: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        setError(data.error || 'Erro ao realizar cadastro');
      }
    } catch (error) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChevronRight className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Conta Criada!</h1>
          <p className="text-zinc-400 mb-6">Sua oficina foi registrada com sucesso. Você será redirecionado para o login em instantes...</p>
          <Link href="/login" className="text-orange-500 hover:underline font-mono text-xs uppercase tracking-widest">
            Ir para Login agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      <div className="w-full max-w-lg p-6 lg:p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl lg:rounded-3xl shadow-2xl relative z-10 my-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/20">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 uppercase tracking-tight">Registro de Oficina</h1>
          <p className="text-zinc-500 text-sm">Crie sua conta para começar a gerenciar sua oficina</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dados da Empresa */}
            <div className="md:col-span-2">
              <h2 className="text-[10px] font-mono uppercase text-orange-500 tracking-[0.2em] mb-4">Dados da Oficina</h2>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Nome da Oficina</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  name="empresa_nome"
                  type="text"
                  required
                  value={formData.empresa_nome}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                  placeholder="EX: Oficina Diesel Pro"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">CNPJ (Opcional)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  name="cnpj"
                  type="text"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            {/* Dados do Admin */}
            <div className="md:col-span-2 pt-2">
              <h2 className="text-[10px] font-mono uppercase text-orange-500 tracking-[0.2em] mb-4">Acesso do Administrador</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Seu Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  name="nome_admin"
                  type="text"
                  required
                  value={formData.nome_admin}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Email Admin</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                  placeholder="admin@email.com"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  name="senha"
                  type="password"
                  required
                  minLength={6}
                  value={formData.senha}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-mono">
              ERROR: {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
          >
            {loading ? (
              <>PROCESSANDO... <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
            ) : (
              'CRIAR CONTA DA OFICINA'
            )}
          </button>

          <div className="pt-2 text-center">
            <Link href="/login" className="text-zinc-500 text-xs hover:text-zinc-300 transition uppercase font-mono tracking-wider">
              Já tem conta? <span className="text-orange-500">FAZER LOGIN</span>
            </Link>
          </div>
        </form>

        <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase font-mono tracking-widest">
          &copy; {new Date().getFullYear()} Sistema Multi-Oficina Cloud.
        </p>
      </div>
    </div>
  );
}
