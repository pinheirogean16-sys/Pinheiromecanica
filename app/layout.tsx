import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { Toaster } from 'sonner';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import { BRANDING } from '@/lib/branding';
import OnboardingTour from '@/components/OnboardingTour';
import { prisma } from '@/lib/prisma';
import { verifyTokenEdge } from '@/lib/auth-edge';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import LayoutWrapper from '@/components/LayoutWrapper';

export const metadata: Metadata = {
  title: { default: BRANDING.name, template: `%s | ${BRANDING.name}` },
  description: BRANDING.description,
  applicationName: BRANDING.name,
  icons: { icon: BRANDING.favicon, apple: BRANDING.favicon },
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: BRANDING.colors.dark,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get('auth-token')?.value;
  let isBlocked = false;
  let isAuthenticated = !!token;

  if (token) {
    try {
      const payload = await verifyTokenEdge(token);
      
      if (payload && payload.empresa_id) {
        const empresa = await prisma.empresa.findUnique({
          where: { id: payload.empresa_id },
          select: { 
            status: true,
            plano: true,          // ✅ Adicionado
            trial_ends_at: true   // ✅ Adicionado
          }
        });
        
        if (empresa) {
          // ✅ REDE DE SEGURANÇA: Verifica se o trial expirou na hora
          const isTrialExpired = empresa.plano === 'TRIAL' && empresa.trial_ends_at && new Date(empresa.trial_ends_at) < new Date();

          if (empresa.status === 'BLOQUEADO' || isTrialExpired) {
            isBlocked = true;
          }
        } else {
          isBlocked = true;
        }
      }
    } catch (error) {
      console.error("Erro ao validar status da empresa:", error);
      isAuthenticated = false;
    }
  }

  // 1. Tela de Bloqueio
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
                O período de testes da sua oficina expirou ou a conta está com pagamento pendente. 
                Entre em contato com o suporte para regularizar a situação.
              </p>
            </div>
            <Link href="/login" className="block w-full py-4 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition">
              Voltar para o Login
            </Link>
          </div>
        </body>
      </html>
    );
  }

  // 2. Se NÃO estiver autenticado
  if (!isAuthenticated) {
    return (
      <html lang="pt-BR" className="dark">
        <body className="bg-zinc-950 text-zinc-200 antialiased overflow-x-hidden">
          {children}
          <Toaster theme="dark" position="top-right" richColors />
        </body>
      </html>
    );
  }

  // 3. Autenticado
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-zinc-950 text-zinc-200 antialiased overflow-x-hidden print:bg-white print:text-black">
        <OnboardingTour /> 
        <DiagnosticsOverlay />
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
