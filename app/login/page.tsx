'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, Wrench } from 'lucide-react';
import { BRANDING } from '@/lib/branding';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
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
      {/* Glow decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grade decorativa */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-6 lg:p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl lg:rounded-3xl shadow-2xl relative z-10"
      >
        {/* Header com logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-900/40">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1 tracking-tight uppercase">
            {BRANDING.name}
          </h1>
          <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">
            {BRANDING.slogan}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">
              Email Institucional
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 lg:py-4 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm lg:text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all font-mono"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono uppercase text-zinc-500 tracking-wider">
              Senha Mestre
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 lg:py-4 pl-10 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm lg:text-base focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all font-mono"
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
            className="w-full text-white py-3 lg:py-4 rounded-xl font-black text-sm uppercase tracking-widest bg-orange-600 hover:bg-orange-500 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-[0.98]"
          >
            {loading ? (
              <>
                ENTRANDO...
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </>
            ) : (
              'ENTRAR NO SISTEMA'
            )}
          </button>
        </form>

        <p className="text-center text-zinc-600 text-xs mt-8 font-mono uppercase tracking-widest">
          © {new Date().getFullYear()} {BRANDING.name}
        </p>
      </motion.div>
    </div>
  );
}
