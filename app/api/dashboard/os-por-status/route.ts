import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrdemServico_status } from '@prisma/client';
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

    const stats = await prisma.ordemServico.groupBy({
      by: ['status'],
      where: {
        empresa_id: user.empresa_id
      },
      _count: { id: true }
    });

    // Mapeia para um formato amigável para o PieChart do Recharts
    const labels: { [key in OrdemServico_status]?: string } = {
      ABERTA: 'Abertas',
      EM_DIAGNOSTICO: 'Em Diagnóstico',
      AGUARDANDO_PECAS: 'Ag. Peças',
      EM_EXECUCAO: 'Em Execução',
      AGUARDANDO_APROVACAO: 'Ag. Aprovação',
      FINALIZADA: 'Finalizadas',
      ENTREGUE: 'Entregues',
      CANCELADA: 'Canceladas'
    };

    // ✅ NOVO: garante que todos os status apareçam no gráfico (mesmo com 0)
    // Se quiser ocultar status com 0, basta filtrar depois.
    const finalData = Object.entries(labels).map(([statusKey, label]) => {
      const found = stats.find(s => s.status === statusKey);
      return {
        name: label,
        value: found ? found._count.id : 0,
      };
    });

    return NextResponse.json(finalData);
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'DASHBOARD', 'Erro ao buscar dados de status');
  }
}
