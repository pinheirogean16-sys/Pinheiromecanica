'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our debug log API
    try {
      fetch('/api/debug/error-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || 'React Boundary Crash',
          url: typeof window !== 'undefined' ? window.location.href : 'Server Side',
          stack: error.stack || null,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
        })
      }).catch(() => {});
    } catch (e) {}

    console.error('🚨 [Error Boundary] FATAL CLIENT ERROR:', error);
  }, [error]);

  const handleClearCacheAndReset = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.reload();
      }
    } catch (e) {
      reset();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <AlertTriangle className="w-8 h-8 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-lg font-black uppercase text-white tracking-tight">Ocorreu um erro de interface</h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            O navegador encontrou um problema ao renderizar a tela. Isso pode ser causado por cache antigo ou incompatibilidade temporária.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[10px] text-zinc-400 text-left break-all max-h-32 overflow-auto font-mono">
            <strong>ERRO:</strong> {error.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </button>
          
          <button
            onClick={handleClearCacheAndReset}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Cache
          </button>
        </div>

        <p className="text-[10px] text-zinc-600">
          Pinheiro Diesel Pro &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
