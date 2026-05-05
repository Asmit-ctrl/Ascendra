# Deploy Python Backend to Render

## What Changed

✅ **Vercel** - Now deploys ONLY the Next.js frontend (studio)
✅ **Render** - Will deploy the Python FastAPI backend (ai-agents)

## Step 1: Deploy to Render

### Option A: Using Render Dashboard (Easiest)

1. **Go to Render**: https://render.com
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → Select "Web Service"
4. **Connect Repository**: 
   - Select your GitHub repo: `dgithinjibit/Ascendra`
   - Render will detect the `render.yaml` file automatically
5. **Configure**:
   - **Name**: `syncsenta-ai-backend`
   - **Root Directory**: `ai-agents`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -e .`
   - **Start Command**: `python -m syncsenta_agents.main`
6. **Add Environment Variable**:
   - Key: `GROQ_API_KEY`
   - Value: Your Groq API key
7. **Click "Create Web Service"**

### Option B: Using render.yaml (Automatic)

The `ai-agents/render.yaml` file is already configured. Render will:
- ✅ Auto-detect Python 3.11
- ✅ Install dependencies from `pyproject.toml`
- ✅ Start the FastAPI server on port 8001
- ✅ Provide a public URL like: `https://syncsenta-ai-backend.onrender.com`

## Step 2: Get Your Backend URL

After deployment, Render will give you a URL like:
```
https://syncsenta-ai-backend.onrender.com
```

Copy this URL - you'll need it for the frontend.

## Step 3: Update Frontend to Use Render Backend

You need to update the frontend to call the Render backend instead of `localhost:8001`.

### Update Environment Variable

Create a `.env.local` file in the `studio/` directory:

```bash
NEXT_PUBLIC_API_URL=https://syncsenta-ai-backend.onrender.com
```

### Update Frontend Code

In all teacher dashboard components, replace:
```typescript
// OLD
const response = await fetch('http://localhost:8001/agents/chat', {
```

With:
```typescript
// NEW
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const response = await fetch(`${apiUrl}/agents/chat`, {
```

## Step 4: Add Environment Variable to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://syncsenta-ai-backend.onrender.com` (your Render URL)
   - **Environment**: Production, Preview, Development
4. Click **Save**
5. **Redeploy** your Vercel project

## Step 5: Test the Setup

1. **Test Backend** (Render):
   ```bash
   curl https://syncsenta-ai-backend.onrender.com/health
   ```
   Should return: `{"status": "healthy"}`

2. **Test Frontend** (Vercel):
   - Go to your Vercel URL
   - Navigate to `/teacher`
   - Try generating a Scheme of Work
   - Should connect to Render backend

## Architecture After Deployment

```
┌─────────────────────────────────────────────┐
│  Vercel (Frontend)                          │
│  https://your-app.vercel.app                │
│                                             │
│  - Next.js App (studio/)                    │
│  - Teacher Dashboard                        │
│  - Student Interface                        │
└─────────────────┬───────────────────────────┘
                  │
                  │ API Calls
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Render (Backend)                           │
│  https://syncsenta-ai-backend.onrender.com  │
│                                             │
│  - FastAPI Server (ai-agents/)              │
│  - Groq AI Integration                      │
│  - Assessment Agents                        │
│  - Telemetry Processing                     │
└─────────────────┬───────────────────────────┘
                  │
                  │ AI Requests
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Groq API                                   │
│  https://api.groq.com                       │
│                                             │
│  - LLM Inference                            │
│  - Content Generation                       │
└─────────────────────────────────────────────┘
```

## Render Free Tier Notes

⚠️ **Important**: Render's free tier:
- ✅ Free for 750 hours/month
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes ~30 seconds (cold start)
- ✅ Automatically wakes up on incoming requests

**For production**, consider upgrading to Render's paid tier ($7/month) for:
- No spin-down
- Faster response times
- Better reliability

## Troubleshooting

### Backend Not Responding
- Check Render logs: Dashboard → Your Service → Logs
- Verify `GROQ_API_KEY` is set correctly
- Check if service is sleeping (free tier)

### Frontend Can't Connect to Backend
- Verify `NEXT_PUBLIC_API_URL` is set in Vercel
- Check CORS settings in backend
- Ensure backend URL is correct (no trailing slash)

### Cold Start Issues
- First request after 15 min takes ~30 seconds
- Consider upgrading to paid tier
- Or implement a keep-alive ping

## Cost Summary

- **Vercel**: Free tier (hobby plan)
- **Render**: Free tier (750 hours/month)
- **Groq**: Free tier (rate limited)

**Total Cost**: $0/month (with limitations)

**Recommended for Production**:
- Render: $7/month (no spin-down)
- Total: $7/month

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Get backend URL
3. ✅ Update frontend environment variables
4. ✅ Redeploy Vercel
5. ✅ Test end-to-end
6. 🎉 Your app is live!
