export interface EmpresaStatusInfo {
  status: string;
  plano: string;
  trial_ends_at: Date | null;
}

export function isEmpresaBloqueada(
  empresa: EmpresaStatusInfo | null | undefined,
  agora: Date = new Date()
): boolean {
  if (!empresa) return true;
  if (empresa.status === 'BLOQUEADO') return true;
  const trialVencido =
    empresa.plano === 'TRIAL' &&
    !!empresa.trial_ends_at &&
    new Date(empresa.trial_ends_at) < agora;
  return trialVencido;
}
