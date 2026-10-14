'use client';

import { Search, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import SinoNotificacoes from './SinoNotificacoes';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/login');
  };

  return (
    <header className="relative z-30 h-14 lg:h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 flex items-center justify-between px-4 lg:px-6">
      <div className="w-12 lg:hidden" />

      <div className="flex items-center gap-2 lg:gap-3 flex-1 max-w-2xl group">
        <Search className="w-4 h-4 text-zinc-600 group-focus-within:text-orange-500 transition-colors flex-shrink-0" />
        <input
          type="text"
          placeholder="BUSCAR OS, CLIENTE OU VEÍCULO..."
          className="bg-transparent text-xs text-zinc-300 placeholder-zinc-800 focus:outline-none w-full font-black uppercase tracking-widest"
        />
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <SinoNotificacoes />

        <button
          onClick={handleLogout}
          className="hidden sm:flex items-center gap-2 px-4 py-2 hover:bg-red-600/10 rounded-xl transition-all text-zinc-500 hover:text-red-500 border border-zinc-800 hover:border-red-600/30 font-mono text-[10px] uppercase tracking-widest"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Encerrar Sessão</span>
        </button>

        <button
          onClick={handleLogout}
          className="sm:hidden p-2 hover:bg-red-600/10 rounded-xl transition text-red-500 border border-zinc-800"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
