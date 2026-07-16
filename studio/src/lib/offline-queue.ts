/**
 * Offline Queue System
 * Queues failed requests and retries them when connection is restored
 */

interface SerializedRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  mode?: RequestMode;
  credentials?: RequestCredentials;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  referrer?: string;
  referrerPolicy?: ReferrerPolicy;
  integrity?: string;
  keepalive?: boolean;
}

interface QueuedRequest {
  id: string;
  url: string;
  options: SerializedRequestInit;
  timestamp: number;
  // Client-side metadata for replay and conflict handling
  attempts?: number;
  lastAttemptAt?: number | null;
  status?: 'queued' | 'processing' | 'failed' | 'conflict' | 'done';
  responseStatus?: number | null;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly STORAGE_KEY = 'offline-queue';
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.loadFromStorage();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Connection restored, processing queue...');
        this.processQueue();
      });

      window.addEventListener('focus', () => {
        if (navigator.onLine) {
          console.log('👀 Window focused, checking queued requests...');
          this.processQueue();
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          this.processQueue();
        }
      });

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'OFFLINE_QUEUE_SYNC' && navigator.onLine) {
          console.log('📩 Received sync request from service worker');
          this.processQueue();
        }
      });

      // Periodic retry while app is open
      setInterval(() => {
        if (navigator.onLine) {
          this.processQueue();
        }
      }, 120_000);

      // Process queue on initialization if online
      if (navigator.onLine) {
        this.processQueue();
      }
    }
  }

  private async registerBackgroundSync(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const registrationWithSync = registration as unknown as {
        sync?: { register: (tag: string) => Promise<void> };
      };

      if (registrationWithSync.sync?.register) {
        await registrationWithSync.sync.register('offline-queue-sync');
        console.log('🔔 Background sync registered for offline queue');
      }
    } catch (error) {
      console.warn('Background sync not available or registration failed:', error);
    }
  }

  /**
   * Add a request to the queue
   */
  async add(url: string, options: RequestInit = {}): Promise<void> {
    const serializedOptions = this.serializeRequestInit(options);

    // Don't queue if we're online and can make the request immediately
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        await fetch(url, serializedOptions as RequestInit);
        return;
      } catch (error) {
        console.log('Request failed, adding to queue:', error);
      }
    }

    const request: QueuedRequest = {
      id: crypto.randomUUID(),
      url,
      options: serializedOptions,
      timestamp: Date.now(),
      attempts: 0,
      lastAttemptAt: null,
      status: 'queued',
      responseStatus: null,
    };

    this.queue.push(request);
    
    // Limit queue size
    if (this.queue.length > this.MAX_QUEUE_SIZE) {
      this.queue.shift(); // Remove oldest
    }

    this.saveToStorage();
    await this.registerBackgroundSync();

    console.log(`📴 Request queued (${this.queue.length} in queue)`);
  }

  /**
   * Process all queued requests
   */
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    console.log(`🔄 Processing ${this.queue.length} queued requests...`);

    let successCount = 0;
    let failCount = 0;

    while (this.queue.length > 0 && typeof navigator !== 'undefined' && navigator.onLine) {
      const request = this.queue[0];
      // update status and persist
      request.status = 'processing';
      request.attempts = (request.attempts || 0) + 1;
      request.lastAttemptAt = Date.now();
      this.saveToStorage();
      try {
        const response = await fetch(request.url, this.deserializeRequestInit(request.options));
        request.responseStatus = response.status;
        // Conflict from server - surface for manual resolution
        if (response.status === 409) {
          request.status = 'conflict';
          this.saveToStorage();
          // notify the application about the conflict so UI can show resolution flow
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-queue-conflict', { detail: request }));
          }
          // keep the conflicted request in queue for manual resolution
          // move to next item to allow other requests to process
          // rotate queue to avoid tight loop
          this.queue.push(this.queue.shift() as QueuedRequest);
          continue;
        }

        if (response.ok) {
          request.status = 'done';
          this.queue.shift(); // Remove from queue
          successCount++;
          this.saveToStorage();
        } else {
          console.error(`Failed to process queued request: ${response.status}`);
          request.status = 'failed';
          // Persist failure status for diagnostics
          this.saveToStorage();
          failCount++;
          // stop processing to avoid hammering server
          break;
        }
      } catch (error) {
        console.error('Failed to process queued request:', error);
        failCount++;
        break; // Stop processing on error
      }
    }

    this.processing = false;

    if (successCount > 0) {
      console.log(`✅ Processed ${successCount} queued requests`);
    }
    if (failCount > 0) {
      console.log(`❌ Failed to process ${failCount} requests`);
    }
  }

  /**
   * Get queue status
   */
  getStatus(): { count: number; processing: boolean; online: boolean } {
    return {
      count: this.queue.length,
      processing: this.processing,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }

  /**
   * Return queued requests currently marked as conflicts
   */
  getConflicts(): QueuedRequest[] {
    return this.queue.filter((r) => r.status === 'conflict');
  }

  /**
   * Attempt to resolve a conflict by sending resolutionData to the server.
   * On success the queued item is removed. On failure it remains for manual review.
   */
  async resolveConflict(requestId: string, resolutionData: any): Promise<boolean> {
    const idx = this.queue.findIndex((r) => r.id === requestId);
    if (idx === -1) return false;
    const req = this.queue[idx];

    try {
      // POST resolution to a dedicated resolution endpoint which can perform
      // server-side merges or forward to the appropriate handler.
      const payload = {
        requestId: req.id,
        originalUrl: req.url,
        originalOptions: req.options,
        resolutionData,
      };
      const res = await fetch('/api/offline/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        // remove from queue
        this.queue.splice(idx, 1);
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to resolve conflict for queued request:', e);
      return false;
    }
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.saveToStorage();
    console.log('🗑️ Queue cleared');
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue to storage:', error);
    }
  }

  private serializeRequestInit(options: RequestInit): SerializedRequestInit {
    const headers: Record<string, string> = {};
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (options.headers && typeof options.headers === 'object') {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    let bodyString: string | null = null;
    if (options.body instanceof Blob) {
      bodyString = ''; // unsupported blob bodies in offline queue
    } else if (options.body instanceof ArrayBuffer || options.body instanceof Uint8Array) {
      bodyString = ''; // unsupported binary body in offline queue
    } else if (options.body instanceof URLSearchParams) {
      bodyString = options.body.toString();
    } else if (options.body instanceof FormData) {
      try {
        const formDataObj: Record<string, string> = {};
        options.body.forEach((value, key) => {
          formDataObj[key] = String(value);
        });
        bodyString = JSON.stringify(formDataObj);
      } catch {
        bodyString = null;
      }
    } else if (typeof options.body === 'string') {
      bodyString = options.body;
    } else if (options.body && typeof options.body === 'object') {
      try {
        bodyString = JSON.stringify(options.body);
      } catch {
        bodyString = null;
      }
    }

    const serialized: SerializedRequestInit = {
      method: options.method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: bodyString,
      mode: options.mode,
      credentials: options.credentials,
      cache: options.cache,
      redirect: options.redirect,
      referrer: options.referrer,
      referrerPolicy: options.referrerPolicy,
      integrity: options.integrity,
      keepalive: options.keepalive,
    };

    if (options.method && options.method.toUpperCase() === 'GET') {
      serialized.body = undefined;
    }

    return serialized;
  }

  private deserializeRequestInit(options: SerializedRequestInit): RequestInit {
    return {
      method: options.method,
      headers: options.headers,
      body: options.body === undefined || options.body === null ? undefined : options.body,
      mode: options.mode,
      credentials: options.credentials,
      cache: options.cache,
      redirect: options.redirect,
      referrer: options.referrer,
      referrerPolicy: options.referrerPolicy,
      integrity: options.integrity,
      keepalive: options.keepalive,
    };
  }

  /**
   * Load queue from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored) as QueuedRequest[];
        console.log(`📦 Loaded ${this.queue.length} queued requests from storage`);
      }
    } catch (error) {
      console.error('Failed to load queue from storage:', error);
      this.queue = [];
    }
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueue();

/**
 * Hook to use offline queue in React components
 */
import { useEffect, useState } from 'react';

export function useOfflineQueue() {
  const [status, setStatus] = useState(offlineQueue.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      const next = offlineQueue.getStatus();
      setStatus((prev) => {
        if (prev.count === next.count && prev.processing === next.processing && prev.online === next.online) {
          return prev;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    ...status,
    add: offlineQueue.add.bind(offlineQueue),
    clear: offlineQueue.clear.bind(offlineQueue),
    processQueue: offlineQueue.processQueue.bind(offlineQueue),
    getConflicts: offlineQueue.getConflicts.bind(offlineQueue),
    resolveConflict: offlineQueue.resolveConflict.bind(offlineQueue),
  };
}

// Made with Bob
