import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrdemServico_status } from '@prisma/client';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const stats = await prisma.ordemServico.groupBy({
      by: ['status'],
      where: {
        empresa_id: user.empresa_id
      },
      _count: { id: true }
    });

    // Mapear para um formato amigável para o PieChart do Recharts
    const data = stats.map(s => ({
      name: s.status,
      value: s._count.id
    }));

    // Garantir que status importantes existam no gráfico
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

    const finalData = data.map(d => ({
      name: labels[d.name as OrdemServico_status] || d.name,
      value: d.value
    }));

    return NextResponse.json(finalData);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar dados de status' }, { status: 500 });
  }
}
