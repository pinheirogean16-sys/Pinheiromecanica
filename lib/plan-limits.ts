// ============================================================
// CONFIGURAÇÃO CENTRAL DE LIMITES POR PLANO
// Altere aqui e o sistema inteiro reflete.
// ============================================================

export type Plano = 'BASICO' | 'PRO';

export type PlanLimits = {
  usuarios: number; // Infinity = ilimitado
  portalCliente: boolean;
  relatoriosAvancados: boolean;
  financeiroCompleto: boolean;
};

export const PLAN_LIMITS: Record<Plano, PlanLimits> = {
  BASICO: {
    usuarios: 3,
    portalCliente: false,
    relatoriosAvancados: false,
    financeiroCompleto: false,
  },
  PRO: {
    usuarios: Infinity,
    portalCliente: true,
    relatoriosAvancados: true,
    financeiroCompleto: true,
  },
};

export function getPlanLimits(plano: string | null | undefined): PlanLimits {
  const key = (plano?.toUpperCase() as Plano) || 'BASICO';
  return PLAN_LIMITS[key] ?? PLAN_LIMITS.BASICO;
}
