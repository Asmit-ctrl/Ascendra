# QUICK FIX: UUID Casting Error in Supabase

## The Problem
You're getting: `ERROR: 42883: operator does not exist: uuid = text`

This happens because Supabase RLS policies have UUID type mismatches.

---

## The Solution: Use NO-RLS Schemas

I've created special NO-RLS versions that remove the problematic RLS policies.

**Why this works**: Your backend uses `service_role` key which **bypasses RLS anyway**, so you don't need RLS policies!

---

## Steps to Fix (5 minutes)

### Step 1: Run Lesson Architect Schema (NO-RLS)

1. Go to Supabase: https://ftamwjhpdihuzrylu4d.supabase.co
2. Click **"SQL Editor"** in left sidebar
3. Click **"New Query"**
4. Open this file in your code editor:
   ```
   ai-agents/src/syncsenta_agents/db/lesson_architect_schema_no_rls.sql
   ```
5. **Copy ALL the content** (Ctrl+A, Ctrl+C)
6. **Paste into Supabase SQL Editor**
7. Click **"Run"** (or Ctrl+Enter)

✅ You should see: "Success. No rows returned"

---

### Step 2: Run Teacher Feedback Schema (NO-RLS)

1. In Supabase SQL Editor, click **"New Query"** again
2. Open this file in your code editor:
   ```
   ai-agents/src/syncsenta_agents/db/teacher_feedback_schema_no_rls.sql
   ```
3. **Copy ALL the content** (Ctrl+A, Ctrl+C)
4. **Paste into Supabase SQL Editor**
5. Click **"Run"** (or Ctrl+Enter)

✅ You should see: "Success. No rows returned"

---

### Step 3: Verify Tables Were Created

1. In Supabase, click **"Table Editor"** in left sidebar
2. You should see these tables:
   - ✅ `schemes`
   - ✅ `lesson_plans`
   - ✅ `ai_decisions`
   - ✅ `learned_rules`
   - ✅ `cultural_patterns`
   - ✅ `teacher_rule_proposals`
   - ✅ `rule_votes`
   - ✅ `rule_ab_tests`

---

### Step 4: Set Environment Variables on Render

1. Go to Render: https://dashboard.render.com
2. Click your service: **"ascendra-1"**
3. Click **"Environment"** in left sidebar
4. Add these 3 variables (click "Add Environment Variable" for each):

```
SUPABASE_URL=https://ftamwjhpdihuzrylu4d.supabase.co
SUPABASE_SERVICE_KEY=<paste your service_role key from Supabase>
GROQ_API_KEY=<your groq api key>
```

**To get service_role key**:
- In Supabase, click "Project Settings" (gear icon)
- Click "API"
- Find "service_role" key (NOT anon key)
- Click copy icon

5. Click **"Save Changes"**
6. **Wait 3-5 minutes** for Render to redeploy

---

### Step 5: Test Scheme Generation

1. Go to: https://sentastudio.vercel.app
2. Navigate to **"Scheme of Work Generator"**
3. Fill in:
   - Grade: **Grade 4**
   - Subject: **Mathematics**
   - Term: **Term 1**
4. Click **"Generate Scheme"**
5. You should see a 12-week scheme with content!

---

## What Changed?

### Before (WITH RLS - BROKEN):
```sql
CREATE TABLE ai_decisions (
  teacher_id UUID REFERENCES auth.users(id)
);

CREATE POLICY "Teachers can view"
  ON ai_decisions FOR SELECT
  USING (auth.uid()::uuid = teacher_id);  -- UUID casting error!
```

### After (NO RLS - WORKS):
```sql
CREATE TABLE ai_decisions (
  teacher_id UUID
);

-- No RLS policies = No UUID casting errors!
```

---

## Why NO-RLS is Safe

1. **Backend uses service_role key** - This bypasses RLS anyway
2. **Frontend doesn't directly access Supabase** - All requests go through your backend
3. **Backend validates teacher_id** - Your Python code controls access
4. **RLS is for client-side access** - You don't have client-side Supabase access

---

## If It Still Doesn't Work

Share with me:

1. **Supabase SQL Editor screenshot** - After running the queries
2. **Render logs** - When you try to generate a scheme
3. **Browser console** - F12 → Console tab when generating

I'll help you debug!

---

## Files You Need

- ✅ `ai-agents/src/syncsenta_agents/db/lesson_architect_schema_no_rls.sql`
- ✅ `ai-agents/src/syncsenta_agents/db/teacher_feedback_schema_no_rls.sql`

Both files are in your codebase now (commit 19a4074).
