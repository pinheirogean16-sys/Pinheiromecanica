'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        toast.error('Erro ao enviar e-mail.');
      }
    } catch {
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Recuperar Senha</h1>
          <p className="text-sm text-zinc-400 mt-2">Enviaremos um link para o seu e-mail.</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-emerald-400 font-bold text-sm bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
              Se o e-mail existir, você receberá um link de recuperação em instantes.
            </p>
            <Link href="/login" className="text-orange-500 text-xs font-bold uppercase hover:underline block">
              Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">E-mail Cadastrado</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition"
                placeholder="seu@email.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Link'}
            </button>
            <Link href="/login" className="flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-white transition mt-4">
              <ArrowLeft className="w-3 h-3" /> Voltar para o Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
