import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresa_id = user.empresa_id;
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const start = startOfDay(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const total = await prisma.movimentacaoFinanceira.aggregate({
        _sum: { valor: true },
        where: {
          empresa_id,
          tipo: 'ENTRADA',
          data: { gte: start, lte: end }
        }
      });

      days.push({
        name: format(date, 'EEE', { locale: ptBR }),
        valor: total._sum.valor || 0
      });
    }

    return NextResponse.json(days);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados do gráfico' }, { status: 500 });
  }
}
