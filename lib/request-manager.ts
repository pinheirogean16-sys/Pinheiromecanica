/**
 * Enterprise Request Manager Global
 * Built specifically for high reliability under Hostinger / shared server environments.
 * Handles deduplication, temporal caching (RAM only), request queueing
 * with concurrency limits, retry with exponential backoff, and graceful offline fallback.
 *
 * SEGURANÇA (C07): cache é mantido APENAS em memória (RAM) — nunca em localStorage.
 * Isso evita vazamento de dados entre usuários no mesmo navegador (PC compartilhado).
 */

import { toast } from 'sonner';

export interface RequestConfig extends Omit<RequestInit, 'body' | 'priority'> {
  body?: any;
  priority?: 'high' | 'normal' | 'low';
  ttl?: number; // Time-to-live in ms for cache
  skipCache?: boolean;
  retries?: number;
  retryDelay?: number; // Base delay in ms
  timeout?: number;
  skipDeduplication?: boolean;
  silentError?: boolean;
}

interface CacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface QueueItem {
  id: string;
  path: string;
  config: RequestConfig;
  priority: 'high' | 'normal' | 'low';
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  retriesRemaining: number;
}

class RequestManager {
  private activeConnections = 0;
  private readonly maxConcurrentRequests = 3; // Hard limit to prevent Hostinger server 429 threshold
  private queue: QueueItem[] = [];

  // Ongoing request Promises/AbortControllers for deduplication & cancellation
  private dedupeMap = new Map<string, Promise<any>>();
  private abortControllers = new Map<string, AbortController>();

  // Memory Cache (RAM only — nunca persistido)
  private memoryCache = new Map<string, CacheItem>();

