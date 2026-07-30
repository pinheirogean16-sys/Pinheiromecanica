import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import AppearanceManager from '@/components/AppearanceManager';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import LayoutWrapper from '@/components/LayoutWrapper';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Pinheiro Diesel Pro',
  description: 'ERP para Oficina Mecânica Diesel',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="bg-zinc-950 text-zinc-200 antialiased overflow-x-hidden">
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // Mechanismo automático para detectar e tratar ChunkLoadError de Next.js
                function handleChunkLoadError(message, stack) {
                  try {
                    var errorStr = (message || '') + ' ' + (stack || '');
                    var isChunkErr = 
                      errorStr.indexOf('ChunkLoadError') !== -1 ||
                      errorStr.indexOf('Loading chunk') !== -1 ||
                      errorStr.indexOf('Failed to fetch dynamically imported module') !== -1 ||
                      errorStr.indexOf('Loading CSS chunk') !== -1 ||
                      errorStr.indexOf('Script error') !== -1;

                    if (isChunkErr) {
                      console.warn('🔄 [ChunkErrorRecovery] Erro de carregamento de chunk detectado! Limpando caches...');
                      var lastReload = sessionStorage.getItem('chunk_error_reload_time');
                      var now = Date.now();
                      
                      // Permite autorecarregar apenas uma vez a cada 15 segundos para evitar loops
                      if (!lastReload || (now - parseInt(lastReload)) > 15000) {
                        sessionStorage.setItem('chunk_error_reload_time', now.toString());
                        
                        // Limpa Service Workers
                        if ('serviceWorker' in navigator) {
                          navigator.serviceWorker.getRegistrations().then(function(regs) {
                            regs.forEach(function(reg) { reg.unregister(); });
                          });
                        }
                        
                        // Limpa Cache Storage
                        if ('caches' in window) {
                          caches.keys().then(function(keys) {
                            keys.forEach(function(key) { caches.delete(key); });
                          });
                        }
                        
                        // Limpa cache de requisições do request-manager
                        for (var k in localStorage) {
                          if (k.indexOf('rm_cache:') === 0) {
                            localStorage.removeItem(k);
                          }
                        }
                        
                        console.log('🔄 [ChunkErrorRecovery] Caches limpos. Recarregando página...');
                        setTimeout(function() {
                          window.location.reload();
                        }, 400);
                      }
                    }
                  } catch(e) {
                    console.error('Erro ao recuperar ChunkLoadError:', e);
                  }
                }

                // Global error logger for debugging client devices
                window.addEventListener('error', function(e) {
                  try {
                    handleChunkLoadError(e.message, e.error ? e.error.stack : '');
                    
                    fetch('/api/debug/error-log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: e.message,
                        url: window.location.href,
                        filename: e.filename,
                        lineno: e.lineno,
                        colno: e.colno,
                        stack: e.error ? e.error.stack : null,
                        userAgent: navigator.userAgent
                      })
                    }).catch(function() {});
                  } catch(err) {}
                });

                window.addEventListener('unhandledrejection', function(e) {
                  try {
                    var reasonStr = e.reason ? (e.reason.message || e.reason) : '';
                    var stackStr = e.reason && e.reason.stack ? e.reason.stack : '';
                    handleChunkLoadError(reasonStr, stackStr);

                    fetch('/api/debug/error-log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        message: 'Unhandled Promise Rejection: ' + (e.reason ? (e.reason.message || e.reason) : 'Unknown reason'),
                        url: window.location.href,
                        stack: e.reason ? e.reason.stack : null,
                        userAgent: navigator.userAgent
                      })
                    }).catch(function() {});
                  } catch(err) {}
                });

                var cor = localStorage.getItem('corPrincipal') || '#F97316';
                var nome = localStorage.getItem('nomeSistema') || 'Pinheiro Diesel Pro';
                var favicon = localStorage.getItem('favicon') || '';
                
                document.documentElement.style.setProperty('--cor-principal', cor);
                if (nome) document.title = nome;
                
                if (favicon) {
                   var link = document.querySelector("link[rel*='icon']");
                   if (!link) {
                      link = document.createElement('link');
                      link.rel = 'icon';
                      document.head.appendChild(link);
                   }
                   link.href = favicon;
                 }

                 // Register service worker
                 if ('serviceWorker' in navigator) {
                   window.addEventListener('load', function() {
                     navigator.serviceWorker.register('/sw.js').then(function(reg) {
                       console.log('Worker operacional:', reg.scope);
                     }).catch(function(err) {
                       console.log('Falha:', err);
                     });
                   });
                 }
              } catch(e) {}
            })();
          `
        }} />
        <AppearanceManager />
        <AuthProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </AuthProvider>
        <Toaster theme="dark" position="top-right" richColors />
        {process.env.NODE_ENV === 'development' && <DiagnosticsOverlay />}
      </body>
    </html>
  );
}
