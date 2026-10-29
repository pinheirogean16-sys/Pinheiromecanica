'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    // ✅ O segredo está no z-[999999] e no fixed inset-0
    // Isso faz essa tela cobrir toda a Sidebar e o Header
    <div className="fixed inset-0 z-[999999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
      
      <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <AlertTriangle className="w-12 h-12 text-red-500" />
      </div>
      
      <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter mb-2">
        Página não encontrada
      </h1>
      
      <p className="text-zinc-400 mb-8 max-w-md text-sm">
        A URL que você tentou acessar não existe, foi movida ou você não tem permissão para vê-la.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={() => router.back()} 
          className="px-6 py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest transition flex items-center justify-center gap-2"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        
        <Link 
          href="/dashboard" 
          className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2"
        >
          Ir para o Dashboard
        </Link>
      </div>
    </div>
  );
}
