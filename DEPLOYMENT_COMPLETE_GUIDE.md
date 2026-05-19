# Complete Deployment Guide - Ascendra Platform

## 🎉 Current Status

### Backend: ✅ DEPLOYED
- **URL**: `https://ascendra-1.onrender.com`
- **Status**: Live and running
- **Services**: All agents initialized (assessment, socratic_tutor, lesson_architect)
- **Database**: Connected to Supabase

### Frontend: ⏳ NEEDS ENVIRONMENT VARIABLE UPDATE
- **URL**: Your Vercel deployment
- **Status**: Deployed but using localhost (will fail)
- **Action Required**: Set environment variable

## 🚀 Quick Fix - Get Everything Working

### Step 1: Set Vercel Environment Variable (2 minutes)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   ```
   Name: NEXT_PUBLIC_AI_AGENTS_URL
   Value: https://ascendra-1.onrender.com
   ```
5. Select all environments (Production, Preview, Development)
6. Click **Save**

### Step 2: Redeploy Frontend (1 minute)

1. Go to **Deployments** tab
2. Click on latest deployment
3. Click **"..."** menu → **"Redeploy"**
4. Click **"Redeploy"** button
5. Wait 2-3 minutes for build to complete

### Step 3: Test (1 minute)

1. Go to your deployed site
2. Login as teacher
3. Try generating a Scheme of Work
4. Should work now! 🎉

## 📋 What Was Fixed

### Problem
- App was hardcoded to use `localhost:8001` as fallback
- In production, localhost doesn't exist → connection refused
- Error: `[Errno -2] Name or service not known`

### Solution
1. ✅ Created centralized API configuration (`src/lib/api-config.ts`)
2. ✅ Updated all components to use centralized config
3. ✅ Backend deployed to Render
4. ⏳ Need to set Vercel environment variable

### Files Modified
- `src/lib/api-config.ts` - NEW: Centralized API config
- `src/components/teacher/scheme-of-work-generator.tsx` - Updated
- `src/components/teacher/lesson-plan-generator.tsx` - Updated
- `src/components/teacher/assessment-generator.tsx` - Updated
- `src/components/teacher/magic-school-teacher.tsx` - Updated
- `src/components/teacher/agent-stats.tsx` - Updated
- `src/app/student/page.tsx` - Updated (direct-to-chat feature)

## 🧪 Testing Checklist

After setting environment variable and redeploying:

### Teacher Features
- [ ] Login as teacher
- [ ] Generate Scheme of Work
- [ ] Generate Lesson Plan
- [ ] Generate Assessment
- [ ] Use Magic School Teacher
- [ ] View student progress
- [ ] Send interventions

### Student Features
- [ ] Login as student
- [ ] Select grade (first time)
- [ ] Click subject card → goes to chat
- [ ] Chat with Mwalimu AI
- [ ] View progress dashboard

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   PRODUCTION STACK                       │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Vercel         │  Frontend (Next.js)
│   Frontend       │  - Teacher dashboard
│                  │  - Student dashboard
└────────┬─────────┘  - Authentication
         │
         │ NEXT_PUBLIC_AI_AGENTS_URL
         │ https://ascendra-1.onrender.com
         │
         ▼
┌──────────────────┐
│   Render.com     │  Backend (Python/FastAPI)
│   AI Agents      │  - Socratic tutor
│                  │  - Lesson architect
│                  │  - Assessment generator
└────────┬─────────┘
         │
         ├──────────► Groq API (LLM)
         │            - llama-3.3-70b-versatile
         │
         └──────────► Supabase (Database)
                      - PostgreSQL
                      - Row Level Security
                      - Real-time subscriptions
```

## 🔧 Environment Variables Summary

