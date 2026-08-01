import NewOSForm from '@/components/NewOSForm';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewOSPage() {
  const clients = await prisma.cliente.findMany({
    include: { Veiculo: true }
  });

  const mechanics = await prisma.user.findMany({
    where: { role: 'MECANICO' }
  });

  return (
    <NewOSForm 
      initialClients={clients} 
      initialMechanics={mechanics} 
    />
  );
}
