/**
 * Security Event Logger
 * 
 * SECURITY: Phase 4 (P3 - Low Priority)
 * - Logs security-relevant events
 * - Monitors suspicious activities
 * - Provides audit trail
 * - Alerts on critical events
 */

export type SecurityEventType =
  | 'auth_success'
  | 'auth_failure'
  | 'auth_lockout'
  | 'password_change'
  | 'password_reset'
  | 'session_created'
  | 'session_expired'
  | 'session_hijack_attempt'
  | 'rate_limit_exceeded'
  | 'csrf_token_invalid'
  | 'xss_attempt'
  | 'sql_injection_attempt'
  | 'unauthorized_access'
  | 'data_breach_attempt'
  | 'suspicious_activity'
  | 'account_created'
  | 'account_deleted'
  | 'permission_change'
  | 'api_error';

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  message: string;
}

const STORAGE_KEY = 'security_events';
const MAX_EVENTS = 500;
const ALERT_THRESHOLD = {
  auth_failure: 3, // Alert after 3 failed login attempts
  rate_limit_exceeded: 2,
  unauthorized_access: 1,
  data_breach_attempt: 1,
};

/**
 * Log a security event
 */
export function logSecurityEvent(
  type: SecurityEventType,
  severity: SecurityEventSeverity,
  message: string,
  details: Record<string, any> = {},
  userId?: string,
  sessionId?: string
): void {
  if (typeof window === 'undefined') return;

  const event: SecurityEvent = {
    id: crypto.randomUUID(),
    type,
    severity,
    timestamp: new Date().toISOString(),
    userId,
    sessionId,
    ipAddress: details.ipAddress,
    userAgent: navigator.userAgent,
    details,
    message,
  };

  // Store event
  const events = getSecurityEvents();
  events.push(event);

  // Keep last MAX_EVENTS
  if (events.length > MAX_EVENTS) {
    events.shift();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

  // Log to console based on severity
  const emoji = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  console.log(`${emoji[severity]} Security Event [${type}]:`, message, details);

  // Check if alert should be triggered
  checkAlertThreshold(type, events);

  // Send to monitoring service in production
  if (process.env.NODE_ENV === 'production' && severity === 'critical') {
    sendToMonitoring(event);
  }
}

/**
 * Get all security events
 */
export function getSecurityEvents(filter?: {
  type?: SecurityEventType;
  severity?: SecurityEventSeverity;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}): SecurityEvent[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let events: SecurityEvent[] = stored ? JSON.parse(stored) : [];

    // Apply filters
    if (filter) {
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      if (filter.severity) {
        events = events.filter(e => e.severity === filter.severity);
      }
      if (filter.userId) {
        events = events.filter(e => e.userId === filter.userId);
      }
      if (filter.startDate) {
        events = events.filter(e => new Date(e.timestamp) >= filter.startDate!);
      }
      if (filter.endDate) {
        events = events.filter(e => new Date(e.timestamp) <= filter.endDate!);
      }
    }

    return events;
  } catch (error) {
    console.error('Failed to get security events:', error);
    return [];
  }
}

/**
 * Get security event statistics
 */
export function getSecurityStats(): {
  total: number;
  bySeverity: Record<SecurityEventSeverity, number>;
  byType: Record<string, number>;
  recentCritical: SecurityEvent[];
  suspiciousUsers: string[];
} {
  const events = getSecurityEvents();

  const bySeverity: Record<SecurityEventSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byType: Record<string, number> = {};
  const userFailures: Record<string, number> = {};

  events.forEach(event => {
    bySeverity[event.severity]++;
    byType[event.type] = (byType[event.type] || 0) + 1;

    // Track failed auth attempts per user
    if (event.type === 'auth_failure' && event.userId) {
      userFailures[event.userId] = (userFailures[event.userId] || 0) + 1;
    }
  });

  // Get recent critical events
  const recentCritical = events
    .filter(e => e.severity === 'critical')
    .slice(-10)
    .reverse();

  // Identify suspicious users (multiple failures)
  const suspiciousUsers = Object.entries(userFailures)
    .filter(([_, count]) => count >= 3)
    .map(([userId]) => userId);

  return {
    total: events.length,
    bySeverity,
    byType,
    recentCritical,
    suspiciousUsers,
  };
}

/**
 * Check if alert threshold is exceeded
 */
