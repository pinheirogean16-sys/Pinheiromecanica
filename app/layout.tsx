import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import AppearanceManager from '@/components/AppearanceManager';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import LayoutWrapper from '@/components/LayoutWrapper';

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
                // Global error logger for debugging client devices
                window.addEventListener('error', function(e) {
                  try {
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
        <LayoutWrapper>{children}</LayoutWrapper>
        <Toaster theme="dark" position="top-right" richColors />
        {process.env.NODE_ENV === 'development' && <DiagnosticsOverlay />}
      </body>
    </html>
  );
}
