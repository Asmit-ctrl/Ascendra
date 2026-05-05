# SyncSenta Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Import Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository: `dgithinjibit/Ascendra`
4. Select the repository and click **"Import"**

### 2. Configure Project Settings

**Framework Preset:** Next.js  
**Root Directory:** `studio`  
**Build Command:** `npm run build`  
**Output Directory:** `.next`  
**Install Command:** `npm install`

### 3. Set Environment Variables

In Vercel project settings → **Environment Variables**, add:

#### Required Variables:

```bash
# Groq AI API Key (REQUIRED)
# Get your FREE key at: https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here

# Groq Model Configuration
GROQ_MODEL=llama-3.3-70b-versatile
LLM_PROVIDER=groq

# Backup Groq Keys (for rate limiting - optional)
GROQ_API_KEY_2=your_backup_key_1_here
GROQ_API_KEY_3=your_backup_key_2_here

# Environment
ENVIRONMENT=production
DEBUG=false
```

**📝 Note:** Use the actual Groq API keys from your `.env` file (not committed to Git)

#### Frontend URL (Update after first deployment):

After your first deployment, Vercel will give you a URL like `https://your-app.vercel.app`

Then add this variable:

```bash
NEXT_PUBLIC_AI_AGENTS_URL=https://your-app.vercel.app/api/agents
```

### 4. Deploy Python Backend as Vercel Serverless Functions

The Python backend (`ai-agents/`) will be deployed as Vercel Serverless Functions.

**File Structure:**
```
api/
├── agents/
│   └── chat.py          # Main chat endpoint
├── telemetry/
│   └── analyze.py       # Telemetry analysis endpoint
└── requirements.txt     # Python dependencies
```

### 5. Click Deploy!

Vercel will automatically:
- Install dependencies
- Build the Next.js frontend
- Deploy serverless functions
- Provide you with a production URL

---

## 📋 Environment Variables Reference

### Groq API Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GROQ_API_KEY` | Primary Groq API key | ✅ Yes | - |
| `GROQ_API_KEY_2` | Backup key #1 | ❌ No | - |
| `GROQ_API_KEY_3` | Backup key #2 | ❌ No | - |
| `GROQ_MODEL` | Model to use | ❌ No | `llama-3.3-70b-versatile` |
| `LLM_PROVIDER` | Provider name | ❌ No | `groq` |

### Frontend Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_AI_AGENTS_URL` | Backend API URL | ✅ Yes | `http://localhost:8001` |

### Optional Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENVIRONMENT` | Environment name | ❌ No | `development` |
| `DEBUG` | Enable debug mode | ❌ No | `true` |

---

## 🔧 Post-Deployment Configuration

### Update Frontend URL

After deployment, update the environment variable:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit `NEXT_PUBLIC_AI_AGENTS_URL`
3. Set it to: `https://your-actual-domain.vercel.app/api/agents`
4. Redeploy the project

### Test the Deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. Navigate to the Teacher Dashboard
3. Try generating a Scheme of Work or Lesson Plan
4. Check that AI responses are working

---

## 🐛 Troubleshooting

### Issue: "GROQ_API_KEY is required"

**Solution:** Make sure you've added the `GROQ_API_KEY` environment variable in Vercel settings.

### Issue: "Failed to generate"

**Solution:** 
1. Check Vercel Function Logs for errors
2. Verify Groq API key is valid
3. Check rate limits (Groq free tier has limits)

### Issue: "Network error"

**Solution:**
1. Verify `NEXT_PUBLIC_AI_AGENTS_URL` is set correctly
2. Check that serverless functions are deployed
3. Look at Vercel deployment logs

---

## 📊 Monitoring

### Vercel Analytics

Enable Vercel Analytics to monitor:
- Page views
- API calls
- Performance metrics
- Error rates

### Groq Usage

Monitor your Groq API usage at: https://console.groq.com/usage

Free tier limits:
- 30 requests per minute
- 6,000 tokens per minute

---

## 🔐 Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use Vercel Environment Variables** - They're encrypted and secure
3. **Rotate API keys regularly** - Update in Vercel settings
4. **Use backup keys** - For high availability
5. **Monitor usage** - Watch for unusual activity

---

## 🚀 Production Checklist

- [ ] Repository imported to Vercel
- [ ] Environment variables configured
- [ ] First deployment successful
- [ ] `NEXT_PUBLIC_AI_AGENTS_URL` updated
- [ ] Teacher dashboard accessible
- [ ] AI generation working
- [ ] Scheme of Work generator tested
- [ ] Lesson Plan generator tested
- [ ] Assessment generator tested
- [ ] Student monitoring displaying data
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error monitoring set up

---

## 📞 Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check Vercel function logs
3. Verify environment variables
4. Test Groq API key directly: https://console.groq.com/playground
5. Review this guide again

---

## 🎉 Success!

Once deployed, your SyncSenta platform will be live at:
- **Production URL:** `https://your-app.vercel.app`
- **Teacher Dashboard:** `https://your-app.vercel.app/teacher-dashboard`
- **API Endpoint:** `https://your-app.vercel.app/api/agents/chat`

**Cost:** $0/month (using Groq free tier + Vercel free tier)

Enjoy your production-ready AI-powered education platform! 🎓✨
