'use client';

import { Search, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import SinoNotificacoes from './SinoNotificacoes';
import { ThemeToggle } from './ThemeToggle';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // Não aparece na página de login
  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.cookie =
      'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  return (
    <header
      className="
        relative z-30 h-14 lg:h-16
        bg-white/80 dark:bg-zinc-950/80
        backdrop-blur-xl
        border-b border-zinc-200 dark:border-zinc-800
        flex items-center justify-between px-4 lg:px-6
        transition-colors
      "
    >
      {/* Espaço para botão mobile */}
      <div className="w-12 lg:hidden" />

      {/* Busca */}
      <div className="flex items-center gap-2 lg:gap-3 flex-1 max-w-2xl group">
        <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-600 group-focus-within:text-orange-500 transition-colors flex-shrink-0" />
        <input
          type="text"
          placeholder="BUSCAR OS, CLIENTE OU VEÍCULO..."
          className="
            bg-transparent text-xs
            text-zinc-900 dark:text-zinc-300
            placeholder-zinc-400 dark:placeholder-zinc-700
            focus:outline-none w-full
            font-black uppercase tracking-widest
          "
        />
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Toggle Dark/Light */}
        <ThemeToggle />

        <SinoNotificacoes />

        <button
          onClick={handleLogout}
          className="
            hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-all
            text-zinc-600 dark:text-zinc-500
            hover:text-red-600 dark:hover:text-red-500
            hover:bg-red-50 dark:hover:bg-red-600/10
            border border-zinc-200 dark:border-zinc-800
            hover:border-red-300 dark:hover:border-red-600/30
            font-mono text-[10px] uppercase tracking-widest
          "
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Encerrar Sessão</span>
        </button>

        {/* Mobile: só ícone */}
        <button
          onClick={handleLogout}
          className="
            sm:hidden p-2 rounded-xl transition
            text-red-600 dark:text-red-500
            hover:bg-red-50 dark:hover:bg-red-600/10
            border border-zinc-200 dark:border-zinc-800
          "
          aria-label="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
