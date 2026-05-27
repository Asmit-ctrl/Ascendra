# Vercel Deployment Guide

## Overview

This guide covers deploying the Ascendra Studio (Next.js frontend) to Vercel with the backend hosted on Render.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Vercel         │         │  Render          │
│  (Frontend)     │────────▶│  (Backend API)   │
│  Next.js App    │  HTTPS  │  FastAPI/Python  │
└─────────────────┘         └──────────────────┘
       │
       │
       ▼
┌─────────────────┐
│  Supabase       │
│  (Database)     │
└─────────────────┘
```

## Prerequisites

1. **Vercel Account**: Sign up at https://vercel.com
2. **Render Account**: Backend already deployed at `https://ascendra-1.onrender.com`
3. **Supabase Project**: Database and authentication
4. **GitHub Repository**: Code pushed to GitHub

## Step 1: Prepare Environment Variables

### Required Environment Variables for Vercel

Create these in your Vercel project settings:

#### 🔴 Critical (Required for Basic Functionality)

```bash
# Backend API URL (Render)
NEXT_PUBLIC_AI_AGENTS_URL=https://ascendra-1.onrender.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Groq API (for AI features)
GROQ_API_KEY=your_groq_api_key
```

#### 🟡 Important (Recommended for Production)

```bash
# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### 🟢 Optional (Enhanced Features)

```bash
# Payment Integration
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_SHORTCODE=your_mpesa_shortcode
MPESA_PASSKEY=your_mpesa_passkey
MPESA_CALLBACK_URL=https://your-domain.vercel.app/api/mpesa/callback

STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Enhanced TTS
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Model Override
GROQ_MODEL=llama-3.3-70b-versatile
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Import Project**
   ```
   1. Go to https://vercel.com/new
   2. Click "Import Git Repository"
   3. Select your GitHub repository
   4. Choose the root directory or select "Ascendra/studio"
   ```

2. **Configure Build Settings**
   ```
   Framework Preset: Next.js
   Root Directory: studio (or leave blank if repo root is studio)
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Add Environment Variables**
   ```
   1. Go to Project Settings → Environment Variables
   2. Add all required variables from Step 1
   3. Set for: Production, Preview, and Development
   ```

4. **Deploy**
   ```
   Click "Deploy"
   Wait for build to complete (~3-5 minutes)
   ```

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to studio directory
cd Ascendra/studio

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Follow prompts to:
# - Link to existing project or create new
# - Confirm settings
# - Deploy
```

## Step 3: Configure Custom Domain (Optional)

1. **Add Domain in Vercel**
   ```
   Project Settings → Domains → Add Domain
   Enter: yourdomain.com
   ```

2. **Update DNS Records**
   ```
   Add CNAME record:
   Name: @ (or www)
   Value: cname.vercel-dns.com
   ```

3. **Update Environment Variables**
   ```
   Update callback URLs to use your custom domain:
   MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
   ```

## Step 4: Verify Deployment

### 1. Check Build Logs
```
Vercel Dashboard → Deployments → Latest Deployment → View Logs
```

### 2. Test Critical Paths

#### A. Homepage
```
https://your-project.vercel.app
✓ Should load without errors
✓ Check browser console for errors
```

#### B. Authentication
```
https://your-project.vercel.app/login
✓ Login form should appear
✓ Test login with Supabase credentials
```

#### C. Teacher Dashboard
```
https://your-project.vercel.app/teacher/dashboard
✓ Dashboard should load
✓ Check "Schemes of Work" tab
✓ Test scheme generation
```

#### D. Lesson Plan Generator
```
1. Generate a scheme in "Schemes of Work" tab
2. Switch to "Lesson Plans from Scheme" tab
3. Verify scheme appears
4. Test hierarchical selection (Scheme → Week → Lesson)
```

#### E. Network Resilience
```
1. Open Chrome DevTools → Network tab
2. Throttle to "Slow 3G"
3. Generate a scheme
4. Verify retry logic works (check console for retry messages)
```

### 3. Performance Check
```
1. Open Chrome DevTools → Performance tab
2. Record interaction
3. Verify no violations >50ms
4. Check Lighthouse score (should be >90)
```

## Step 5: Configure Render Backend (If Needed)

### Update CORS Settings

If you get CORS errors, update your Render backend:

```python
# In your FastAPI app
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-project.vercel.app",
        "https://yourdomain.com",  # if using custom domain
        "http://localhost:3000",   # for local development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Environment Variables on Render

Ensure these are set in your Render service:

```bash
# Database
DATABASE_URL=your_supabase_connection_string

# AI Services
GROQ_API_KEY=your_groq_api_key

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=https://your-project.vercel.app,https://yourdomain.com
```

## Step 6: Set Up Continuous Deployment

### Automatic Deployments

Vercel automatically deploys on:
- ✅ Push to `main` branch → Production
- ✅ Push to other branches → Preview deployments
- ✅ Pull requests → Preview deployments

### Branch Protection (Recommended)

```bash
# In GitHub repository settings:
1. Settings → Branches → Add rule
2. Branch name pattern: main
3. Enable:
   ☑ Require pull request reviews
   ☑ Require status checks to pass
   ☑ Require deployments to succeed before merging
