/**
 * Content Moderation System (FREE)
 * Basic profanity filter and content safety checks
 *
 * Security: XSS Protection with DOMPurify
 * - Sanitizes all user content before storage
 * - Prevents script injection attacks
 * - Removes dangerous HTML/JavaScript
 */

import DOMPurify from 'isomorphic-dompurify';

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
 * Sanitize content to prevent XSS attacks
 * Removes all HTML tags and dangerous content
 */
export function sanitizeContent(text: string): string {
  if (!text) return '';
  
  // Configure DOMPurify to be strict
  const config = {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  };
  
  // Sanitize the content
  const sanitized = DOMPurify.sanitize(text, config);
  
  // Additional sanitization: remove any remaining script-like patterns
  return sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Moderate content for inappropriate language and patterns
 * Now includes XSS protection via sanitization
 */
export function moderateContent(text: string): ModerationResult {
  const violations: string[] = [];
  const warnings: string[] = [];
  
  // SECURITY: Sanitize input first to prevent XSS
  const sanitized = sanitizeContent(text);
  let filtered = sanitized;
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  
  // Check if content was modified during sanitization (potential XSS attempt)
  if (sanitized !== text) {
    violations.push('Potentially dangerous content detected and removed');
    severity = 'high';
  }

  // Check for profanity (use sanitized text)
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(sanitized)) {
      violations.push(`Inappropriate language detected`);
      filtered = filtered.replace(regex, '***');
      severity = 'high';
    }
  }

  // Check for suspicious patterns (use sanitized text)
  const phoneMatch = sanitized.match(SUSPICIOUS_PATTERNS[0]);
  if (phoneMatch) {
    warnings.push('Contains phone number');
    filtered = filtered.replace(SUSPICIOUS_PATTERNS[0], '[PHONE REMOVED]');
    severity = severity === 'none' ? 'medium' : severity;
  }

  const emailMatch = sanitized.match(SUSPICIOUS_PATTERNS[1]);
  if (emailMatch) {
    warnings.push('Contains email address');
    filtered = filtered.replace(SUSPICIOUS_PATTERNS[1], '[EMAIL REMOVED]');
    severity = severity === 'none' ? 'medium' : severity;
  }

  const urlMatch = sanitized.match(SUSPICIOUS_PATTERNS[2]);
  if (urlMatch) {
    warnings.push('Contains URL');
    filtered = filtered.replace(SUSPICIOUS_PATTERNS[2], '[LINK REMOVED]');
    severity = severity === 'none' ? 'low' : severity;
  }

  const meetingMatch = sanitized.match(SUSPICIOUS_PATTERNS[3]);
  if (meetingMatch) {
    warnings.push('Contains meeting platform reference');
    severity = severity === 'none' ? 'low' : severity;
  }

  // Check for excessive caps (potential shouting)
  const capsRatio = (sanitized.match(/[A-Z]/g) || []).length / sanitized.length;
  if (capsRatio > 0.5 && sanitized.length > 10) {
    warnings.push('Excessive use of capital letters');
  }

  // Check for repeated characters (spam-like)
  if (/(.)\1{4,}/.test(sanitized)) {
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
 * SECURITY: Sanitizes content before logging to prevent XSS in logs
 */
export function logModerationEvent(
  userId: string,
  content: string,
  result: ModerationResult
): void {
  if (typeof window === 'undefined') return;

  // SECURITY: Sanitize userId to prevent injection
  const sanitizedUserId = sanitizeContent(userId);
  
  // SECURITY: Don't store raw content, only sanitized version
  const event = {
    userId: sanitizedUserId,
    timestamp: new Date().toISOString(),
    severity: result.severity,
    violations: result.violations,
    warnings: result.warnings,
    // Store hash of content instead of actual content for privacy
    contentHash: hashContent(content),
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
 * Simple hash function for content (for privacy in logs)
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
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
 * SECURITY: All content is sanitized before processing
 */
export function useContentModeration() {
  const moderate = (text: string, userId?: string) => {
    // SECURITY: Sanitize input first
    const sanitized = sanitizeContent(text);
    const result = moderateContent(sanitized);
    
    if (userId && (result.violations.length > 0 || result.warnings.length > 0)) {
      logModerationEvent(userId, sanitized, result);
    }

    return result;
  };

  return {
    moderate,
    sanitize: sanitizeContent,
    isContentSafe,
    getModerationSummary,
    getLog: getModerationLog,
    clearLog: clearModerationLog,
  };
}

// For non-React usage
import React from 'react';

// Made with Bob
