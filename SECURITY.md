# Security Documentation

## Overview

This document outlines the security measures implemented in the Ascendra platform to protect user data and prevent common vulnerabilities.

## Security Measures Implemented

### Phase 1: Critical Security Issues (P0) ✅

#### 1. IDOR (Insecure Direct Object Reference)
**Status:** Fixed  
**Location:** `studio/src/app/api/referral/route.ts`

**Issue:** Users could access other users' referral data by manipulating the `referrerId` parameter.

**Fix:**
- Added authentication checks using Supabase auth
- Use authenticated user ID from session instead of client-provided ID
- Verify ownership before allowing access to resources

**Code Example:**
```typescript
// Before (VULNERABLE)
const referrerId = searchParams.get('referrerId');

// After (SECURED)
const user = await getAuthenticatedUser(supabase);
const referrerId = user.id; // Use session user ID
```

#### 2. Mass Assignment
**Status:** Fixed  
**Location:** `studio/src/app/api/referral/route.ts`

**Issue:** Attackers could modify unauthorized fields by including them in request body.

**Fix:**
- Verify ownership before updates
- Validate status transitions (business logic)
- Only allow specific fields to be updated
- Add audit trail (created_by, updated_by)

### Phase 2: High Priority Security Issues (P1) ✅

#### 3. XSS (Cross-Site Scripting)
**Status:** Fixed  
**Locations:** 
- `studio/src/lib/content-moderation.ts`
- `studio/src/middleware.ts`

**Issue:** User-generated content could contain malicious scripts.

**Fix:**
- Installed DOMPurify for HTML sanitization
- Sanitize all user content before storage
- Added Content-Security-Policy headers
- Remove dangerous HTML/JavaScript patterns

**Code Example:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeContent(text: string): string {
  const config = {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  };
  return DOMPurify.sanitize(text, config);
}
```

#### 4. Session Fixation
**Status:** Fixed  
**Location:** `studio/src/lib/session-manager.ts`

**Issue:** Attackers could hijack user sessions by setting session IDs.

**Fix:**
- Generate unique session IDs on login (UUID v4)
- Rotate session IDs on privilege escalation
- Enforce 24-hour maximum session age
- Validate session ID format

#### 5. NoSQL Injection
**Status:** Fixed  
**Location:** `studio/src/lib/analytics.ts`

**Issue:** Unsanitized query parameters could manipulate database queries.

**Fix:**
- Validate all UUIDs before queries
- Sanitize event names and properties
- Use strict equality checks
- Limit input lengths

#### 6. CSRF (Cross-Site Request Forgery)
**Status:** Fixed  
**Location:** `studio/src/app/api/referral/route.ts`

**Issue:** Attackers could perform unauthorized actions on behalf of users.

**Fix:**
- Generate cryptographically secure CSRF tokens
- Validate tokens on POST/PATCH/DELETE requests
- Use timing-safe comparison
- Set SameSite=Strict cookie attribute

### Phase 3: Medium Priority Security Issues (P2) ✅

#### 7. Weak Password Policy
**Status:** Fixed  
**Location:** `studio/src/lib/security-utils.ts`

**Issue:** No password strength requirements allowed weak passwords.

**Fix:**
- Minimum 12 characters
- Require uppercase, lowercase, numbers, special characters
- Detect common patterns (123456, password, etc.)
- Password strength scoring (0-100)

**Password Requirements:**
- ✅ Minimum 12 characters
- ✅ At least one uppercase letter
- ✅ At least one lowercase letter
- ✅ At least one number
- ✅ At least one special character
- ❌ No common patterns or dictionary words

#### 8. Missing Rate Limiting on Auth
**Status:** Fixed  
**Locations:**
- `studio/src/lib/security-utils.ts`
- `studio/src/app/api/auth/route.ts`

**Issue:** No protection against brute force attacks.

**Fix:**
- Login: 5 attempts per 15 minutes, 30-minute block
- Signup: 3 attempts per hour, 1-hour block
- API: 100 requests per minute, 5-minute block
- Automatic cleanup of old records

#### 9. IDOR in Analytics
**Status:** Fixed  
**Location:** `studio/src/lib/analytics.ts`

**Issue:** Users could access other users' analytics data.

**Fix:**
- Added authorization checks
- Users can only access their own data
- UUID validation for all user IDs
- Optional filtering by current user

#### 10. Missing Input Length Validation
**Status:** Fixed  
**Location:** `studio/src/lib/security-utils.ts`

**Issue:** No limits on input lengths could cause buffer overflow or DoS.

**Fix:**
- Email: 254 characters (RFC 5322)
- Name: 100 characters
- Password: 12-128 characters
- Text: 500 characters
- Long text: 5000 characters
- URL: 2048 characters

### Phase 4: Low Priority Security Issues (P3) ✅

#### 11. Missing Logging and Monitoring
**Status:** Fixed  
**Location:** `studio/src/lib/security-logger.ts`

**Issue:** No audit trail for security events.

**Fix:**
- Comprehensive security event logging
- Track authentication, authorization, and suspicious activities
- Alert on critical events
- Export logs for analysis

**Logged Events:**
- Authentication (success/failure/lockout)
- Session management
- Rate limit violations
- CSRF token failures
- XSS attempts
- Unauthorized access
- Suspicious activities

#### 12. Account Lockout Policy
**Status:** Implemented  
**Location:** `studio/src/lib/security-utils.ts`

**Issue:** No automatic account lockout after failed attempts.

**Fix:**
- Automatic lockout after 5 failed login attempts
- 30-minute lockout duration
- Progressive delays between attempts
- Security event logging

#### 13. Security Headers
**Status:** Implemented  
**Location:** `studio/src/middleware.ts`

**Headers Added:**
- `Content-Security-Policy`: Prevents XSS attacks
- `X-Frame-Options`: Prevents clickjacking
- `X-Content-Type-Options`: Prevents MIME sniffing
- `X-XSS-Protection`: Browser XSS protection
- `Referrer-Policy`: Controls referrer information
- `Permissions-Policy`: Restricts browser features
- `Strict-Transport-Security`: Forces HTTPS (production)

## Security Best Practices

### For Developers

1. **Always validate input**
   - Check data types, formats, and lengths
   - Sanitize user-generated content
   - Use allowlists instead of blocklists

2. **Use parameterized queries**
   - Never concatenate user input into queries
   - Use ORM/query builders with parameter binding

3. **Implement proper authentication**
   - Use secure session management
   - Rotate session IDs on privilege changes
   - Implement multi-factor authentication (future)

4. **Follow principle of least privilege**
   - Users should only access their own data
   - Verify ownership before operations
   - Use role-based access control

5. **Keep dependencies updated**
   - Regularly run `npm audit`
   - Update packages with security patches
   - Monitor security advisories

### For Users

1. **Use strong passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Avoid common words and patterns
   - Use a password manager

2. **Enable two-factor authentication** (when available)

3. **Be cautious of phishing**
   - Verify URLs before entering credentials
   - Don't click suspicious links
   - Report suspicious emails

4. **Keep software updated**
   - Update browser regularly
   - Enable automatic updates
   - Use latest OS version

## Security Testing

### Manual Testing Checklist

- [ ] Test authentication with invalid credentials
- [ ] Attempt to access other users' data
- [ ] Try SQL injection in input fields
- [ ] Test XSS with `<script>alert('XSS')</script>`
- [ ] Verify CSRF protection on state-changing operations
- [ ] Test rate limiting by making rapid requests
- [ ] Check session expiration
- [ ] Verify password strength requirements

### Automated Testing

```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated

