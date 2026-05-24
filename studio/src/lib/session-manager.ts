/**
 * Session Management System (FREE)
 * Handles session timeouts and activity tracking
 */

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000; // 5 minutes before timeout
const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // Check every minute

export interface SessionInfo {
  valid: boolean;
  reason?: 'no_session' | 'expired' | 'invalid';
  lastActivity?: number;
  timeRemaining?: number;
  warningShown?: boolean;
}

/**
 * Check if session is valid
 */
export function checkSession(): SessionInfo {
  if (typeof window === 'undefined') {
    return { valid: false, reason: 'no_session' };
  }

  const lastActivity = localStorage.getItem('last_activity');

  if (!lastActivity) {
    return { valid: false, reason: 'no_session' };
  }

  const lastActivityTime = parseInt(lastActivity);
  const now = Date.now();
  const timeSinceActivity = now - lastActivityTime;

  if (timeSinceActivity > SESSION_TIMEOUT) {
    localStorage.removeItem('last_activity');
    return { 
      valid: false, 
      reason: 'expired',
      lastActivity: lastActivityTime,
    };
  }

  const timeRemaining = SESSION_TIMEOUT - timeSinceActivity;
  const warningShown = localStorage.getItem('session_warning_shown') === 'true';

  return { 
    valid: true,
    lastActivity: lastActivityTime,
    timeRemaining,
    warningShown,
  };
}

/**
 * Update last activity timestamp
 */
export function updateActivity(): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem('last_activity', Date.now().toString());
  localStorage.removeItem('session_warning_shown');
}

/**
 * Initialize session
 */
export function initSession(): void {
  updateActivity();
  
  if (typeof window === 'undefined') return;

  // Track user activity
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  
  events.forEach(event => {
    window.addEventListener(event, updateActivity, { passive: true });
  });
}

/**
 * End session
 */
export function endSession(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('last_activity');
  localStorage.removeItem('session_warning_shown');
}

/**
 * Get session duration
 */
export function getSessionDuration(): number {
  if (typeof window === 'undefined') return 0;

  const lastActivity = localStorage.getItem('last_activity');
  if (!lastActivity) return 0;

  return Date.now() - parseInt(lastActivity);
}

/**
 * Format time remaining
 */
export function formatTimeRemaining(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Check if warning should be shown
 */
export function shouldShowWarning(): boolean {
  const session = checkSession();
  
  if (!session.valid || !session.timeRemaining) return false;
  
  return session.timeRemaining <= WARNING_BEFORE_TIMEOUT && !session.warningShown;
}

/**
 * Mark warning as shown
 */
export function markWarningShown(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('session_warning_shown', 'true');
}

/**
 * React hook for session management
 */
export function useSessionManager(options: {
  onExpired?: () => void;
  onWarning?: (timeRemaining: number) => void;
  checkInterval?: number;
} = {}) {
  const {
    onExpired,
    onWarning,
    checkInterval = ACTIVITY_CHECK_INTERVAL,
  } = options;

  const [session, setSession] = React.useState<SessionInfo>({ valid: true });

  React.useEffect(() => {
    // Initialize session
    initSession();

    // Check session periodically
    const interval = setInterval(() => {
      const currentSession = checkSession();
      setSession(currentSession);

      if (!currentSession.valid && onExpired) {
        onExpired();
      } else if (shouldShowWarning() && onWarning && currentSession.timeRemaining) {
        markWarningShown();
        onWarning(currentSession.timeRemaining);
      }
    }, checkInterval);

    return () => {
      clearInterval(interval);
    };
  }, [onExpired, onWarning, checkInterval]);

  return {
    session,
    updateActivity,
    endSession,
    formatTimeRemaining: (ms: number) => formatTimeRemaining(ms),
  };
}

/**
 * Get session statistics
 */
export function getSessionStats(): {
  totalSessions: number;
  averageDuration: number;
  longestSession: number;
} {
  if (typeof window === 'undefined') {
    return { totalSessions: 0, averageDuration: 0, longestSession: 0 };
  }

  const stats = localStorage.getItem('session_stats');
  if (!stats) {
    return { totalSessions: 0, averageDuration: 0, longestSession: 0 };
  }

  return JSON.parse(stats);
}

/**
 * Track session end
 */
export function trackSessionEnd(): void {
  if (typeof window === 'undefined') return;

  const duration = getSessionDuration();
  const stats = getSessionStats();

  stats.totalSessions += 1;
  stats.averageDuration = 
    (stats.averageDuration * (stats.totalSessions - 1) + duration) / stats.totalSessions;
  stats.longestSession = Math.max(stats.longestSession, duration);

  localStorage.setItem('session_stats', JSON.stringify(stats));
}

// For non-React usage
import React from 'react';

// Made with Bob
