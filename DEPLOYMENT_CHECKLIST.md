# Deployment Checklist

## Pre-Deployment

### Code Quality
- [x] All TypeScript errors resolved
- [x] Build succeeds locally (`npm run build`)
- [x] Type checking passes (`npm run typecheck`)
- [x] No console errors in development
- [x] Performance optimizations implemented
- [x] Network retry logic added

### Testing
- [ ] Test scheme generation workflow
- [ ] Test hierarchical lesson selection (Scheme → Week → Lesson)
- [ ] Test network resilience (throttle to Slow 3G)
- [ ] Test on mobile devices
- [ ] Test authentication flow
- [ ] Test API endpoints

### Environment Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in all required environment variables
- [ ] Verify backend URL is correct
- [ ] Test local build: `npm run build && npm start`

## Vercel Deployment

### 1. Repository Setup
- [ ] Code pushed to GitHub
- [ ] Branch protection rules configured (optional)
- [ ] `.gitignore` includes `.env.local`

### 2. Vercel Project Setup
- [ ] Import project from GitHub
- [ ] Set root directory to `studio` (if needed)
- [ ] Configure build settings:
  - Framework: Next.js
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

### 3. Environment Variables (Vercel Dashboard)

#### Required (Critical)
- [ ] `NEXT_PUBLIC_AI_AGENTS_URL` = `https://ascendra-1.onrender.com`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key
- [ ] `GROQ_API_KEY` = Your Groq API key

#### Recommended (Production)
- [ ] `UPSTASH_REDIS_REST_URL` = Your Upstash Redis URL
- [ ] `UPSTASH_REDIS_REST_TOKEN` = Your Upstash Redis token
- [ ] `NEXT_PUBLIC_SENTRY_DSN` = Your Sentry DSN
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` = Your PostHog key

#### Optional (Enhanced Features)
- [ ] M-Pesa credentials (if using payments)
- [ ] Stripe credentials (if using payments)
- [ ] ElevenLabs API key (if using enhanced TTS)

### 4. Deploy
- [ ] Click "Deploy" button
- [ ] Wait for build to complete (~3-5 minutes)
- [ ] Check build logs for errors

## Post-Deployment Verification

### 1. Basic Functionality
- [ ] Homepage loads: `https://your-project.vercel.app`
- [ ] No console errors in browser
- [ ] Authentication works
- [ ] Dashboard loads

### 2. Core Features
- [ ] Navigate to Teacher Dashboard
- [ ] Go to "Schemes of Work" tab
- [ ] Generate a new scheme
- [ ] Verify scheme saves successfully
- [ ] Switch to "Lesson Plans from Scheme" tab
- [ ] Verify scheme appears in list
- [ ] Click on scheme
- [ ] Select week from dropdown
- [ ] Select lesson from dropdown
- [ ] Generate lesson plan
- [ ] Verify lesson plan dialog opens

### 3. Network Resilience
- [ ] Open Chrome DevTools → Network tab
- [ ] Throttle to "Slow 3G"
- [ ] Generate a scheme
- [ ] Verify retry logic works (check console)
- [ ] Verify success after retries

### 4. Performance
- [ ] Open Chrome DevTools → Performance tab
- [ ] Record interaction
- [ ] Verify no violations >50ms
- [ ] Check Lighthouse score (target: >90)
- [ ] Test on mobile device

### 5. Error Handling
- [ ] Test with invalid inputs
- [ ] Test with network disconnected
- [ ] Verify error messages are user-friendly
- [ ] Check Sentry for error reports (if configured)

## Render Backend Verification

### 1. Backend Health
- [ ] Check backend is running: `https://ascendra-1.onrender.com/health`
- [ ] Verify CORS headers allow Vercel domain
- [ ] Test API endpoints directly

### 2. CORS Configuration
```bash
# Test CORS
curl -H "Origin: https://your-project.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://ascendra-1.onrender.com/lesson-architect/generate-scheme
```

Expected response should include:
- [ ] `Access-Control-Allow-Origin: https://your-project.vercel.app`
- [ ] `Access-Control-Allow-Methods: POST, GET, OPTIONS`
- [ ] `Access-Control-Allow-Credentials: true`

