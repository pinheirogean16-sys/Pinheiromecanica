import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresa_id = user.empresa_id;
    const last6Months = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const start = startOfMonth(date);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);

      const faturamento = await prisma.ordemServico.aggregate({
        _sum: { valor_total: true },
        where: {
          empresa_id,
          status: { in: ['FINALIZADA', 'ENTREGUE'] },
          updated_at: { gte: start, lte: end }
        }
      });

      last6Months.push({
        name: format(date, 'MMM', { locale: ptBR }).toUpperCase(),
        valor: faturamento._sum.valor_total || 0
      });
    }

    return NextResponse.json(last6Months);
  } catch (error) {
    console.error('Faturamento mensal error:', error);
    return NextResponse.json({ error: 'Erro ao buscar faturamento mensal' }, { status: 500 });
  }
}
