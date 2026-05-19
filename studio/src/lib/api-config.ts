/**
 * API Configuration
 * 
 * Centralized configuration for backend API endpoints.
 * This ensures consistent error handling and prevents localhost fallbacks in production.
 */

/**
 * Get the AI Agents backend URL
 * 
 * In production, this MUST be set via NEXT_PUBLIC_AI_AGENTS_URL environment variable.
 * In development, falls back to localhost.
 * 
 * @throws Error if URL is not configured in production
 */
export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_AI_AGENTS_URL;
  
  // In production, require the environment variable
  if (process.env.NODE_ENV === 'production' && !url) {
    throw new Error(
      'NEXT_PUBLIC_AI_AGENTS_URL environment variable is not set. ' +
      'Please configure the backend URL in your deployment settings.'
    );
  }
  
  // In development, allow localhost fallback
  return url || 'http://localhost:8001';
}

/**
 * Get WebSocket URL for real-time features
 * Converts HTTP(S) URL to WS(S) URL
 */
export function getWebSocketUrl(): string {
  const httpUrl = getApiUrl();
  return httpUrl.replace(/^http/, 'ws');
}

/**
 * Check if backend is configured
 */
export function isBackendConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_AI_AGENTS_URL;
}

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Agent endpoints
  AGENTS_CHAT: '/agents/chat',
  
  // Dashboard endpoints
  DASHBOARD_AGENTS_STATS: '/dashboard/agents/stats',
  DASHBOARD_STUDENTS_ACTIVE: '/dashboard/students/active',
  DASHBOARD_STUDENTS_PROGRESS: (studentId: string) => `/dashboard/students/${studentId}/progress`,
  DASHBOARD_INTERVENTIONS: '/dashboard/interventions',
  DASHBOARD_WS_TEACHER: '/dashboard/ws/teacher',
  
  // Telemetry endpoints
  TELEMETRY_CAPTURE: '/telemetry/capture',
} as const;

/**
 * Build full API URL
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiUrl();
  return `${baseUrl}${endpoint}`;
}

/**
 * Build WebSocket URL
 */
export function buildWebSocketUrl(endpoint: string): string {
  const baseUrl = getWebSocketUrl();
  return `${baseUrl}${endpoint}`;
}
