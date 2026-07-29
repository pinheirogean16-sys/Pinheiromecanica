import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const osAReceber = await prisma.ordemServico.findMany({
      where: { status: 'FINALIZADA' },
      include: {
        cliente: true,
      },
      orderBy: { data_finalizada: 'asc' },
      take: 5
    });

    const formatado = osAReceber.map(os => ({
      id: os.id,
      numero: os.numero,
      cliente: os.cliente.nome,
      valor: os.valor_total,
      data: os.data_finalizada
    }));

    return NextResponse.json(formatado);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pendências' }, { status: 500 });
  }
}
