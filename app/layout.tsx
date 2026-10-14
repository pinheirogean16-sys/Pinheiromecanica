import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'sonner';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import { ThemeProvider } from '@/components/ThemeProvider';
import { BRANDING } from '@/lib/branding';

// ============================================================
// METADATA VEHLOX
// ============================================================
export const metadata: Metadata = {
  title: {
    default: BRANDING.name,
    template: `%s | ${BRANDING.name}`,
  },
  description: BRANDING.description,
  applicationName: BRANDING.name,
  icons: {
    icon: BRANDING.favicon,
    apple: BRANDING.favicon,
  },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRANDING.colors.light },
    { media: '(prefers-color-scheme: dark)', color: BRANDING.colors.dark },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased overflow-x-hidden">
        <ThemeProvider>
          <DiagnosticsOverlay />
          <div className="flex w-full h-screen overflow-hidden">
            <Sidebar />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-background">
                {children}
              </main>
            </div>
          </div>
          <Toaster theme="system" position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
