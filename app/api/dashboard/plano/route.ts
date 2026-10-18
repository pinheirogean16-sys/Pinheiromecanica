import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      select: {
        plano: true,
        status: true,
        trial_ends_at: true,
      }
    });

    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });

    // Calcula dias restantes de trial (se aplicável)
    let diasRestantes = 0;
    if (empresa.plano === 'TRIAL' && empresa.trial_ends_at) {
      const hoje = new Date();
      const fim = new Date(empresa.trial_ends_at);
      const diffTime = fim.getTime() - hoje.getTime();
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diasRestantes < 0) diasRestantes = 0;
    }

    return NextResponse.json({
      plano: empresa.plano,
      status: empresa.status,
      trial_ends_at: empresa.trial_ends_at,
      diasRestantes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar plano' }, { status: 500 });
  }
}
