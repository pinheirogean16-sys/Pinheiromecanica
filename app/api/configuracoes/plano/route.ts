import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/api-auth';
import { checkPermission } from '@/lib/rbac';
import { getPlanLimits, Plano } from '@/lib/plan-limits';
import { apiError } from '@/lib/api-error';

export async function GET() {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    // ⚠️ Ajuste a chave de permissão se no seu RBAC for diferente
    if (!checkPermission(user, 'configuracoes', 'visualizar')) {
      return NextResponse.json({ error: 'Permissão negada' }, { status: 403 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: user.empresa_id },
      select: {
        plano: true,
        status: true,
        trial_ends_at: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    const planoKey = ((empresa.plano?.toUpperCase() as Plano) || 'BASICO') as Plano;
    const limites = getPlanLimits(planoKey);

    const totalUsuarios = await prisma.user.count({
      where: { empresa_id: user.empresa_id },
    });

    const diasRestantes = empresa.trial_ends_at
      ? Math.max(
          0,
          Math.ceil(
            (new Date(empresa.trial_ends_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    return NextResponse.json({
      plano: empresa.plano,          // mantém o casing original (TRIAL/BASICO/PRO)
      status: empresa.status,
      trial_ends_at: empresa.trial_ends_at,
      diasRestantes,
      limites: {
        usuarios: limites.usuarios === Infinity ? null : limites.usuarios, // null = ilimitado
        portalCliente: limites.portalCliente,
        financeiroCompleto: limites.financeiroCompleto,
      },
      uso: {
        usuarios: totalUsuarios,
      },
    });
  } catch (error: any) {
    return apiError(error, 'PLANO', 'Erro ao carregar plano');
  }
}
