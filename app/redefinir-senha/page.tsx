'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 👇 LÊ A URL DIRETAMENTE DO NAVEGADOR (Garante que o token seja pego)
  useEffect(() => {
    setIsMounted(true);
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (!token) {
      toast.error('Token inválido.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 3000);
      } else {
        toast.error(data.error || 'Erro ao redefinir senha.');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Evita erro de hidratação antes de ler a URL
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Senha Redefinida!</h1>
          <p className="text-sm text-zinc-400">
            Sua senha foi alterada com sucesso. Você será redirecionado para o login...
          </p>
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md p-8 bg-zinc-900 border border-red-500/20 rounded-3xl text-center space-y-4 shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-black text-white uppercase">Token Inválido</h1>
          <p className="text-sm text-zinc-400">
            O link de recuperação está incompleto ou expirou. Solicite um novo.
          </p>
          <Link href="/recuperar-senha" className="block w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
            Solicitar Novo Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase">Nova Senha</h1>
          <p className="text-sm text-zinc-400 mt-2">Crie uma nova senha de acesso.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Nova Senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-orange-500"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Confirmar Senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-orange-500"
              placeholder="Repita a senha"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
