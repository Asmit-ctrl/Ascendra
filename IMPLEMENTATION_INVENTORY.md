# Implementation Inventory

This inventory maps implemented, partially implemented, and missing features to their primary files in the repository. Use this as a quick reference when testing, deploying, or finishing work.

## Fully Implemented (ready to test/live)
- **PWA + Service Worker**: [studio/public/sw.js](studio/public/sw.js)
- **Offline Queue (client)**: [studio/src/lib/offline-queue.ts](studio/src/lib/offline-queue.ts)
- **Accessibility Panel (low-bandwidth toggle)**: [studio/src/components/accessibility/AccessibilityPanel.tsx](studio/src/components/accessibility/AccessibilityPanel.tsx)
- **Accessibility styles**: [studio/src/styles/accessibility.css](studio/src/styles/accessibility.css)
- **Supabase browser client**: [studio/src/lib/supabase/client.ts](studio/src/lib/supabase/client.ts)
- **Supabase types (DB schema)**: [studio/src/lib/supabase/types.ts](studio/src/lib/supabase/types.ts)
- **Distributed rate limiter (Upstash)**: [studio/src/lib/rate-limit-upstash.ts](studio/src/lib/rate-limit-upstash.ts)
- **Teacher Dashboard (UI + realtime wiring)**: [studio/src/app/teacher/dashboard/page.tsx](studio/src/app/teacher/dashboard/page.tsx)

## Partially Implemented (needs finishing/wiring)
- **Offline quiz sync** (sync-triggering & queue exist; conflict resolution and server-side replay need work)
  - client queue: [studio/src/lib/offline-queue.ts](studio/src/lib/offline-queue.ts)
  - service worker sync tag: [studio/public/sw.js](studio/public/sw.js)
  - quiz page usage: [studio/src/app/quiz/page.tsx](studio/src/app/quiz/page.tsx)
  - exam runner usage: [studio/src/components/exam/ExamRunner.tsx](studio/src/components/exam/ExamRunner.tsx)
- **Low-bandwidth optimizations** (CSS toggle done; compress/lazy-load pending)
  - accessibility styles: [studio/src/styles/accessibility.css](studio/src/styles/accessibility.css)
  - toggle UI: [studio/src/components/accessibility/AccessibilityPanel.tsx](studio/src/components/accessibility/AccessibilityPanel.tsx)
- **Progress tracking & analytics** (functions exist; additional typed RPCs and edge cases remain)
  - core logic: [studio/src/lib/progress-tracking.ts](studio/src/lib/progress-tracking.ts)
  - gamification hooks: [studio/src/lib/gamification/points-system.ts](studio/src/lib/gamification/points-system.ts)

## Not Implemented / Missing (priority TODOs)
- Local AI fallback (small on-device model) — not implemented
- Conflict resolution for offline edits (multi-device) — not implemented
- Compress assets, lazy-loading for images/fonts/scripts — not implemented
- Server-side TTS integration (ElevenLabs/Groq) — not implemented
- Parent Portal (dashboard + messaging + payments) — not implemented
- M-Pesa / Stripe payment flows — not implemented
- Monitoring & analytics integrations (Sentry, PostHog) — not implemented

## Useful entry points & helpers
- PWA registration / hook: [studio/src/hooks/use-pwa.ts](studio/src/hooks/use-pwa.ts)
- Supabase route handler (cookie-aware): [studio/src/lib/supabase/route-handler.ts](studio/src/lib/supabase/route-handler.ts)
- Chat route uses rate-limiter + progress updates: [studio/src/app/api/chat/route.ts](studio/src/app/api/chat/route.ts)

---

If you want, I can (pick one):

- expand each **Partially Implemented** item into a checklist of concrete code tasks (with file-level edits), or
- start implementing one high-priority missing item (recommend: conflict resolution for offline quiz sync or typed Supabase RPC wrappers).

Requested by: automated repo scan on 2026-07-15
