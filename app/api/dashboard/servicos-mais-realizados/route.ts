import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar o dashboard
    if (!checkPermission(user, 'dashboard', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const topServices = await prisma.servicoOS.groupBy({
      by: ['descricao'],
      where: {
        OrdemServico: {
          empresa_id: user.empresa_id,
          // ✅ OPCIONAL: considere apenas OS finalizadas/entregues
          // status: { in: ['FINALIZADA', 'ENTREGUE'] },
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
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar serviços mais realizados');
  }
}
