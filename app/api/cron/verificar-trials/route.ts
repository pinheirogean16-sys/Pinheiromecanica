// app/api/cron/verificar-trials/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { log } from '@/lib/logger';

export async function GET(request: Request) {
  // 1. Medida de segurança: Verifica se a chamada é do seu Cron Job
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const agora = new Date();

    // 2. Encontra todas as empresas que estão no trial, o trial expirou e ainda estão ativas
    const empresasParaBloquear = await prisma.empresa.findMany({
      where: {
        plano: 'TRIAL',
        status: 'ATIVO',
        trial_ends_at: {
          lt: agora, // A data de término do trial é menor que agora (já passou)
        },
      },
    });

    if (empresasParaBloquear.length === 0) {
      return NextResponse.json({ message: 'Nenhum trial expirado para bloquear.' });
    }

    // 3. Atualiza o status de todas as empresas encontradas para 'BLOQUEADO'
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
    });
  } catch (error: any) {
    log('ERROR', 'CRON_TRIAL', 'Erro ao verificar trials', { error: error?.message }, 'SISTEMA');
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
