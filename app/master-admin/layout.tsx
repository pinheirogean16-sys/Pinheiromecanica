import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

  // 🚨 TRAVA DE SEGURANÇA NO SERVIDOR:
  // Se não estiver logado, ou o e-mail não for o do Super Admin, 
  // redireciona para o dashboard antes de carregar a tela.
  if (!session || !superAdminEmail || session.email !== superAdminEmail) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
