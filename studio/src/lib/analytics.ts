/**
 * Simple Analytics System (FREE)
 * Uses localStorage for basic event tracking
 */

interface Event {
  name: string;
  properties?: Record<string, any>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

interface AnalyticsSummary {
  totalEvents: number;
  eventCounts: Record<string, number>;
  recentEvents: Event[];
  uniqueUsers: number;
  sessionsCount: number;
}

const STORAGE_KEY = 'analytics';
const MAX_EVENTS = 1000;
const SESSION_KEY = 'analytics_session';

/**
 * Get or create session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Track an event
 */
export function trackEvent(
  name: string,
  properties?: Record<string, any>,
  userId?: string
): void {
  if (typeof window === 'undefined') return;

  const event: Event = {
    name,
    properties,
    timestamp: new Date().toISOString(),
    userId,
    sessionId: getSessionId(),
  };

  // Store locally
  const events = getStoredEvents();
  events.push(event);
  
  // Keep last MAX_EVENTS events
  if (events.length > MAX_EVENTS) {
    events.shift();
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 Event:', name, properties);
  }
}

/**
 * Get stored events
 */
function getStoredEvents(): Event[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to parse analytics:', error);
    return [];
  }
}

/**
 * Get analytics summary
 */
export function getAnalytics(): AnalyticsSummary {
  const events = getStoredEvents();
  
  // Group by event name
  const eventCounts = events.reduce((acc: Record<string, number>, event: Event) => {
    acc[event.name] = (acc[event.name] || 0) + 1;
    return acc;
  }, {});

  // Count unique users
  const uniqueUsers = new Set(
    events.filter(e => e.userId).map(e => e.userId)
  ).size;

  // Count unique sessions
  const sessionsCount = new Set(
    events.map(e => e.sessionId)
  ).size;

  return {
    totalEvents: events.length,
    eventCounts,
    recentEvents: events.slice(-10),
    uniqueUsers,
    sessionsCount,
  };
}

/**
 * Get events by name
 */
export function getEventsByName(name: string): Event[] {
  const events = getStoredEvents();
  return events.filter(e => e.name === name);
}

/**
 * Get events by user
 */
export function getEventsByUser(userId: string): Event[] {
  const events = getStoredEvents();
  return events.filter(e => e.userId === userId);
}

/**
 * Get events in date range
 */
export function getEventsByDateRange(startDate: Date, endDate: Date): Event[] {
  const events = getStoredEvents();
  return events.filter(e => {
    const eventDate = new Date(e.timestamp);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Clear all analytics data
 */
export function clearAnalytics(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Analytics cleared');
}

/**
 * Export analytics data
 */
export function exportAnalytics(): string {
  const events = getStoredEvents();
  return JSON.stringify(events, null, 2);
}

/**
 * Common event tracking helpers
 */
export const Analytics = {
  // Page views
  pageView: (page: string, userId?: string) => {
    trackEvent('page_view', { page }, userId);
  },

  // User actions
  buttonClick: (buttonName: string, userId?: string) => {
    trackEvent('button_click', { buttonName }, userId);
  },

  // Learning events
  lessonStarted: (subject: string, grade: string, userId?: string) => {
    trackEvent('lesson_started', { subject, grade }, userId);
  },

  lessonCompleted: (subject: string, grade: string, duration: number, userId?: string) => {
    trackEvent('lesson_completed', { subject, grade, duration }, userId);
  },

  quizStarted: (subject: string, grade: string, userId?: string) => {
    trackEvent('quiz_started', { subject, grade }, userId);
  },

  quizCompleted: (subject: string, grade: string, score: number, userId?: string) => {
    trackEvent('quiz_completed', { subject, grade, score }, userId);
  },

  // AI interactions
  aiQuestionAsked: (subject: string, userId?: string) => {
    trackEvent('ai_question_asked', { subject }, userId);
  },

  aiResponseReceived: (subject: string, responseTime: number, userId?: string) => {
    trackEvent('ai_response_received', { subject, responseTime }, userId);
  },

  // Errors
  error: (errorType: string, errorMessage: string, userId?: string) => {
    trackEvent('error', { errorType, errorMessage }, userId);
  },

  // Feature usage
  featureUsed: (featureName: string, userId?: string) => {
    trackEvent('feature_used', { featureName }, userId);
  },
};

/**
 * React hook for analytics
 */
export function useAnalytics() {
  const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);

  React.useEffect(() => {
    setSummary(getAnalytics());
  }, []);

  const refresh = () => {
    setSummary(getAnalytics());
  };

  return {
    summary,
    refresh,
    track: trackEvent,
    Analytics,
  };
}

// For non-React usage
import React from 'react';

// Made with Bob
