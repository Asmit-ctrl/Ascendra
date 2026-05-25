/**
 * Performance Utilities
 * Debouncing, throttling, and async optimization helpers
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last time it was invoked
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Async debounce - for async functions
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeout: NodeJS.Timeout | null = null;
  let resolveList: Array<(value: any) => void> = [];
  let rejectList: Array<(reason?: any) => void> = [];

  return function executedFunction(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }

      resolveList.push(resolve);
      rejectList.push(reject);

      timeout = setTimeout(async () => {
        const currentResolveList = resolveList;
        const currentRejectList = rejectList;
        resolveList = [];
        rejectList = [];

        try {
          const result = await func(...args);
          currentResolveList.forEach((r) => r(result));
        } catch (error) {
          currentRejectList.forEach((r) => r(error));
        }
      }, wait);
    });
  };
}

/**
 * Request Animation Frame throttle - for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    if (rafId !== null) {
      return;
    }

    rafId = requestAnimationFrame(() => {
      func(...args);
      rafId = null;
    });
  };
}

/**
 * Batch multiple calls into a single execution
 */
export function batchCalls<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let calls: Array<Parameters<T>> = [];

  return function executedFunction(...args: Parameters<T>) {
    calls.push(args);

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      const allCalls = calls;
      calls = [];
      // Execute with the last call's arguments
      if (allCalls.length > 0) {
        func(...allCalls[allCalls.length - 1]);
      }
    }, wait);
  };
}

/**
 * Memoize expensive function calls
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Lazy load a component or module
 */
export async function lazyLoad<T>(
  importFunc: () => Promise<T>,
  delay: number = 0
): Promise<T> {
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return importFunc();
}

/**
 * Run expensive operations in idle time
 */
export function runWhenIdle(
  callback: () => void,
  options?: IdleRequestOptions
): number {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  // Fallback for browsers that don't support requestIdleCallback
  return (typeof window !== 'undefined' ? (window as any).setTimeout(callback, 1) : 0) as number;
}

/**
 * Cancel idle callback
 */
export function cancelIdle(id: number): void {
  if (typeof window !== 'undefined') {
    if ('cancelIdleCallback' in window) {
      window.cancelIdleCallback(id);
    } else {
      (window as any).clearTimeout(id);
    }
  }
}

/**
 * Measure performance of a function
 */
export async function measurePerformance<T>(
  name: string,
  func: () => T | Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await func();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`[Performance] ${name} failed after ${(end - start).toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Create a performance observer for long tasks
 */
export function observeLongTasks(threshold: number = 50): PerformanceObserver | null {
  if (!('PerformanceObserver' in window)) {
    return null;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > threshold) {
          console.warn(`[Performance] Long task detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure', 'longtask'] });
    return observer;
  } catch (error) {
    console.error('[Performance] Failed to create observer:', error);
    return null;
  }
}

// Made with Bob
