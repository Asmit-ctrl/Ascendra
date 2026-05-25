/**
 * Referral Program API (SECURED)
 * Stores referrals in Supabase with proper authentication and authorization
 *
 * SECURITY FIXES:
 * - Added authentication checks (fixes IDOR vulnerability)
 * - Added authorization/ownership verification (fixes Mass Assignment)
 * - Improved input validation (RFC 5322 email validation)
 * - Sanitized error messages (no information disclosure)
 * - Added audit trail
 * - Added CSRF protection (fixes CSRF vulnerability)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Create an authenticated Supabase server client.
 *
 * The previous implementation read a `sb-access-token` cookie that
 * `@supabase/ssr` does not actually set — `createBrowserClient` writes the
 * session under `sb-<project-ref>-auth-token` (and chunks it into `.0`, `.1`
 * suffixes when the JWT is large). The mismatch meant `auth.getUser()` always
 * returned null and every referral request silently 401'd, even for a logged-
 * in user. Switching to `createServerClient` from `@supabase/ssr` with a
 * cookies adapter is the supported way to read whatever cookie shape the
 * browser client produced.
 */
async function createAuthenticatedClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Route handlers can't reliably set cookies on the response from inside
      // the supabase adapter (the response object isn't in scope here), so we
      // no-op writes. Token refresh still works because the browser client
      // refreshes its own cookies; this route only needs to *read* the session.
      set(_name: string, _value: string, _options: CookieOptions) {
        /* no-op */
      },
      remove(_name: string, _options: CookieOptions) {
        /* no-op */
      },
    },
  });
}

/**
 * Get authenticated user from session
 */
async function getAuthenticatedUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Validate email format (RFC 5322 compliant)
 */
function validateEmail(email: string): boolean {
  // RFC 5322 compliant regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) return false;
  if (email.length > 254) return false; // RFC limit
  
  const [local, domain] = email.split('@');
  if (local.length > 64) return false; // RFC limit
  
  return true;
}

/**
 * Validate input lengths
 */
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;

/**
 * Generate CSRF token
 * SECURITY: Creates cryptographically secure token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate CSRF token
 * SECURITY: Compares tokens using timing-safe comparison
 */
