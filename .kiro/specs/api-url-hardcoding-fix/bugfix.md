# Bugfix Requirements Document

## Introduction

Multiple teacher and student components across the application fail when deployed to production because they use hardcoded API URLs (`http://localhost:8001`) instead of the environment variable `NEXT_PUBLIC_AI_AGENTS_URL`. This causes fetch requests to fail in production environments where the local development server is not accessible. The bug affects 9 component files with 11 total hardcoded URL instances across various API endpoints. The fix ensures that all components dynamically use the correct API endpoint based on the deployment environment.

**Affected Components:**
1. `studio/src/components/teacher/scheme-of-work-generator.tsx` (line 107)
2. `studio/src/components/teacher/lesson-plan-generator.tsx` (line 212)
3. `studio/src/components/teacher/assessment-generator.tsx` (line 322)
4. `studio/src/components/teacher/magic-school-teacher.tsx` (line 141)
5. `studio/src/components/teacher/agent-stats.tsx` (line 26)
6. `studio/src/components/teacher/real-time-monitor.tsx` (line 56)
7. `studio/src/components/teacher/student-detail.tsx` (lines 36, 49)
8. `studio/src/components/student/mwalimu-chat.tsx` (line 250)
9. `studio/src/components/student/interactive-sandbox.tsx` (line 172)

**Affected API Endpoints:**
- `/agents/chat` - Main AI chat endpoint (6 instances)
- `/dashboard/agents/stats` - Agent statistics (1 instance)
- `/dashboard/students/active` - Active students list (1 instance)
- `/dashboard/students/{id}/progress` - Student progress (1 instance)
- `/dashboard/interventions` - Teacher interventions (1 instance)
- `/telemetry/capture` - Telemetry data capture (1 instance)

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN scheme-of-work-generator.tsx makes an API call THEN the system attempts to fetch from hardcoded `http://localhost:8001/agents/chat` (line 107) which fails in production with error "Failed to generate scheme of work"

1.2 WHEN lesson-plan-generator.tsx makes an API call THEN the system attempts to fetch from hardcoded `http://localhost:8001/agents/chat` (line 212) which fails in production

1.3 WHEN assessment-generator.tsx makes an API call THEN the system attempts to fetch from hardcoded `http://localhost:8001/agents/chat` (line 322) which fails in production

1.4 WHEN magic-school-teacher.tsx makes an API call THEN the system attempts to fetch from hardcoded `http://localhost:8001/agents/chat` (line 141) which fails in production

1.5 WHEN agent-stats.tsx fetches statistics THEN the system attempts to fetch from hardcoded `http://localhost:8001/dashboard/agents/stats?hours=1` (line 26) which fails in production

1.6 WHEN real-time-monitor.tsx fetches active students THEN the system attempts to fetch from hardcoded `http://localhost:8001/dashboard/students/active` (line 56) which fails in production

1.7 WHEN student-detail.tsx fetches student progress THEN the system attempts to fetch from hardcoded `http://localhost:8001/dashboard/students/${studentId}/progress` (line 36) which fails in production

1.8 WHEN student-detail.tsx sends an intervention message THEN the system attempts to fetch from hardcoded `http://localhost:8001/dashboard/interventions` (line 49) which fails in production

1.9 WHEN mwalimu-chat.tsx sends a chat message THEN the system attempts to fetch from hardcoded `http://localhost:8001/agents/chat` (line 250) which fails in production

1.10 WHEN interactive-sandbox.tsx submits telemetry data THEN the system attempts to fetch from hardcoded `http://localhost:8001/telemetry/capture` (line 172) which fails in production

1.11 WHEN any of these components are deployed to production (Vercel) THEN all fetch calls fail because `http://localhost:8001` is not accessible, resulting in network errors and broken functionality

### Expected Behavior (Correct)

2.1 WHEN scheme-of-work-generator.tsx makes an API call THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` to determine the API endpoint and successfully generate the scheme

2.2 WHEN lesson-plan-generator.tsx makes an API call THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` to determine the API endpoint and successfully generate the lesson plan

