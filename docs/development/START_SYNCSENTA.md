# 🚀 Quick Start Guide - SyncSenta

## Prerequisites Check

Before starting, ensure you have:
- ✅ Ollama installed and running (or use Dify alternative)
- ✅ Python 3.11+ installed
- ✅ Node.js 18+ installed

## Option 1: Using Ollama (Local AI)

### Terminal 1: Start Ollama
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start it
ollama serve

# In another terminal, pull required models (if not already done)
ollama pull llama3.2:1b
ollama pull qwen2.5:0.5b
```

### Terminal 2: Start AI Agents Service
```bash
cd ai-agents

# Create .env file
cp .env.example .env

# Install dependencies (first time only)
pip install -e .

# Start the service
python -m syncsenta_agents.main
```

**Expected output:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8001
```

### Terminal 3: Start Frontend
```bash
cd studio

# Create .env file (first time only)
cp .env.cbc-agent.example .env

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

**Expected output:**
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Access the Application

**Student Interface:**
http://localhost:5173/student

**Teacher Dashboard:**
http://localhost:5173/teacher

---

## Option 2: Using Dify (Cloud AI - Recommended for Testing)

Dify provides a hosted AI service, so you don't need to run Ollama locally.

### Step 1: Get Dify API Key

1. Go to https://cloud.dify.ai/
2. Sign up or log in
3. Create a new application (Chatbot type)
4. Copy your API key from Settings → API Access

### Step 2: Configure Environment

Create `ai-agents/.env`:
```bash
# SyncSenta AI Agents Configuration
ENVIRONMENT=development
DEBUG=true

# Use Dify instead of Ollama
USE_DIFY=true
DIFY_API_KEY=your_dify_api_key_here
DIFY_BASE_URL=https://api.dify.ai/v1

# Fallback to Ollama if Dify fails
OLLAMA_BASE_URL=http://localhost:11434

# Database (optional for testing)
DATABASE_URL=sqlite:///./syncsenta_agents.db

# Cultural Settings
DEFAULT_LANGUAGE=english
CULTURAL_CONTEXT=kenyan
```

### Step 3: Start Services

**Terminal 1: AI Agents with Dify**
```bash
cd ai-agents
pip install -e .
python -m syncsenta_agents.main
```

**Terminal 2: Frontend**
```bash
cd studio
npm install
npm run dev
```

---

## Quick Test Commands

### Test Ollama
```bash
curl http://localhost:11434/api/tags
```

### Test AI Agents Service
```bash
curl http://localhost:8001/healthz
```

### Test Chat Endpoint
```bash
curl -X POST http://localhost:8001/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help with fractions",
    "user_id": "test_student",
    "language": "english"
  }'
```

---

## For Codespaces

If running in GitHub Codespaces, the setup is automatic! Just:

1. Create a Codespace
2. Wait for setup to complete (~10-15 minutes)
3. Run the terminal commands above

Codespaces will provide public URLs for:
- Frontend: `https://[codespace-name]-5173.app.github.dev`
- AI Agents: `https://[codespace-name]-8001.app.github.dev`

**Share the frontend URL with students for testing!**

---

## Troubleshooting

### Ollama not responding
```bash
# Check if running
ps aux | grep ollama

# Restart
pkill ollama
ollama serve
```

### AI Agents service fails
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
cd ai-agents
pip install -e . --force-reinstall
```

### Frontend won't start
```bash
# Clear cache and reinstall
cd studio
rm -rf node_modules .next
npm install
npm run dev
```

### Port already in use
```bash
# Find and kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Find and kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

---

## Production Deployment

For production, see:
- `RENDER_DEPLOYMENT.md` - Deploy to Render.com
- `render.yaml` - Infrastructure as code

---

## What's Running?

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend | 5173 | http://localhost:5173 | Student & Teacher UI |
| AI Agents | 8001 | http://localhost:8001 | Python FastAPI service |
| Ollama | 11434 | http://localhost:11434 | Local AI models |
| Backend (future) | 8080 | http://localhost:8080 | Rust/Axum API |

---

## Next Steps

1. ✅ Get services running
2. 📱 Test student chat interface
3. 👨‍🏫 Test teacher dashboard
4. 🌍 Share URL with students
5. 📊 Monitor agent activity in teacher dashboard

**Need help?** Check the logs in each terminal for error messages.
