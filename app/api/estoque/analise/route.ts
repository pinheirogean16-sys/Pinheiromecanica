import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { apiError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    if (!checkPermission(user, 'estoque', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const pecas = await prisma.peca.findMany({
      where: { empresa_id: user.empresa_id },
      select: {
        id: true,
        codigo: true,
        descricao: true,
        quantidade: true,
        estoque_minimo: true,
        preco_custo: true,
        preco_venda: true,
      }
    });

    let totalValorGlobal = 0;
    const pecasComValor = pecas.map(p => {
      const valorEstoque = Number(p.quantidade) * Number(p.preco_venda);
      totalValorGlobal += valorEstoque;
      return { ...p, valorEstoque };
    });

    pecasComValor.sort((a, b) => b.valorEstoque - a.valorEstoque);

    let acumuladoValor = 0;
    let itensClasseA = 0;
    let sugestoesPendentes = 0;
    let alertasCriticos = 0;

    const rows = pecasComValor.map(p => {
      acumuladoValor += p.valorEstoque;
      const percentualAcumulado = totalValorGlobal > 0 ? (acumuladoValor / totalValorGlobal) * 100 : 100;
      
      let curvaABC = 'C';
      if (percentualAcumulado <= 75) {
        curvaABC = 'A';
        itensClasseA++;
      } else if (percentualAcumulado <= 90) {
        curvaABC = 'B';
      }

      let giroStatus = 'BAIXO_GIRO';
      if (p.quantidade > p.estoque_minimo * 2) giroStatus = 'ALTO_GIRO';
      else if (p.quantidade > p.estoque_minimo) giroStatus = 'MEDIO_GIRO';

      let alertaStatus = 'OK';
      let sugestaoReposicao = 0;

      if (p.quantidade === 0) {
        alertaStatus = 'CRITICO';
        sugestaoReposicao = p.estoque_minimo > 0 ? p.estoque_minimo : 5;
        alertasCriticos++;
      } else if (p.quantidade <= p.estoque_minimo) {
        alertaStatus = 'ALERTA';
        sugestaoReposicao = p.estoque_minimo - p.quantidade;
      }

      if (sugestaoReposicao > 0) sugestoesPendentes++;

      return {
        id: p.id,
        codigo: p.codigo,
        descricao: p.descricao,
        quantidade: p.quantidade,
        estoque_minimo: p.estoque_minimo,
        preco_custo: Number(p.preco_custo),
        preco_venda: Number(p.preco_venda),
        curvaABC,
        giroStatus,
        alertaStatus,
        sugestaoReposicao,
      };
    });

    return NextResponse.json({
      meta: {
        totalValorGlobal,
        itensClasseA,
        sugestoesPendentes,
        alertasCriticos,
      },
      rows,
    });

  } catch (error: any) {
    return apiError(error, 'ESTOQUE_ANALISE', 'Erro ao processar análise de estoque');
  }
}
