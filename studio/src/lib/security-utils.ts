/**
 * Security Utilities
 * 
 * SECURITY: Phase 3 (P2 - Medium Priority)
 * - Password strength validation
 * - Rate limiting for authentication
 * - Input length validation
 * - Authorization helpers
 */

/**
 * Password Policy Configuration
 */
const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * Input Length Limits
 */
export const INPUT_LIMITS = {
  email: 254, // RFC 5322
  name: 100,
  password: 128,
  text: 500,
  longText: 5000,
  url: 2048,
  phone: 20,
  code: 10,
};

/**
 * Rate Limiting Configuration
 */
const RATE_LIMITS = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  signup: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
  },
};

/**
 * Password Strength Result
 */
export interface PasswordStrength {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  suggestions: string[];
}

/**
 * Validate password strength
 * SECURITY: Enforces strong password policy
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  } else {
    score += 20;
  }

  // Check maximum length
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
    return { isValid: false, score: 0, errors, suggestions };
  }

  // Check for uppercase letters
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (PASSWORD_POLICY.requireUppercase) {
    score += 20;
  }

  // Check for lowercase letters
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (PASSWORD_POLICY.requireLowercase) {
    score += 20;
  }

  // Check for numbers
  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else if (PASSWORD_POLICY.requireNumbers) {
    score += 20;
  }

  // Check for special characters
  const specialCharsRegex = new RegExp(`[${PASSWORD_POLICY.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
  if (PASSWORD_POLICY.requireSpecialChars && !specialCharsRegex.test(password)) {
    errors.push(`Password must contain at least one special character (${PASSWORD_POLICY.specialChars})`);
  } else if (PASSWORD_POLICY.requireSpecialChars) {
    score += 20;
  }

  // Check for common patterns
  const commonPatterns = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890)+$/, // Sequential numbers
    /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // Sequential letters
    /password|123456|qwerty|admin|letmein|welcome/i, // Common passwords
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns. Please use a more unique password');
      score = Math.max(0, score - 30);
      break;
    }
  }

  // Bonus points for length
  if (password.length >= 16) {
    score += 10;
    suggestions.push('Great! Your password is nice and long');
  }

  // Bonus points for variety
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.7) {
    score += 10;
    suggestions.push('Good variety of characters');
  }

  // Cap score at 100
  score = Math.min(100, score);

  // Add suggestions if not perfect
  if (score < 100 && errors.length === 0) {
    suggestions.push('Consider making your password even stronger by adding more variety');
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
    suggestions,
  };
}

/**
 * Rate Limiter Class
 * SECURITY: Prevents brute force attacks
 */
class RateLimiter {
  private attempts: Map<string, { count: number; firstAttempt: number; blockedUntil?: number }> = new Map();

  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string, type: keyof typeof RATE_LIMITS = 'api'): boolean {
    const config = RATE_LIMITS[type];
    const now = Date.now();
    const record = this.attempts.get(identifier);

    // Check if blocked
    if (record?.blockedUntil && record.blockedUntil > now) {
      return false;
    }

    // Clean up old records
    if (record && now - record.firstAttempt > config.windowMs) {
      this.attempts.delete(identifier);
      return true;
    }

    // Check rate limit
    if (record && record.count >= config.maxAttempts) {
      // Block the identifier
      record.blockedUntil = now + config.blockDurationMs;
      return false;
    }

    return true;
  }

  /**
   * Record an attempt
   */
  recordAttempt(identifier: string, type: keyof typeof RATE_LIMITS = 'api'): void {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now - record.firstAttempt > RATE_LIMITS[type].windowMs) {
      this.attempts.set(identifier, { count: 1, firstAttempt: now });
    } else {
      record.count++;
    }
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string, type: keyof typeof RATE_LIMITS = 'api'): number {
    const config = RATE_LIMITS[type];
    const record = this.attempts.get(identifier);

    if (!record) return config.maxAttempts;

    const now = Date.now();
    if (now - record.firstAttempt > config.windowMs) {
      return config.maxAttempts;
    }

    return Math.max(0, config.maxAttempts - record.count);
  }

  /**
   * Get time until unblocked (in ms)
   */
  getBlockedTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record?.blockedUntil) return 0;

    const now = Date.now();
    return Math.max(0, record.blockedUntil - now);
  }

  /**
   * Reset attempts for identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Clean up old records (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(r => r.windowMs));

    for (const [identifier, record] of this.attempts.entries()) {
      if (now - record.firstAttempt > maxWindow && (!record.blockedUntil || record.blockedUntil < now)) {
        this.attempts.delete(identifier);
      }
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Schedule periodic cleanup so the in-memory Map doesn't grow unbounded.
//
// The earlier version gated this on `typeof window !== 'undefined'` — which
// is exactly backwards: the rate limiter is consumed by /api/auth (a Node
// route handler) where `window` is undefined, so cleanup never ran in the
// place it actually mattered. On Render's free tier (512 MB), a long-lived
// process could leak indefinitely. On the browser side, the limiter is
// re-created per page load anyway, so cleanup buys little there.
//
// We run cleanup in BOTH environments and use `unref()` on Node so the
// interval doesn't keep the process alive after shutdown signals.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const cleanupHandle: ReturnType<typeof setInterval> = setInterval(
  () => rateLimiter.cleanup(),
  CLEANUP_INTERVAL_MS
);
// Node's Timeout has .unref(); browsers don't. Guard the call.
if (typeof (cleanupHandle as { unref?: () => void }).unref === 'function') {
  (cleanupHandle as { unref: () => void }).unref();
}

/**
 * Validate input length
 * SECURITY: Prevents buffer overflow and DoS attacks
 */
export function validateInputLength(
  value: string,
  fieldName: string,
  maxLength: number,
  minLength: number = 0
): { isValid: boolean; error?: string } {
  if (value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitize user identifier for rate limiting
 * SECURITY: Creates consistent identifier from IP or user ID
 */
export function sanitizeIdentifier(identifier: string): string {
  // Remove any special characters and limit length
  return identifier.replace(/[^a-zA-Z0-9._-]/g, '').substring(0, 100);
}

/**
 * Get client IP from request headers
 * SECURITY: Extracts IP for rate limiting
 */
export function getClientIP(headers: Headers): string {
  // Check common headers for IP address
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

/**
 * Format time duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

// Made with Bob