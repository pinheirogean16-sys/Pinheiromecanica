import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Toaster } from 'sonner';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import { BRANDING } from '@/lib/branding';
import OnboardingTour from '@/components/OnboardingTour';
import { prisma } from '@/lib/prisma';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Tenta pegar o token para saber quem é o usuário
  const token = (await cookies()).get('auth-token')?.value;
  let isBlocked = false;

  // 2. Se tiver token, verifica se a empresa está bloqueada
  if (token) {
    try {
      const payload = await verifyTokenEdge(token);
      
      if (payload && payload.empresa_id) {
        const empresa = await prisma.empresa.findUnique({
          where: { id: payload.empresa_id },
          select: { status: true }
        });
        
        // Se a empresa não existir ou estiver bloqueada
        if (!empresa || empresa.status === 'BLOQUEADO') {
          isBlocked = true;
        }
      }
    } catch (error) {
      console.error("Erro ao validar status da empresa:", error);
    }
  }

  // 3. Se estiver bloqueada, renderiza a tela de bloqueio no lugar do sistema
  if (isBlocked) {
    return (
      <html lang="pt-BR" className="dark">
        <body className="bg-zinc-950 text-zinc-200 antialiased flex items-center justify-center min-h-screen p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Acesso Bloqueado</h1>
              <p className="text-sm text-zinc-400 mt-2">
                A conta da sua oficina está com pagamento pendente ou foi suspensa.
                Entre em contato com o suporte para regularizar a situação.
              </p>
            </div>
            <Link 
              href="/login" 
              className="block w-full py-4 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition"
            >
              Voltar para o Login
            </Link>
          </div>
        </body>
      </html>
    );
  }

  // 4. Se estiver tudo certo (ou for a tela de login), renderiza o sistema normal
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-zinc-950 text-zinc-200 antialiased overflow-x-hidden">
        <OnboardingTour /> 
        
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