  // Telemetry indicators for enterprise HUD (CTRL + SHIFT + D)
  public telemetry = {
    totalRequests: 0,
    queueBlocks: 0,
    dedupeHits: 0,
    cacheHits: 0,
    localStorageHits: 0, // mantido para compatibilidade com o HUD (sempre 0 agora)
    failedRequests: 0,
    retriesAttempted: 0,
    rateLimitBlocks: 0,
    restoredFromFallback: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      // SEGURANÇA (C07): remove cache legado do localStorage de versões anteriores
      // que vazava dados entre usuários. Executa uma vez por sessão de página.
      this.clearLegacyLocalStorageCache();

      // Cleanup de entradas expiradas em memória
      setTimeout(() => this.cleanupExpiredCache(), 1000);
    }
  }

  /**
   * SEGURANÇA (C07): remove qualquer chave `rm_cache:*` deixada no localStorage
   * por versões anteriores deste arquivo. Deve rodar no início da sessão para
   * eliminar dados eventualmente herdados de outro usuário.
   */
  private clearLegacyLocalStorageCache(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('rm_cache:')) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        localStorage.removeItem(k);
      }
    } catch {
      // localStorage pode estar indisponível (modo privado, cota cheia, etc.)
    }
  }

  /**
   * Gera uma chave determinística para um request.
   * IMPORTANTE: continua sem usuário/empresa porque o cache agora é
   * APENAS em memória — vive enquanto a aba está aberta, e é destruído
   * no reload/logout. Não há vazamento entre sessões.
   */
  private generateKey(path: string, config: RequestConfig): string {
    const method = (config.method || 'GET').toUpperCase();
    const bodyStr = config.body ? JSON.stringify(config.body) : '';
    return `${method}:${path}:${bodyStr}`;
  }

  /**
   * Lê o valor do cache em memória (RAM). Nunca toca em localStorage.
   */
  private getCacheValue(key: string): any | null {
    const ramItem = this.memoryCache.get(key);
    if (ramItem) {
      if (Date.now() < ramItem.expiresAt) {
        this.telemetry.cacheHits++;
        return ramItem.data;
      }
      this.memoryCache.delete(key);
    }
    return null;
  }

  /**
   * Salva o valor APENAS em memória. Nunca persiste.
   */
  private setCacheValue(key: string, data: any, ttl: number): void {
    if (ttl <= 0) return;

    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.memoryCache.set(key, item);
  }

  /**
   * Fallback stale (mesmo expirado) para manter a UI estável se o servidor cair.
   * Fonte: apenas memória — nunca disco.
   */
  private getStaleFallback(key: string): any | null {
    const ramItem = this.memoryCache.get(key);
    if (ramItem) return ramItem.data;
    return null;
  }

  /**
   * Remove entradas expiradas do cache em memória.
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const key of Array.from(this.memoryCache.keys())) {
      const item = this.memoryCache.get(key);
      if (item && now > item.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * SEGURANÇA (C07): limpa todo o cache em memória.
   * Deve ser chamado no LOGOUT para eliminar qualquer dado sensível residual
   * em navegadores compartilhados, mesmo sem reload da página.
   */
  public clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Cancela qualquer request ativo para uma chave específica.
   */
  public cancelRequest(key: string): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
      this.dedupeMap.delete(key);
    }
  }

  /**
   * Ponto de entrada principal. Enfileira ou despacha o request.
   */
  public async request<T = any>(path: string, config: RequestConfig = {}): Promise<T> {
    this.telemetry.totalRequests++;

    const method = (config.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const key = this.generateKey(path, config);

    const defaultTTL = isGet ? 10 * 1000 : 0; // 10s de cache client-side padrão para GETs
    const ttl = config.ttl !== undefined ? config.ttl : defaultTTL;
    const skipCache = config.skipCache || !isGet;
    const retries = config.retries !== undefined ? config.retries : isGet ? 2 : 0;
    const retryDelay = config.retryDelay || 1000;
    const timeout = config.timeout || 25000;
    const priority = config.priority || 'normal';

    // 1. Cache (RAM)
    if (!skipCache) {
      const cached = this.getCacheValue(key);
      if (cached !== null) {
        return cached as T;
      }
    }

    // 2. Deduplicação de GETs em andamento
    if (isGet && !config.skipDeduplication) {
      const ongoing = this.dedupeMap.get(key);
      if (ongoing) {
        this.telemetry.dedupeHits++;
        return ongoing as Promise<T>;
      }
    }

    // 3. Cancela request anterior da mesma chave (ex: filtro mudando)
    if (!isGet) {
      this.cancelRequest(key);
    }

    const promise = new Promise<T>((resolve, reject) => {
      const queueItem: QueueItem = {
        id: Math.random().toString(36).substring(7),
        path,
        config: { ...config, ttl, timeout },
        priority,
        resolve,
        reject,
        retriesRemaining: retries,
      };

      this.enqueue(queueItem);
    });

    if (isGet && !config.skipDeduplication) {
      this.dedupeMap.set(key, promise);
      promise.finally(() => {
        this.dedupeMap.delete(key);
      });
    }

    return promise;
  }

  /**
   * Enfileira por prioridade.
   */
  private enqueue(item: QueueItem): void {
    this.queue.push(item);

    const priorityWeight = { high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    this.processQueue();
  }

  /**
   * Processa a fila respeitando o limite de concorrência.
   */
  private async processQueue(): Promise<void> {
    if (this.activeConnections >= this.maxConcurrentRequests) {
      this.telemetry.queueBlocks++;
      return;
    }

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    this.activeConnections++;
    this.executeRequest(nextItem);
  }

  /**
   * Executa o HTTP real com timeout, abort e retry exponencial.
   */
  private async executeRequest(item: QueueItem): Promise<void> {
    const { path, config, resolve, reject } = item;
    const key = this.generateKey(path, config);

    const controller = new AbortController();
    this.abortControllers.set(key, controller);

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, config.timeout);

    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
    };

    let processedBody = config.body;
    if (config.body !== undefined && config.body !== null) {
      if (typeof config.body === 'object' && !(config.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
        processedBody = JSON.stringify(config.body);
      }
    }

    const mergedHeaders = { ...defaultHeaders, ...config.headers };

    try {
      const {
        priority,
        ttl,
        skipCache,
        retries,
        retryDelay,
        timeout,
        skipDeduplication,
        silentError,
        body,
        headers,
        signal,
        ...nativeOptions
      } = config;

      const requestPriority =
        priority === 'high' ? 'high' : priority === 'low' ? 'low' : undefined;

      const response = await fetch(path, {
        ...nativeOptions,
        headers: mergedHeaders,
        body: processedBody,
        signal: controller.signal,
        credentials: config.credentials ?? 'include',
        ...(requestPriority ? { priority: requestPriority } : {}),
      } as any);

      clearTimeout(timeoutId);
      this.abortControllers.delete(key);

      let data: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch {}
      } else {
        try {
          const text = await response.text();
          data = text ? { message: text } : null;
        } catch {}
      }

      if (!response.ok) {
        if (response.status === 429) {
          this.telemetry.rateLimitBlocks++;
        }
        throw {
          status: response.status,
          statusText: response.statusText,
          message: data?.error || data?.message || `HTTP Err ${response.status}`,
          data,
        };
      }

      // Cache apenas GETs bem-sucedidos
      const resolvedTtl = ttl ?? 0;
      if (resolvedTtl > 0 && (config.method || 'GET').toUpperCase() === 'GET') {
        this.setCacheValue(key, data, resolvedTtl);
      }

      resolve(data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(key);

      const isAbort =
        err.name === 'AbortError' || err.message === 'The user aborted a request.';
      const status = err.status || 0;

      const shouldRetry =
        item.retriesRemaining > 0 &&
        !isAbort &&
        status !== 400 &&
        status !== 401 &&
        status !== 403 &&
        status !== 404;

      if (shouldRetry) {
        item.retriesRemaining--;
        this.telemetry.retriesAttempted++;

        const delay =
          (config.retryDelay || 1000) *
          Math.pow(2, (config.retries || 2) - item.retriesRemaining);

        setTimeout(() => {
          this.enqueue(item);
        }, delay);
      } else {
        const isGet = (config.method || 'GET').toUpperCase() === 'GET';
        const fallback = isGet ? this.getStaleFallback(key) : null;

        if (fallback !== null) {
          this.telemetry.restoredFromFallback++;

          if (!config.silentError) {
            toast.warning(
              'Instabilidade de servidor detectada! Exibindo dados de cache local.',
              {
                description: 'Nenhum dado foi perdido.',
                duration: 5000,
              }
            );
          }

          resolve(fallback);
        } else {
          this.telemetry.failedRequests++;

          if (!config.silentError && !isAbort) {
            toast.error(err.message || 'Erro de conexão na requisição.');
          }

          reject(err);
        }
      }
    } finally {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      this.processQueue();
    }
  }
}

export const requestManager = new RequestManager();
if (typeof window !== 'undefined') {
  (window as any).__request_manager = requestManager;
}
