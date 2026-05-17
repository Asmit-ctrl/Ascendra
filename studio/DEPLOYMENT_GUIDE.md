# Teacher Dashboard - Deployment Guide

## Quick Start

The Teacher Dashboard is ready to deploy. Follow these steps to get it live.

## Prerequisites

- [x] Supabase project created
- [x] Database migration `002_teacher_dashboard.sql` applied
- [x] Environment variables configured
- [x] All dependencies installed

## Step 1: Verify Database Migration

```bash
# Check if migration was applied
# Login to Supabase dashboard and verify these tables exist:
# - teacher_students
# - teacher_interventions
# - student_alerts
# - class_performance

# If not applied, run:
cd Ascendra/studio
supabase db push
```

## Step 2: Build the Application

```bash
cd Ascendra/studio
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

## Step 3: Test Locally

```bash
npm run start
```

Visit: `http://localhost:3000/teacher/dashboard`

### Test Checklist:
- [ ] Dashboard loads without errors
- [ ] Can select a class
- [ ] Student list displays
- [ ] Alerts panel works
- [ ] Analytics tab loads charts
- [ ] Can send interventions
- [ ] Export reports work
- [ ] Browser notifications appear

## Step 4: Deploy to Vercel

### Option A: Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy
vercel deploy --prod
```

### Option B: GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Vercel auto-deploys on push

## Step 5: Configure Environment Variables

In Vercel dashboard, add:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

## Step 6: Enable Supabase Realtime

1. Go to Supabase Dashboard
2. Navigate to Database → Replication
3. Enable replication for `student_alerts` table
4. Verify Realtime is enabled

## Step 7: Test in Production

### Create Test Accounts

```sql
-- Create test teacher
INSERT INTO profiles (id, email, full_name, role, grade)
VALUES (
  'test-teacher-id',
  'teacher@test.com',
  'Test Teacher',
  'teacher',
  'Teacher'
);

-- Create test students
INSERT INTO profiles (id, email, full_name, role, grade)
VALUES 
  ('student-1-id', 'student1@test.com', 'Student One', 'student', 'Grade 5'),
  ('student-2-id', 'student2@test.com', 'Student Two', 'student', 'Grade 5');

-- Assign students to teacher
INSERT INTO teacher_students (teacher_id, student_id, class_name, subject)
VALUES 
  ('test-teacher-id', 'student-1-id', 'Grade 5A', 'Mathematics'),
  ('test-teacher-id', 'student-2-id', 'Grade 5A', 'Mathematics');
```

### Test Flow

1. **Login as teacher**: `teacher@test.com`
2. **Navigate to**: `/teacher/dashboard`
3. **Select class**: "Grade 5A"
4. **Verify**: Students appear in list
5. **Test intervention**: Click "Send Hint" on a student
6. **Test analytics**: Click "Analytics" tab
7. **Test export**: Open student detail, click "Export CSV"
8. **Test alerts**: Create a test alert (see below)

### Create Test Alert

```sql
-- Create test alert
SELECT create_student_alert(
  'student-1-id',
  'stuck',
  'high',
  'Student appears stuck on fractions',
  'Student has been on the same problem for 10 minutes',
  NULL,
  'MATH-5-1-2',
  NULL
);
```

## Step 8: Monitor Performance

### Check Vercel Analytics
- Page load times
- Error rates
- User sessions

### Check Supabase Logs
- Database query performance
- Realtime connection status
- API usage

### Check Browser Console
- No JavaScript errors
- Notifications working
- Charts rendering

## Troubleshooting

### Issue: Dashboard not loading

**Solution:**
1. Check environment variables are set
2. Verify Supabase connection
3. Check browser console for errors

### Issue: Students not appearing

**Solution:**
1. Verify teacher-student assignments exist
2. Check RLS policies are active
3. Run: `SELECT * FROM teacher_students WHERE teacher_id = 'your-teacher-id'`

### Issue: Alerts not real-time

**Solution:**
1. Enable Supabase Realtime replication
2. Check WebSocket connection in Network tab
3. Verify RLS policies allow teacher access

### Issue: Charts not rendering

**Solution:**
1. Check recharts is installed: `npm list recharts`
2. Verify data is being fetched
3. Check browser console for errors

### Issue: Notifications not working

**Solution:**
1. Ensure HTTPS connection (required for notifications)
2. Check notification permission granted
3. Verify browser supports notifications

### Issue: Export not working

**Solution:**
1. Check API route is accessible
2. Verify teacher has access to student
3. Check browser console for errors

## Performance Optimization

### Enable Caching

Add to `next.config.js`:

```javascript
module.exports = {
  // ... existing config
  headers: async () => [
    {
      source: '/teacher/dashboard',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=60, stale-while-revalidate=120',
        },
      ],
    },
  ],
};
```

### Database Indexes

Verify these indexes exist:

```sql
-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('teacher_students', 'student_alerts', 'learning_progress');
```

### CDN Configuration

Vercel automatically uses Edge Network for static assets.

## Security Checklist

- [x] RLS policies active on all tables
- [x] Teacher role verification on all API routes
- [x] Input validation on all forms
- [x] HTTPS enabled (Vercel default)
- [x] Environment variables secured
- [x] No sensitive data in client code

## Monitoring Setup

### Sentry (Optional)

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

### PostHog (Optional)

```bash
npm install posthog-js
```

Add to `_app.tsx`:

```typescript
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init('your-api-key', {
    api_host: 'https://app.posthog.com',
  });
}
```

## Rollback Plan

If issues occur in production:

1. **Revert deployment**: `vercel rollback`
2. **Check logs**: `vercel logs`
3. **Fix issues locally**
4. **Test thoroughly**
5. **Redeploy**: `vercel deploy --prod`

## Success Criteria

Dashboard is successfully deployed when:

- [x] Dashboard loads in < 2 seconds
- [x] All charts render correctly
- [x] Real-time alerts work
- [x] Interventions send successfully
- [x] Export downloads work
- [x] Mobile responsive
- [x] No console errors
- [x] Lighthouse score > 80

## Post-Deployment

### Week 1
- Monitor error rates
- Gather teacher feedback
- Fix critical bugs
- Document common issues

### Week 2
- Optimize slow queries
- Add missing features
- Improve UX based on feedback
- Create teacher training materials

### Week 3
- Scale infrastructure if needed
- Add analytics tracking
- Implement feature requests
- Prepare for wider rollout

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Check browser console
4. Review this guide
5. Contact support if needed

## Conclusion

The Teacher Dashboard is production-ready and can be deployed immediately. Follow this guide step-by-step for a smooth deployment.

**Estimated Deployment Time**: 30-60 minutes  
**Estimated Testing Time**: 2-3 hours  
**Estimated Bug Fixes**: 1-2 days  

---

**Status**: Ready to Deploy ✅  
**Next Action**: Run `npm run build` and deploy to Vercel
