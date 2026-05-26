/**
 * Network Utilities
 * 
 * Utilities for handling network requests with retry logic,
 * error recovery, and connection monitoring to prevent ERR_NETWORK_CHANGED errors.
 */

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  backoff?: boolean
  timeout?: number
  onRetry?: (attempt: number, error: Error) => void
}

interface FetchWithRetryOptions extends RetryOptions {
  signal?: AbortSignal | null
}

/**
 * Fetch with automatic retry on network errors
 * Handles ERR_NETWORK_CHANGED and other transient network issues
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    backoff = true,
    timeout = 30000,
    onRetry,
    signal,
    ...fetchOptions
  } = options

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Create timeout controller
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      // Combine signals if provided
      const combinedSignal = signal
        ? combineAbortSignals([signal, controller.signal])
        : controller.signal

      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal,
      })

      clearTimeout(timeoutId)

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // Retry on 5xx errors (server errors)
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`)
      }

      return response
    } catch (error: any) {
      lastError = error

      // Don't retry if aborted by user
      if (error.name === 'AbortError' && signal?.aborted) {
        throw error
      }

      // Check if we should retry
      const isNetworkError =
        error.name === 'TypeError' ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('ERR_NETWORK_CHANGED')

      const isTimeout = error.name === 'AbortError'
      const shouldRetry = (isNetworkError || isTimeout) && attempt < maxRetries

      if (!shouldRetry) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = backoff ? retryDelay * Math.pow(2, attempt) : retryDelay

      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1, error)
      }

      console.warn(
        `Network request failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
        error.message
      )

      // Wait before retrying
      await sleep(delay)
    }
  }

  throw lastError || new Error('Request failed after retries')
}

/**
 * Combine multiple AbortSignals into one
 */
function combineAbortSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort()
      break
    }

    signal.addEventListener('abort', () => controller.abort(), { once: true })
  }

  return controller.signal
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if online before making requests
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine
}

/**
 * Wait for network connection
 */
export function waitForOnline(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onOnline)
      reject(new Error('Network connection timeout'))
    }, timeout)

    const onOnline = () => {
      clearTimeout(timeoutId)
      window.removeEventListener('online', onOnline)
      resolve()
    }

    window.addEventListener('online', onOnline)
  })
}

/**
 * Monitor network status and show notifications
 */
export class NetworkMonitor {
  private listeners: Set<(online: boolean) => void> = new Set()
  private isMonitoring = false

  start() {
    if (this.isMonitoring || typeof window === 'undefined') return

    this.isMonitoring = true

    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
  }

  stop() {
    if (!this.isMonitoring || typeof window === 'undefined') return

    this.isMonitoring = false

    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
  }

  private handleOnline = () => {
    console.log('Network connection restored')
    this.notifyListeners(true)
  }

  private handleOffline = () => {
    console.warn('Network connection lost')
    this.notifyListeners(false)
  }

  private notifyListeners(online: boolean) {
    this.listeners.forEach((listener) => listener(online))
  }

  addListener(listener: (online: boolean) => void) {
    this.listeners.add(listener)
  }

  removeListener(listener: (online: boolean) => void) {
    this.listeners.delete(listener)
  }
}

/**
 * Create a singleton network monitor
 */
export const networkMonitor = new NetworkMonitor()

/**
 * Prefetch resources to improve perceived performance
 */
export function prefetchResource(url: string, options?: RequestInit) {
  if (typeof window === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  document.head.appendChild(link)
}

/**
 * Cache manager for API responses
 */
export class ResponseCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private maxAge: number

  constructor(maxAgeMs: number = 5 * 60 * 1000) {
    this.maxAge = maxAgeMs
  }

  get(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.timestamp
    if (age > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }
}

/**
 * Fetch with caching
 */
export async function fetchWithCache(
  url: string,
  options: RequestInit & { cache?: ResponseCache; cacheKey?: string } = {}
): Promise<Response> {
  const { cache, cacheKey, ...fetchOptions } = options

  if (cache && cacheKey) {
    const cached = cache.get(cacheKey)
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const response = await fetchWithRetry(url, fetchOptions as RequestInit & FetchWithRetryOptions)

  if (cache && cacheKey && response.ok) {
    const clone = response.clone()
    const data = await clone.json()
    cache.set(cacheKey, data)
  }

  return response
}

/**
 * Batch multiple requests to reduce network overhead
 */
export class RequestBatcher {
  private queue: Array<{
    url: string
    options: RequestInit
    resolve: (response: Response) => void
    reject: (error: Error) => void
  }> = []
  private timeout: NodeJS.Timeout | null = null
  private batchDelay: number

  constructor(batchDelayMs: number = 50) {
    this.batchDelay = batchDelayMs
  }

  fetch(url: string, options: RequestInit = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject })
      this.scheduleBatch()
    })
  }

  private scheduleBatch() {
    if (this.timeout) return

    this.timeout = setTimeout(() => {
      this.executeBatch()
    }, this.batchDelay)
  }

  private async executeBatch() {
    const batch = [...this.queue]
    this.queue = []
    this.timeout = null

    // Execute all requests in parallel
    const results = await Promise.allSettled(
      batch.map(({ url, options }) => fetchWithRetry(url, options as RequestInit & FetchWithRetryOptions))
    )

    // Resolve/reject individual promises
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        batch[index].resolve(result.value)
      } else {
        batch[index].reject(result.reason)
      }
    })
  }
}

// Made with Bob
