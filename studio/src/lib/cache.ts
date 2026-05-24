/**
 * Client-side caching utility using localStorage
 * 100% FREE - no external dependencies
 * 
 * Features:
 * - Automatic expiration
 * - Type-safe
 * - Fallback on errors
 * - Memory-efficient (auto-cleanup)
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const CACHE_PREFIX = 'syncsenta_cache_'
const MAX_CACHE_SIZE = 50 // Maximum number of cached items

/**
 * Get cached data or fetch fresh data
 * @param key - Unique cache key
 * @param fetcher - Function to fetch fresh data
 * @param ttl - Time to live in milliseconds (default: 1 hour)
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600000 // 1 hour default
): Promise<T> {
  try {
    const cacheKey = CACHE_PREFIX + key
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      const entry: CacheEntry<T> = JSON.parse(cached)
      const now = Date.now()
      
      // Check if cache is still valid
      if (now - entry.timestamp < entry.ttl) {
        console.log(`[Cache] Hit: ${key}`)
        return entry.data
      }
      
      // Cache expired, remove it
      localStorage.removeItem(cacheKey)
      console.log(`[Cache] Expired: ${key}`)
    }
  } catch (error) {
    console.warn('[Cache] Error reading cache:', error)
  }

  // Fetch fresh data
  console.log(`[Cache] Miss: ${key}`)
  const data = await fetcher()
  
  // Store in cache
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }
    
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
    
    // Cleanup old cache entries if needed
    cleanupCache()
  } catch (error) {
    console.warn('[Cache] Error writing cache:', error)
  }

  return data
}

/**
 * Invalidate specific cache entry
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(CACHE_PREFIX + key)
    console.log(`[Cache] Invalidated: ${key}`)
  } catch (error) {
    console.warn('[Cache] Error invalidating cache:', error)
  }
}

/**
 * Invalidate all cache entries matching a pattern
 */
export function invalidateCachePattern(pattern: string): void {
  try {
    const keys = Object.keys(localStorage)
    const matchingKeys = keys.filter(k => 
      k.startsWith(CACHE_PREFIX) && k.includes(pattern)
    )
    
    matchingKeys.forEach(key => localStorage.removeItem(key))
    console.log(`[Cache] Invalidated ${matchingKeys.length} entries matching: ${pattern}`)
  } catch (error) {
    console.warn('[Cache] Error invalidating cache pattern:', error)
  }
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX))
    
    cacheKeys.forEach(key => localStorage.removeItem(key))
    console.log(`[Cache] Cleared ${cacheKeys.length} entries`)
  } catch (error) {
    console.warn('[Cache] Error clearing cache:', error)
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  count: number
  size: number
  keys: string[]
} {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX))
    
    let totalSize = 0
    cacheKeys.forEach(key => {
      const value = localStorage.getItem(key)
      if (value) {
        totalSize += value.length
      }
    })
    
    return {
      count: cacheKeys.length,
      size: totalSize,
      keys: cacheKeys.map(k => k.replace(CACHE_PREFIX, '')),
    }
  } catch (error) {
    console.warn('[Cache] Error getting cache stats:', error)
    return { count: 0, size: 0, keys: [] }
  }
}

/**
 * Cleanup old cache entries to prevent localStorage overflow
 */
function cleanupCache(): void {
  try {
    const keys = Object.keys(localStorage)
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX))
    
    // If we have too many cache entries, remove oldest ones
    if (cacheKeys.length > MAX_CACHE_SIZE) {
      const entries = cacheKeys.map(key => {
        const value = localStorage.getItem(key)
        if (!value) return null
        
        try {
          const entry: CacheEntry<any> = JSON.parse(value)
          return { key, timestamp: entry.timestamp }
        } catch {
          return null
        }
      }).filter(Boolean) as { key: string; timestamp: number }[]
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.timestamp - b.timestamp)
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE)
      toRemove.forEach(({ key }) => localStorage.removeItem(key))
      
      console.log(`[Cache] Cleaned up ${toRemove.length} old entries`)
    }
  } catch (error) {
    console.warn('[Cache] Error during cleanup:', error)
  }
}

/**
 * Preload cache with data
 * Useful for prefetching commonly used data
 */
export async function preloadCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600000
): Promise<void> {
  try {
    await getCached(key, fetcher, ttl)
  } catch (error) {
    console.warn('[Cache] Error preloading cache:', error)
  }
}

/**
 * Cache keys for common data
 */
export const CACHE_KEYS = {
  CURRICULUM: (grade: string, subject: string) => `curriculum:${grade}:${subject}`,
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  LESSON_PLANS: (teacherId: string) => `teacher:${teacherId}:lessons`,
  STUDENT_PROGRESS: (studentId: string) => `student:${studentId}:progress`,
  SCHEMES: (teacherId: string) => `teacher:${teacherId}:schemes`,
} as const

// Made with Bob
