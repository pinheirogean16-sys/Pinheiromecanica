import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { log } from '@/lib/logger';
import { roundDecimal } from '@/lib/utils';

export async function GET(request: Request) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'financeiro', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ano = parseInt(searchParams.get('ano') || new Date().getFullYear().toString());

    const empresa_id = user?.empresa_id || 'default';

    // 1. DRE SIMPLIFICADO GERAL DO ANO SELECIONADO
    const startOfYear = new Date(ano, 0, 1);
    const endOfYear = new Date(ano, 11, 31, 23, 59, 59);

    const orcamentosAno = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        status: 'PAGO',
        data: {
          gte: startOfYear,
          lte: endOfYear
        }
      },
      select: {
        tipo: true,
        categoria: true,
        valor: true
      }
    });

    const dreCategorias: Record<string, { receitas: number, despesas: number }> = {};
    let totalReceitasDRE = 0;
    let totalDespesasDRE = 0;

    orcamentosAno.forEach(m => {
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

    const dreBreakdown = Object.entries(dreCategorias).map(([categoria, valores]) => ({
      categoria,
      receitas: roundDecimal(valores.receitas),
      despesas: roundDecimal(valores.despesas),
      saldo: roundDecimal(valores.receitas - valores.despesas)
    })).sort((a, b) => b.saldo - a.saldo);

    // 2. PREVISÃO FINANCEIRA (PRÓXIMOS 4 MESES)
    const hoje = new Date();
    const previsaoMeses = [];
    
    for (let i = 0; i < 4; i++) {
      const pData = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const pStart = new Date(pData.getFullYear(), pData.getMonth(), 1);
      const pEnd = new Date(pData.getFullYear(), pData.getMonth() + 1, 0, 23, 59, 59);

      const mPrevistas = await prisma.movimentacaoFinanceira.findMany({
        where: {
          empresa_id,
          data_vencimento: { gte: pStart, lte: pEnd },
          status: { in: ['PENDENTE', 'ATRASADO'] }
        },
        select: { tipo: true, valor: true }
      });

      const pEntradas = roundDecimal(mPrevistas.filter(m => m.tipo === 'ENTRADA').reduce((sum, m) => sum + Number(m.valor), 0));
      const pSaidas = roundDecimal(mPrevistas.filter(m => m.tipo === 'SAIDA').reduce((sum, m) => sum + Number(m.valor), 0));

      previsaoMeses.push({
        mes: pStart.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        ano: pStart.getFullYear(),
        entradas: pEntradas,
        saidas: pSaidas,
        saldoEstimado: roundDecimal(pEntradas - pSaidas)
      });
    }

    // 3. INADIMPLÊNCIA (CONTAS A RECEBER EM ATRASO)
    const inadimplentes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        tipo: 'ENTRADA',
        status: { in: ['PENDENTE', 'ATRASADO'] },
        data_vencimento: { lt: startOfDay(new Date()) }
      },
      include: {
        Cliente: {
          select: { nome: true, cpf_cnpj: true, telefone: true }
        }
      },
      orderBy: { data_vencimento: 'asc' },
      take: 20
    });

    const totalInadimplencia = roundDecimal(inadimplentes.reduce((sum, m) => sum + Number(m.valor), 0));

    // 4. CENTRO DE CUSTO INVESTMENTS
    const centroCustos = await prisma.movimentacaoFinanceira.groupBy({
      by: ['centro_custo'],
      where: {
        empresa_id,
        status: 'PAGO'
      },
      _sum: { valor: true },
      _count: { id: true },
    });

    const centroCustosBreakdown = centroCustos.map(c => ({
      centro_custo: c.centro_custo || 'NÃO DEFINIDO',
      total: roundDecimal(c._sum.valor ? Number(c._sum.valor) : 0),
      lançamentos: c._count.id
    })).sort((a, b) => b.total - a.total);

    // 5. RECORRÊNCIAS DE LANÇAMENTOS (SIMULAÇÃO DE ENTRADAS RECORRENTES COMO PARCELADOS)
    const recorrentes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id,
        descricao: { contains: 'Parcela ' }
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    return NextResponse.json({
      dre: {
        totalReceitas: roundDecimal(totalReceitasDRE),
        totalDespesas: roundDecimal(totalDespesasDRE),
        lucroLiquido: roundDecimal(totalReceitasDRE - totalDespesasDRE),
        margemOperacional: totalReceitasDRE > 0 ? roundDecimal(((totalReceitasDRE - totalDespesasDRE) / totalReceitasDRE) * 100) : 0,
        categorias: dreBreakdown
      },
      previsao: previsaoMeses,
      inadimplencia: {
        total: totalInadimplencia,
        lista: inadimplentes
      },
      centroCustos: centroCustosBreakdown,
      recorrentes
    });

  } catch (err) {
    log('ERROR', 'FINANCEIRO', 'Erro ao processar análise do módulo financeiro', { err }, 'sistema');
    return NextResponse.json({ error: 'Erro de processamento' }, { status: 500 });
  }
}

function startOfDay(d: Date): Date {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
