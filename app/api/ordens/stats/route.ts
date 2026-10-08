import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const today = new Date();
    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);

    const stats = await prisma.ordemServico.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { valor_total: true },
      where: { empresa_id: user.empresa_id }
    });

    const totalOS = await prisma.ordemServico.count({
      where: { empresa_id: user.empresa_id }
    });
    
    const faturamentoMes = await prisma.ordemServico.aggregate({
      _sum: { valor_total: true },
      where: {
        empresa_id: user.empresa_id,
        status: { in: ['FINALIZADA', 'ENTREGUE'] },
        data_finalizada: { gte: startMonth, lte: endMonth }
      }
    });

    const startDay = new Date(today.setHours(0,0,0,0));
    const endDay = new Date(today.setHours(23,59,59,999));

    const concluídasHoje = await prisma.ordemServico.aggregate({
      _count: { id: true },
      _sum: { valor_total: true },
      where: {
        empresa_id: user.empresa_id,
        status: 'FINALIZADA',
        data_finalizada: { gte: startDay, lte: endDay }
      }
    });

    const result: any = {
      ABERTA: { count: 0, total: 0 },
      EM_DIAGNOSTICO: { count: 0, total: 0 },
      AGUARDANDO_PECAS: { count: 0, total: 0 },
      EM_EXECUCAO: { count: 0, total: 0 },
      AGUARDANDO_APROVACAO: { count: 0, total: 0 },
      FINALIZADA: { count: 0, total: 0 },
      ENTREGUE: { count: 0, total: 0 },
      total: totalOS,
      faturamentoMes: faturamentoMes._sum.valor_total || 0,
      concluidasHoje: {
        count: concluídasHoje._count.id || 0,
        total: concluídasHoje._sum.valor_total || 0
      }
    };

    stats.forEach(s => {
      if (result[s.status]) {
        result[s.status] = {
          count: s._count.id,
          total: s._sum.valor_total || 0
        };
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 });
  }
}
