# Mwalimu AI - Production Deployment Guide

## Stack Overview

- **Frontend:** Next.js on Vercel
- **Backend:** FastAPI on Render
- **Database:** Supabase (PostgreSQL)
- **AI:** Groq (free tier)

## Prerequisites

- Vercel account
- Render account
- Supabase project
- Groq API key (free at https://console.groq.com)

---

## 1. Supabase Setup (Database)

### Step 1: Create Project
1. Go to https://app.supabase.com
2. Create new project
3. Note your credentials:
   - `SUPABASE_URL`: https://xxxxx.supabase.co
   - `SUPABASE_ANON_KEY`: eyJhbGc...
   - `SUPABASE_SERVICE_KEY`: eyJhbGc... (from Settings → API)

### Step 2: Run Database Migration
1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Copy contents of `ai-agents/src/syncsenta_agents/db/teacher_feedback_schema.sql`
4. Paste and click "Run"
5. Verify tables created in Table Editor:
   - `ai_decisions`
   - `learned_rules`
   - `cultural_patterns`
   - `teacher_rule_proposals`
   - `rule_votes`
   - `rule_ab_tests`

### Step 3: Enable Row Level Security
Already configured in schema file. Verify policies exist:
- Teachers can view their students' decisions
- Teachers can update feedback
- Teachers can propose and vote on rules

---

## 2. Backend Deployment (Render)

### Step 1: Prepare Backend
```bash
cd ai-agents

# Ensure requirements are up to date
pip freeze > requirements.txt

# Verify these are included:
# - fastapi
# - uvicorn
# - supabase
# - python-dotenv
# - langchain-groq
```

### Step 2: Create `render.yaml`
Already exists at `ai-agents/render.yaml`. Verify it contains:
```yaml
services:
  - type: web
    name: mwalimu-ai-agents
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
      - key: GROQ_MODEL
        value: llama-3.3-70b-versatile
```

### Step 3: Deploy to Render
1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Select `ai-agents` directory
5. Render auto-detects `render.yaml`
6. Add environment variables:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_KEY`: Your service key
   - `GROQ_API_KEY`: Your Groq API key
7. Click "Create Web Service"
8. Wait for deployment (~5 minutes)
9. Note your backend URL: `https://mwalimu-ai-agents.onrender.com`

### Step 4: Verify Backend
```bash
curl https://mwalimu-ai-agents.onrender.com/health
# Should return: {"status": "healthy"}

curl https://mwalimu-ai-agents.onrender.com/teacher-feedback/learned-rules?status=active
# Should return: [] (empty array initially)
```

---

## 3. Frontend Deployment (Vercel)

### Step 1: Configure Environment Variables
Create `studio/.env.production`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Backend API
NEXT_PUBLIC_AI_AGENTS_URL=https://mwalimu-ai-agents.onrender.com

# Optional: Analytics, etc.
```

### Step 2: Deploy to Vercel
```bash
cd studio

# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repo
4. Select `studio` directory as root
5. Add environment variables from `.env.production`
6. Click "Deploy"
7. Wait for deployment (~3 minutes)
8. Note your frontend URL: `https://mwalimu-ai.vercel.app`

### Step 3: Verify Frontend
1. Visit `https://mwalimu-ai.vercel.app`
2. Sign up as teacher
3. Navigate to AI Feedback dashboard
4. Should see empty state (no decisions yet)

---

## 4. Scheduled Jobs (Render Cron)

### Option A: Render Cron Jobs (Recommended)
Add to `ai-agents/render.yaml`:
```yaml
services:
  # ... existing web service ...

  - type: cron
    name: rule-learning-job
    env: python
    schedule: "0 2 * * *"  # Daily at 2 AM UTC
    buildCommand: pip install -r requirements.txt
    startCommand: python -m syncsenta_agents.jobs.rule_learning_job
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
```

### Option B: External Cron Service
Use https://cron-job.org or similar:
1. Create account
2. Add job:
   - URL: `https://mwalimu-ai-agents.onrender.com/jobs/run-rule-learning`
   - Schedule: Daily at 2 AM
   - Method: POST

---

## 5. Post-Deployment Verification

### Test Complete Flow
```bash
# 1. Student asks question (generates AI decision)
curl -X POST https://mwalimu-ai-agents.onrender.com/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I add 1/2 + 1/4?",
    "user_id": "student_123",
    "grade": "Grade 4",
    "subject": "Mathematics",
    "role": "student",
    "context": {
      "teacher_id": "teacher_456",
      "competency": "MATH.G4.FRACTIONS",
      "telemetry": {"erasure_count": 3, "dwell_time_seconds": 55}
    }
  }'

# 2. Check decision was logged
# Go to Supabase → Table Editor → ai_decisions
# Should see 1 row

# 3. Teacher provides feedback
# Go to frontend → Teacher Dashboard → AI Feedback
# Should see 1 pending decision
# Click "Helpful" or "Not Helpful"

# 4. Verify feedback recorded
# Check ai_decisions table → teacher_feedback column should be updated
```

---

## 6. Monitoring & Maintenance

### Render Monitoring
- Dashboard: https://dashboard.render.com
- Logs: Click service → "Logs" tab
- Metrics: CPU, Memory, Response time

### Supabase Monitoring
- Dashboard: https://app.supabase.com
- Database: Table Editor → Check row counts
- Logs: Logs Explorer → Filter by table

### Vercel Monitoring
- Dashboard: https://vercel.com/dashboard
- Analytics: Built-in analytics
- Logs: Deployment logs

### Key Metrics to Track
```sql
-- In Supabase SQL Editor

-- 1. Feedback rate
SELECT 
  COUNT(*) as total_decisions,
  COUNT(teacher_feedback) as feedback_given,
  (COUNT(teacher_feedback)::FLOAT / COUNT(*)) as feedback_rate
FROM ai_decisions;

-- 2. Rule performance
SELECT 
  rule_id,
  rule_name,
  times_applied,
  (times_helpful::FLOAT / NULLIF(times_applied, 0)) as success_rate
FROM learned_rules
WHERE times_applied > 10
ORDER BY success_rate DESC;

-- 3. Cultural patterns
SELECT 
  pattern_name,
  region,
  occurrence_count,
  success_rate
FROM cultural_patterns
ORDER BY success_rate DESC
LIMIT 10;
```

---

## 7. Scaling Considerations

### Render (Backend)
- **Free Tier:** Spins down after 15 min inactivity
- **Starter ($7/mo):** Always on, 512 MB RAM
- **Standard ($25/mo):** 2 GB RAM, better for production
- **Recommendation:** Start with Starter, upgrade to Standard at 100+ daily users

### Vercel (Frontend)
- **Hobby (Free):** 100 GB bandwidth, good for MVP
- **Pro ($20/mo):** 1 TB bandwidth, better analytics
- **Recommendation:** Start with Hobby, upgrade at 1000+ daily users

### Supabase (Database)
- **Free Tier:** 500 MB database, 2 GB bandwidth
- **Pro ($25/mo):** 8 GB database, 50 GB bandwidth
- **Recommendation:** Start with Free, upgrade at 10,000+ decisions logged

---

## 8. Environment Variables Checklist

### Backend (Render)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `GROQ_API_KEY`
- [ ] `GROQ_MODEL` (default: llama-3.3-70b-versatile)

### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_AI_AGENTS_URL`

---

## 9. Troubleshooting

### Issue: Backend not responding
**Check:**
1. Render logs for errors
2. Environment variables set correctly
3. Supabase connection working

**Fix:**
```bash
# Test Supabase connection
curl https://mwalimu-ai-agents.onrender.com/health
```

### Issue: Frontend can't reach backend
**Check:**
1. `NEXT_PUBLIC_AI_AGENTS_URL` is correct
2. CORS enabled on backend
3. Backend is running (not spun down)

**Fix:**
Add to `ai-agents/src/syncsenta_agents/api/server.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://mwalimu-ai.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue: Database tables not found
**Fix:**
Re-run SQL migration in Supabase dashboard

### Issue: Rule learning job not running
**Check:**
1. Cron job configured in Render
2. Environment variables set for cron job
3. Check cron job logs in Render

---

## 10. Security Checklist

- [ ] Use `SUPABASE_SERVICE_KEY` only on backend (never frontend)
- [ ] Use `SUPABASE_ANON_KEY` on frontend
- [ ] Enable Row Level Security on all tables
- [ ] Use HTTPS only (Vercel/Render provide this)
- [ ] Rotate API keys every 90 days
- [ ] Monitor Supabase logs for suspicious activity
- [ ] Rate limit API endpoints (Render provides this)

---

## 11. Backup Strategy

### Database Backups (Supabase)
- **Automatic:** Daily backups on Pro plan
- **Manual:** Settings → Database → Backups → "Create backup"
- **Recommendation:** Weekly manual backups for first 3 months

### Rule Snapshots
- **Automatic:** Rule learning job exports daily
- **Location:** Stored in Supabase (or S3 if configured)
- **Retention:** Keep 30 days of snapshots

---

## 12. Cost Estimate

### MVP (0-100 users)
- Vercel: $0 (Hobby)
- Render: $7/mo (Starter)
- Supabase: $0 (Free)
- Groq: $0 (Free tier)
- **Total: $7/mo**

### Growth (100-1000 users)
- Vercel: $20/mo (Pro)
- Render: $25/mo (Standard)
- Supabase: $25/mo (Pro)
- Groq: $0 (Free tier sufficient)
- **Total: $70/mo**

### Scale (1000+ users)
- Vercel: $20/mo (Pro)
- Render: $85/mo (Pro)
- Supabase: $25/mo (Pro)
- Groq: $0 (Still free!)
- **Total: $130/mo**

---

## 13. Launch Checklist

- [ ] Supabase project created
- [ ] Database migration run
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Test flow completed (student → AI → teacher feedback)
- [ ] Rule learning job scheduled
- [ ] Monitoring dashboards set up
- [ ] Backup strategy in place
- [ ] Documentation shared with team

---

## Support

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Groq Docs:** https://console.groq.com/docs

---

**Ready to deploy!** 🚀

Start with Supabase, then Backend, then Frontend. Test after each step.
