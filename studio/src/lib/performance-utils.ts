/**
 * Performance Optimization Utilities
 * 
 * Utilities to prevent forced reflows, optimize event handlers,
 * and improve overall application performance.
 */

/**
 * Debounce function to limit how often a function can fire
 * Prevents performance violations from rapid event handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to ensure a function is called at most once per interval
 * Useful for scroll, resize, and mousemove handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Request Animation Frame wrapper for smooth animations
 * Prevents forced reflows by batching DOM reads/writes
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null

  return function executedFunction(...args: Parameters<T>) {
    if (rafId !== null) {
      return
    }

    rafId = requestAnimationFrame(() => {
      func(...args)
      rafId = null
    })
  }
}

/**
 * Batch DOM reads and writes to prevent layout thrashing
 */
export class DOMBatcher {
  private readQueue: Array<() => void> = []
  private writeQueue: Array<() => void> = []
  private scheduled = false

  read(callback: () => void) {
    this.readQueue.push(callback)
    this.schedule()
  }

  write(callback: () => void) {
    this.writeQueue.push(callback)
    this.schedule()
  }

  private schedule() {
    if (this.scheduled) return

    this.scheduled = true
    requestAnimationFrame(() => {
      this.flush()
    })
  }

  private flush() {
    // Execute all reads first
    let callback
    while ((callback = this.readQueue.shift())) {
      callback()
    }

    // Then execute all writes
    while ((callback = this.writeQueue.shift())) {
      callback()
    }

    this.scheduled = false
  }
}

/**
 * Optimize event handler performance
 * Wraps handler in requestIdleCallback when available
 */
export function optimizeEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  options?: { timeout?: number }
): (...args: Parameters<T>) => void {
  if (typeof window === 'undefined' || !('requestIdleCallback' in window)) {
    return handler
  }

  return function optimizedHandler(...args: Parameters<T>) {
    requestIdleCallback(
      () => {
        handler(...args)
      },
      { timeout: options?.timeout || 50 }
    )
  }
}

/**
 * Lazy load images with Intersection Observer
 */
export function lazyLoadImages(selector: string = 'img[data-src]') {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return
  }

  const images = document.querySelectorAll(selector)
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement
        const src = img.getAttribute('data-src')
        
        if (src) {
          img.src = src
          img.removeAttribute('data-src')
          observer.unobserve(img)
        }
      }
    })
  })

  images.forEach((img) => imageObserver.observe(img))
}

/**
 * Measure and log performance metrics
 */
export function measurePerformance(name: string, fn: () => void) {
  if (typeof window === 'undefined' || !('performance' in window)) {
    fn()
    return
  }

  const startMark = `${name}-start`
  const endMark = `${name}-end`
  const measureName = `${name}-measure`

  performance.mark(startMark)
  fn()
  performance.mark(endMark)

  try {
    performance.measure(measureName, startMark, endMark)
    const measure = performance.getEntriesByName(measureName)[0]
    
    if (measure.duration > 50) {
      console.warn(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`)
    }

    // Cleanup
    performance.clearMarks(startMark)
    performance.clearMarks(endMark)
    performance.clearMeasures(measureName)
  } catch (e) {
    // Ignore errors in performance measurement
  }
}

/**
 * Prevent layout thrashing by batching style changes
 */
export function batchStyleChanges(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
) {
  requestAnimationFrame(() => {
    Object.assign(element.style, styles)
  })
}

/**
 * Virtual scroll helper for large lists
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const end = Math.min(totalItems, start + visibleCount + overscan * 2)

  return { start, end }
}

// Made with Bob
