import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedStats, getCachedAtividades, getCachedResumoFinanceiro } from '@/lib/dashboard-cache';

export async function GET() {
  const results: Record<string, any> = {};

  const runTest = async (name: string, fn: () => Promise<any>) => {
    const startTime = Date.now();
    try {
      const data = await fn();
      let count = 0;
      if (Array.isArray(data)) {
        count = data.length;
      } else if (data && typeof data === 'object') {
        if ('total' in data) {
          count = Number(data.total);
        } else if ('items' in data && Array.isArray(data.items)) {
          count = data.items.length;
        } else {
          count = Object.keys(data).length;
        }
      }
      results[name] = {
        status: 'SUCCESS',
        time_ms: Date.now() - startTime,
        records: count,
        error: null
      };
    } catch (err: any) {
      results[name] = {
        status: 'ERROR',
        time_ms: Date.now() - startTime,
        records: 0,
        error: {
          message: err.message,
          stack: err.stack ? err.stack.split('\n')[0] : null
        }
      };
    }
  };

  // Test 1: Agenda
  await runTest('Agenda (/api/agenda)', async () => {
    return await prisma.eventoAgenda.findMany({
      include: {
        OrdemServico: { select: { id: true, numero: true } },
        Cliente: { select: { id: true, nome: true } },
        Veiculo: { select: { id: true, placa: true, modelo: true } },
        User_EventoAgenda_mecanico_idToUser: { select: { id: true, name: true } },
      },
      take: 10
    });
  });

  // Test 2: Clientes
  await runTest('Clientes (/api/clientes)', async () => {
    return await prisma.cliente.findMany({
      include: {
        _count: {
          select: {
            Veiculo: true,
            OrdemServico: true,
          }
        },
        OrdemServico: {
          select: {
            numero: true,
            valor_total: true,
            created_at: true,
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 1
        }
      },
      take: 10
    });
  });

  // Test 3: Veiculos
  await runTest('Veículos (/api/veiculos)', async () => {
    return await prisma.veiculo.findMany({
      include: {
        Cliente: { select: { nome: true, id: true } }
      },
      take: 10
    });
  });

  // Test 4: Peças
  await runTest('Peças (/api/pecas)', async () => {
    return await prisma.peca.findMany({
      take: 10
    });
  });

  // Test 5: Fornecedores
  await runTest('Fornecedores (Ex: clientes PERFIL=FORNECEDOR)', async () => {
    return await prisma.cliente.findMany({
      where: { perfil: 'FORNECEDOR' },
      take: 10
    });
  });

  // Test 6: Ordens
  await runTest('Ordens (/api/ordens)', async () => {
    return await prisma.ordemServico.findMany({
      include: {
        Cliente: { select: { nome: true } },
        Veiculo: { select: { placa: true, modelo: true } },
        User: { select: { name: true } },
      },
      take: 10
    });
  });

  // Test 7: Dashboard Stats
  await runTest('Dashboard Stats (/api/dashboard/stats)', async () => {
    return await getCachedStats('default');
  });

  // Test 8: Dashboard Atividades
  await runTest('Dashboard Atividades (/api/dashboard/atividades)', async () => {
    return await getCachedAtividades('default');
  });

  // Test 9: Dashboard Resumo Financeiro
  await runTest('Dashboard Resumo Financeiro (/api/dashboard/resumo-financeiro)', async () => {
    return await getCachedResumoFinanceiro('default');
  });

  const allSuccess = Object.values(results).every((r: any) => r.status === 'SUCCESS');

  return NextResponse.json({
    success: allSuccess,
    results
  });
}
