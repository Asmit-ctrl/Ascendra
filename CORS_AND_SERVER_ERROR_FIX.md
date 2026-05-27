# CORS and Server Error Fix Documentation

## Problem Summary

After deploying the latest commit, the application encounters two critical errors when trying to generate schemes of work:

### Error 1: CORS Policy Violation
```
Access to fetch at 'https://ascendra-1.onrender.com/lesson-architect/generate-scheme' 
from origin 'https://sentastudio.vercel.app' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### Error 2: Server Error (500)
```
Failed to load resource: the server responded with a status of 500
Generation error: Error: Server error: 500
```

---

## Root Causes

### 1. CORS Error
**What it means:** The backend server (`ascendra-1.onrender.com`) is not configured to accept requests from the frontend domain (`sentastudio.vercel.app`).

**Why it happens:** 
- Cross-Origin Resource Sharing (CORS) is a browser security feature
- When frontend (Vercel) tries to call backend (Render) directly, the browser blocks it
- Backend must explicitly allow the frontend's origin via HTTP headers

### 2. Server 500 Error
**What it means:** The backend code is encountering an internal error during request processing.

**Possible causes:**
- Missing environment variables on Render
- Database connection issues
- Unhandled exceptions in the generation logic
- Missing dependencies or configuration

---

## Solutions Implemented

### ✅ Frontend Fix: Use Vercel Proxy (Immediate Solution)

**File Modified:** [`Ascendra/studio/src/lib/api-config.ts`](Ascendra/studio/src/lib/api-config.ts)

**What changed:**
- In production, API calls now use `/api/*` proxy path instead of direct backend URL
- Vercel's rewrites (configured in [`vercel.json`](Ascendra/studio/vercel.json:57-66)) forward these to the backend
- This bypasses CORS because requests appear to come from the same origin

**How it works:**
```
Frontend Request: https://sentastudio.vercel.app/api/lesson-architect/generate-scheme
                                    ↓
Vercel Rewrite:   https://ascendra-1.onrender.com/lesson-architect/generate-scheme
```

**Benefits:**
- ✅ No CORS errors (same-origin requests)
- ✅ No backend changes required immediately
- ✅ Works with existing [`vercel.json`](Ascendra/studio/vercel.json:57-66) configuration

---

## Backend Fixes Required (For Long-term Solution)

### 🔧 Add CORS Headers to Backend

The backend server needs to be configured to allow requests from the frontend domain.

#### For FastAPI (Python)
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://sentastudio.vercel.app",  # Production frontend
        "http://localhost:3000",            # Local development
        "http://localhost:3001",            # Alternative local port
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)
```

#### For Express (Node.js)
```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Configure CORS
app.use(cors({
    origin: [
        'https://sentastudio.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 🔧 Fix Server 500 Error

**Steps to diagnose:**

1. **Check Render logs:**
   ```bash
   # In Render dashboard, view logs for ascendra-1 service
   # Look for stack traces or error messages around the time of the 500 error
   ```

2. **Verify environment variables:**
   - Ensure all required env vars are set in Render dashboard
   - Check for missing API keys, database URLs, etc.

3. **Test endpoint directly:**
   ```bash
   curl -X POST https://ascendra-1.onrender.com/lesson-architect/generate-scheme \
     -H "Content-Type: application/json" \
     -d '{
       "teacher_id": "test_teacher",
       "grade": "Grade 3",
       "subject": "Mathematics",
       "term": "Term 1",
       "mode": "standard",
       "language": "english"
     }'
   ```

4. **Common fixes:**
   - Add error handling to catch and log exceptions
   - Verify database connections are working
   - Check that all dependencies are installed
   - Ensure sufficient memory/resources on Render

---

## Testing the Fix

### 1. Test Frontend Changes (Immediate)

After deploying the updated [`api-config.ts`](Ascendra/studio/src/lib/api-config.ts):

```bash
# Deploy to Vercel
cd Ascendra/studio
git add .
git commit -m "Fix CORS by using Vercel proxy"
git push

# Vercel will auto-deploy
```

**Expected behavior:**
- ✅ No more CORS errors in browser console
- ⚠️ May still see 500 errors if backend has issues

### 2. Test Backend Changes (After CORS fix)

After adding CORS headers to backend:

```bash
# Test from browser console on https://sentastudio.vercel.app
fetch('https://ascendra-1.onrender.com/lesson-architect/generate-scheme', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teacher_id: 'test',
    grade: 'Grade 3',
    subject: 'Mathematics',
    term: 'Term 1',
    mode: 'standard',
    language: 'english'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Expected behavior:**
- ✅ No CORS errors
- ✅ Successful response (200) or proper error message

---

## Network Retry Logic

The application already has robust retry logic in [`network-utils.ts`](Ascendra/studio/src/lib/network-utils.ts:24-110):

- **Max retries:** 3 attempts
- **Backoff strategy:** Exponential (1s, 2s, 4s)
- **Timeout:** 30 seconds per request
- **Retry conditions:**
  - Network errors (ERR_NETWORK_CHANGED, fetch failures)
  - Server errors (5xx status codes)
  - Timeouts

**Does NOT retry:**
- Client errors (4xx status codes)
- User-aborted requests

---

## Monitoring and Debugging

### Frontend Debugging

Check browser console for:
```javascript
// Success log
console.log('Scheme saved successfully:', {
  scheme_id: data.scheme_id,
  rows: rows.length,
  grade,
  subject,
  term
})

// Error log
console.error('Generation error:', error)
```

### Backend Debugging

Add logging to backend:
```python
import logging

logger = logging.getLogger(__name__)

@app.post("/lesson-architect/generate-scheme")
async def generate_scheme(request: SchemeRequest):
    try:
        logger.info(f"Generating scheme for {request.grade} {request.subject}")
        # ... generation logic
        logger.info(f"Successfully generated {len(rows)} lessons")
        return {"rows": rows, "scheme_id": scheme_id}
    except Exception as e:
        logger.error(f"Generation failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Deployment Checklist

### Frontend (Vercel)
- [x] Updated [`api-config.ts`](Ascendra/studio/src/lib/api-config.ts) to use proxy in production
- [ ] Commit and push changes
- [ ] Verify Vercel auto-deployment succeeds
- [ ] Test in production: https://sentastudio.vercel.app
- [ ] Check browser console for errors

### Backend (Render)
- [ ] Add CORS middleware with correct origins
- [ ] Fix any 500 errors (check logs)
- [ ] Verify environment variables are set
- [ ] Test endpoint directly with curl
- [ ] Monitor logs during frontend testing

---

## Alternative Approaches

### Option 1: Vercel Proxy (Current Implementation) ✅
**Pros:**
- No backend changes needed immediately
- Works with existing configuration
- Same-origin requests (no CORS)

**Cons:**
- Adds latency (extra hop through Vercel)
- Couples frontend deployment to backend availability

### Option 2: Backend CORS Headers (Recommended Long-term)
**Pros:**
- Direct communication (faster)
- Standard approach
- Decouples frontend/backend

**Cons:**
- Requires backend deployment
- Must maintain allowed origins list

### Option 3: Hybrid Approach (Best)
**Use both:**
- Keep Vercel proxy as fallback
- Add CORS headers to backend
- Frontend can use direct URL if CORS is configured

---

## Related Files

- [`Ascendra/studio/src/lib/api-config.ts`](Ascendra/studio/src/lib/api-config.ts) - API configuration (MODIFIED)
- [`Ascendra/studio/src/lib/network-utils.ts`](Ascendra/studio/src/lib/network-utils.ts) - Retry logic
- [`Ascendra/studio/vercel.json`](Ascendra/studio/vercel.json) - Vercel proxy configuration
- [`Ascendra/studio/src/components/teacher/scheme-of-work-generator.tsx`](Ascendra/studio/src/components/teacher/scheme-of-work-generator.tsx) - Component making API calls

---

## Summary

**Immediate fix:** ✅ Frontend now uses Vercel proxy to avoid CORS errors

**Next steps:**
1. Deploy frontend changes to Vercel
2. Add CORS headers to backend (Render)
3. Fix backend 500 errors by checking logs
4. Test end-to-end functionality

**Expected outcome:** Scheme generation should work without CORS or server errors.

---

*Made with Bob*