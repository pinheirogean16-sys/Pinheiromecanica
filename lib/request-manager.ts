/**
 * Enterprise Request Manager Global
 * Built specifically for high reliability under Hostinger / shared server environments.
 * Handles deduplication, temporal hybrid caching (RAM + LocalStorage), request queueing 
 * with concurrency limits, retry with exponential backoff, and graceful offline fallback.
 */

import { toast } from 'sonner';

export interface RequestConfig extends Omit<RequestInit, 'body'> {
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

  // Memory Cache
  private memoryCache = new Map<string, CacheItem>();

  // Telemetry indicators for enterprise HUD (CTRL + SHIFT + D)
  public telemetry = {
    totalRequests: 0,
    queueBlocks: 0,
    dedupeHits: 0,
    cacheHits: 0,
    localStorageHits: 0,
    failedRequests: 0,
    retriesAttempted: 0,
    rateLimitBlocks: 0,
    restoredFromFallback: 0,
  };

  constructor() {
    // Attempt local storage cleanup of expired keys in background
    if (typeof window !== 'undefined') {
      setTimeout(() => this.cleanupIndexedCache(), 1000);
    }
  }

  /**
   * Generates a unique deterministic cache key for a request
   */
  private generateKey(path: string, config: RequestConfig): string {
    const method = (config.method || 'GET').toUpperCase();
    const bodyStr = config.body ? JSON.stringify(config.body) : '';
    return `${method}:${path}:${bodyStr}`;
  }

