import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';
import { apiError } from '@/lib/api-error';
import { verificarContasAtrasadas, verificarContasAVencer } from '@/lib/notificacoes-financeiras';

// ============================================================
// TRAVA DE SEGURANÇA: valida o CRON_SECRET
// ============================================================
function validarCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // Se a variável não estiver configurada, o endpoint fica bloqueado por padrão
  if (!secret) {
    log('ERROR', 'FINANCEIRO_CRON', 'CRON_SECRET não configurado no ambiente', {}, 'sistema');
    return false;
  }

  // Aceita dois formatos de header:
  // 1. Authorization: Bearer <secret>
  // 2. x-cron-secret: <secret>
  const authHeader = req.headers.get('authorization');
  const cronHeader = req.headers.get('x-cron-secret');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7) === secret;
  }

  if (cronHeader) {
    return cronHeader === secret;
  }

  return false;
}

// ============================================================
// POST — Executa a verificação em todas as empresas ativas
// ============================================================
export async function POST(req: NextRequest) {
  try {
    // 1. Valida o secret do cron
    if (!validarCronSecret(req)) {
      log(
        'WARN',
        'FINANCEIRO_CRON',
        'Tentativa de acesso ao cron sem CRON_SECRET válido',
        { ip: req.headers.get('x-forwarded-for') || 'unknown' },
        'sistema'
      );
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Busca todas as empresas ativas (ignora bloqueadas)
    const empresas = await prisma.empresa.findMany({
      where: { status: { not: 'BLOQUEADO' } },
      select: { id: true, nome: true },
    });

    if (empresas.length === 0) {
      log('INFO', 'FINANCEIRO_CRON', 'Nenhuma empresa ativa para verificar', {}, 'cron');
      return NextResponse.json({
        success: true,
        total: 0,
        ok: 0,
        erros: 0,
        resultados: [],
      });
    }

    // 3. Itera sobre cada empresa e dispara as verificações
    const resultados: any[] = [];

    for (const empresa of empresas) {
      const inicio = Date.now();
      try {
        await verificarContasAtrasadas(empresa.id);
        await verificarContasAVencer(3, empresa.id);

        resultados.push({
          empresa_id: empresa.id,
          empresa_nome: empresa.nome,
          status: 'OK',
          tempo_ms: Date.now() - inicio,
        });
      } catch (err: any) {
        log(
          'ERROR',
          'FINANCEIRO_CRON',
          `Falha ao verificar empresa ${empresa.nome}`,
          { empresa_id: empresa.id, error: err?.message },
          'cron'
        );
        resultados.push({
          empresa_id: empresa.id,
          empresa_nome: empresa.nome,
          status: 'ERROR',
          erro: 'Falha na verificação',
          tempo_ms: Date.now() - inicio,
        });
      }
    }

    const okCount = resultados.filter((r) => r.status === 'OK').length;
    const errorCount = resultados.filter((r) => r.status === 'ERROR').length;

    log(
      'INFO',
      'FINANCEIRO_CRON',
      'Verificação de alertas financeiros concluída',
      { total: empresas.length, ok: okCount, erros: errorCount },
      'cron'
    );

    return NextResponse.json({
      success: true,
      total: empresas.length,
      ok: okCount,
      erros: errorCount,
      resultados,
    });
  } catch (error: any) {
    return apiError(error, 'FINANCEIRO_CRON', 'Erro no cron de alertas');
  }
}

// ============================================================
// GET — Permite testar o cron manualmente (mas exige o secret)
// ============================================================
export async function GET(req: NextRequest) {
  return POST(req);
}
