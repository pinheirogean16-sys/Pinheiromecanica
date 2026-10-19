import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar o dashboard (financeiro)
    if (!checkPermission(user, 'dashboard', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresa_id = user.empresa_id;
    const today = new Date();

    // Define o período completo (últimos 6 meses)
    const startDate = startOfMonth(subMonths(today, 5));
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    // ✅ NOVO: Uma única consulta ao banco (em vez de 6)
    const ordens = await prisma.ordemServico.findMany({
      where: {
        empresa_id,
        status: { in: ['FINALIZADA', 'ENTREGUE'] },
        updated_at: { gte: startDate, lte: endDate }
      },
      select: {
        valor_total: true,
        updated_at: true,
      }
    });

    // ✅ NOVO: Agrupa os valores por mês em memória
    const valoresPorMes: Record<string, number> = {};

    // Inicializa todos os meses com zero
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const key = format(date, 'yyyy-MM');
      valoresPorMes[key] = 0;
    }

    // Soma os valores de cada OS no mês correspondente
    for (const os of ordens) {
      const key = format(new Date(os.updated_at), 'yyyy-MM');
      if (valoresPorMes[key] !== undefined) {
        valoresPorMes[key] += Number(os.valor_total || 0);
      }
    }

    // Monta o array de resposta no formato esperado pelo frontend
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const key = format(date, 'yyyy-MM');
      last6Months.push({
        name: format(date, 'MMM', { locale: ptBR }).toUpperCase(),
        valor: valoresPorMes[key] || 0,
      });
    }

    return NextResponse.json(last6Months);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar faturamento mensal');
  }
}
