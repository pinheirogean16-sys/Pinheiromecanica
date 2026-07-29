'use client';

import { useEffect } from 'react';

export default function AppearanceManager() {
  useEffect(() => {
    const handleAuthExpired = async () => {
      // Clear cookies on client side
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      
      // Attempt to invoke the server logout endpoint gently
      try {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      } catch (e) {
        // Safe catch for network or state error in offline/aborted conditions
      }

      // Redirect user to the login screen
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    };

    window.addEventListener('auth-expired', handleAuthExpired);

    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      const corPrincipal = localStorage.getItem('corPrincipal') || '#F97316';
      const nomeSistema = localStorage.getItem('nomeSistema') || 'Pinheiro Diesel Pro';
      const favicon = localStorage.getItem('favicon') || '';

      // Aplicar Cor
      document.documentElement.style.setProperty('--cor-principal', corPrincipal);

      // Aplicar Nome (Title)
      if (nomeSistema) {
        document.title = nomeSistema;
      }

      // Aplicar Favicon
      if (favicon) {
        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = favicon;
      }
    }, 0);
  }, []);

  return null;
}