### 3. Environment Variables (Render)
- [ ] `DATABASE_URL` is set
- [ ] `GROQ_API_KEY` is set
- [ ] `ALLOWED_ORIGINS` includes Vercel URL

## Monitoring Setup

### 1. Vercel Analytics
- [ ] Enable Web Analytics in project settings
- [ ] Verify data is being collected

### 2. Error Tracking (Sentry)
- [ ] Sentry DSN configured
- [ ] Test error is captured
- [ ] Set up alerts for critical errors

### 3. Uptime Monitoring
- [ ] Set up UptimeRobot or similar
- [ ] Monitor frontend: `https://your-project.vercel.app`
- [ ] Monitor backend: `https://ascendra-1.onrender.com/health`
- [ ] Configure alerts (email/SMS)

## Custom Domain (Optional)

### 1. Add Domain in Vercel
- [ ] Go to Project Settings → Domains
- [ ] Add your custom domain
- [ ] Note the DNS records to add

### 2. Update DNS
- [ ] Add CNAME record pointing to `cname.vercel-dns.com`
- [ ] Wait for DNS propagation (up to 48 hours)
- [ ] Verify SSL certificate is issued

### 3. Update Environment Variables
- [ ] Update callback URLs to use custom domain
- [ ] Update CORS settings on backend
- [ ] Redeploy if needed

## Security Checklist

- [ ] All sensitive keys are in environment variables (not in code)
- [ ] `.env.local` is in `.gitignore`
- [ ] HTTPS is enforced (automatic on Vercel)
- [ ] Security headers configured in `vercel.json`
- [ ] Rate limiting enabled (Upstash Redis)
- [ ] CORS properly configured on backend
- [ ] API routes protected with authentication
- [ ] No sensitive data in logs
- [ ] Supabase RLS policies enabled

## Documentation

- [ ] Update README with deployment info
- [ ] Document environment variables
- [ ] Create runbook for common issues
- [ ] Document API endpoints
- [ ] Create user guide for new features

## Team Communication

- [ ] Notify team of deployment
- [ ] Share deployment URL
- [ ] Document any breaking changes
- [ ] Schedule training session (if needed)
- [ ] Update project documentation

## Rollback Plan

### If Deployment Fails:
1. [ ] Check build logs in Vercel
2. [ ] Verify environment variables
3. [ ] Test locally: `npm run build && npm start`
4. [ ] Rollback to previous deployment in Vercel dashboard
5. [ ] Fix issues and redeploy

### If Issues Found After Deployment:
1. [ ] Immediately rollback in Vercel dashboard
2. [ ] Investigate issue in staging/local environment
3. [ ] Fix and test thoroughly
4. [ ] Redeploy with fixes

## Success Criteria

Deployment is successful when:
- [x] Build completes without errors
- [x] All environment variables configured
- [x] Homepage loads correctly
- [x] Authentication works
- [x] Scheme generation works
- [x] Hierarchical lesson selection works
- [x] Network retry logic functions
- [x] Performance is acceptable (Lighthouse >90)
- [x] No critical errors in Sentry
- [x] Mobile experience is good

## Post-Deployment Tasks

### Immediate (Within 24 hours)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] Address any critical issues

### Short-term (Within 1 week)
- [ ] Gather user feedback
- [ ] Monitor analytics
- [ ] Optimize based on real usage
- [ ] Document lessons learned

### Long-term (Ongoing)
- [ ] Regular security updates
- [ ] Performance monitoring
- [ ] Feature enhancements
- [ ] User feedback incorporation

## Notes

**Deployment Date**: _________________

**Deployed By**: _________________

**Deployment URL**: _________________

**Issues Encountered**: 
_________________________________________________
_________________________________________________
_________________________________________________

**Resolution**: 
_________________________________________________
_________________________________________________
_________________________________________________

## Sign-off

- [ ] Technical Lead Approval
- [ ] QA Testing Complete
- [ ] Product Owner Approval
- [ ] Deployment Successful

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Failed

**Overall Progress**: _____ / _____ tasks completed