### Vercel (Frontend)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://khsemyqovhqwrjzlzwo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase dashboard>
NEXT_PUBLIC_AI_AGENTS_URL=https://ascendra-1.onrender.com  # ← ADD THIS
```

### Render (Backend) - Already Set ✅
```bash
GROQ_API_KEY=<your groq key>
SUPABASE_URL=https://khsemyqovhqwrjzlzwo.supabase.co
SUPABASE_SERVICE_KEY=<your supabase service key>
GROQ_MODEL=llama-3.3-70b-versatile
PORT=10000
```

## 🐛 Troubleshooting

### Issue: Scheme of Work still fails after setting env var

**Check 1**: Verify environment variable is set
```bash
# In Vercel dashboard, check Environment Variables section
# Should see: NEXT_PUBLIC_AI_AGENTS_URL = https://ascendra-1.onrender.com
```

**Check 2**: Verify you redeployed after setting env var
```bash
# Environment variables only take effect after redeploy
# Go to Deployments → Redeploy
```

**Check 3**: Check backend is running
```bash
curl https://ascendra-1.onrender.com/healthz
# Should return: {"status": "healthy"}
```

**Check 4**: Check browser console
```bash
# Open browser DevTools → Console
# Look for fetch errors
# Should see: POST https://ascendra-1.onrender.com/agents/chat
# NOT: POST http://localhost:8001/agents/chat
```

### Issue: Backend shows 404 errors

**Solution**: Backend doesn't have a root route, this is normal
```bash
# These are OK:
# GET / → 404 (no root route)
# HEAD / → 404 (health check uses /healthz)

# These should work:
# GET /healthz → 200
# POST /agents/chat → 200
```

### Issue: "Name or service not known" error

**Cause**: Frontend is still trying to use localhost
**Solution**: 
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Verify env var is set in Vercel
4. Redeploy frontend

## 📈 Monitoring

### Render Logs
https://dashboard.render.com → Your Service → Logs

**What to look for**:
- `INFO: Application startup complete` ✅
- `Orchestrator initialized successfully` ✅
- Incoming POST requests to `/agents/chat`
- Agent execution logs

### Vercel Logs
https://vercel.com/dashboard → Your Project → Logs

**What to look for**:
- Successful builds
- No environment variable errors
- API call logs

## 💰 Cost Estimate

### Current Setup (Free Tier)
- Vercel: Free (Hobby plan)
- Render: Free (sleeps after 15 min inactivity)
- Supabase: Free (500MB database)
- Groq: Free (14,400 requests/day)
- **Total**: $0/month

### Production Tier (Recommended)
- Vercel: $20/month (Pro plan)
- Render: $7/month (Starter - always on)
- Supabase: $25/month (Pro - 8GB database)
- Groq: Pay-as-you-go (~$10-50/month)
- **Total**: ~$62-102/month

## 🎯 Next Steps

1. ✅ Backend deployed to Render
2. ⏳ **Set Vercel environment variable** ← YOU ARE HERE
3. ⏳ Redeploy frontend
4. ⏳ Test all features
5. ⏳ Run SQL migrations in Supabase (if not done)
6. ⏳ Monitor logs for errors
7. ⏳ Set up custom domain (optional)

## 📚 Additional Documentation

- `studio/BACKEND_URL_FIX.md` - Technical details of the fix
- `studio/ERROR_ANALYSIS_AND_FIXES.md` - Error analysis
- `studio/FEATURE_DIRECT_SUBJECT_TO_CHAT.md` - New student feature
- `studio/TESTING_CHECKLIST.md` - SQL migration testing
- `ai-agents/DEPLOYMENT.md` - Backend deployment guide

## 🆘 Support

If you're still having issues:

1. Check all environment variables are set correctly
2. Verify backend is running on Render
3. Clear browser cache and hard refresh
4. Check browser console for errors
5. Check Render logs for backend errors
6. Verify SQL migrations have been run

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ No console errors about localhost
2. ✅ Scheme of Work generates successfully
3. ✅ Lesson Plans generate successfully
4. ✅ Students can chat with Mwalimu AI
5. ✅ No "connection refused" errors
6. ✅ Render logs show incoming requests
7. ✅ All features work as expected

---

**Last Updated**: 2026-05-18
**Backend URL**: https://ascendra-1.onrender.com
**Status**: Backend live, frontend needs env var update
