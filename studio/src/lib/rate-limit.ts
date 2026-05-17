/**
 * In-memory token-bucket rate limiter, per identifier (typically remote IP).
 *
 * HONEST LIMITATIONS — read before relying on this:
 *
 *   1. State lives in the Node.js process memory. On Vercel's serverless
 *      runtime, multiple concurrent instances do NOT share counters, so a
 *      user can exceed the limit by a factor of (instance count). Treat this
 *      as a per-instance circuit breaker against runaway clients, NOT as a
 *      precise quota system.
 *
 *   2. State is lost on cold start. A burst right after a restart will not
 *      be rate-limited.
 *
 *   3. There is no eviction loop; we lazy-expire on access. Memory grows
 *      with unique callers within the bucket TTL. For an MVP this is fine —
 *      Vercel functions are short-lived. Swap for Upstash / Vercel KV the
 *      moment usage justifies it.
 *
 * Picking parameters:
 *   - capacity: max burst (e.g. 30 = "30 messages in a tight burst before
 *     anyone notices a delay").
 *   - refillPerSec: sustained rate (e.g. 0.5 = "1 message every 2 seconds
 *     long-term").
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitDecision {
  allowed: boolean;
  /** Whole seconds until at least one token is available. 0 if allowed. */
  retryAfterSec: number;
  /** Tokens left in the bucket after this call. Useful for response headers. */
  remaining: number;
}

export interface RateLimitOptions {
  capacity: number;
  refillPerSec: number;
}

/**
 * Charge one token against `key`'s bucket. Returns whether the call is
 * allowed and, if not, when to retry.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitDecision {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: opts.capacity, lastRefill: now };

  // Lazy refill: add tokens proportional to time elapsed since last touch.
  const elapsedSec = Math.max(0, (now - bucket.lastRefill) / 1000);
  const refilled = Math.min(opts.capacity, bucket.tokens + elapsedSec * opts.refillPerSec);
  bucket.tokens = refilled;
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, retryAfterSec: 0, remaining: Math.floor(bucket.tokens) };
  }

  buckets.set(key, bucket);
  // Time until the bucket holds one token = (1 - tokens) / refillPerSec.
  const retry = Math.ceil((1 - bucket.tokens) / Math.max(opts.refillPerSec, 1e-6));
  return { allowed: false, retryAfterSec: retry, remaining: 0 };
}

/** Test-only — wipe all buckets. Exported so unit tests can isolate. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}
