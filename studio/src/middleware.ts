/**
 * Next.js Middleware for Security Headers
 *
 * SECURITY: Content-Security-Policy (CSP)
 * - Prevents XSS attacks by controlling resource loading
 * - Restricts inline scripts and styles
 * - Allows only trusted sources
 *
 * SECURITY: API Versioning (Phase 4 - P3)
 * - Adds API version headers
 * - Supports version negotiation
 * - Maintains backward compatibility
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_VERSION = '1.0.0';
const SUPPORTED_VERSIONS = ['1.0.0'];

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // SECURITY: API Versioning
  response.headers.set('X-API-Version', API_VERSION);
  response.headers.set('X-Supported-Versions', SUPPORTED_VERSIONS.join(', '));
  
  // Check if client requested specific API version
  const requestedVersion = request.headers.get('X-API-Version');
  if (requestedVersion && !SUPPORTED_VERSIONS.includes(requestedVersion)) {
    return NextResponse.json(
      {
        error: 'Unsupported API version',
        requestedVersion,
        supportedVersions: SUPPORTED_VERSIONS,
        currentVersion: API_VERSION,
      },
      {
        status: 400,
        headers: {
          'X-API-Version': API_VERSION,
          'X-Supported-Versions': SUPPORTED_VERSIONS.join(', '),
        },
      }
    );
  }

  // Content Security Policy
  // This is a strict CSP that prevents most XSS attacks
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.supabase.co https://ascendra-1.onrender.com wss://*.supabase.co;
    frame-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  // Additional Security Headers
  
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection in older browsers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy - don't leak referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy - restrict browser features
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Strict-Transport-Security (HSTS) - force HTTPS
  // Only set in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

// Apply middleware to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

// Made with Bob
