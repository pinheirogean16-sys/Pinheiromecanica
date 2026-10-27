import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { roundDecimal } from '@/lib/utils';
import { getPlanLimits, Plano } from '@/lib/plan-limits'; // ✅ IMPORT ADICIONADO
import { z } from 'zod';

// ============================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================
const resumoQuerySchema = z.object({
  mes: z.coerce.number().int().min(1).max(12).optional(),
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
});

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    // ✅ BLOQUEIO DE PLANO (DRE = Financeiro Completo)
    // ⚠️ Se o model/campo do plano tiver outro nome no seu schema, ajuste aqui.
    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      select: { plano: true },
    });

    const planoAtual = (empresa?.plano?.toUpperCase() as Plano) || 'BASICO';
    const limites = getPlanLimits(planoAtual);

    if (!limites.financeiroCompleto) {
      log(
        'WARN',
        'FINANCEIRO',
        'Acesso ao DRE bloqueado pelo plano',
        { empresa_id: user.empresa_id, plano: planoAtual },
        user.name
      );

      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          code: 'UPGRADE_REQUIRED',
          message: 'O DRE e Relatórios Financeiros Avançados estão disponíveis apenas no plano PRO.',
          planoAtual,
          feature: 'financeiro_completo',
        },
        { status: 402 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hoje = new Date();
    const parsed = resumoQuerySchema.parse({
      mes: searchParams.get('mes') || (hoje.getMonth() + 1).toString(),
      ano: searchParams.get('ano') || hoje.getFullYear().toString(),
    });

    const mesAtual = parsed.mes!;
    const anoAtual = parsed.ano!;

    const start = new Date(anoAtual, mesAtual - 1, 1);
    const end = new Date(anoAtual, mesAtual, 0, 23, 59, 59);

    // Define o início do período de 6 meses (para o gráfico)
    const chartStart = new Date(anoAtual, mesAtual - 1, 1);
    chartStart.setMonth(chartStart.getMonth() - 5);

    // ✅ NOVO: uma única consulta para o mês atual + gráfico (em vez de 7)
    const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id: user.empresa_id,
        data: { gte: chartStart, lte: end },
      },
      select: {
        tipo: true,
        status: true,
        valor: true,
        data: true,
      },
    });

    // Separa movimentações do mês atual e do período do gráfico
    const movMesAtual = movimentacoes.filter(
      (m) => m.data >= start && m.data <= end
    );

    // Cálculos do mês atual
    const entradas = roundDecimal(
      movMesAtual
        .filter((m) => m.tipo === 'ENTRADA' && m.status === 'PAGO')
        .reduce((acc, m) => acc + Number(m.valor), 0)
    );

    const saidas = roundDecimal(
      movMesAtual
        .filter((m) => m.tipo === 'SAIDA' && m.status === 'PAGO')
        .reduce((acc, m) => acc + Number(m.valor), 0)
    );

    const previstoEntradas = roundDecimal(
      movMesAtual
        .filter((m) => m.tipo === 'ENTRADA' && m.status !== 'PAGO' && m.status !== 'CANCELADO')
        .reduce((acc, m) => acc + Number(m.valor), 0)
    );

    const previstoSaidas = roundDecimal(
      movMesAtual
        .filter((m) => m.tipo === 'SAIDA' && m.status !== 'PAGO' && m.status !== 'CANCELADO')
        .reduce((acc, m) => acc + Number(m.valor), 0)
    );

    const saldo = roundDecimal(entradas - saidas);
    const previsto = roundDecimal(previstoEntradas - previstoSaidas);

    // ✅ NOVO: agrupa o gráfico em memória (em vez de 6 consultas)
    const chartData: { name: string; entradas: number; saidas: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(anoAtual, mesAtual - 1 - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const mData = movimentacoes.filter(
        (m) => m.data >= mStart && m.data <= mEnd && m.status === 'PAGO'
      );

      const mEntradas = roundDecimal(
        mData
          .filter((m) => m.tipo === 'ENTRADA')
          .reduce((acc, m) => acc + Number(m.valor), 0)
      );

      const mSaidas = roundDecimal(
        mData
          .filter((m) => m.tipo === 'SAIDA')
          .reduce((acc, m) => acc + Number(m.valor), 0)
      );

      const monthName = mStart
        .toLocaleString('pt-BR', { month: 'short' })
        .replace('.', '')
        .toUpperCase();

      chartData.push({
        name: monthName,
        entradas: mEntradas,
        saidas: mSaidas,
      });
    }

    return NextResponse.json({
      entradas,
      saidas,
      saldo,
      previsto,
      chartData,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'FINANCEIRO', 'Erro ao buscar resumo financeiro');
  }
}
