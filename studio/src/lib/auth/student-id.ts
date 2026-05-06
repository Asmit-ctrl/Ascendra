/**
 * Resolves the current student's ID. Reads from localStorage when running in
 * the browser; falls back to 'user1' for SSR / unauthenticated demo flows.
 *
 * This is a stop-gap until real auth is wired in. Once a session/JWT is
 * available, replace these reads with the real source of truth.
 */

const FALLBACK_STUDENT_ID = 'user1';
const STORAGE_KEYS = ['studentId', 'userId'] as const;

export function getStudentId(): string {
  if (typeof window === 'undefined') return FALLBACK_STUDENT_ID;
  for (const key of STORAGE_KEYS) {
    const value = window.localStorage.getItem(key);
    if (value && value.trim().length > 0) return value;
  }
  return FALLBACK_STUDENT_ID;
}

export { FALLBACK_STUDENT_ID };
