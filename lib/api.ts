import { requestManager } from './request-manager';
import { showUpgradeModal } from '@/components/UpgradeModal';

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

export const apiTelemetry = {
  get totalRequests() { return requestManager.telemetry.totalRequests; },
  get activeRequests() { return (requestManager as any).activeConnections || 0; },
  get cacheHits() { return requestManager.telemetry.dedupeHits + requestManager.telemetry.cacheHits + requestManager.telemetry.localStorageHits; },
  get errorsRecoveredByCache() { return requestManager.telemetry.restoredFromFallback; },
  get rateLimitBlocks() { return requestManager.telemetry.rateLimitBlocks; },
  lastRequestsLog: [] as { path: string; timestamp: string; status: number; duration: number }[]
};

if (typeof window !== 'undefined') {
  (window as any).__api_telemetry = apiTelemetry;
}

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
    return result;
  } catch (err: any) {
    const payload = extractErrorPayload(err);
    // Garante que o status venha do erro ou do payload
    const status = err.status || payload?.status || 0; 

    // ✅ UPGRADE: detecta 402, dispara o modal e lança um ApiError oficial
    if (
      (status === 402 || payload?.code === 'UPGRADE_REQUIRED' || err.message?.includes('UPGRADE_REQUIRED')) &&
      !options.silentError
    ) {
      // ✅ Abre o modal imediatamente
      showUpgradeModal({
        message: payload?.message || err.message,
        planoAtual: payload?.planoAtual,
        limite: payload?.limite,
        total: payload?.total,
        feature: payload?.feature,
      });
      
      // Lança o erro com as propriedades corretas para o frontend ignorar o toast
      throw new ApiError(
        'UPGRADE_REQUIRED', // Força a mensagem padrão para o handleApiError reconhecer
        402, 
        'Payment Required', 
        { ...payload, code: 'UPGRADE_REQUIRED' }
      );
    }

    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Erro de rede ou API', status, err.statusText || 'Error', payload);
  }
}