  /**
   * Fetches data from caches (RAM first, then LocalStorage)
   */
  private getCacheValue(key: string): any | null {
    // 1. RAM Cache check
    const ramItem = this.memoryCache.get(key);
    if (ramItem) {
      if (Date.now() < ramItem.expiresAt) {
        this.telemetry.cacheHits++;
        return ramItem.data;
      }
      this.memoryCache.delete(key);
    }

    // 2. LocalStorage Cache check as secondary backup
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`rm_cache:${key}`);
        if (stored) {
          const parsed: CacheItem = JSON.parse(stored);
          if (Date.now() < parsed.expiresAt) {
            // Restore back to memory cache
            this.memoryCache.set(key, parsed);
            this.telemetry.localStorageHits++;
            return parsed.data;
          }
          localStorage.removeItem(`rm_cache:${key}`);
        }
      } catch (err) {
        console.warn('RM Cache: LocalStorage read failed', err);
      }
    }
    return null;
  }

  /**
   * Save entry to caches (RAM + LocalStorage)
   */
  private setCacheValue(key: string, data: any, ttl: number): void {
    if (ttl <= 0) return;

    const item: CacheItem = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    this.memoryCache.set(key, item);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`rm_cache:${key}`, JSON.stringify(item));
      } catch (err) {
        // Handle storage full by clearing older items
        this.cleanupIndexedCache(true);
        try {
          localStorage.setItem(`rm_cache:${key}`, JSON.stringify(item));
        } catch {}
      }
    }
  }

  /**
   * Get an extreme robust fallback even if the cache is legally expired.
   * Helps keep UI fully stable and visually populated during active server down/429 periods.
   */
  private getStaleFallback(key: string): any | null {
    const ramItem = this.memoryCache.get(key);
    if (ramItem) return ramItem.data;

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`rm_cache:${key}`);
        if (stored) {
          const parsed: CacheItem = JSON.parse(stored);
          return parsed.data;
        }
      } catch {}
    }
    return null;
  }

  /**
   * Cleans up expired cache items to conserve memory & local storage space.
   */
  private cleanupIndexedCache(forceAll = false): void {
    if (typeof window === 'undefined') return;

    try {
      if (forceAll) {
        // Storage is full, clear older cached assets completely
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith('rm_cache:')) {
            localStorage.removeItem(k);
          }
        }
        this.memoryCache.clear();
        return;
      }

      const now = Date.now();
      for (const key of Array.from(this.memoryCache.keys())) {
        const item = this.memoryCache.get(key);
        if (item && now > item.expiresAt) {
          this.memoryCache.delete(key);
        }
      }

      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('rm_cache:')) {
          const stored = localStorage.getItem(k);
          if (stored) {
            const parsed: CacheItem = JSON.parse(stored);
            if (now > parsed.expiresAt) {
              localStorage.removeItem(k);
            }
          }
        }
      }
    } catch {}
  }

  /**
   * Cancels any active outgoing request for a specific endpoint key
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
   * Dispatches of queues the request to maintain a strict concurrent execution model
   */
  public async request<T = any>(path: string, config: RequestConfig = {}): Promise<T> {
    this.telemetry.totalRequests++;

    const method = (config.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const key = this.generateKey(path, config);

    // Default parameters for caching and resilience
    const defaultTTL = isGet ? 10 * 1000 : 0; // 10 seconds of default client-side caching for GETs
    const ttl = config.ttl !== undefined ? config.ttl : defaultTTL;
    const skipCache = config.skipCache || !isGet;
    const retries = config.retries !== undefined ? config.retries : (isGet ? 2 : 0);
    const retryDelay = config.retryDelay || 1000;
    const timeout = config.timeout || 25000;
    const priority = config.priority || 'normal';

    // 1. Check cache first for GET requests
    if (!skipCache) {
      const cached = this.getCacheValue(key);
      if (cached !== null) {
        return cached as T;
      }
    }

    // 2. Deduplicate ongoing identical GET requests
    if (isGet && !config.skipDeduplication) {
      const ongoing = this.dedupeMap.get(key);
      if (ongoing) {
        this.telemetry.dedupeHits++;
        return ongoing as Promise<T>;
      }
    }

    // 3. Cancel outstanding request of same key if new comes in (e.g. typing or change filter)
    if (!isGet) {
      this.cancelRequest(key);
    }

    // Wrap in queued promise
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

      // Push into queue
      this.enqueue(queueItem);
    });

    if (isGet && !config.skipDeduplication) {
      this.dedupeMap.set(key, promise);
      // Clean up deduplication ref when promise settles
      promise.finally(() => {
        this.dedupeMap.delete(key);
      });
    }

    return promise;
  }

  /**
   * Put item in the queue and order it by Priority
   */
  private enqueue(item: QueueItem): void {
    this.queue.push(item);

    // Sort queue by Priority (high first, low last)
    const priorityWeight = { high: 3, normal: 2, low: 1 };
    this.queue.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

    this.processQueue();
  }

  /**
   * Process pending queued requests up to max concurrency
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
   * Performs the raw HTTP connection with AbortController, Timeout and backoff retries
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
      'Accept': 'application/json',
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
      const response = await fetch(path, {
        ...config,
        headers: mergedHeaders,
        body: processedBody,
        signal: controller.signal,
        credentials: config.credentials ?? 'include',
      });

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

      // If valid, cache it
      const ttl = config.ttl ?? 0;
      if (ttl > 0 && (config.method || 'GET').toUpperCase() === 'GET') {
        this.setCacheValue(key, data, ttl);
      }

      resolve(data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.abortControllers.delete(key);

      const isAbort = err.name === 'AbortError' || err.message === 'The user aborted a request.';
      const status = err.status || 0;

      // Detect if we should retry (network dropouts or server timeouts, but do not retry 403, 401 or user cancellation)
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
        
        // Exponential Backoff algorithm: delay base * 2 ^ attempt
        const delay = (config.retryDelay || 1000) * Math.pow(2, (config.retries || 2) - item.retriesRemaining);
        
        setTimeout(() => {
          this.enqueue(item);
        }, delay);
      } else {
        // Retry exhausted or not applicable, search fallback cache for GETs
        const isGet = (config.method || 'GET').toUpperCase() === 'GET';
        const fallback = isGet ? this.getStaleFallback(key) : null;

        if (fallback !== null) {
          this.telemetry.restoredFromFallback++;
          
          if (!config.silentError) {
            toast.warning('Instabilidade de servidor detectada! Exibindo dados de cache local.', {
              description: 'Nenhum dado foi perdido.',
              duration: 5000,
            });
          }
          
          resolve(fallback);
        } else {
          // No fallback available, fail formally
          this.telemetry.failedRequests++;
          
          if (!config.silentError && !isAbort) {
            toast.error(err.message || 'Erro de conexão na requisição.');
          }
          
          reject(err);
        }
      }
    } finally {
      this.activeConnections = Math.max(0, this.activeConnections - 1);
      // Trigger execution of layout tasks in queue
      this.processQueue();
    }
  }
}

export const requestManager = new RequestManager();
if (typeof window !== 'undefined') {
  (window as any).__request_manager = requestManager;
}
