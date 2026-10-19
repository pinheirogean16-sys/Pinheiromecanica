import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar o dashboard (financeiro)
    if (!checkPermission(user, 'dashboard', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    // ✅ NOVO: Filtra OS finalizadas nos últimos 90 dias (evita distorção)
    const noventaDiasAtras = new Date();
    noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);

    const osAReceber = await prisma.ordemServico.findMany({
      where: { 
        empresa_id: user.empresa_id,
        status: 'FINALIZADA',
        data_finalizada: { gte: noventaDiasAtras } // 👈 Filtro de data
      },
      select: {
        id: true,
        numero: true,
        valor_total: true,
        data_finalizada: true,
        // ✅ NOVO: busca apenas o nome do cliente
        Cliente: { select: { nome: true } },
      },
      orderBy: { data_finalizada: 'asc' },
      take: 5
    });

    const formatado = osAReceber.map(os => ({
      id: os.id,
      numero: os.numero,
      cliente: os.Cliente?.nome || 'Cliente não encontrado',
      valor: os.valor_total,
      data: os.data_finalizada
    }));

    return NextResponse.json(formatado);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar pendências');
  }
}
