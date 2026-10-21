import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function GET(request: Request) {
  // 1. Medida de segurança: aceita o segredo via URL ou via Header
  const { searchParams } = new URL(request.url);
  const secretViaUrl = searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  const headerCron = request.headers.get('x-cron-secret');
  
  const cronSecret = process.env.CRON_SECRET;

  // 🚨 TRAVA DE SEGURANÇA: Se a senha não bater, bloqueia o acesso
  const isAuthorized = 
    (secretViaUrl && secretViaUrl === cronSecret) ||
    (authHeader === `Bearer ${cronSecret}`) || 
    (headerCron === cronSecret);

  if (!cronSecret || !isAuthorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const agora = new Date();

    // 2. Encontra todas as empresas com trial expirado que ainda estão ativas
    const empresasParaBloquear = await prisma.empresa.findMany({
      where: {
        plano: 'TRIAL',
        status: 'ATIVO',
        trial_ends_at: {
          lt: agora,
        },
      },
    });

    if (empresasParaBloquear.length === 0) {
      return NextResponse.json({ message: 'Nenhum trial expirado para bloquear.' });
    }

    // 3. Atualiza o status
    const resultado = await prisma.empresa.updateMany({
      where: {
        id: { in: empresasParaBloquear.map((e) => e.id) },
      },
      data: {
        status: 'BLOQUEADO',
      },
    });

    log(
      'INFO',
      'CRON_TRIAL',
      `${resultado.count} empresa(s) bloqueada(s) por trial expirado.`,
      { empresas: empresasParaBloquear.map((e) => e.nome) },
      'SISTEMA'
    );

    return NextResponse.json({
      success: true,
      message: `${resultado.count} empresa(s) bloqueada(s) com sucesso.`,
      empresas: empresasParaBloquear.map(e => e.nome)
    });
  } catch (error: any) {
    log('ERROR', 'CRON_TRIAL', 'Erro ao verificar trials', { error: error?.message }, 'SISTEMA');
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
