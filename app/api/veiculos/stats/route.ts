import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';
import { startOfDay } from 'date-fns';

// ============================================================
// GET — Estatísticas de veículos (dashboard)
// ============================================================
export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar veículos
    if (!checkPermission(user, 'veiculos', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    // ✅ CORRIGIDO: startOfDay não muta o objeto original
    const hoje = startOfDay(new Date());

    const [total, ativo, emManutencaoHoje, emManutencaoAtiva] = await Promise.all([
      // Total de veículos da empresa
      prisma.veiculo.count({
        where: { empresa_id: user.empresa_id },
      }),

      // Veículos com cliente ativo
      prisma.veiculo.count({
        where: {
          empresa_id: user.empresa_id,
          Cliente: { ativo: true },
        },
      }),

      // OS abertas HOJE (entrada hoje, ainda não finalizada)
      prisma.ordemServico.count({
        where: {
          empresa_id: user.empresa_id,
          data_entrada: { gte: hoje },
          status: { notIn: ['FINALIZADA', 'ENTREGUE', 'CANCELADA'] },
        },
      }),

      // OS em andamento ativo (em qualquer data, mas em status de execução)
      prisma.ordemServico.count({
        where: {
          empresa_id: user.empresa_id,
          status: { in: ['EM_EXECUCAO', 'EM_DIAGNOSTICO', 'ABERTA', 'AGUARDANDO_PECAS'] },
        },
      }),
    ]);

    // ✅ NOTA: mantida compatibilidade com o formato antigo do frontend
    // (total, ativo, maintToday, inMaint) para não quebrar consumidores.
    // Se quiser renomear, ajuste o frontend e mude aqui.
    return NextResponse.json({
      total,
      ativo,
      maintToday: emManutencaoHoje,
      inMaint: emManutencaoAtiva,
    });
  } catch (error: any) {
    // ✅ CORRIGIDO: não engole o erro — retorna 500 real
    return apiError(error, 'VEICULO', 'Erro ao buscar estatísticas de veículos');
  }
}
