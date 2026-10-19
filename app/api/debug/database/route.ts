import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { getCachedStats, getCachedAtividades, getCachedResumoFinanceiro } from '@/lib/dashboard-cache';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // 🔒 TRAVA DE SEGURANÇA MÁXIMA: apenas SUPER_ADMIN
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superAdminEmail || user.email !== superAdminEmail) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // 🔒 Em produção, só funciona se explicitamente habilitado
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DIAGNOSTICS !== 'true') {
      return NextResponse.json({ error: 'Diagnóstico desabilitado' }, { status: 404 });
    }

    const empresa_id = user.empresa_id;
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
        };
      } catch (err: any) {
        // ✅ Não vaza stack trace nem mensagem real
        log('ERROR', 'DIAGNOSTIC', `Falha no teste: ${name}`, { error: err?.message }, 'sistema');
        results[name] = {
          status: 'ERROR',
          time_ms: Date.now() - startTime,
          records: 0,
          error: 'Falha na query',
        };
      }
    };

    await runTest('Agenda', async () => {
      return await prisma.eventoAgenda.findMany({
        where: { empresa_id },
        take: 10
      });
    });

    await runTest('Clientes', async () => {
      return await prisma.cliente.findMany({
        where: { empresa_id },
        take: 10
      });
    });

    await runTest('Veiculos', async () => {
      return await prisma.veiculo.findMany({
        where: { empresa_id },
        take: 10
      });
    });

    await runTest('Pecas', async () => {
      return await prisma.peca.findMany({
        where: { empresa_id },
        take: 10
      });
    });

    await runTest('Fornecedores', async () => {
      return await prisma.cliente.findMany({
        where: { empresa_id, perfil: 'FORNECEDOR' },
        take: 10
      });
    });

    await runTest('Ordens', async () => {
      return await prisma.ordemServico.findMany({
        where: { empresa_id },
        take: 10
      });
    });

    await runTest('Dashboard Stats', async () => {
      return await getCachedStats(empresa_id);
    });

    await runTest('Dashboard Atividades', async () => {
      return await getCachedAtividades(empresa_id);
    });

    await runTest('Dashboard Resumo Financeiro', async () => {
      return await getCachedResumoFinanceiro(empresa_id);
    });

    const allSuccess = Object.values(results).every((r: any) => r.status === 'SUCCESS');

    return NextResponse.json({
      success: allSuccess,
      results
    });
  } catch (error: any) {
    return apiError(error, 'DIAGNOSTIC', 'Erro no diagnóstico');
  }
}
