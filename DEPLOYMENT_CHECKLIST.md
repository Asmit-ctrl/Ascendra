# SyncSenta Deployment Checklist

## ✅ Completed Steps

### 1. Code Fixes (Commit: 8e14dda)
- ✅ Fixed UUID casting in SQL RLS policies (`auth.uid()::uuid`)
- ✅ Moved INDEX declarations outside CREATE TABLE statements
- ✅ Added `supabase` dependency to pyproject.toml
- ✅ Pushed to GitHub (Render will auto-deploy in 3-5 minutes)

---

## 🔄 Next Steps (YOU NEED TO DO THESE)

### Step 1: Run Lesson Architect SQL in Supabase (NO-RLS VERSION)

**IMPORTANT**: Use the NO-RLS version to avoid UUID casting errors!

1. **Go to Supabase**: https://ftamwjhpdihuzrylu4d.supabase.co
2. **Click "SQL Editor"** in left sidebar
3. **Click "New Query"**
4. **Copy ALL content** from: `ai-agents/src/syncsenta_agents/db/lesson_architect_schema_no_rls.sql`
5. **Paste into SQL Editor**
6. **Click "Run"** (or Ctrl+Enter)

This creates the `schemes` and `lesson_plans` tables WITHOUT RLS policies.

**Why NO-RLS?** The backend uses `service_role` key which bypasses RLS anyway, so RLS policies are not needed and cause UUID casting errors.

---

### Step 2: Run Teacher Feedback SQL in Supabase (NO-RLS VERSION)

**IMPORTANT**: Use the NO-RLS version to avoid UUID casting errors!

1. **In Supabase SQL Editor**, click "New Query"
2. **Copy ALL content** from: `ai-agents/src/syncsenta_agents/db/teacher_feedback_schema_no_rls.sql`
3. **Paste into SQL Editor**
4. **Click "Run"**

This creates the teacher feedback tables WITHOUT RLS policies.

---

### Step 3: Copy Supabase Service Role Key

1. **In Supabase**, click "Project Settings" (gear icon)
2. **Click "API"** in left sidebar
3. **Find "service_role" key** (NOT the anon key)
4. **Click the copy icon** to copy it
5. **Save it temporarily** - you'll need it in Step 4

---

### Step 4: Set Environment Variables on Render

1. **Go to Render**: https://dashboard.render.com
2. **Click your service**: "ascendra-1"
3. **Click "Environment"** in left sidebar
4. **Add these 3 variables**:

```
SUPABASE_URL=https://ftamwjhpdihuzrylu4d.supabase.co
SUPABASE_SERVICE_KEY=<paste the service_role key from Step 3>
GROQ_API_KEY=<your groq api key>
```

5. **Click "Save Changes"**
6. **Wait 3-5 minutes** for Render to redeploy

---

### Step 5: Test Scheme Generation

After Render finishes redeploying:

1. **Go to frontend**: https://sentastudio.vercel.app
2. **Navigate to "Scheme of Work Generator"**
3. **Fill in**:
   - Grade: Grade 4
   - Subject: Mathematics
   - Term: Term 1
4. **Click "Generate Scheme"**
5. **Open browser console** (F12 → Console tab) to see any errors
6. **Check Render logs** if it fails

---

## 🐛 Troubleshooting

### If scheme generation still fails:

1. **Check Render logs**:
   - Go to Render dashboard → ascendra-1 → Logs
   - Look for errors when you try to generate

2. **Check browser console**:
   - Press F12 → Console tab
   - Look for red errors

3. **Verify environment variables**:
   - Render → ascendra-1 → Environment
   - Make sure all 3 variables are set

4. **Verify SQL tables exist**:
   - Supabase → Table Editor
   - Should see: `schemes`, `lesson_plans`, `ai_decisions`, etc.

---

## 📊 What Was Fixed

### SQL Schema Errors
**Problem**: Postgres couldn't compare UUID to TEXT in RLS policies
**Fix**: Cast `auth.uid()` to UUID: `auth.uid()::uuid = teacher_id`

**Problem**: INDEX declarations inside CREATE TABLE (invalid syntax)
**Fix**: Moved all INDEX declarations outside CREATE TABLE statements

### Missing Dependency
**Problem**: `ModuleNotFoundError: No module named 'supabase'`
**Fix**: Added `supabase = "^2.0.0"` to pyproject.toml

---

## 🎯 Expected Result

After completing all steps, you should be able to:

1. ✅ Generate schemes of work (12-week CBC-compliant content)
2. ✅ See scheme content displayed in the UI
3. ✅ Schemes saved to Supabase database
4. ✅ No "database not configured" errors
5. ✅ No CORS or 500 errors

---

## 📝 Files Modified

- `ai-agents/src/syncsenta_agents/db/teacher_feedback_schema.sql` - Fixed UUID casting and INDEX syntax
- `ai-agents/pyproject.toml` - Added supabase dependency

---

## 🚀 Deployment Status

- **GitHub**: ✅ Pushed (commit 8e14dda)
- **Render**: 🔄 Auto-deploying (wait 3-5 minutes)
- **Supabase**: ❌ Need to run SQL scripts (Steps 1-2)
- **Environment Variables**: ❌ Need to set on Render (Step 4)

---

## ⏱️ Time Estimate

- Step 1 (Lesson Architect SQL): 2 minutes
- Step 2 (Teacher Feedback SQL): 2 minutes
- Step 3 (Copy Service Key): 1 minute
- Step 4 (Set Env Variables): 3 minutes
- Step 5 (Test): 2 minutes
- **Total**: ~10 minutes

---

## 🆘 If You Get Stuck

Share with me:
1. **Render logs** (full error message)
2. **Browser console errors** (F12 → Console)
3. **Which step you're on**

I'll help you debug!
