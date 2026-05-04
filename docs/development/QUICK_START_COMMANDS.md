# 🚀 Quick Start Commands

## Easiest Way (Automated Script)

```bash
./start-dev.sh
```

This will:
- ✅ Create .env files if missing
- ✅ Start AI Agents service (port 8001)
- ✅ Start Frontend (port 5173)
- ✅ Show you the URLs to access
- ✅ Handle cleanup on Ctrl+C

---

## Manual Start (3 Terminals)

### Terminal 1: Ollama (if not using Dify)
```bash
ollama serve
```

### Terminal 2: AI Agents
```bash
cd ai-agents
cp .env.example .env  # First time only
pip install -e .      # First time only
python -m syncsenta_agents.main
```

### Terminal 3: Frontend
```bash
cd studio
cp .env.cbc-agent.example .env  # First time only
npm install                      # First time only
npm run dev
```

---

## Using Dify Instead of Ollama

1. **Get Dify API Key:**
   - Go to https://cloud.dify.ai/
   - Sign up and create an app
   - Copy your API key

2. **Configure:**
   ```bash
   cd ai-agents
   nano .env  # or use any editor
   ```
   
   Set:
   ```
   USE_DIFY=true
   DIFY_API_KEY=your_actual_api_key_here
   ```

3. **Start (skip Ollama):**
   ```bash
   # Terminal 1: AI Agents
   cd ai-agents
   python -m syncsenta_agents.main
   
   # Terminal 2: Frontend
   cd studio
   npm run dev
   ```

---

## Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Student Chat** | http://localhost:5173/student | Main student interface |
| **Teacher Dashboard** | http://localhost:5173/teacher | Teacher monitoring |
| **API Health** | http://localhost:8001/healthz | Check if AI agents are running |
| **Ollama** | http://localhost:11434/api/tags | Check Ollama models |

---

## Quick Tests

### Test AI Agents
```bash
curl http://localhost:8001/healthz
```

### Test Chat
```bash
curl -X POST http://localhost:8001/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, help me with fractions",
    "user_id": "test_student",
    "language": "english"
  }'
```

### Test Ollama
```bash
curl http://localhost:11434/api/tags
```

---

## For Students to Test

Once running, share this URL with students:

**http://localhost:5173/student**

Or if in Codespaces:

**https://[your-codespace-name]-5173.app.github.dev/student**

---

## Troubleshooting

### Port already in use
```bash
# Kill process on port 8001
lsof -ti:8001 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Ollama not responding
```bash
pkill ollama
ollama serve
```

### AI Agents won't start
```bash
cd ai-agents
pip install -e . --force-reinstall
python -m syncsenta_agents.main
```

### Frontend won't start
```bash
cd studio
rm -rf node_modules .next
npm install
npm run dev
```

---

## Stop Everything

If using the automated script:
```bash
Ctrl+C
```

If running manually, press `Ctrl+C` in each terminal.

---

## View Logs

If using automated script:
```bash
tail -f logs/ai-agents.log
tail -f logs/frontend.log
```

---

## First Time Setup Checklist

- [ ] Install Python 3.11+
- [ ] Install Node.js 18+
- [ ] Install Ollama (or get Dify API key)
- [ ] Clone repository
- [ ] Run `./start-dev.sh` OR follow manual steps
- [ ] Access http://localhost:5173/student
- [ ] Test chat functionality
- [ ] Share URL with students

---

**Need more details?** See `START_SYNCSENTA.md`
