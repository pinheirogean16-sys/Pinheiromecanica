'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { Wrench } from 'lucide-react';

interface UserTokenPayload {
  id: string;
  name: string;
  email: string;
  role: string;
  empresa_id: string;
}

interface AuthContextType {
  user: UserTokenPayload | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserTokenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === '/login';

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {}
    
    // Cookie deletion for maximum client reliability
    document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    localStorage.removeItem('user_session');
    setUser(null);
    router.push('/login');
  }, [router]);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/session', { priority: 'high', skipCache: true, silentError: true });
      if (data && data.id) {
        setUser(data);
        localStorage.setItem('user_session', JSON.stringify(data));
      } else {
        throw new Error('Invalido');
      }
    } catch (err) {
      setUser(null);
      localStorage.removeItem('user_session');
      if (!isLoginPage) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [isLoginPage, logout]);

  useEffect(() => {
    // Safe pre-loading of session for instant visual feedback
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_session');
      if (saved) {
        try {
          setUser(JSON.parse(saved));
        } catch {
          localStorage.removeItem('user_session');
        }
      }
    }
    refreshSession();
  }, [refreshSession]);

  // If loading and not on login page, block layout rendering and show visual loader
  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-mono">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-orange-600/10 border border-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Wrench className="w-8 h-8 animate-spin duration-1000" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-black text-white tracking-widest uppercase">PINHEIRO DIESEL</h2>
            <p className="text-[10px] text-zinc-500">Verificando credenciais de acesso...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, block layout rendering and wait for router.push to trigger
  if (!loading && !user && !isLoginPage) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
