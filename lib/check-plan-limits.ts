import { prisma } from '@/lib/prisma';
import { getPlanLimits, Plano } from '@/lib/plan-limits';

export type CheckLimitResult =
  | { ok: true; planoAtual: Plano; limite: number; total: number }
  | {
      ok: false;
      planoAtual: Plano;
      limite: number;
      total: number;
      mensagem: string;
      code: 'UPGRADE_REQUIRED';
    };

/**
 * Verifica se a empresa ainda pode criar usuários conforme o plano.
 * Retorna ok:false com code UPGRADE_REQUIRED quando o limite foi atingido.
 */
export async function checkUserLimit(empresa_id: string): Promise<CheckLimitResult> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresa_id },
    select: { plano: true },
  });

  const planoAtual = ((empresa?.plano?.toUpperCase() as Plano) || 'BASICO') as Plano;
  const limites = getPlanLimits(planoAtual);

  // Se existir campo `ativo` no User, troque para:
  // where: { empresa_id, ativo: true }
  const total = await prisma.user.count({
    where: { empresa_id },
  });

  if (total >= limites.usuarios) {
    return {
      ok: false,
      planoAtual,
      limite: limites.usuarios,
      total,
      code: 'UPGRADE_REQUIRED',
      mensagem: `Seu plano ${planoAtual} permite no máximo ${limites.usuarios} usuários. Faça upgrade para o PRO para adicionar mais.`,
    };
  }

  return {
    ok: true,
    planoAtual,
    limite: limites.usuarios,
    total,
  };
}
