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
const analiseQuerySchema = z.object({
  ano: z.coerce.number().int().min(2000).max(2100).optional(),
});

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    // ✅ BLOQUEIO DE PLANO (Análise/DRE = Financeiro Completo)
    // ⚠️ Ajuste o nome do model/campo se no seu schema for diferente.
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
        'Acesso à Análise/DRE bloqueado pelo plano',
        { empresa_id: user.empresa_id, plano: planoAtual },
        user.name
      );

      return NextResponse.json(
        {
          error: 'UPGRADE_REQUIRED',
          code: 'UPGRADE_REQUIRED',
          message: 'A Análise Financeira (DRE) está disponível apenas no plano PRO.',
          planoAtual,
          feature: 'financeiro_completo',
        },
        { status: 402 }
      );
    }

    const { searchParams } = new URL(request.url);
    const anoAtual = new Date().getFullYear();
    const parsed = analiseQuerySchema.parse({
      ano: searchParams.get('ano') || anoAtual,
    });
    const ano = parsed.ano!;

    const empresa_id = user.empresa_id;

    // ============================================================
    // 1. DRE SIMPLIFICADO DO ANO SELECIONADO
    // ============================================================
    const startOfYear = new Date(ano, 0, 1);
    const endOfYear = new Date(ano, 11, 31, 23, 59, 59);

    const orcamentosAno = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        status: 'PAGO',
        data: { gte: startOfYear, lte: endOfYear },
      },
      select: { tipo: true, categoria: true, valor: true },
    });

    const dreCategorias: Record<string, { receitas: number; despesas: number }> = {};
    let totalReceitasDRE = 0;
    let totalDespesasDRE = 0;

    orcamentosAno.forEach((m) => {
      const cat = m.categoria || 'OUTROS';
      if (!dreCategorias[cat]) {
        dreCategorias[cat] = { receitas: 0, despesas: 0 };
      }
      const valorNum = Number(m.valor);
      if (m.tipo === 'ENTRADA') {
        dreCategorias[cat].receitas += valorNum;
        totalReceitasDRE += valorNum;
      } else {
        dreCategorias[cat].despesas += valorNum;
        totalDespesasDRE += valorNum;
      }
    });

    const dreBreakdown = Object.entries(dreCategorias)
      .map(([categoria, valores]) => ({
        categoria,
        receitas: roundDecimal(valores.receitas),
        despesas: roundDecimal(valores.despesas),
        saldo: roundDecimal(valores.receitas - valores.despesas),
      }))
      .sort((a, b) => b.saldo - a.saldo);

    // ============================================================
    // 2. PREVISÃO FINANCEIRA (PRÓXIMOS 4 MESES)
    // ============================================================
    const hoje = new Date();
    const previsaoStart = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const previsaoEnd = new Date(hoje.getFullYear(), hoje.getMonth() + 4, 0, 23, 59, 59);

    const movPrevistas = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        data_vencimento: { gte: previsaoStart, lte: previsaoEnd },
        status: { in: ['PENDENTE', 'ATRASADO'] },
      },
      select: { tipo: true, valor: true, data_vencimento: true },
    });

    const previsaoMeses = [];

    for (let i = 0; i < 4; i++) {
      const pData = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const pStart = new Date(pData.getFullYear(), pData.getMonth(), 1);
      const pEnd = new Date(pData.getFullYear(), pData.getMonth() + 1, 0, 23, 59, 59);

      const mPrevistas = movPrevistas.filter(
        (m) => m.data_vencimento && m.data_vencimento >= pStart && m.data_vencimento <= pEnd
      );

      const pEntradas = roundDecimal(
        mPrevistas
          .filter((m) => m.tipo === 'ENTRADA')
          .reduce((sum, m) => sum + Number(m.valor), 0)
      );

      const pSaidas = roundDecimal(
        mPrevistas
          .filter((m) => m.tipo === 'SAIDA')
          .reduce((sum, m) => sum + Number(m.valor), 0)
      );

      previsaoMeses.push({
        mes: pStart.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
        ano: pStart.getFullYear(),
        entradas: pEntradas,
        saidas: pSaidas,
        saldoEstimado: roundDecimal(pEntradas - pSaidas),
      });
    }

    // ============================================================
    // 3. INADIMPLÊNCIA (CONTAS A RECEBER EM ATRASO)
    // ============================================================
    const inadimplentes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        tipo: 'ENTRADA',
        status: { in: ['PENDENTE', 'ATRASADO'] },
        data_vencimento: { lt: startOfDay(new Date()) },
      },
      include: {
        Cliente: {
          select: { nome: true, cpf_cnpj: true, telefone: true },
        },
      },
      orderBy: { data_vencimento: 'asc' },
      take: 20,
    });

    const totalInadimplencia = roundDecimal(
      inadimplentes.reduce((sum, m) => sum + Number(m.valor), 0)
    );

    // ============================================================
    // 4. CENTRO DE CUSTOS — filtrado pelo ano selecionado
    // ============================================================
    const centroCustos = await prisma.movimentacaoFinanceira.groupBy({
      by: ['centro_custo'],
      where: {
        empresa_id,
        status: 'PAGO',
        data: { gte: startOfYear, lte: endOfYear },
      },
      _sum: { valor: true },
      _count: { id: true },
    });

    const centroCustosBreakdown = centroCustos
      .map((c) => ({
        centro_custo: c.centro_custo || 'NÃO DEFINIDO',
        total: roundDecimal(c._sum.valor ? Number(c._sum.valor) : 0),
        lancamentos: c._count.id,
      }))
      .sort((a, b) => b.total - a.total);

    // ============================================================
    // 5. RECORRÊNCIAS DE LANÇAMENTOS
    // ============================================================
    const recorrentes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        descricao: { contains: 'Parcela ' },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      dre: {
        totalReceitas: roundDecimal(totalReceitasDRE),
        totalDespesas: roundDecimal(totalDespesasDRE),
        lucroLiquido: roundDecimal(totalReceitasDRE - totalDespesasDRE),
        margemOperacional:
          totalReceitasDRE > 0
            ? roundDecimal(((totalReceitasDRE - totalDespesasDRE) / totalReceitasDRE) * 100)
            : 0,
        categorias: dreBreakdown,
      },
      previsao: previsaoMeses,
      inadimplencia: {
        total: totalInadimplencia,
        lista: inadimplentes,
      },
      centroCustos: centroCustosBreakdown,
      recorrentes,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return apiError(error, 'FINANCEIRO', 'Erro ao processar análise do módulo financeiro');
  }
}