function checkAlertThreshold(type: SecurityEventType, events: SecurityEvent[]): void {
  const threshold = ALERT_THRESHOLD[type as keyof typeof ALERT_THRESHOLD];
  if (!threshold) return;

  // Count recent events of this type (last 15 minutes)
  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  const recentEvents = events.filter(
    e => e.type === type && new Date(e.timestamp).getTime() > fifteenMinutesAgo
  );

  if (recentEvents.length >= threshold) {
    console.warn(`⚠️ SECURITY ALERT: ${type} threshold exceeded (${recentEvents.length}/${threshold})`);
    
    // Trigger alert notification
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Security Alert', {
          body: `Multiple ${type} events detected`,
          icon: '/favicon.ico',
        });
      }
    }
  }
}

/**
 * Send critical events to monitoring service
 */
async function sendToMonitoring(event: SecurityEvent): Promise<void> {
  try {
    // In production, send to your monitoring service (e.g., Sentry, DataDog)
    const monitoringUrl = process.env.NEXT_PUBLIC_MONITORING_URL;
    if (!monitoringUrl) return;

    await fetch(monitoringUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Failed to send to monitoring:', error);
  }
}

/**
 * Clear security events (admin only)
 */
export function clearSecurityEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Security events cleared');
}

/**
 * Export security events for analysis
 */
export function exportSecurityEvents(): string {
  const events = getSecurityEvents();
  return JSON.stringify(events, null, 2);
}

/**
 * Common security event helpers
 */
export const SecurityLogger = {
  // Authentication events
  authSuccess: (userId: string, details: Record<string, any> = {}) => {
    logSecurityEvent('auth_success', 'low', 'User logged in successfully', details, userId);
  },

  authFailure: (email: string, reason: string, details: Record<string, any> = {}) => {
    logSecurityEvent('auth_failure', 'medium', `Login failed: ${reason}`, { email, ...details });
  },

  authLockout: (userId: string, details: Record<string, any> = {}) => {
    logSecurityEvent('auth_lockout', 'high', 'Account locked due to multiple failed attempts', details, userId);
  },

  passwordChange: (userId: string, details: Record<string, any> = {}) => {
    logSecurityEvent('password_change', 'medium', 'Password changed', details, userId);
  },

  // Session events
  sessionCreated: (userId: string, sessionId: string, details: Record<string, any> = {}) => {
    logSecurityEvent('session_created', 'low', 'New session created', details, userId, sessionId);
  },

  sessionExpired: (userId: string, sessionId: string, details: Record<string, any> = {}) => {
    logSecurityEvent('session_expired', 'low', 'Session expired', details, userId, sessionId);
  },

  sessionHijackAttempt: (userId: string, sessionId: string, details: Record<string, any> = {}) => {
    logSecurityEvent('session_hijack_attempt', 'critical', 'Possible session hijack detected', details, userId, sessionId);
  },

  // Security violations
  rateLimitExceeded: (identifier: string, type: string, details: Record<string, any> = {}) => {
    logSecurityEvent('rate_limit_exceeded', 'medium', `Rate limit exceeded for ${type}`, { identifier, type, ...details });
  },

  csrfTokenInvalid: (userId?: string, details: Record<string, any> = {}) => {
    logSecurityEvent('csrf_token_invalid', 'high', 'Invalid CSRF token detected', details, userId);
  },

  xssAttempt: (userId?: string, details: Record<string, any> = {}) => {
    logSecurityEvent('xss_attempt', 'high', 'Potential XSS attack detected', details, userId);
  },

  unauthorizedAccess: (userId?: string, resource?: string, details: Record<string, any> = {}) => {
    logSecurityEvent('unauthorized_access', 'high', `Unauthorized access attempt to ${resource}`, details, userId);
  },

  suspiciousActivity: (userId?: string, activity?: string, details: Record<string, any> = {}) => {
    logSecurityEvent('suspicious_activity', 'medium', `Suspicious activity: ${activity}`, details, userId);
  },
};

/**
 * React hook for security monitoring
 */
export function useSecurityMonitoring() {
  const [stats, setStats] = React.useState(getSecurityStats());

  const refresh = () => {
    setStats(getSecurityStats());
  };

  React.useEffect(() => {
    // Refresh stats every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    refresh,
    getEvents: getSecurityEvents,
    logEvent: logSecurityEvent,
    SecurityLogger,
  };
}

// For non-React usage
import React from 'react';

// Made with Bob