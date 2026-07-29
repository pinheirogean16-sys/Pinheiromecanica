import { prisma } from '@/lib/prisma';

export async function getMetricasEstoque(empresaId: string) {
  // Seleciona exclusivamente as colunas necessárias para o cálculo de métricas para alta performance
  const pecas = await prisma.peca.findMany({
    where: {
      empresa_id: empresaId
    },
    select: {
      quantidade: true,
      estoque_minimo: true,
      preco_custo: true,
      preco_venda: true,
    }
  });

  const totalSkus = pecas.length;
  let valorEstoque = 0;
  let potencialVenda = 0;
  let estoqueBaixo = 0;
  let foraEstoque = 0;

  for (let i = 0; i < pecas.length; i++) {
    const p = pecas[i];
    const qty = p.quantidade || 0;
    valorEstoque += qty * (p.preco_custo || 0);
    potencialVenda += qty * (p.preco_venda || 0);
    if (qty <= (p.estoque_minimo || 0)) {
       estoqueBaixo++;
    }
    if (qty <= 0) {
       foraEstoque++;
    }
  }

  return {
    totalSkus,
    valorEstoque,
    potencialVenda,
    estoqueBaixo,
    foraEstoque
  };
}
