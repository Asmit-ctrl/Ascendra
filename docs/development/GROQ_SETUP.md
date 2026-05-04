# 🚀 Groq Setup Guide - FREE & Ultra-Fast AI

Groq provides **FREE, ultra-fast LLM inference** - perfect for SyncSenta!

## Why Groq?

| Feature | Groq | Ollama | Dify | Azure OpenAI |
|---------|------|--------|------|--------------|
| **Cost** | ✅ FREE | ✅ FREE | 💰 $20-50/mo | 💰 Pay-per-use |
| **Speed** | ⚡ Ultra-fast | ⚠️ Slow (CPU) | ⚠️ Medium | ⚠️ Medium |
| **Quality** | ✅ Excellent | ⚠️ Poor (small models) | ✅ Good | ✅ Excellent |
| **Setup** | ✅ 2 minutes | ❌ Complex | ✅ Easy | ⚠️ Medium |
| **Crashes laptop** | ✅ No | ❌ Yes | ✅ No | ✅ No |
| **Scales** | ✅ Unlimited | ❌ No | ⚠️ Limited | ✅ Unlimited |

**Winner: Groq** - FREE, fast, and no laptop crashes!

## Step 1: Get FREE Groq API Key

1. Go to https://console.groq.com/
2. Sign up (FREE - no credit card required!)
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy your key (starts with `gsk_...`)

## Step 2: Configure SyncSenta

Edit `ai-agents/.env`:

```bash
cd ai-agents
cp .env.example .env
nano .env  # or use any editor
```

Set these values:

```bash
# Use Groq (RECOMMENDED)
LLM_PROVIDER=groq

# Your Groq API key
GROQ_API_KEY=gsk_your_actual_key_here

# Model to use (RECOMMENDED: llama-3.1-70b-versatile)
GROQ_MODEL=llama-3.1-70b-versatile
```

## Step 3: Start Services

### Option A: Automated (Easiest)
```bash
./scripts/start-dev.sh
```

### Option B: Manual

**Terminal 1 - AI Agents:**
```bash
cd ai-agents
python -m syncsenta_agents.main
```

**Terminal 2 - Frontend:**
```bash
cd studio
npm run dev
```

## Step 4: Test

Open http://localhost:5173/student and start chatting!

## Available Groq Models

| Model | Speed | Quality | Best For |
|-------|-------|---------|----------|
| **llama-3.1-70b-versatile** | ⚡⚡ Fast | ⭐⭐⭐ Excellent | **RECOMMENDED - General use** |
| llama-3.1-8b-instant | ⚡⚡⚡ Ultra-fast | ⭐⭐ Good | Quick responses |
| llama-3.1-405b-reasoning | ⚡ Slower | ⭐⭐⭐⭐ Best | Complex reasoning |
| mixtral-8x7b-32768 | ⚡⚡ Fast | ⭐⭐⭐ Excellent | Long context |
| gemma2-9b-it | ⚡⚡⚡ Ultra-fast | ⭐⭐ Good | Instruction following |

**Default:** `llama-3.1-70b-versatile` (best balance)

## Groq FREE Tier Limits

- **Requests:** 30 requests/minute
- **Tokens:** 6,000 tokens/minute
- **Daily:** 14,400 requests/day

**More than enough for testing with students!**

## Troubleshooting

### "GROQ_API_KEY not found"
```bash
# Make sure .env file exists
ls ai-agents/.env

# Check if key is set
grep GROQ_API_KEY ai-agents/.env
```

### "Rate limit exceeded"
You're hitting the FREE tier limits. Either:
- Wait a minute
- Upgrade to Groq Pro (still cheap!)
- Use a different model (8b is faster)

### "Invalid API key"
- Make sure key starts with `gsk_`
- No spaces or quotes in .env file
- Get a new key from https://console.groq.com/keys

## Comparison with Other Options

### vs Ollama (Local)
- ✅ Groq: No crashes, faster, better quality
- ❌ Ollama: Crashes laptop, slow on CPU, poor quality

### vs Dify
- ✅ Groq: FREE, faster, direct API
- ❌ Dify: Costs money, middleman service

### vs Azure OpenAI
- ✅ Groq: FREE, simpler setup
- ⚠️ Azure: Better for production, costs money

## For Production

Groq FREE tier is fine for:
- ✅ Testing with students
- ✅ Small classrooms (< 30 students)
- ✅ Development

For larger scale:
- Upgrade to Groq Pro ($0.27/M tokens)
- Or switch to Azure OpenAI

## Next Steps

1. ✅ Get Groq API key
2. ✅ Configure `.env`
3. ✅ Start services
4. ✅ Test at http://localhost:5173/student
5. ✅ Share URL with students!

## Resources

- **Groq Console:** https://console.groq.com/
- **Groq Docs:** https://console.groq.com/docs
- **Pricing:** https://wow.groq.com/pricing/
- **Models:** https://console.groq.com/docs/models

---

**Ready to start?** Just get your API key and run `./scripts/start-dev.sh`!