# Run tests
npm test
```

## Incident Response

### If you discover a security vulnerability:

1. **Do NOT** disclose publicly
2. Email security@ascendra.com with details
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **24 hours**: Initial acknowledgment
- **7 days**: Assessment and triage
- **30 days**: Fix deployed (for critical issues)
- **90 days**: Public disclosure (coordinated)

## Security Contacts

- **Security Team**: security@ascendra.com
- **Bug Bounty**: Coming soon
- **PGP Key**: Available on request

## Compliance

### Data Protection

- GDPR compliant (EU)
- CCPA compliant (California)
- Data encryption at rest and in transit
- Regular security audits

### Standards

- OWASP Top 10 compliance
- CWE/SANS Top 25 mitigation
- NIST Cybersecurity Framework alignment

## Security Roadmap

### Q2 2026
- [x] Fix critical vulnerabilities (P0)
- [x] Implement rate limiting
- [x] Add CSRF protection
- [x] Enhance password policy

### Q3 2026
- [ ] Implement multi-factor authentication
- [ ] Add security headers
- [ ] Set up automated security scanning
- [ ] Conduct penetration testing

### Q4 2026
- [ ] Implement Web Application Firewall (WAF)
- [ ] Add intrusion detection system
- [ ] Set up security information and event management (SIEM)
- [ ] Obtain security certifications

## Resources

### Internal Documentation
- [API Security Guide](./docs/api-security.md)
- [Authentication Flow](./docs/authentication.md)
- [Data Protection Policy](./docs/data-protection.md)

### External Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Changelog

### 2026-05-24
- ✅ Fixed IDOR vulnerability in referral API
- ✅ Fixed Mass Assignment vulnerability
- ✅ Implemented XSS protection with DOMPurify
- ✅ Added Session Fixation protection
- ✅ Fixed NoSQL Injection in analytics
- ✅ Implemented CSRF protection
- ✅ Added password strength validation
- ✅ Implemented rate limiting on authentication
- ✅ Added authorization checks to analytics
- ✅ Implemented comprehensive input validation
- ✅ Added security event logging
- ✅ Implemented account lockout policy
- ✅ Added security headers via middleware

---

**Last Updated:** 2026-05-24  
**Version:** 1.0.0  
**Maintained by:** Bob (Security Team)

// Made with Bob