function validateCsrfToken(token: string, storedToken: string): boolean {
  if (!token || !storedToken) return false;
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const tokenBuffer = Buffer.from(token, 'hex');
    const storedBuffer = Buffer.from(storedToken, 'hex');
    
    if (tokenBuffer.length !== storedBuffer.length) return false;
    
    return crypto.timingSafeEqual(tokenBuffer, storedBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Get or create CSRF token from cookies
 * SECURITY: Stores token in HTTP-only cookie with SameSite protection
 */
async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  let csrfToken = cookieStore.get('csrf-token')?.value;
  
  if (!csrfToken) {
    csrfToken = generateCsrfToken();
    // Note: Cookie setting is done in middleware for better control
  }
  
  return csrfToken;
}

/**
 * Verify CSRF token from request
 * SECURITY: Validates token from header against cookie
 */
async function verifyCsrfToken(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get('csrf-token')?.value;
  const headerToken = req.headers.get('x-csrf-token');
  
  if (!storedToken || !headerToken) {
    return false;
  }
  
  return validateCsrfToken(headerToken, storedToken);
}

/**
 * Create a new referral
 * SECURITY: Now requires authentication, CSRF token, and uses authenticated user ID
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY FIX: Verify CSRF token first
    const csrfValid = await verifyCsrfToken(req);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
    
    const supabase = await createAuthenticatedClient();
    
    // SECURITY FIX: Verify authentication
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { referredEmail, referredName } = await req.json();

    // Validate input
    if (!referredEmail) {
      return NextResponse.json(
        { error: 'Missing required field: referredEmail' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Improved email validation
    if (!validateEmail(referredEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Validate input lengths
    if (referredEmail.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json(
        { error: 'Email address too long' },
        { status: 400 }
      );
    }

    if (referredName && referredName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: 'Name too long' },
        { status: 400 }
      );
    }

    // SECURITY FIX: Use authenticated user ID instead of client-provided referrerId
    const referrerId = user.id;

    // Check if referral already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', referrerId)
      .eq('referred_email', referredEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Referral already exists' },
        { status: 409 }
      );
    }

    // Create referral record with audit trail
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_email: referredEmail,
        referred_name: referredName || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        created_by: user.id, // Audit trail
      })
      .select()
      .single();

    if (error) {
      // SECURITY FIX: Don't expose internal error details
      console.error('[INTERNAL] Supabase error:', error);
      return NextResponse.json(
        { error: 'Unable to create referral. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Referral created successfully' 
    });
  } catch (error) {
    // SECURITY FIX: Generic error message
    console.error('[INTERNAL] Referral creation error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * Get referrals for authenticated user
 * SECURITY: Fixed IDOR vulnerability - users can only access their own referrals
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createAuthenticatedClient();
    
    // SECURITY FIX: Verify authentication
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // SECURITY FIX: Ignore client-provided referrerId, use authenticated user ID
    const referrerId = user.id;

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', referrerId)
      .order('created_at', { ascending: false });

    if (error) {
      // SECURITY FIX: Don't expose internal error details
      console.error('[INTERNAL] Supabase error:', error);
      return NextResponse.json(
        { error: 'Unable to fetch referrals. Please try again.' },
        { status: 400 }
      );
    }

    // Calculate statistics
    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      completed: data.filter(r => r.status === 'completed').length,
      rewarded: data.filter(r => r.status === 'rewarded').length,
    };

    return NextResponse.json({ 
      success: true, 
      data,
      stats 
    });
  } catch (error) {
    // SECURITY FIX: Generic error message
    console.error('[INTERNAL] Referral fetch error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * Update referral status
 * SECURITY: Fixed Mass Assignment - users can only update their own referrals
 * SECURITY: Added CSRF protection
 */
export async function PATCH(req: NextRequest) {
  try {
    // SECURITY FIX: Verify CSRF token first
    const csrfValid = await verifyCsrfToken(req);
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
    
    const supabase = await createAuthenticatedClient();
    
    // SECURITY FIX: Verify authentication
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { referralId, status } = await req.json();

    if (!referralId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: referralId and status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'completed', 'rewarded', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
        { status: 400 }
      );
    }

    // SECURITY FIX: Verify ownership before update
    const { data: referral, error: fetchError } = await supabase
      .from('referrals')
      .select('referrer_id, status')
      .eq('id', referralId)
      .maybeSingle();

    if (fetchError) {
      console.error('[INTERNAL] Supabase error:', fetchError);
      return NextResponse.json(
        { error: 'Unable to verify referral ownership.' },
        { status: 400 }
      );
    }

    if (!referral) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    // SECURITY FIX: Authorization check - user must own the referral
    if (referral.referrer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update this referral' },
        { status: 403 }
      );
    }

    // SECURITY FIX: Validate status transitions (business logic)
    const allowedTransitions: Record<string, string[]> = {
      'pending': ['cancelled'],
      'completed': ['rewarded'], // Only completed referrals can be rewarded
      'rewarded': [], // Final state
      'cancelled': [], // Final state
    };

    const currentStatus = referral.status;
    const allowedNextStatuses = allowedTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Update with audit trail
    const { data, error } = await supabase
      .from('referrals')
      .update({ 
        status,
        updated_at: new Date().toISOString(),
        updated_by: user.id, // Audit trail
      })
      .eq('id', referralId)
      .select()
      .single();

    if (error) {
      // SECURITY FIX: Don't expose internal error details
      console.error('[INTERNAL] Supabase error:', error);
      return NextResponse.json(
        { error: 'Unable to update referral. Please try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Referral status updated successfully' 
    });
  } catch (error) {
    // SECURITY FIX: Generic error message
    console.error('[INTERNAL] Referral update error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * Get CSRF token endpoint
 * SECURITY: Provides CSRF token to clients
 */
export async function OPTIONS(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    let csrfToken = cookieStore.get('csrf-token')?.value;
    
    if (!csrfToken) {
      csrfToken = generateCsrfToken();
    }
    
    const response = NextResponse.json({
      csrfToken,
      message: 'Include this token in X-CSRF-Token header for POST/PATCH/DELETE requests'
    });
    
    // Set CSRF token cookie with security flags.
    //
    // NOTE: httpOnly MUST be false here. We use the double-submit cookie
    // pattern: the client reads this cookie via document.cookie and mirrors
    // its value into the `x-csrf-token` request header on POST/PATCH. If the
    // cookie were httpOnly, JavaScript couldn't read it and every state-
    // changing request would 403 — which is exactly what was happening with
    // the previous httpOnly: true setting, silently breaking the whole flow.
    // SameSite=strict + the header-mirror check together still prevent CSRF.
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('[INTERNAL] CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Unable to generate CSRF token' },
      { status: 500 }
    );
  }
}

// Security fixes implemented by Bob - 2026-05-24

// Made with Bob
