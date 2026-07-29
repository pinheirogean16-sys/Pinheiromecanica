import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { verificarContasAtrasadas, verificarContasAVencer } from '@/lib/notificacoes-financeiras';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const verify = searchParams.get('verify') === 'true';

    // Trigger verification if requested (ideally by a cron job)
    if (verify && (session.role === 'ADMIN' || session.role === 'FINANCEIRO')) {
      await verificarContasAtrasadas();
      await verificarContasAVencer(3);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const proximoLimite = new Date();
    proximoLimite.setDate(hoje.getDate() + 3);
    proximoLimite.setHours(23, 59, 59, 999);

    // Contas Atrasadas
    const atrasadasRaw = await prisma.movimentacaoFinanceira.findMany({
      where: {
        status: 'ATRASADO',
        empresa_id: session.empresa_id || 'default'
      },
      include: {
        Cliente: { select: { nome: true } },
        OrdemServico: { select: { numero: true } }
      },
      orderBy: { data_vencimento: 'asc' }
    });

    const atrasadas = atrasadasRaw.map(a => ({
      ...a,
      os: a.OrdemServico,
      cliente: a.Cliente,
      OrdemServico: undefined,
      Cliente: undefined
    }));

    // Contas a Vencer (nos próximos 3 dias)
    const aVencerRaw = await prisma.movimentacaoFinanceira.findMany({
      where: {
        status: 'PENDENTE',
        data_vencimento: {
          gte: hoje,
          lte: proximoLimite
        },
        empresa_id: session.empresa_id || 'default'
      },
      include: {
        Cliente: { select: { nome: true } },
        OrdemServico: { select: { numero: true } }
      },
      orderBy: { data_vencimento: 'asc' }
    });

    const aVencer = aVencerRaw.map(a => ({
      ...a,
      os: a.OrdemServico,
      cliente: a.Cliente,
      OrdemServico: undefined,
      Cliente: undefined
    }));

    return NextResponse.json({
      atrasadas,
      aVencer,
      resumo: {
        totalAtrasadas: atrasadas.reduce((acc, c) => acc + Number(c.valor), 0),
        totalAVencer: aVencer.reduce((acc, c) => acc + Number(c.valor), 0),
        countAtrasadas: atrasadas.length,
        countAVencer: aVencer.length
      }
    });

  } catch (error) {
    console.error('Erro ao buscar alertas financeiros:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
