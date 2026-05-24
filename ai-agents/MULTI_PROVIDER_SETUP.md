# Multi-Provider LLM Setup Guide

This guide explains how to set up multiple LLM providers to avoid rate limits and ensure reliable service for teachers and students.

## Overview

The system uses a **cascading fallback** approach:

1. **Groq** (Primary) - Fastest, free tier, but rate-limited
2. **OpenRouter** (Secondary) - Reliable, 200 free requests/day + pay-as-you-go
3. **Puter.js** (Frontend only) - User-pays model, unlimited for users

When Groq hits rate limits, the system automatically switches to OpenRouter. For frontend applications, Puter.js can be used as a third option where users cover their own AI costs.

---

## Backend Setup (Python)

### 1. Install Dependencies

```bash
cd ai-agents
pip install aiohttp langchain-groq
```

### 2. Configure Environment Variables

Update your `.env` file:

```bash
# Primary: Groq (fastest, free tier)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Secondary: OpenRouter (fallback)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Get API Keys

#### Groq (Free)
1. Visit: https://console.groq.com/keys
2. Sign up for free account
3. Generate API key
4. Free tier: ~14,400 requests/day

#### OpenRouter (Free tier + Pay-as-you-go)
1. Visit: https://openrouter.ai/keys
2. Sign up
3. Generate API key
4. Free tier: 200 requests/day
5. After free tier: $0.0001-0.001 per request (very cheap)

### 4. Usage

The multi-provider client is automatically used by `LessonArchitectAgent`:

```python
from syncsenta_agents.agents.lesson_architect import LessonArchitectAgent

agent = LessonArchitectAgent()
result = await agent.generate_scheme(
    grade="Grade 4",
    subject="Mathematics",
    term="Term 1",
    teacher_id="teacher_123"
)
```

The system will:
1. Try Groq first
2. If Groq is rate-limited, automatically switch to OpenRouter
3. Log which provider was used
4. Track rate limits and retry after cooldown period

### 5. Check Provider Status

```python
from syncsenta_agents.inference.multi_provider_client import get_multi_provider_client

client = get_multi_provider_client()
status = client.get_provider_status()
print(status)
# Output:
# {
#   "groq": {
#     "enabled": True,
#     "rate_limited": False,
#     "retry_in_seconds": 0,
#     "models": ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
#   },
#   "openrouter": {
#     "enabled": True,
#     "rate_limited": False,
#     "retry_in_seconds": 0,
#     "models": ["meta-llama/llama-3.1-70b-instruct", ...]
#   }
# }
```

---

## Frontend Setup (Puter.js - Optional)

Puter.js uses a **user-pays model** where each user covers their own AI costs through their Puter account. This is perfect for avoiding rate limits entirely.

### 1. Install Puter.js

```bash
cd studio
npm install puter
```

### 2. Initialize Puter

```typescript
// lib/puter-client.ts
import puter from 'puter';

export async function initPuter() {
  // Initialize Puter - users will be prompted to sign in
  await puter.auth.signIn();
}

export async function generateWithPuter(
  prompt: string,
  systemPrompt?: string
) {
  try {
    const response = await puter.ai.chat({
      model: 'gpt-4o', // or 'claude-3-5-sonnet'
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 4096
    });
    
    return response.message.content;
  } catch (error) {
    console.error('Puter AI error:', error);
    throw error;
  }
}
```

### 3. Use in Components

```typescript
// components/teacher/scheme-generator.tsx
import { generateWithPuter, initPuter } from '@/lib/puter-client';

