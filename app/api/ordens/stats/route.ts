import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // A25: stats agregadas financeiras — exige permissão de OS.visualizar
    if (!checkPermission(user, 'os', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const today = new Date();
    const startMonth = startOfMonth(today);
    const endMonth = endOfMonth(today);
    // ✅ CORRIGIDO: startOfDay/endOfDay não mutam `today`
    const startDay = startOfDay(today);
    const endDay = endOfDay(today);

    // ✅ NOVO: as 3 queries independentes rodam em paralelo
    const [stats, faturamentoMes, concluidasHoje] = await Promise.all([
      prisma.ordemServico.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { valor_total: true },
        where: { empresa_id: user.empresa_id },
      }),
      prisma.ordemServico.aggregate({
        _sum: { valor_total: true },
        where: {
          empresa_id: user.empresa_id,
          status: { in: ['FINALIZADA', 'ENTREGUE'] },
          data_finalizada: { gte: startMonth, lte: endMonth },
        },
      }),
      prisma.ordemServico.aggregate({
        _count: { id: true },
        _sum: { valor_total: true },
        where: {
          empresa_id: user.empresa_id,
          status: 'FINALIZADA',
          data_finalizada: { gte: startDay, lte: endDay },
        },
      }),
    ]);

    // ✅ CORRIGIDO: converte Decimal → number com Number()
    const result: any = {
      ABERTA: { count: 0, total: 0 },
      EM_DIAGNOSTICO: { count: 0, total: 0 },
      AGUARDANDO_PECAS: { count: 0, total: 0 },
      EM_EXECUCAO: { count: 0, total: 0 },
      AGUARDANDO_APROVACAO: { count: 0, total: 0 },
      FINALIZADA: { count: 0, total: 0 },
      ENTREGUE: { count: 0, total: 0 },
      CANCELADA: { count: 0, total: 0 },
      total: 0,
      faturamentoMes: Number(faturamentoMes._sum.valor_total || 0),
      concluidasHoje: {
        count: concluidasHoje._count.id || 0,
        total: Number(concluidasHoje._sum.valor_total || 0),
      },
    };

    // ✅ NOVO: deriva o total do groupBy (elimina uma query inteira)
    let totalOS = 0;
    stats.forEach((s) => {
      const count = s._count.id;
      totalOS += count;
      if (result[s.status]) {
        result[s.status] = {
          count,
          total: Number(s._sum.valor_total || 0),
        };
      }
    });
    result.total = totalOS;

    return NextResponse.json(result);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'OS', 'Erro ao buscar estatísticas de OS');
  }
}
