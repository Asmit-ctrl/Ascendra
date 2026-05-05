# Render Deployment - Next Steps

## ✅ What's Been Fixed

The Python backend now has all required dependencies to run successfully on Render. The `ModuleNotFoundError: No module named 'langgraph'` issue has been resolved.

## 🚀 Deploy to Render Now

### Step 1: Go to Render Dashboard

1. Open https://render.com
2. Sign in with your GitHub account
3. Go to your service (or create a new one if this is first time)

### Step 2: Configure the Service

If creating a new service:

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo: `dgithinjibit/Ascendra`
3. Fill in these details:

   **Basic Settings:**
   - **Name**: `syncsenta-ai-backend`
   - **Region**: Choose closest to your users (e.g., Oregon for US West)
   - **Branch**: `main`
   - **Root Directory**: `ai-agents`
   
   **Build & Deploy:**
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -e .`
   - **Start Command**: `python -m syncsenta_agents.main`
   
   **Plan:**
   - Select **"Free"** (for now)

4. Click **"Advanced"** and add environment variable:
   - **Key**: `GROQ_API_KEY`
   - **Value**: `[Your Groq API key from https://console.groq.com]`

5. Click **"Create Web Service"**

### Step 3: Wait for Build

Render will:
1. Clone your repo
2. Detect Python 3.11 from `runtime.txt`
3. Install dependencies from `pyproject.toml` (including the newly added LangChain/LangGraph)
4. Start the FastAPI server

**Expected build time**: 3-5 minutes

### Step 4: Verify Deployment

Once deployed, you'll get a URL like:
```
https://syncsenta-ai-backend.onrender.com
```

Test it:
```bash
curl https://syncsenta-ai-backend.onrender.com/healthz
```

Expected response:
```json
{
  "status": "ok",
  "offline_demo": false
}
```

### Step 5: Copy Your Backend URL

Copy the full URL (e.g., `https://syncsenta-ai-backend.onrender.com`)

You'll need this for the frontend configuration.

---

## 🎨 Update Frontend (Vercel)

### Step 1: Add Environment Variable to Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://syncsenta-ai-backend.onrender.com` (your Render URL)
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

### Step 2: Redeploy Vercel

1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (~2 minutes)

---

## 🧪 Test End-to-End

### Test 1: Backend Health Check

```bash
curl https://syncsenta-ai-backend.onrender.com/healthz
```

Should return: `{"status": "ok", "offline_demo": false}`

### Test 2: Teacher Dashboard - Scheme of Work

1. Go to your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Navigate to `/teacher`
3. Click on **"Scheme of Work Generator"** tab
4. Select:
   - Level: Lower Primary
   - Grade: Grade 4
   - Subject: Mathematics
   - Term: Term 1
5. Click **"Generate Scheme of Work"**
6. Wait 30-60 seconds (first request may be slow due to cold start)
7. Should see a comprehensive 13-week scheme generated

### Test 3: Teacher Dashboard - Assessment Generator

1. Stay on `/teacher` page
2. Click on **"Assessment Generator"** tab
3. Select:
   - Assessment Type: Quick Quiz
   - Level: Lower Primary
   - Grade: Grade 4
   - Subject: Mathematics
4. Click **"Generate Quiz"**
5. Should see a CBC-aligned quiz generated

---

## ⚠️ Important Notes

### Cold Start Delay

Render's free tier spins down after 15 minutes of inactivity. The first request after spin-down will take ~30 seconds. This is normal.

**Solutions:**
- Upgrade to Render paid tier ($7/month) for no spin-down
- Implement a keep-alive ping (ping the backend every 10 minutes)
- Accept the cold start delay for free tier

### CORS Issues

If you see CORS errors in the browser console, the backend already has CORS configured to allow all origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, you should restrict this to your Vercel domain only.

### Rate Limits

Groq's free tier has rate limits:
- 30 requests per minute
- 14,400 requests per day

If you hit these limits, you'll see errors. Consider upgrading to Groq's paid tier if needed.

---

## 📊 Monitoring

### Check Render Logs

1. Go to Render dashboard
2. Click on your service
3. Click **"Logs"** tab
4. You'll see real-time logs of:
   - Incoming requests
   - AI agent routing decisions
   - Groq API calls
   - Errors (if any)

### Check Vercel Logs

1. Go to Vercel dashboard
2. Click on your project
3. Click **"Logs"** tab
4. Filter by **"Functions"** to see API route logs

---

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Render backend responds to `/healthz`
- ✅ Vercel frontend loads without errors
- ✅ Teacher dashboard can generate schemes of work
- ✅ Teacher dashboard can generate assessments
- ✅ No CORS errors in browser console
- ✅ No import errors in Render logs

---

## 🆘 Troubleshooting

### Backend Not Responding

**Check:**
1. Render service status (should be "Live")
2. Environment variable `GROQ_API_KEY` is set
3. Logs for errors

**Fix:**
- Restart the service from Render dashboard
- Check if service is sleeping (free tier)
- Verify build completed successfully

### Frontend Can't Connect

**Check:**
1. `NEXT_PUBLIC_API_URL` is set in Vercel
2. Backend URL is correct (no trailing slash)
3. Browser console for CORS errors

**Fix:**
- Redeploy Vercel after adding environment variable
- Clear browser cache
- Check network tab in browser dev tools

### Generation Takes Too Long

**Possible causes:**
1. Cold start (first request after 15 min)
2. Groq API rate limit
3. Large prompt size

**Fix:**
- Wait for cold start to complete (~30s)
- Upgrade to Render paid tier
- Reduce prompt size if needed

---

## 💰 Cost Breakdown

**Current Setup (Free Tier):**
- Vercel: $0/month
- Render: $0/month (750 hours)
- Groq: $0/month (rate limited)
- **Total: $0/month**

**Recommended for Production:**
- Vercel: $0/month (hobby)
- Render: $7/month (no spin-down)
- Groq: $0/month (or upgrade if needed)
- **Total: $7/month**

---

## 📝 Summary

1. ✅ Fixed: Added LangChain/LangGraph dependencies
2. ✅ Pushed: Changes are on GitHub
3. 🚀 Next: Deploy to Render
4. 🎨 Then: Update Vercel environment variable
5. 🧪 Finally: Test end-to-end

**You're ready to deploy!** Follow the steps above and your app will be live.

