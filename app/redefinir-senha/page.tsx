'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, CheckCircle2, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { handleApiError } from '@/lib/handle-api-error';

// ============================================================
// CONSTANTES (espelham a política do backend)
// ============================================================
const SENHA_MIN_LENGTH = 8;
const REDIRECT_DELAY_MS = 4000;

// ============================================================
// VALIDAÇÃO DE SENHA (espelha o backend)
// ============================================================
function validarSenha(senha: string): { valida: boolean; erro?: string } {
  if (senha.length < SENHA_MIN_LENGTH) {
    return { valida: false, erro: `A senha deve ter pelo menos ${SENHA_MIN_LENGTH} caracteres.` };
  }
  if (!/[A-Za-z]/.test(senha)) {
    return { valida: false, erro: 'A senha deve conter pelo menos uma letra.' };
  }
  if (!/\d/.test(senha)) {
    return { valida: false, erro: 'A senha deve conter pelo menos um número.' };
  }
  return { valida: true };
}

// ============================================================
// CONTEÚDO (usa useSearchParams — precisa estar dentro de Suspense)
// ============================================================
function RedefinirSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // ✅ NOVO: cleanup do timeout para evitar redirect após unmount
  useEffect(() => {
    if (!success) return;

    const timer = setTimeout(() => {
      router.push('/login');
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [success, router]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // ✅ NOVO: validação client-side (espelha o backend)
      const validacao = validarSenha(novaSenha);
      if (!validacao.valida) {
        toast.error(validacao.erro || 'Senha inválida.');
        return;
      }

      if (novaSenha !== confirmarSenha) {
        toast.error('As senhas não coincidem.');
        return;
      }

      if (!token) {
        toast.error('Token inválido. Solicite um novo link de recuperação.');
        return;
      }

      setLoading(true);
      try {
        await apiFetch('/api/auth/redefinir-senha', {
          method: 'POST',
          body: { token, novaSenha },
        });

        setSuccess(true);
        toast.success('Senha redefinida com sucesso!');
      } catch (err: any) {
        handleApiError(err, { defaultMessage: 'Erro ao redefinir senha' });
      } finally {
        setLoading(false);
      }
    },
    [novaSenha, confirmarSenha, token]
  );

  // ============================================================
  // SUCESSO
  // ============================================================
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md p-8 bg-zinc-900 border border-emerald-500/20 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Senha Redefinida!
          </h1>
          <p className="text-sm text-zinc-400">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes...
          </p>
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
          <Link
            href="/login"
            className="inline-block text-[10px] font-black text-orange-500 hover:text-orange-400 uppercase tracking-widest transition"
          >
            Ir para o login agora →
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // TOKEN AUSENTE
  // ============================================================
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md p-8 bg-zinc-900 border border-red-500/20 rounded-3xl text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Token Inválido
          </h1>
          <p className="text-sm text-zinc-400">
            O link de recuperação está incompleto ou expirou. Solicite um novo.
          </p>
          <Link
            href="/recuperar-senha"
            className="block w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition"
          >
            Solicitar Novo Link
          </Link>
          <Link
            href="/login"
            className="inline-block text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // FORMULÁRIO
  // ============================================================
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Nova Senha
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            Crie uma nova senha de acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Nova Senha */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                required
                autoComplete="new-password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 pr-12 text-xs font-bold text-white outline-none focus:border-orange-500 transition"
                placeholder={`Mínimo ${SENHA_MIN_LENGTH} caracteres`}
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition"
                tabIndex={-1}
              >
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider px-1">
              Mínimo {SENHA_MIN_LENGTH} caracteres, com 1 letra e 1 número
            </p>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">
              Confirmar Senha
            </label>
            <input
              type={showSenha ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-zinc-800">
          <Link
            href="/login"
            className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition"
          >
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE (Suspense obrigatório para useSearchParams no App Router)
// ============================================================
export default function RedefinirSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
      }
    >
      <RedefinirSenhaContent />
    </Suspense>
  );
}