export function SchemeGenerator() {
  const [usePuter, setUsePuter] = useState(false);
  
  const generateScheme = async () => {
    if (usePuter) {
      // Use Puter.js (user-pays, unlimited)
      await initPuter(); // Prompt user to sign in
      const result = await generateWithPuter(
        `Generate a scheme for Grade 4 Mathematics Term 1`,
        SYSTEM_PROMPT
      );
      // Process result...
    } else {
      // Use backend API (Groq → OpenRouter fallback)
      const response = await fetch('/api/generate-scheme', {
        method: 'POST',
        body: JSON.stringify({ grade, subject, term })
      });
      // Process response...
    }
  };
  
  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={usePuter}
          onChange={(e) => setUsePuter(e.target.checked)}
        />
        Use Puter.js (unlimited, requires sign-in)
      </label>
      <button onClick={generateScheme}>Generate Scheme</button>
    </div>
  );
}
```

### 4. Puter.js Benefits

- **Unlimited usage** - No rate limits for your app
- **Free for developers** - Users pay for their own usage
- **400+ models** - Access to OpenAI, Anthropic, Google, Meta, etc.
- **No backend needed** - Works entirely in the browser

### 5. Puter.js Limitations

- **Requires user authentication** - Users must create Puter accounts
- **Users pay** - Users need Puter credits (free tier available)
- **Frontend only** - Cannot be used in backend Python code

---

## Cost Comparison

| Provider | Free Tier | Cost After Free | Best For |
|----------|-----------|-----------------|----------|
| **Groq** | ~14,400 req/day | N/A (free only) | Primary, fastest |
| **OpenRouter** | 200 req/day | $0.0001-0.001/req | Reliable fallback |
| **Puter.js** | User's free tier | User pays | Unlimited frontend |

### Example Monthly Costs (1000 teachers, 50 requests/day each)

- **Groq only**: FREE (but will hit rate limits)
- **Groq + OpenRouter**: ~$50-150/month (after Groq limits)
- **Groq + OpenRouter + Puter.js**: ~$20-50/month (users cover overflow)

---

## Monitoring & Alerts

### Check Rate Limit Status

```bash
# In Python backend
curl http://localhost:8001/health/providers
```

Response:
```json
{
  "groq": {
    "status": "rate_limited",
    "retry_in_seconds": 87,
    "last_error": "Rate limit exceeded"
  },
  "openrouter": {
    "status": "active",
    "requests_today": 45
  }
}
```

### Logs

The system logs provider switches:

```
INFO: Attempting generation with groq (attempt 1/3)
WARNING: Rate limit hit on groq
INFO: Attempting generation with openrouter (attempt 1/3)
INFO: ✅ Success with openrouter
```

---

## Troubleshooting

### "All LLM providers failed"

**Cause**: Both Groq and OpenRouter are unavailable or rate-limited.

**Solution**:
1. Check API keys are valid
2. Wait for rate limits to reset (2 minutes for Groq, 1 minute for OpenRouter)
3. Add Puter.js as frontend fallback
4. Consider upgrading OpenRouter plan

### "OpenRouter API error 402: Insufficient credits"

**Cause**: OpenRouter free tier exhausted and no payment method added.

**Solution**:
1. Add payment method to OpenRouter account
2. Or wait 24 hours for free tier to reset
3. Or use Puter.js in frontend

### "Puter authentication required"

**Cause**: User hasn't signed into Puter.

**Solution**:
1. Call `await puter.auth.signIn()` before using AI
2. User will see Puter sign-in dialog
3. After sign-in, AI calls will work

---

## Best Practices

1. **Always set OPENROUTER_API_KEY** - Ensures fallback when Groq is rate-limited
2. **Monitor usage** - Check provider status regularly
3. **Offer Puter.js option** - Let users choose unlimited access
4. **Cache results** - Store generated schemes to reduce API calls
5. **Batch requests** - Generate multiple lessons in one call when possible

---

## Support

- **Groq**: https://console.groq.com/docs
- **OpenRouter**: https://openrouter.ai/docs
- **Puter.js**: https://developer.puter.com/tutorials/free-unlimited-ai-api

---

## Summary

✅ **Backend**: Groq → OpenRouter automatic fallback (no code changes needed)  
✅ **Frontend**: Optional Puter.js for unlimited user-pays access  
✅ **Cost**: Free tier covers most usage, minimal cost for overflow  
✅ **Reliability**: Multiple providers ensure service availability
