import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays, format } from 'date-fns';
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
    
    // Define o período completo (7 dias)
    const startDate = startOfDay(subDays(today, 6));
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    // ✅ NOVO: Uma única consulta ao banco (em vez de 7)
    const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        tipo: 'ENTRADA',
        data: { gte: startDate, lte: endDate }
      },
      select: {
        valor: true,
        data: true,
      }
    });

    // ✅ NOVO: Agrupa os valores por dia em memória
    const valoresPorDia: Record<string, number> = {};
    
    // Inicializa todos os dias com zero
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, 'yyyy-MM-dd');
      valoresPorDia[key] = 0;
    }

    // Soma os valores de cada movimentação no dia correspondente
    for (const mov of movimentacoes) {
      const key = format(new Date(mov.data), 'yyyy-MM-dd');
      if (valoresPorDia[key] !== undefined) {
        valoresPorDia[key] += Number(mov.valor || 0);
      }
    }

    // Monta o array de resposta no formato esperado pelo frontend
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const key = format(date, 'yyyy-MM-dd');
      days.push({
        name: format(date, 'EEE', { locale: ptBR }),
        valor: valoresPorDia[key] || 0,
      });
    }

    return NextResponse.json(days);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar dados do gráfico');
  }
}
