import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    
    const cliente = await prisma.cliente.findFirst({
      where: { id, empresa_id: user.empresa_id }
    });
    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const [totalOS, totalGasto, ultimaOS] = await Promise.all([
      prisma.ordemServico.count({ where: { cliente_id: id, empresa_id: user.empresa_id } }),
      prisma.ordemServico.aggregate({
        _sum: { valor_total: true },
        where: { cliente_id: id, empresa_id: user.empresa_id }
      }),
      prisma.ordemServico.findFirst({
        where: { cliente_id: id, empresa_id: user.empresa_id },
        orderBy: { data_entrada: 'desc' },
        select: { numero: true, data_entrada: true }
      })
    ]);

    return NextResponse.json({
      totalOS,
      totalGasto: totalGasto._sum.valor_total || 0,
      ultimaOS: ultimaOS ? {
        numero: ultimaOS.numero,
        data: ultimaOS.data_entrada
      } : null
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 500 });
  }
}
