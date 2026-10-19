'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ CORRIGIDO: apiFetch padronizado
      await apiFetch('/api/auth/recuperar-senha', {
        method: 'POST',
        body: { email },
      });

      setSuccess(true);
    } catch (err: any) {
      // ✅ CORRIGIDO: mensagens específicas (ex: rate limit 429, e-mail inválido)
      handleApiError(err, { defaultMessage: 'Erro ao enviar e-mail.' });
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
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Recuperar Senha
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Enviaremos um link para o seu e-mail.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <p className="text-emerald-400 font-bold text-sm leading-relaxed">
                Se o e-mail existir em nossa base, você receberá um link de recuperação em instantes.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-orange-500 hover:text-orange-400 text-[11px] font-black uppercase tracking-widest transition"
            >
              <ArrowLeft size={14} /> Voltar para o Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
                E-mail Cadastrado
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner placeholder:text-zinc-700"
                placeholder="seu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] shadow-lg shadow-orange-950/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send size={16} /> Enviar Link
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-1.5 text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar para o Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
