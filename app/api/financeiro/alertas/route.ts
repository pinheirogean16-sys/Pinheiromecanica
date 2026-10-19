import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { verificarContasAtrasadas, verificarContasAVencer } from '@/lib/notificacoes-financeiras';

export async function GET(req: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ✅ NOVO: exige permissão para visualizar dados financeiros
    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresa_id = user.empresa_id;

    // ⚠️ AVISO: A verificação de contas (que dispara notificações) NÃO deve
    // ser feita via GET. Este endpoint apenas LÊ os alertas.
    // Para disparar a verificação, crie um POST separado ou use um cron job.
    // Exemplo de cron: chamar POST /api/financeiro/alertas/verificar
    // (endpoint a ser criado) ou um endpoint de cron dedicado.

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximoLimite = new Date(hoje);
    proximoLimite.setDate(hoje.getDate() + 3);
    proximoLimite.setHours(23, 59, 59, 999);

    // ============================================================
    // Contas Atrasadas
    // ============================================================
    const atrasadasRaw = await prisma.movimentacaoFinanceira.findMany({
      where: {
        status: 'ATRASADO',
        empresa_id,
      },
      select: {
        id: true,
        tipo: true,
        descricao: true,
        valor: true,
        data_vencimento: true,
        status: true,
        categoria: true,
        Cliente: { select: { nome: true } },
        OrdemServico: { select: { numero: true } },
      },
      orderBy: { data_vencimento: 'asc' },
    });

    const atrasadas = atrasadasRaw.map((a) => ({
      ...a,
      os: a.OrdemServico,
      cliente: a.Cliente,
      OrdemServico: undefined,
      Cliente: undefined,
    }));

    // ============================================================
    // Contas a Vencer (próximos 3 dias)
    // ============================================================
    const aVencerRaw = await prisma.movimentacaoFinanceira.findMany({
      where: {
        status: 'PENDENTE',
        data_vencimento: {
          gte: hoje,
          lte: proximoLimite,
        },
        empresa_id,
      },
      select: {
        id: true,
        tipo: true,
        descricao: true,
        valor: true,
        data_vencimento: true,
        status: true,
        categoria: true,
        Cliente: { select: { nome: true } },
        OrdemServico: { select: { numero: true } },
      },
      orderBy: { data_vencimento: 'asc' },
    });

    const aVencer = aVencerRaw.map((a) => ({
      ...a,
      os: a.OrdemServico,
      cliente: a.Cliente,
      OrdemServico: undefined,
      Cliente: undefined,
    }));

    return NextResponse.json({
      atrasadas,
      aVencer,
      resumo: {
        totalAtrasadas: atrasadas.reduce((acc, c) => acc + Number(c.valor), 0),
        totalAVencer: aVencer.reduce((acc, c) => acc + Number(c.valor), 0),
        countAtrasadas: atrasadas.length,
        countAVencer: aVencer.length,
      },
    });
  } catch (error: any) {
    // ✅ NOVO: tratamento de erro padronizado
    return apiError(error, 'FINANCEIRO', 'Erro ao buscar alertas financeiros');
  }
}
