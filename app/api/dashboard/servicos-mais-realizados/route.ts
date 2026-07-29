import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const topServices = await prisma.servicoOS.groupBy({
      by: ['descricao'],
      where: {
        OrdemServico: {
          empresa_id: user?.empresa_id || 'default'
        }
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' }
      },
      take: 5
    });

    const data = topServices.map(s => ({
      name: s.descricao,
      value: s._count.id
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Top services error:', error);
    return NextResponse.json({ error: 'Erro ao buscar serviços mais realizados' }, { status: 500 });
  }
}
