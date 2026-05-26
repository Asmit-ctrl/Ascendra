# Quick Fix: Apply Training Data Export Migration

## Problem
Your production database is missing the `exported_at` column in the `schemes` table, causing the error:
```
Could not find the 'exported_at' column of 'schemes' in the schema cache (PGRST204)
```

## Solution
Apply the migration that adds the missing columns.

---

## Option 1: Supabase Dashboard (Fastest - 2 minutes)

### Steps:
1. **Go to Supabase SQL Editor**
   - URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
   - Or: Supabase Dashboard → Your Project → SQL Editor → New Query

2. **Copy the migration SQL**
   - Open: `Ascendra/supabase/migrations/20260522000002_training_data_export.sql`
   - Copy the entire file contents

3. **Paste and Run**
   - Paste into the SQL Editor
   - Click **"Run"** button
   - Wait for success message

4. **Verify**
   Run this query to confirm columns exist:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'schemes' 
   AND column_name IN ('exported_at', 'storage_path', 'is_training_data', 'export_format');
   ```
   
   Should return 4 rows.

5. **Test the export feature**
   - Go to your frontend
   - Try exporting a scheme again
   - Should work now!

---

## Option 2: Supabase CLI (If you have it installed)

```bash
# Navigate to Ascendra directory
cd Ascendra

# Link to your remote project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push

# Verify
supabase db diff
```

---

## Option 3: Direct PostgreSQL Connection

If you have direct database access:

```bash
# Connect to your database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run the migration file
\i Ascendra/supabase/migrations/20260522000002_training_data_export.sql

# Verify
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'schemes' 
AND column_name IN ('exported_at', 'storage_path', 'is_training_data');
```

---

## What This Migration Does

Adds to `schemes` table:
- ✅ `storage_path` - Path to exported file in storage
- ✅ `exported_at` - Timestamp of last export
- ✅ `export_format` - Format of export (json/csv)
- ✅ `is_training_data` - Flag for training data

Creates new table:
- ✅ `training_exports` - Tracks batch exports

Adds functions:
- ✅ `mark_scheme_as_training_data()` - Mark schemes as exported
- ✅ `get_training_data_stats()` - Get export statistics
- ✅ `get_exportable_schemes()` - Find schemes ready to export

---

## After Migration

Your export feature will work:
- Export schemes to training data ✅
- Track export history ✅
- View export statistics ✅
- Re-export updated schemes ✅

---

## Troubleshooting

### "relation already exists"
The migration uses `IF NOT EXISTS` so it's safe to run multiple times.

### "permission denied"
Make sure you're using the service role key or database owner credentials.

### Still getting PGRST204 error
1. Refresh your PostgREST schema cache:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
2. Or restart your Supabase project (Settings → General → Restart project)

---

## Quick Verification Script

Run this in Supabase SQL Editor to check everything:

```sql
-- Check columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'schemes' 
AND column_name IN ('exported_at', 'storage_path', 'is_training_data', 'export_format')
ORDER BY column_name;

-- Check training_exports table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'training_exports'
) as training_exports_exists;

-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'mark_scheme_as_training_data',
  'get_training_data_stats',
  'get_exportable_schemes'
)
ORDER BY routine_name;
```

Expected output:
- 4 columns in schemes table
- training_exports table exists: `true`
- 3 functions exist

---

## Need Help?

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Check backend logs: Render Dashboard → Your Service → Logs
3. Verify environment variables are set correctly
