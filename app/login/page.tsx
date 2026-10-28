'use client';

import { useState, Suspense } from 'react'; // ✅ Adicionado Suspense
import { useRouter, useSearchParams } from 'next/navigation'; // ✅ Adicionado useSearchParams
import { 
  Lock, Mail, Building, CreditCard, ChevronRight, KeyRound, 
  User, ArrowRight, ArrowLeft, CheckCircle2, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BRANDING } from '@/lib/branding';
import { apiFetch } from '@/lib/api';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ Lê os parâmetros da URL
  
  // ✅ Se a URL tiver ?mode=register, inicia na aba de cadastro
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  
  const [loading, setLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    invite_token: '',
    empresa_nome: '',
    cnpj: '',
    nome_admin: '',
    email: '',
    senha: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch<{ redirect?: string }>('/api/auth/login', {
        method: 'POST',
        body: loginData,
        silentError: true,
      });

      toast.success('Login realizado com sucesso!');
      router.push(data.redirect || '/dashboard');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch<{ success: boolean }>('/api/register', {
        method: 'POST',
        body: registerData,
        silentError: true,
      });

      if (data.success) {
        setRegisterSuccess(true);
        setTimeout(() => {
          router.push('/bem-vindo');
        }, 3000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  if (registerSuccess) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-zinc-950">
        <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-3xl text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Conta Criada!</h1>
          <p className="text-sm text-zinc-400">
            Sua oficina foi registrada com sucesso. Você será redirecionado para o tutorial de primeiros passos em instantes...
          </p>
          <div className="pt-4 flex justify-center">
            <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
      
      <div className="w-full max-w-lg p-6 lg:p-10 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-[2rem] shadow-2xl relative z-10 my-8">
        
        <div className="text-center mb-8">
          <div className="w-36 h-36 mx-auto mb-4 flex items-center justify-center">
            <img 
              src={BRANDING.logo.url} 
              alt={BRANDING.logo.alt} 
              className="w-full h-full object-contain drop-shadow-2xl" 
            />
          </div>
          
          <h1 className="text-sm font-black text-orange-500 mb-2 uppercase tracking-widest">
            {BRANDING.slogan || 'Sistema de Gestão para Oficinas'}
          </h1>
          
          <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
            {isLogin ? 'Entre com suas credenciais' : 'Crie sua conta para começar'}
          </p>
        </div>

        {isLogin ? (
          <form onSubmit={handleLogin} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Senha de Acesso</label>
                <Link href="/recuperar-senha" className="text-[10px] font-bold text-orange-500 hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Sistema'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="pt-6 border-t border-zinc-800/60 text-center">
              <p className="text-xs text-zinc-500">
                Ainda não tem uma conta?
              </p>
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="mt-2 text-xs font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                Criar conta da oficina <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 px-1">Código de Convite</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={registerData.invite_token}
                    onChange={(e) => setRegisterData({ ...registerData, invite_token: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-mono font-bold text-white outline-none focus:border-orange-500 transition shadow-inner uppercase"
                    placeholder="CÓDIGO DE ACESSO"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Nome da Oficina</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={registerData.empresa_nome}
                    onChange={(e) => setRegisterData({ ...registerData, empresa_nome: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                    placeholder="EX: OFICINA DIESEL PRO"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">CNPJ (Opcional)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={registerData.cnpj}
                    onChange={(e) => setRegisterData({ ...registerData, cnpj: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-mono font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Seu Nome (Admin)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={registerData.nome_admin}
                    onChange={(e) => setRegisterData({ ...registerData, nome_admin: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                    placeholder="SEU NOME"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                    placeholder="admin@oficina.com"
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 px-1">Criar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={registerData.senha}
                    onChange={(e) => setRegisterData({ ...registerData, senha: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-orange-500 transition shadow-inner"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-950/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finalizar Cadastro'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="pt-6 border-t border-zinc-800/60 text-center">
              <p className="text-xs text-zinc-500">
                Já tem uma conta?
              </p>
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="mt-2 text-xs font-black uppercase tracking-widest text-orange-500 hover:text-orange-400 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3 h-3" /> Voltar para o Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ✅ O Next.js exige que o useSearchParams esteja dentro de um Suspense
export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
