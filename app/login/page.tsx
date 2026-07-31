'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Terminal, Wrench } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [corPrincipal, setCorPrincipal] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('corPrincipal') || '#F97316';
    }
    return '#F97316';
  });

  const [logo, setLogo] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('logo') || '';
    }
    return '';
  });

  const [nomeSistema, setNomeSistema] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nomeSistema') || 'Pinheiro Diesel Pro';
    }
    return 'Pinheiro Diesel Pro';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (data.success) {
        window.location.href = data.redirect || '/dashboard';
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (error) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-6 lg:p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl lg:rounded-3xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          {logo ? (
            <img src={logo} alt="Logo" className="h-16 mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/20">
              <Wrench className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-1 truncate">{nomeSistema}</h1>
          <p className="text-zinc-500 text-sm">Sistema de Gestão para Oficina Diesel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Email institucional</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 lg:py-4 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm lg:text-base focus:outline-none focus:ring-1 transition-all font-mono"
                style={{ borderColor: corPrincipal + '20' }}
                placeholder="admin@pinheiro.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">Senha mestre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 lg:py-4 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm lg:text-base focus:outline-none focus:ring-1 transition-all font-mono"
                style={{ borderColor: corPrincipal + '20' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs font-mono"
            >
              ERROR: {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: corPrincipal }}
            className="w-full text-white py-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>ENTRANDO... <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
            ) : (
              'ENTRAR NO SISTEMA'
            )}
          </button>

        </form>

        <p className="text-center text-zinc-600 text-xs mt-8">
          &copy; {new Date().getFullYear()} {nomeSistema}. Todos os direitos reservados.
        </p>
      </motion.div>
    </div>
  );
}
