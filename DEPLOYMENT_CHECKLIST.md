# SyncSenta Vercel Deployment Checklist

## Pre-Deployment

- [ ] **Groq API Key Ready**
  - Get free key: https://console.groq.com/keys
  - Test key: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`

- [ ] **Local Testing Complete**
  ```bash
  # Frontend
  cd studio && npm run dev
  
  # Backend
  cd ai-agents && python -m uvicorn syncsenta_agents.api.server:app --reload --port 8001
  ```
  - [ ] Student chat works (http://localhost:5173/student)
  - [ ] Teacher Magic School works (http://localhost:5173/teacher)
  - [ ] Backend responds (http://localhost:8001/health)

- [ ] **Code Committed**
  ```bash
  git add .
  git commit -m "Streamlined for Vercel deployment"
  git push origin main
  ```

## Vercel Deployment

- [ ] **Create Vercel Account**
  - Sign up: https://vercel.com/signup
  - Connect GitHub account

- [ ] **Import Repository**
  - Go to: https://vercel.com/new
  - Select your GitHub repository
  - Click "Import"

- [ ] **Configure Project**
  - Framework Preset: **Next.js**
  - Root Directory: **studio**
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

- [ ] **Add Environment Variables**
  
  In Vercel Dashboard → Settings → Environment Variables:
  
  ```bash
  # Required
  GROQ_API_KEY=your_groq_api_key_here
  GROQ_MODEL=llama-3.3-70b-versatile
  LLM_PROVIDER=groq
  
  # Frontend URL (update after first deployment)
  NEXT_PUBLIC_AI_AGENTS_URL=https://your-app.vercel.app/api/agents
  ```

- [ ] **Deploy**
  - Click "Deploy"
  - Wait for build to complete (~2-3 minutes)
  - Note your deployment URL: `https://your-app.vercel.app`

## Post-Deployment

- [ ] **Update Environment Variables**
  - Go to Vercel Dashboard → Settings → Environment Variables
  - Update `NEXT_PUBLIC_AI_AGENTS_URL` with your actual Vercel URL
  - Redeploy: Vercel Dashboard → Deployments → Latest → Redeploy

- [ ] **Test Production**
  - [ ] Visit: `https://your-app.vercel.app`
  - [ ] Test student chat: `https://your-app.vercel.app/student`
  - [ ] Test teacher Magic School: `https://your-app.vercel.app/teacher`
  - [ ] Check browser console for errors (F12)

- [ ] **Verify Backend API**
  ```bash
  # Test health endpoint
  curl https://your-app.vercel.app/api/agents/health
  
  # Test chat endpoint
  curl -X POST https://your-app.vercel.app/api/agents/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Hello", "user_id": "test"}'
  ```

## Optional Enhancements

- [ ] **Custom Domain**
  - Vercel Dashboard → Settings → Domains
  - Add your custom domain
  - Update DNS records

- [ ] **Analytics**
  - Vercel Dashboard → Analytics
  - Enable Vercel Analytics (free)

- [ ] **Monitoring**
  - Sign up for Sentry (free tier): https://sentry.io
  - Add Sentry DSN to environment variables
  - Install Sentry SDK in frontend/backend

- [ ] **Database** (for future features)
  - Sign up for Supabase (free tier): https://supabase.com
  - Create project
  - Add `DATABASE_URL` to environment variables

## Troubleshooting

### Build Fails

**Check:**
- [ ] `studio/package.json` has all dependencies
- [ ] Node version is compatible (18+)
- [ ] Build logs in Vercel Dashboard

**Fix:**
```bash
# Test build locally
cd studio
npm run build
```

### Backend API Not Working

**Check:**
- [ ] `GROQ_API_KEY` is set correctly
- [ ] Environment variables are in "Production" scope
- [ ] Function logs in Vercel Dashboard

**Fix:**
```bash
# Test Groq API key
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Student Chat Not Connecting

**Check:**
- [ ] `NEXT_PUBLIC_AI_AGENTS_URL` is correct
- [ ] Browser console for CORS errors
- [ ] Network tab shows API requests

**Fix:**
- Update `NEXT_PUBLIC_AI_AGENTS_URL` in Vercel environment variables
- Redeploy

### Teacher Magic School Not Generating

**Check:**
- [ ] Groq API rate limits
- [ ] Backend logs for errors
- [ ] Network tab shows API responses

**Fix:**
- Rotate to backup Groq API key
- Check Groq console: https://console.groq.com

## Success Criteria

✅ **Deployment Successful When:**

1. **Frontend loads** at `https://your-app.vercel.app`
2. **Student chat works** - Can send messages and get AI responses
3. **Teacher Magic School works** - Can generate lesson plans, quizzes, etc.
4. **No console errors** - Browser console (F12) shows no errors
5. **Fast responses** - AI responses in < 3 seconds
6. **$0 cost** - Vercel and Groq free tiers

## Maintenance

### Weekly
- [ ] Check Vercel analytics for usage
- [ ] Monitor Groq API usage: https://console.groq.com
- [ ] Review error logs in Vercel Dashboard

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Review and rotate Groq API keys if needed
- [ ] Check for Vercel/Groq service updates

### As Needed
- [ ] Rotate Groq API key if rate limited
- [ ] Scale up to paid tier if free tier insufficient
- [ ] Add custom domain
- [ ] Enable monitoring/analytics

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Groq Docs**: https://console.groq.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **SyncSenta Issues**: https://github.com/yourusername/syncsenta/issues

## Quick Commands

```bash
# Local development
npm run dev                    # Frontend (studio/)
python -m uvicorn ...          # Backend (ai-agents/)

# Testing
npm test                       # Frontend tests
pytest                         # Backend tests

# Deployment
git push origin main           # Triggers Vercel deployment
vercel --prod                  # Manual deployment

# Logs
vercel logs                    # View production logs
vercel logs --follow           # Stream logs
```

---

**Estimated Time:** 5-10 minutes  
**Cost:** $0/month  
**Difficulty:** Easy

**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete

**Deployment Date:** _______________  
**Deployment URL:** _______________  
**Notes:** _______________
