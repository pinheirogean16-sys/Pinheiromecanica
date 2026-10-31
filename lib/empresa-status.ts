import { prisma } from './prisma';
import { isEmpresaBloqueada } from './empresa-status-core';

export { isEmpresaBloqueada } from './empresa-status-core';
export type { EmpresaStatusInfo } from './empresa-status-core';

const TTL_MS = 15_000;
const MAX_ENTRIES = 5_000;
const cache = new Map<string, { bloqueada: boolean; expiresAt: number }>();

export function invalidateEmpresaStatusCache(empresaId?: string) {
  if (empresaId) cache.delete(empresaId);
  else cache.clear();
}

export async function empresaEstaBloqueada(empresaId: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(empresaId);
  if (hit && hit.expiresAt > now) return hit.bloqueada;

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { status: true, plano: true, trial_ends_at: true },
  });
  const bloqueada = isEmpresaBloqueada(empresa);

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(empresaId, { bloqueada, expiresAt: now + TTL_MS });
  return bloqueada;
}