2.3 WHEN assessment-generator.tsx makes an API call THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` to determine the API endpoint and successfully generate the assessment

2.4 WHEN magic-school-teacher.tsx makes an API call THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` to determine the API endpoint and successfully generate the content

2.5 WHEN agent-stats.tsx fetches statistics THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/dashboard/agents/stats?hours=1` to determine the API endpoint and successfully fetch statistics

2.6 WHEN real-time-monitor.tsx fetches active students THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/dashboard/students/active` to determine the API endpoint and successfully fetch active students

2.7 WHEN student-detail.tsx fetches student progress THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/dashboard/students/${studentId}/progress` to determine the API endpoint and successfully fetch progress

2.8 WHEN student-detail.tsx sends an intervention message THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/dashboard/interventions` to determine the API endpoint and successfully send the message

2.9 WHEN mwalimu-chat.tsx sends a chat message THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` to determine the API endpoint and successfully send the message

2.10 WHEN interactive-sandbox.tsx submits telemetry data THEN the system SHALL use `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/telemetry/capture` to determine the API endpoint and successfully submit telemetry

2.11 WHEN any component runs in development environment THEN the system SHALL call `http://localhost:8001` (from `NEXT_PUBLIC_AI_AGENTS_URL`) for all API endpoints

2.12 WHEN any component runs in production environment THEN the system SHALL call the production URL (from `NEXT_PUBLIC_AI_AGENTS_URL`) which routes to the appropriate backend service

2.13 WHEN the environment variable `NEXT_PUBLIC_AI_AGENTS_URL` is not set THEN the system SHALL fall back to `http://localhost:8001` as a default value for development

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the API endpoint is correctly configured and reachable THEN the system SHALL CONTINUE TO generate schemes of work, lesson plans, assessments, and other content with the same quality and format

3.2 WHEN the fetch request succeeds in scheme-of-work-generator.tsx THEN the system SHALL CONTINUE TO display the generated content in the ScrollArea component

3.3 WHEN the fetch request succeeds in lesson-plan-generator.tsx THEN the system SHALL CONTINUE TO display the generated lesson plan with all sections

3.4 WHEN the fetch request succeeds in assessment-generator.tsx THEN the system SHALL CONTINUE TO display the generated assessment with answer keys and rubrics

3.5 WHEN the fetch request succeeds in magic-school-teacher.tsx THEN the system SHALL CONTINUE TO display the generated teaching materials

3.6 WHEN agent-stats.tsx successfully fetches statistics THEN the system SHALL CONTINUE TO display agent usage metrics correctly

3.7 WHEN real-time-monitor.tsx successfully fetches active students THEN the system SHALL CONTINUE TO display the real-time student activity list

3.8 WHEN student-detail.tsx successfully fetches progress THEN the system SHALL CONTINUE TO display student progress with mastery levels and quiz scores

3.9 WHEN student-detail.tsx successfully sends intervention messages THEN the system SHALL CONTINUE TO notify the user of successful message delivery

3.10 WHEN mwalimu-chat.tsx successfully sends messages THEN the system SHALL CONTINUE TO display agent responses with proper formatting and agent attribution

3.11 WHEN interactive-sandbox.tsx successfully submits telemetry THEN the system SHALL CONTINUE TO analyze student interactions and provide feedback

3.12 WHEN the fetch request fails due to actual API errors (not URL issues) THEN the system SHALL CONTINUE TO show appropriate error messages to the user

3.13 WHEN users interact with form controls (level, grade, subject, term selection, etc.) THEN the system SHALL CONTINUE TO function identically

3.14 WHEN users copy or download generated content THEN the system SHALL CONTINUE TO work as before

3.15 WHEN WebSocket connections are established (real-time-monitor.tsx, mwalimu-chat.tsx) THEN the system SHALL CONTINUE TO use the appropriate WebSocket URL pattern

3.16 WHEN users interact with voice input, text-to-speech, or file upload features THEN the system SHALL CONTINUE TO function identically
