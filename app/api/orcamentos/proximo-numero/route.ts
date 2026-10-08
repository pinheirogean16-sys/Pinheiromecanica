import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const now = new Date();
    const year = now.getFullYear();
    
    // Buscar o último número do ano atual pertencente à empresa
    const lastOrcamento = await prisma.orcamento.findFirst({
      where: {
        empresa_id: user.empresa_id,
        numero: {
          startsWith: `ORC-${year}-`,
        }
      },
      orderBy: {
        numero: 'desc',
      },
    });

    let nextNumber = 1;
    if (lastOrcamento) {
      const lastSequence = parseInt(lastOrcamento.numero.split('-')[2]);
      nextNumber = lastSequence + 1;
    }

    const numero = `ORC-${year}-${nextNumber.toString().padStart(4, '0')}`;

    return NextResponse.json({ numero });
  } catch (error) {
    console.error('Erro ao gerar próximo número:', error);
    return NextResponse.json({ error: 'Erro ao gerar número' }, { status: 500 });
  }
}
