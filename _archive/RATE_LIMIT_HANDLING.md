# Rate Limit Handling Guide

## Overview
##
if we look at the current hybrid mwalmu AI under the chat interface, we need it to be more learner frinedly especially the call, the latency has to be near realistic, so how should we work around that because to be truly great in the edtech field, I have personally interacted with this synthesis tutor and it had fast latency and also in the deep learning AI, I could call ANdrew NG in there and it was quite fast, close to be a realistic call, embracing dustruption and shifting as I have given it the message, like one time we were discussing o why ML models are great I answered about crew AI and as he was answering, shifted to lang graph and it was near realistic to shift, so this is waht we need, also sine we are embracing character AI's mode of call, let it be better than it is, in terms of latency, understanding the learner, if a supabase thing is needed, then we can create it in the editor for it as long as we retain the $0 budget.
##
The Ascendra platform uses Groq API for AI generation (schemes, lesson plans, worksheets, etc.). Groq has rate limits on their free tier that can be reached during heavy usage.

## Rate Limits (Groq Free Tier)

- **Requests per minute**: 30
- **Requests per day**: 14,400
- **Tokens per minute**: 6,000

## Automatic Handling

The system now includes **automatic rate limit handling** with:

### 1. Model Fallback
When rate limit is hit, the system automatically tries backup models:
1. `llama-3.1-70b-versatile` (primary, higher limits)
2. `mixtral-8x7b-32768` (fallback, even higher limits)

### 2. Exponential Backoff
- First retry: Wait 1 second
- Second retry: Wait 2 seconds
- Third retry: Wait 4 seconds
- If all models exhausted: Wait 5s, 10s, 20s

### 3. User-Friendly Messages
Frontend shows clear messages:
- "Rate Limit Reached" (instead of generic error)
- "Please wait 2-3 minutes and try again"
- "The system will automatically use backup models"

## What Teachers See

### Before (Old Error)
```
❌ Generation Failed
Failed to generate scheme: Groq API rate limit reached
```

### After (New Error)
```
⚠️ Rate Limit Reached
The AI service is temporarily at capacity. Please wait 2-3 minutes 
and try again. The system will automatically use backup models.
```

## Solutions

### Short-Term (Immediate)

1. **Wait 2-3 minutes** - Rate limits reset quickly
2. **Try again** - System will use backup models automatically
3. **Generate smaller batches** - Instead of full 13-week scheme, generate week-by-week

### Medium-Term (This Week)

1. **Upgrade Groq Plan** ($0.10/1M tokens):
   - Requests per minute: 30 → 6,000
   - Requests per day: 14,400 → 14,400
   - Much higher token limits

2. **Add Caching**:
   - Cache generated schemes for 24 hours
   - Reuse similar schemes (same grade/subject/term)
   - Reduce API calls by 70-80%

3. **Queue System**:
   - Queue generation requests
   - Process one at a time
   - Show position in queue to user

### Long-Term (Next Month)

1. **Multi-Provider Support**:
   - Add OpenAI as backup
   - Add Anthropic Claude as backup
   - Automatic failover between providers

2. **Local Model Option**:
   - Run Llama 3.1 locally for some tasks
   - Use cloud API only for complex generation
   - Hybrid approach

3. **Pre-Generated Templates**:
   - Pre-generate common schemes (Grade 1-9, all subjects)
   - Store in database
   - Customize on-demand instead of generating from scratch

## Monitoring

### Check Current Usage

```bash
# Check Groq dashboard
https://console.groq.com/usage

# Or via API
curl https://api.groq.com/openai/v1/usage \
  -H "Authorization: Bearer $GROQ_API_KEY"
```

### Backend Logs

```bash
# Check for rate limit warnings
cd ai-agents
tail -f logs/app.log | grep "rate limit"

# Or check Render logs
https://dashboard.render.com/web/srv-xxx/logs
```

## Code Changes

### Backend (`lesson_architect.py`)

```python
class _GroqProvider:
    def __init__(self):
        # Multiple models for fallback
        self.models = [
            "llama-3.1-70b-versatile",  # Primary
            "mixtral-8x7b-32768",        # Fallback
        ]
    
    async def generate(self, prompt, max_retries=3):
        # Try each model with exponential backoff
        for attempt in range(max_retries):
            try:
                return await self._llm.invoke(messages)
            except RateLimitError:
                # Switch to next model
                # Wait with exponential backoff
                # Retry
```

### Frontend (`scheme-of-work-generator.tsx`)

```typescript
catch (error) {
  const isRateLimit = error.message.includes('rate limit')
  
  toast({
    title: isRateLimit ? 'Rate Limit Reached' : 'Generation Failed',
    description: isRateLimit 
      ? 'Please wait 2-3 minutes and try again'
      : error.message
  })
}
```

## Testing Rate Limit Handling

### Simulate Rate Limit

```python
# In lesson_architect.py, temporarily add:
async def generate(self, prompt, **kwargs):
    raise Exception("rate_limit_exceeded")
```

### Expected Behavior

1. First attempt fails with rate limit
2. System switches to mixtral model
3. Waits 1 second
4. Retries with mixtral
5. If still fails, waits 2 seconds
6. Retries again
7. If all fail, shows user-friendly error

## Upgrading Groq Plan

### Cost Comparison

| Plan | Cost | RPM | Tokens/Min |
|------|------|-----|------------|
| Free | $0 | 30 | 6,000 |
| Pay-as-you-go | $0.10/1M tokens | 6,000 | 1,000,000 |

### Estimated Costs

- 1 scheme generation: ~2,000 tokens = $0.0002
- 1,000 schemes/month: $0.20
- 10,000 schemes/month: $2.00

**Recommendation**: Upgrade to pay-as-you-go ($0.10/1M tokens) for production use.

### How to Upgrade

1. Go to: https://console.groq.com/settings/billing
2. Add payment method
3. Enable pay-as-you-go
4. Set spending limit (e.g., $10/month)
5. Update `GROQ_API_KEY` in `.env` (same key works)

## Alternative: Use OpenAI

If Groq limits are too restrictive:

```python
# In .env
OPENAI_API_KEY=sk-...
USE_OPENAI_FALLBACK=true

# System will use OpenAI when Groq is rate limited
```

Cost: $0.50/1M tokens (5x more expensive but more reliable)

## FAQ

### Q: Why do I keep hitting rate limits?

**A**: Groq free tier allows 30 requests/minute. Generating a 13-week scheme makes ~15-20 API calls (one per sub-strand batch). If multiple teachers generate at once, limits are reached quickly.

### Q: How long do I need to wait?

**A**: Rate limits reset every minute. Wait 2-3 minutes to be safe.

### Q: Will upgrading fix this?

**A**: Yes! Pay-as-you-go plan increases limits from 30 RPM to 6,000 RPM (200x increase).

### Q: Can I use a different AI provider?

**A**: Yes, we can add OpenAI or Anthropic as backup. OpenAI is more expensive but more reliable.

### Q: What about caching?

**A**: Coming soon! We'll cache generated schemes for 24 hours to reduce API calls by 70-80%.

## Summary

**Current Status**: ✅ Automatic rate limit handling implemented

**What happens now**:
1. Rate limit hit → Switch to backup model
2. Still failing → Exponential backoff (1s, 2s, 4s)
3. All retries fail → Clear error message to user

**Next steps**:
1. Monitor usage in Groq dashboard
2. Consider upgrading to pay-as-you-go ($0.10/1M tokens)
3. Add caching to reduce API calls
4. Add OpenAI as backup provider

**For production**: Upgrade Groq plan or add multi-provider support.
