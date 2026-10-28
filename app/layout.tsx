import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { Toaster } from 'sonner';
import DiagnosticsOverlay from '@/components/DiagnosticsOverlay';
import { BRANDING } from '@/lib/branding';
import OnboardingTour from '@/components/OnboardingTour';
import IaSupportWidget from '@/components/IaSupportWidget';
import { UpgradeModalHost } from '@/components/UpgradeModal';
import BlockedScreen from '@/components/BlockedScreen'; // ✅ IMPORT ADICIONADO
import { prisma } from '@/lib/prisma';
import { verifyTokenEdge } from '@/lib/auth-edge';
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
            plano: true,
            trial_ends_at: true
          }
        });
        
        if (empresa) {
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

  // 1. Tela de Bloqueio (com opções de assinatura)
  if (isBlocked) {
    return (
      <html lang="pt-BR" className="dark">
        <body className="bg-zinc-950 text-zinc-200 antialiased">
          <BlockedScreen /> {/* ✅ USA O NOVO COMPONENTE */}
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
        
        <IaSupportWidget />
        <UpgradeModalHost />
        
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
