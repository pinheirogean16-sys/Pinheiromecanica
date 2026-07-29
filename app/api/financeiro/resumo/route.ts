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
    const mes = searchParams.get('mes') || (new Date().getMonth() + 1).toString();
    const ano = searchParams.get('ano') || new Date().getFullYear().toString();

    const start = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    const end = new Date(parseInt(ano), parseInt(mes), 0, 23, 59, 59);

    const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id: user?.empresa_id || 'default',
        data: {
          gte: start,
          lte: end
        }
      }
    });

    const entradas = roundDecimal(movimentacoes
      .filter(m => m.tipo === 'ENTRADA' && m.status === 'PAGO')
      .reduce((acc, m) => acc + m.valor, 0));

    const saidas = roundDecimal(movimentacoes
      .filter(m => m.tipo === 'SAIDA' && m.status === 'PAGO')
      .reduce((acc, m) => acc + m.valor, 0));

    const previstoEntradas = roundDecimal(movimentacoes
      .filter(m => m.tipo === 'ENTRADA' && m.status !== 'PAGO' && m.status !== 'CANCELADO')
      .reduce((acc, m) => acc + m.valor, 0));

    const previstoSaidas = roundDecimal(movimentacoes
      .filter(m => m.tipo === 'SAIDA' && m.status !== 'PAGO' && m.status !== 'CANCELADO')
      .reduce((acc, m) => acc + m.valor, 0));

    const saldo = roundDecimal(entradas - saidas);
    const previsto = roundDecimal(previstoEntradas - previstoSaidas);

    // Dados para gráfico (últimos 6 meses)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const mData = await prisma.movimentacaoFinanceira.findMany({
        where: {
          empresa_id: user?.empresa_id || 'default',
          data: { gte: mStart, lte: mEnd },
          status: 'PAGO'
        }
      });

      const mEntradas = roundDecimal(mData.filter(m => m.tipo === 'ENTRADA').reduce((acc, m) => acc + m.valor, 0));
      const mSaidas = roundDecimal(mData.filter(m => m.tipo === 'SAIDA').reduce((acc, m) => acc + m.valor, 0));

      const monthName = mStart.toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
      chartData.push({
        name: monthName,
        entradas: mEntradas,
        saidas: mSaidas
      });
    }

    return NextResponse.json({
      entradas,
      saidas,
      saldo,
      previsto,
      chartData
    });
  } catch (error) {
    log('ERROR', 'FINANCEIRO', 'Erro ao buscar resumo financeiro', { error }, 'sistema');
    return NextResponse.json({ error: 'Erro ao buscar resumo financeiro' }, { status: 500 });
  }
}
