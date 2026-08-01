import { prisma } from './prisma';

type CacheEntry = {
  data: any;
  expires: number;
};

const cache = new Map<string, CacheEntry>();

export function getCache(key: string) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

export function setCache(key: string, data: any, ttl = 60000) {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
  if (cache.size > 500) {
    cache.clear();
  }
}

export function invalidateDashboardCache(empresa_id: string) {
  cache.delete(`stats_${empresa_id}`);
  cache.delete(`atividades_${empresa_id}`);
  cache.delete(`resumo_financeiro_${empresa_id}`);
}

export async function getCachedStats(empresa_id: string) {
  const cacheKey = `stats_${empresa_id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. OS em aberto
  const osEmAberto = await prisma.ordemServico.count({
    where: {
      empresa_id,
      status: {
        notIn: ['FINALIZADA', 'ENTREGUE', 'CANCELADA']
      }
    }
  });

  // 2. Faturamento do mês (com base nas OS finalizadas no mês atual)
  const osFinalizadasEsteMes = await prisma.ordemServico.findMany({
    where: {
      empresa_id,
      status: {
        in: ['FINALIZADA', 'ENTREGUE']
      },
      OR: [
        {
          data_finalizada: {
            gte: startOfMonth
          }
        },
        {
          data_finalizada: null,
          updated_at: {
            gte: startOfMonth
          }
        }
      ]
    },
    select: {
      valor_total: true
    }
  });

  const faturamentoMes = osFinalizadasEsteMes.reduce((sum, os) => sum + (os.valor_total ? Number(os.valor_total) : 0), 0);

  // 3. Clientes ativos
  const clientesAtivos = await prisma.cliente.count({
    where: {
      empresa_id,
      status: 'ATIVO'
    }
  });

  // 4. Peças com estoque baixo
  const pecas = await prisma.peca.findMany({
    where: {
      empresa_id
    },
    select: {
      quantidade: true,
      estoque_minimo: true
    }
  });

  const pecasEstoqueBaixo = pecas.filter(p => p.quantidade <= (p.estoque_minimo ?? 5)).length;

  const data = {
    osEmAberto,
    faturamentoMes,
    clientesAtivos,
    pecasEstoqueBaixo
  };

  setCache(cacheKey, data, 30000); // 30 segundos de cache
  return data;
}

export async function getCachedAtividades(empresa_id: string) {
  const cacheKey = `atividades_${empresa_id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    // 1. Recent OS
    const rawRecentOS = await prisma.ordemServico.findMany({
      where: {
        empresa_id
      },
      include: {
        Cliente: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });

    const recentOS = rawRecentOS.map(os => {
      const { Cliente, ...rest } = os;
      return {
        ...rest,
        cliente: Cliente
      };
    });

    // 2. Recent Finances
    const rawRecentFinances = await prisma.movimentacaoFinanceira.findMany({
      where: {
        empresa_id
      },
      include: {
        OrdemServico: {
          select: {
            numero: true
          }
        },
        Cliente: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });

    const recentFinances = rawRecentFinances.map(fin => {
      const { OrdemServico, Cliente, ...rest } = fin;
      return {
        ...rest,
        os: OrdemServico,
        cliente: Cliente
      };
    });

    const data = {
      recentOS,
      recentFinances
    };

    setCache(cacheKey, data, 30000); // 30 segundos de cache
    return data;
  } catch (error: any) {
    console.error("Prisma Error loading dashboard activities:", error);
    throw error;
  }
}

export async function getCachedResumoFinanceiro(empresa_id: string) {
  const cacheKey = `resumo_financeiro_${empresa_id}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
    where: {
      empresa_id,
      data: {
        gte: startOfMonth
      }
    },
    select: {
      tipo: true,
      valor: true,
      status: true
    }
  });

  let receitas = 0;
  let despesas = 0;
  let aReceber = 0;
  let aPagar = 0;

  movimentacoes.forEach(mov => {
    if (mov.tipo === 'ENTRADA') {
      if (mov.status === 'PAGO' || mov.status === 'CONCLUIDO') {
        receitas += mov.valor ? Number(mov.valor) : 0;
      } else if (mov.status !== 'CANCELADO') {
        aReceber += mov.valor ? Number(mov.valor) : 0;
      }
    } else if (mov.tipo === 'SAIDA') {
      if (mov.status === 'PAGO' || mov.status === 'CONCLUIDO') {
        despesas += mov.valor ? Number(mov.valor) : 0;
      } else if (mov.status !== 'CANCELADO') {
        aPagar += mov.valor ? Number(mov.valor) : 0;
      }
    }
  });

  const saldo = receitas - despesas;

  const data = {
    receitas,
    despesas,
    saldo,
    aReceber,
    aPagar
  };

  setCache(cacheKey, data, 30000); // 30 segundos de cache
  return data;
}
