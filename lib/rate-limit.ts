// ============================================================
// RATE LIMIT EM MEMÓRIA (v2 — sliding window)
//
// ⚠️ LIMITAÇÃO CONHECIDA (A11):
// Este rate limit é mantido em memória do processo Node. Em ambiente
// com múltiplos workers (Hostinger Cloud, PM2 cluster, Vercel), cada
// worker tem seu próprio Map — o limite efetivo é `limit × workers`.
//
// Para resolver 100%, migrar para tabela `LoginAttempt` no banco
// (requer migration). Ver: docs/auditoria-v7.md (achado A11).
// ============================================================

interface RateLimitEntry {
  // Sliding window: guarda os timestamps das requisições dentro da janela
  timestamps: number[];
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Limites de segurança do Map (evita OOM em produção)
const MAX_TRACKED_KEYS = 2000;

// Telemetria
export const rateLimitTelemetry = {
  totalChecks: 0,
  totalBlocked: 0,
  totalCleared: 0,
  peakSize: 0,
};

// ============================================================
// Cleanup automático — chamado em cada request
// ============================================================
function cleanupExpired(now: number, windowMs: number): void {
  // Remove entradas cuja janela inteira já expirou
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
      rateLimitTelemetry.totalCleared++;
    } else {
      // Remove timestamps antigos dentro da janela (sliding window)
      const cutoff = now - windowMs;
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    }
  }
}

// ============================================================
// isRateLimited — função principal
//
// Uso:
//   isRateLimited('ip')                          → 60 req/min por IP
//   isRateLimited(`login:${email}:${ip}`, 5, 300_000) → 5 tentativas / 5min
//   isRateLimited(`user:${userId}`, 100, 60_000) → 100 req/min por usuário
// ============================================================
export function isRateLimited(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): { limited: boolean; count: number; reset: number } {
  const now = Date.now();
  rateLimitTelemetry.totalChecks++;

  // Proteção contra crescimento descontrolado do Map
  if (rateLimitMap.size > MAX_TRACKED_KEYS) {
    cleanupExpired(now, windowMs);

    // Fallback: se ainda estourou, limpa tudo (self-healing)
    if (rateLimitMap.size > MAX_TRACKED_KEYS) {
      rateLimitMap.clear();
      rateLimitTelemetry.totalCleared += rateLimitMap.size;
    }
  }

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // Nova chave ou janela expirada
    const newEntry: RateLimitEntry = {
      timestamps: [now],
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, newEntry);

    // Atualiza peak da telemetria
    if (rateLimitMap.size > rateLimitTelemetry.peakSize) {
      rateLimitTelemetry.peakSize = rateLimitMap.size;
    }

    return { limited: false, count: 1, reset: newEntry.resetTime };
  }

  // Sliding window: remove timestamps fora da janela e conta os que sobraram
  const cutoff = now - windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  entry.timestamps.push(now);

  const count = entry.timestamps.length;

  if (count > limit) {
    rateLimitTelemetry.totalBlocked++;
    return { limited: true, count, reset: entry.resetTime };
  }

  return { limited: false, count, reset: entry.resetTime };
}

// ============================================================
// peekRateLimit — consulta sem incrementar (útil para debug)
// ============================================================
export function peekRateLimit(
  key: string,
  windowMs: number = 60000
): { exists: boolean; count: number; reset: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    return { exists: false, count: 0, reset: 0 };
  }

  const cutoff = now - windowMs;
  const count = entry.timestamps.filter((t) => t > cutoff).length;

  return { exists: true, count, reset: entry.resetTime };
}

// ============================================================
// resetRateLimit — limpa a chave (útil para suporte desbloquear usuário)
// ============================================================
export function resetRateLimit(key: string): boolean {
  return rateLimitMap.delete(key);
}

// ============================================================
// getRateLimitStatus — dados para painel de observabilidade
// ============================================================
export function getRateLimitStatus() {
  return {
    ...rateLimitTelemetry,
    currentSize: rateLimitMap.size,
    maxKeys: MAX_TRACKED_KEYS,
  };
}
