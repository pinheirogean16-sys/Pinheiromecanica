/**
 * Centralized API Fetch Utility with Deduplication, Telemetry, and Resilient Backoff Caching
 * Developed for robust performance in shared and low-resource hosting (such as Hostinger Business).
 * Features Client-side rate-limit recovery and stale-while-revalidate protection.
 */

import { toast } from 'sonner';
import { requestManager } from './request-manager';
import { showUpgradeModal } from '@/components/UpgradeModal'; // ✅ UPGRADE

export class ApiError extends Error {
  status: number;
  statusText: string;
  info?: any;

  constructor(message: string, status: number, statusText: string, info?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.info = info;
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'priority'> {
  body?: any;
  priority?: 'high' | 'normal' | 'low';
  ttl?: number;
  skipCache?: boolean;
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  skipDeduplication?: boolean;
  silentError?: boolean;
}

// Keep track of counts for Ctrl + Shift + D Diagnostic UI
export const apiTelemetry = {
  get totalRequests() { return requestManager.telemetry.totalRequests; },
  get activeRequests() { return (requestManager as any).activeConnections || 0; },
  get cacheHits() { return requestManager.telemetry.dedupeHits + requestManager.telemetry.cacheHits + requestManager.telemetry.localStorageHits; },
  get errorsRecoveredByCache() { return requestManager.telemetry.restoredFromFallback; },
  get rateLimitBlocks() { return requestManager.telemetry.rateLimitBlocks; },
  lastRequestsLog: [] as { path: string; timestamp: string; status: number; duration: number }[]
};

// Expose to window for real-time live debugging
if (typeof window !== 'undefined') {
  (window as any).__api_telemetry = apiTelemetry;
}

// ✅ UPGRADE: extrai o payload do erro independente de onde o requestManager guardou
function extractErrorPayload(err: any): any {
  return err?.info ?? err?.data ?? err?.body ?? null;
}

export async function apiFetch<T = any>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await requestManager.request<T>(path, options);

    // Append to telemetry trace log
    apiTelemetry.lastRequestsLog.unshift({
      path,
      timestamp: new Date().toLocaleTimeString(),
      status: 200,
      duration: Date.now() - startTime
    });
    if (apiTelemetry.lastRequestsLog.length > 50) {
      apiTelemetry.lastRequestsLog.pop();
    }

    return result;
  } catch (err: any) {
    const status = err.status || 0;
    const payload = extractErrorPayload(err);

    // Append error trace log
    apiTelemetry.lastRequestsLog.unshift({
      path,
      timestamp: new Date().toLocaleTimeString(),
      status,
      duration: Date.now() - startTime
    });
    if (apiTelemetry.lastRequestsLog.length > 50) {
      apiTelemetry.lastRequestsLog.pop();
    }

    // ✅ UPGRADE: detecta 402 UPGRADE_REQUIRED e dispara o modal global
    // Não mostra o modal se a chamada marcou silentError (ex.: polling em background)
    if (
      status === 402 &&
      payload?.code === 'UPGRADE_REQUIRED' &&
      !options.silentError
    ) {
      showUpgradeModal({
        message: payload?.message,
        planoAtual: payload?.planoAtual,
        limite: payload?.limite,
        total: payload?.total,
        feature: payload?.feature,
      });
    }

    if (err instanceof Error) {
      throw err;
    }
    throw new ApiError(err.message || 'Erro de rede ou API', status, err.statusText || 'Error', payload);
  }
}
