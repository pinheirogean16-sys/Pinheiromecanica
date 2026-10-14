import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'sonner';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
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
  themeColor: BRANDING.colors.dark,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-zinc-950 text-zinc-200 antialiased overflow-x-hidden">
        <DiagnosticsOverlay />
        <div className="flex w-full h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 bg-zinc-950">
              {children}
            </main>
          </div>
        </div>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
