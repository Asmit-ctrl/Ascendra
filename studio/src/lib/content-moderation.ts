/**
 * Content Moderation System (FREE)
 * Basic profanity filter and content safety checks
 */

// Basic profanity list (expand as needed)
const PROFANITY_LIST = [
  // Common inappropriate words (add more as needed)
  'badword1',
  'badword2',
  // Add actual words based on your context
];

// Suspicious patterns
const SUSPICIOUS_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
  /https?:\/\/[^\s]+/g, // URLs
  /\b(?:meet|zoom|skype|whatsapp)\b/gi, // Meeting platforms
];

export interface ModerationResult {
  isClean: boolean;
  filtered: string;
  violations: string[];
  warnings: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  suggestions?: string[];
}

/**
 * Moderate content for inappropriate language and patterns
 */
export function moderateContent(text: string): ModerationResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  let filtered = text;
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';

  // Check for profanity
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(text)) {
      violations.push(`Inappropriate language: ${word}`);
      filtered = filtered.replace(regex, '***');
      severity = 'high';
    }
  }

  // Check for suspicious patterns
  const phoneMatch = text.match(SUSPICIOUS_PATTERNS[0]);
  if (phoneMatch) {
    warnings.push('Contains phone number');
    filtered = filtered.replace(SUSPICIOUS_PATTERNS[0], '[PHONE REMOVED]');
    severity = severity === 'none' ? 'medium' : severity;
  }

  const emailMatch = text.match(SUSPICIOUS_PATTERNS[1]);
  if (emailMatch) {
    warnings.push('Contains email address');
    filtered = filtered.replace(SUSPICIOUS_PATTERNS[1], '[EMAIL REMOVED]');
    severity = severity === 'none' ? 'medium' : severity;
  }

  const urlMatch = text.match(SUSPICIOUS_PATTERNS[2]);
  if (urlMatch) {
    warnings.push('Contains URL');
    filtered = filtered.replace(SUSPICIOUS_PATTERNS[2], '[LINK REMOVED]');
    severity = severity === 'none' ? 'low' : severity;
  }

  const meetingMatch = text.match(SUSPICIOUS_PATTERNS[3]);
  if (meetingMatch) {
    warnings.push('Contains meeting platform reference');
    severity = severity === 'none' ? 'low' : severity;
  }

  // Check for excessive caps (potential shouting)
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 10) {
    warnings.push('Excessive use of capital letters');
  }

  // Check for repeated characters (spam-like)
  if (/(.)\1{4,}/.test(text)) {
    warnings.push('Excessive repeated characters');
  }

  const suggestions: string[] = [];
  if (violations.length > 0) {
    suggestions.push('Please use appropriate language');
  }
  if (warnings.length > 0) {
    suggestions.push('Avoid sharing personal information');
  }

  return {
    isClean: violations.length === 0,
    filtered,
    violations,
    warnings,
    severity,
    suggestions,
  };
}

/**
 * Check if content is safe for students
 */
export function isContentSafe(text: string): boolean {
  const result = moderateContent(text);
  return result.isClean && result.severity !== 'high';
}

/**
 * Get moderation summary
 */
export function getModerationSummary(text: string): string {
  const result = moderateContent(text);
  
  if (result.isClean && result.warnings.length === 0) {
    return 'Content is appropriate';
  }

  const parts: string[] = [];
  
  if (result.violations.length > 0) {
    parts.push(`${result.violations.length} violation(s) found`);
  }
  
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }

  return parts.join(', ');
}

/**
 * Log moderation event
 */
export function logModerationEvent(
  userId: string,
  content: string,
  result: ModerationResult
): void {
  if (typeof window === 'undefined') return;

  const event = {
    userId,
    timestamp: new Date().toISOString(),
    severity: result.severity,
    violations: result.violations,
    warnings: result.warnings,
  };

  // Store in localStorage for review
  const key = 'moderation_log';
  const log = JSON.parse(localStorage.getItem(key) || '[]');
  log.push(event);

  // Keep last 100 events
  if (log.length > 100) {
    log.shift();
  }

  localStorage.setItem(key, JSON.stringify(log));

  // Log to console in development
  if (process.env.NODE_ENV === 'development' && result.severity !== 'none') {
    console.warn('🛡️ Moderation event:', event);
  }
}

/**
 * Get moderation log
 */
export function getModerationLog(): any[] {
  if (typeof window === 'undefined') return [];

  const key = 'moderation_log';
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/**
 * Clear moderation log
 */
export function clearModerationLog(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('moderation_log');
}

/**
 * React hook for content moderation
 */
export function useContentModeration() {
  const moderate = (text: string, userId?: string) => {
    const result = moderateContent(text);
    
    if (userId && (result.violations.length > 0 || result.warnings.length > 0)) {
      logModerationEvent(userId, text, result);
    }

    return result;
  };

  return {
    moderate,
    isContentSafe,
    getModerationSummary,
    getLog: getModerationLog,
    clearLog: clearModerationLog,
  };
}

// For non-React usage
import React from 'react';

// Made with Bob
