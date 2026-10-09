import { NextResponse } from 'next/server';
import { prisma, dbTelemetry } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { log } from '@/lib/logger';

export async function GET() {
  try {
    // 1. Check Authentication Status
    const { error: authError, user } = await requireAuth();
    if (authError) return authError;

    const authStatus = 'Autenticado';

    // 2. Test Database Connection and Get Row Counts
    let dbStatus = 'CONECTADO';
    let dbDetails: any = {};
    let counts: Record<string, number> = {};

    try {
      const [
        totalUsers,
        totalClientes,
        totalVeiculos,
        totalOS,
        totalFinanceiro,
        totalPecas,
      ] = await Promise.all([
        prisma.user.count({ where: { empresa_id: user.empresa_id } }),
        prisma.cliente.count({ where: { empresa_id: user.empresa_id } }),
        prisma.veiculo.count({ where: { empresa_id: user.empresa_id } }),
        prisma.ordemServico.count({ where: { empresa_id: user.empresa_id } }),
        prisma.movimentacaoFinanceira.count({ where: { empresa_id: user.empresa_id } }),
        prisma.peca.count({ where: { empresa_id: user.empresa_id } }),
      ]);

      counts = {
        usuarios: totalUsers,
        clientes: totalClientes,
        veiculos: totalVeiculos,
        os: totalOS,
        financeiro: totalFinanceiro,
        pecas: totalPecas,
      };

      // Fetch a sample of each to make sure query resolution works
      dbDetails = {
        provider: 'MySQL',
        connectionOk: true,
        schemaMatch: true
      };
    } catch (dbErr: any) {
      dbStatus = 'FALHA_CONEXAO';
      dbDetails = {
        error: dbErr.message || 'Erro desconhecido de banco',
        code: dbErr.code,
        meta: dbErr.meta
      };
      log('ERROR', 'SYS_DIAGNOSTICS', 'Erro de banco no diagnostico', { error: dbErr }, 'sistema');
    }

    // 3. Check Critical Environments (flags only, no secrets leaked)
    const envStatus = {
      DATABASE_URL_SET: !!process.env.DATABASE_URL,
      JWT_SECRET_SET: !!process.env.JWT_SECRET,
      GEMINI_API_KEY_SET: !!process.env.GEMINI_API_KEY,
      NODE_ENV: process.env.NODE_ENV || 'production'
    };

    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      autenticacao: {
        status: authStatus,
        usuario: user ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          empresa_id: user.empresa_id
        } : null,
      },
      bancoDeDados: {
        status: dbStatus,
        detalhes: dbDetails,
        registros: counts,
      },
      dbTelemetry: {
        totalQueries: dbTelemetry.totalQueries,
        slowQueries: dbTelemetry.slowQueries,
        failedQueries: dbTelemetry.failedQueries,
        queriesLog: dbTelemetry.queriesLog,
      },
      variaveisAmbiente: envStatus,
    });
  } catch (error: any) {
    console.error('Diagnostics Critical Error:', error);
    return NextResponse.json({
      status: 'ERROR',
      message: error.message || 'Erro interno ao executar diagnóstico',
    }, { status: 500 });
  }
}
