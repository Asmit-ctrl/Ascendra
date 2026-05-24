/**
 * Authentication API (SECURED)
 * 
 * SECURITY: Phase 3 (P2 - Medium Priority)
 * - Password strength validation
 * - Rate limiting on login/signup
 * - Input length validation
 * - Comprehensive error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  validatePasswordStrength,
  rateLimiter,
  getClientIP,
  sanitizeIdentifier,
  formatDuration,
  validateInputLength,
  INPUT_LIMITS,
} from '@/lib/security-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Validate email format (RFC 5322 compliant)
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  if (email.length > INPUT_LIMITS.email) return false;
  
  const [local, domain] = email.split('@');
  if (local.length > 64) return false;
  
  return true;
}

/**
 * Sign up endpoint
 * SECURITY: Validates password strength and rate limits requests
 */
export async function POST(req: NextRequest) {
  try {
    const clientIP = getClientIP(req.headers);
    const identifier = sanitizeIdentifier(clientIP);

    // SECURITY: Check rate limit
    if (!rateLimiter.isAllowed(identifier, 'signup')) {
      const blockedTime = rateLimiter.getBlockedTime(identifier);
      return NextResponse.json(
        {
          error: 'Too many signup attempts',
          message: `Please try again in ${formatDuration(blockedTime)}`,
          retryAfter: Math.ceil(blockedTime / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(blockedTime / 1000).toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password) {
      rateLimiter.recordAttempt(identifier, 'signup');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate email format
    if (!validateEmail(email)) {
      rateLimiter.recordAttempt(identifier, 'signup');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // SECURITY: Validate email length
    const emailValidation = validateInputLength(email, 'Email', INPUT_LIMITS.email);
    if (!emailValidation.isValid) {
      rateLimiter.recordAttempt(identifier, 'signup');
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    // SECURITY: Validate password strength
    const passwordStrength = validatePasswordStrength(password);
    if (!passwordStrength.isValid) {
      rateLimiter.recordAttempt(identifier, 'signup');
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          details: passwordStrength.errors,
          suggestions: passwordStrength.suggestions,
        },
        { status: 400 }
      );
    }

    // SECURITY: Validate name length if provided
    if (name) {
      const nameValidation = validateInputLength(name, 'Name', INPUT_LIMITS.name, 1);
      if (!nameValidation.isValid) {
        rateLimiter.recordAttempt(identifier, 'signup');
        return NextResponse.json(
          { error: nameValidation.error },
          { status: 400 }
        );
      }
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Attempt signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || null,
        },
      },
    });

    if (error) {
      rateLimiter.recordAttempt(identifier, 'signup');
      console.error('[INTERNAL] Signup error:', error);
      
      // Don't expose internal error details
      if (error.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Unable to create account. Please try again.' },
        { status: 400 }
      );
    }

    // Success - reset rate limit for this user
    rateLimiter.reset(identifier);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: data.user,
        session: data.session,
      },
    });
  } catch (error) {
    console.error('[INTERNAL] Signup error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * Login endpoint
 * SECURITY: Rate limits login attempts to prevent brute force
 */
export async function PUT(req: NextRequest) {
  try {
    const clientIP = getClientIP(req.headers);
    const identifier = sanitizeIdentifier(clientIP);

    // SECURITY: Check rate limit
    if (!rateLimiter.isAllowed(identifier, 'login')) {
      const blockedTime = rateLimiter.getBlockedTime(identifier);
      return NextResponse.json(
        {
          error: 'Too many login attempts',
          message: `Please try again in ${formatDuration(blockedTime)}`,
          retryAfter: Math.ceil(blockedTime / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(blockedTime / 1000).toString(),
          },
        }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      rateLimiter.recordAttempt(identifier, 'login');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate email format
    if (!validateEmail(email)) {
      rateLimiter.recordAttempt(identifier, 'login');
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      rateLimiter.recordAttempt(identifier, 'login');
      console.error('[INTERNAL] Login error:', error);
      
      // Generic error message to prevent user enumeration
      const remaining = rateLimiter.getRemainingAttempts(identifier, 'login');
      return NextResponse.json(
        {
          error: 'Invalid email or password',
          attemptsRemaining: remaining,
        },
        { status: 401 }
      );
    }

    // Success - reset rate limit for this user
    rateLimiter.reset(identifier);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: data.user,
        session: data.session,
      },
    });
  } catch (error) {
    console.error('[INTERNAL] Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * Get rate limit status
 * Allows clients to check their rate limit status
 */
export async function GET(req: NextRequest) {
  try {
    const clientIP = getClientIP(req.headers);
    const identifier = sanitizeIdentifier(clientIP);

    const loginRemaining = rateLimiter.getRemainingAttempts(identifier, 'login');
    const signupRemaining = rateLimiter.getRemainingAttempts(identifier, 'signup');
    const loginBlocked = rateLimiter.getBlockedTime(identifier);

    return NextResponse.json({
      success: true,
      rateLimit: {
        login: {
          remaining: loginRemaining,
          blocked: loginBlocked > 0,
          blockedUntil: loginBlocked > 0 ? Date.now() + loginBlocked : null,
        },
        signup: {
          remaining: signupRemaining,
        },
      },
    });
  } catch (error) {
    console.error('[INTERNAL] Rate limit check error:', error);
    return NextResponse.json(
      { error: 'Unable to check rate limit status' },
      { status: 500 }
    );
  }
}

// Security fixes implemented by Bob - Phase 3 (P2)

// Made with Bob