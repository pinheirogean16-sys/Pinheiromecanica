import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // 🔒 TRAVA DE SEGURANÇA MÁXIMA
    if (user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Acesso negado. Área restrita.' }, { status: 403 });
    }

    // Busca todas as empresas (Inquilinos)
    const empresas = await prisma.empresa.findMany({
      include: {
        _count: {
          select: { User: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Estatísticas Globais
    const totalEmpresas = await prisma.empresa.count();
    const totalUsuarios = await prisma.user.count();
    const totalOS = await prisma.ordemServico.count();
    
    // Simulação de MRR (Faturamento Mensal Recorrente)
    // Se o plano for PRO, cobra 149.90, se BASICO cobra 89.90
    let mrr = 0;
    empresas.forEach(emp => {
      if (emp.plano === 'PRO') mrr += 149.90;
      if (emp.plano === 'BASICO') mrr += 89.90;
    });

    // Últimos logs críticos de todo o sistema
    const logsRecentes = await prisma.auditLog.findMany({
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        totalEmpresas,
        totalUsuarios,
        totalOS,
        mrr
      },
      empresas,
      logsRecentes
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno no servidor master' }, { status: 500 });
  }
}
