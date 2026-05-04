# SyncSenta Vercel Deployment Guide

## Overview

SyncSenta Education OS is now streamlined for **FREE** Vercel deployment with:
- **Frontend**: Next.js (studio/)
- **Backend**: Python FastAPI (ai-agents/)
- **AI**: Groq (hardcoded, $0 cost)

## Prerequisites

1. **Vercel Account** (free tier): https://vercel.com/signup
2. **Groq API Key** (free): https://console.groq.com/keys
3. **GitHub Account**: For repository connection

## Quick Deploy

### 1. Push to GitHub

```bash
git add .
git commit -m "Streamlined for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `studio`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3. Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
# AI Configuration (REQUIRED)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
LLM_PROVIDER=groq

# Frontend URLs
NEXT_PUBLIC_AI_AGENTS_URL=https://your-app.vercel.app/api/agents
```

### 4. Deploy Backend API

The Python backend (ai-agents/) will be deployed as Vercel Serverless Functions:

1. Create `ai-agents/api/index.py`:
```python
from syncsenta_agents.api.server import app

# Vercel serverless handler
def handler(request):
    return app(request)
```

2. Vercel will automatically detect and deploy it

### 5. Test Deployment

Visit your Vercel URL:
- **Student Chat**: `https://your-app.vercel.app/student`
- **Teacher Magic School**: `https://your-app.vercel.app/teacher`

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Edge Network                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Next.js)          Backend (Python FastAPI)   │
│  ├─ studio/                  ├─ ai-agents/             │
│  ├─ Student Chat             ├─ /api/agents/chat       │
│  ├─ Teacher Magic School     ├─ /api/agents/generate   │
│  └─ Real-time UI             └─ Groq AI Integration    │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Groq AI (Free)
                    llama-3.3-70b
```

## What Was Removed

To streamline for Vercel deployment, we removed:

### ❌ Removed Components
- `backend/syncsenta-blockchain/` - Web3/Solidity smart contracts
- `backend/syncsenta-wasm/` - WebAssembly modules
- `backend/syncsenta-backend/` - Rust backend (replaced by Python)
- `ChatDev/` - Separate ChatDev installation
- Ollama dependencies (replaced with Groq)
- Local GPU requirements

### ✅ Kept Components
- `studio/` - Next.js frontend
- `ai-agents/` - Python FastAPI backend
- `docs/` - Documentation
- `notebooks/` - Jupyter notebooks
- `scripts/` - Utility scripts

## Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Hosting | **$0** | Free tier (100GB bandwidth) |
| Groq AI | **$0** | Free tier (generous limits) |
| **TOTAL** | **$0/month** | 🎉 |

## Groq API Key Rotation

You have 3 Groq API keys for rotation:

```bash
# Primary
GROQ_API_KEY=your_primary_groq_key_here

# Backup 1
GROQ_API_KEY_2=your_backup_key_1_here

# Backup 2
GROQ_API_KEY_3=your_backup_key_2_here
```

If you hit rate limits, update the environment variable in Vercel.

## Troubleshooting

### Frontend Not Loading
- Check Vercel build logs
- Verify `studio/package.json` has correct dependencies
- Ensure `NEXT_PUBLIC_AI_AGENTS_URL` is set

### Backend API Errors
- Check Vercel Function logs
- Verify `GROQ_API_KEY` is set correctly
- Test Groq API key: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`

### Student Chat Not Working
- Open browser console (F12)
- Check for CORS errors
- Verify WebSocket connection to `/api/agents/chat`

### Teacher Magic School Not Generating
- Check Groq API rate limits
- Verify `LLM_PROVIDER=groq` is set
- Check backend logs for errors

## Local Development

```bash
# Frontend
cd studio
npm install
npm run dev  # http://localhost:5173

# Backend
cd ai-agents
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn syncsenta_agents.api.server:app --reload --port 8001
```

## Production Checklist

- [ ] Groq API key added to Vercel
- [ ] Frontend deployed successfully
- [ ] Backend API responding
- [ ] Student chat working
- [ ] Teacher Magic School generating content
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled (optional)

## Support

- **Groq Issues**: https://console.groq.com/docs
- **Vercel Issues**: https://vercel.com/docs
- **SyncSenta Issues**: Open GitHub issue

## Next Steps

1. **Custom Domain**: Add your own domain in Vercel settings
2. **Database**: Add Supabase (free tier) for user data
3. **Analytics**: Add Vercel Analytics (free)
4. **Monitoring**: Add Sentry (free tier) for error tracking

---

**Deployment Time**: ~5 minutes  
**Monthly Cost**: $0  
**Scalability**: Automatic (Vercel Edge)