```

## Step 7: Monitoring & Alerts

### 1. Vercel Analytics

```
Project Settings → Analytics
Enable: Web Analytics
```

### 2. Error Tracking (Sentry)

```javascript
// Already configured in the app
// Just add NEXT_PUBLIC_SENTRY_DSN to environment variables
```

### 3. Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor:
- `https://your-project.vercel.app` (frontend)
- `https://ascendra-1.onrender.com/health` (backend)

## Troubleshooting

### Issue: Build Fails

**Check:**
1. Build logs in Vercel dashboard
2. Ensure all dependencies in `package.json`
3. Verify Node version compatibility

**Solution:**
```bash
# Specify Node version in package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Issue: Environment Variables Not Working

**Check:**
1. Variables are set for correct environment (Production/Preview/Development)
2. Variables starting with `NEXT_PUBLIC_` are accessible in browser
3. Server-only variables (without `NEXT_PUBLIC_`) are not exposed

**Solution:**
```bash
# Redeploy after adding variables
vercel --prod --force
```

### Issue: API Calls Failing

**Check:**
1. `NEXT_PUBLIC_AI_AGENTS_URL` is set correctly
2. Render backend is running
3. CORS is configured on backend
4. Network tab shows correct request URLs

**Solution:**
```bash
# Verify backend URL
curl https://ascendra-1.onrender.com/health

# Check CORS headers
curl -H "Origin: https://your-project.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://ascendra-1.onrender.com/lesson-architect/generate-scheme
```

### Issue: Slow Performance

**Check:**
1. Vercel region (should be close to users)
2. Image optimization enabled
3. Static assets cached properly

**Solution:**
```json
// In vercel.json
{
  "regions": ["iad1"],  // US East (change based on user location)
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Issue: ERR_NETWORK_CHANGED Still Occurring

**Check:**
1. Network utilities are imported correctly
2. `fetchWithRetry` is being used
3. Retry logic is configured

**Solution:**
```typescript
// Verify import
import { fetchWithRetry } from '@/lib/network-utils'

// Use with proper config
await fetchWithRetry(url, {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 60000
})
```

## Performance Optimization

### 1. Enable Edge Functions (Optional)

```javascript
// In API routes
export const config = {
  runtime: 'edge',
}
```

### 2. Image Optimization

```javascript
// Use Next.js Image component
import Image from 'next/image'

<Image
  src="/logo.png"
  width={200}
  height={100}
  alt="Logo"
  priority
/>
```

### 3. Code Splitting

```javascript
// Dynamic imports for large components
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
})
```

## Security Checklist

- [x] Environment variables properly scoped (public vs server-only)
- [x] CORS configured on backend
- [x] Security headers configured in `vercel.json`
- [x] Rate limiting enabled (Upstash Redis)
- [x] Authentication via Supabase
- [x] API routes protected with middleware
- [x] Sensitive data not logged
- [x] HTTPS enforced (automatic on Vercel)

## Cost Estimation

### Vercel (Frontend)
- **Hobby Plan**: Free
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Automatic HTTPS
  - Edge Network

- **Pro Plan**: $20/month
  - 1 TB bandwidth/month
  - Advanced analytics
  - Team collaboration
  - Priority support

### Render (Backend)
- **Free Tier**: $0
  - Spins down after inactivity
  - 750 hours/month

- **Starter**: $7/month
  - Always on
  - 512 MB RAM
  - Recommended for production

### Supabase (Database)
- **Free Tier**: $0
  - 500 MB database
  - 50,000 monthly active users
  - 2 GB bandwidth

- **Pro**: $25/month
  - 8 GB database
  - 100,000 monthly active users
  - 50 GB bandwidth

**Total Estimated Cost:**
- Development: $0/month (all free tiers)
- Production: $52/month (Vercel Pro + Render Starter + Supabase Pro)

## Support

For deployment issues:
1. Check Vercel documentation: https://vercel.com/docs
2. Review build logs in Vercel dashboard
3. Test locally first: `npm run build && npm start`
4. Check this guide's troubleshooting section

## Next Steps After Deployment

1. ✅ Set up monitoring and alerts
2. ✅ Configure custom domain
3. ✅ Enable analytics
4. ✅ Set up error tracking
5. ✅ Create staging environment (use Preview deployments)
6. ✅ Document API endpoints
7. ✅ Set up automated testing
8. ✅ Create backup strategy

## Conclusion

Your Ascendra Studio frontend is now deployed on Vercel with:
- ✅ Automatic deployments from GitHub
- ✅ Network resilience with retry logic
- ✅ Performance optimizations
- ✅ Hierarchical lesson plan selection
- ✅ Secure environment variable management
- ✅ Production-ready configuration

**Live URL**: `https://your-project.vercel.app`
**Backend API**: `https://ascendra-1.onrender.com`