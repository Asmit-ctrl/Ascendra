# API URL Hardcoding Fix - Bugfix Design

## Overview

This bugfix addresses a critical production deployment issue where 9 React components across the application use hardcoded `http://localhost:8001` URLs instead of the environment variable `NEXT_PUBLIC_AI_AGENTS_URL`. This causes all API requests to fail in production environments where the local development server is not accessible. The fix will systematically replace all 11 hardcoded URL instances with dynamic environment variable references, ensuring proper API connectivity across all deployment environments (development, staging, production). The approach is minimal and surgical: replace hardcoded strings with environment variable interpolation while preserving all existing functionality, error handling, and user experience.

**Impact Scope:**
- 9 component files affected
- 11 total hardcoded URL instances
- 6 distinct API endpoints
- Affects both teacher and student-facing features
- Critical for production deployment on Vercel

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a component makes an API fetch request using a hardcoded `http://localhost:8001` URL instead of the environment variable `NEXT_PUBLIC_AI_AGENTS_URL`
- **Property (P)**: The desired behavior when API requests are made - components should dynamically construct URLs using `process.env.NEXT_PUBLIC_AI_AGENTS_URL` to ensure correct endpoint resolution in all environments
- **Preservation**: All existing API request logic, error handling, response processing, UI state management, and user interactions that must remain unchanged by the fix
- **NEXT_PUBLIC_AI_AGENTS_URL**: The Next.js environment variable that stores the base URL for the AI agents backend service (e.g., `http://localhost:8001` in development, `https://your-app.vercel.app/api/agents` in production)
- **Fetch Request**: HTTP requests made using the browser's `fetch()` API to communicate with backend services
- **Environment Variable Interpolation**: The pattern `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/endpoint` used to dynamically construct URLs
- **Fallback Value**: The default value `http://localhost:8001` used when `NEXT_PUBLIC_AI_AGENTS_URL` is not set (for development convenience)

## Bug Details

### Bug Condition

The bug manifests when any of the 9 affected components attempts to make an API request in a production environment. Each component uses a hardcoded `http://localhost:8001` base URL in its `fetch()` call, which fails because the local development server is not accessible from production deployments. The fetch requests fail with network errors (typically "Failed to fetch" or connection refused), causing features to break and displaying error messages to users.

**Formal Specification:**
```
FUNCTION isBugCondition(fetchCall)
  INPUT: fetchCall of type FetchAPICall
  OUTPUT: boolean
  
  RETURN fetchCall.url STARTS_WITH 'http://localhost:8001'
         AND fetchCall.environment IN ['production', 'staging', 'preview']
         AND NOT isLocalDevelopment()
END FUNCTION
```

**Affected Locations:**

1. **scheme-of-work-generator.tsx** (line 107)
   - URL: `http://localhost:8001/agents/chat`
   - Context: Generating 13-week curriculum schemes

2. **lesson-plan-generator.tsx** (line 212)
   - URL: `http://localhost:8001/agents/chat`
   - Context: Generating detailed lesson plans

3. **assessment-generator.tsx** (line 322)
   - URL: `http://localhost:8001/agents/chat`
   - Context: Generating assessments with rubrics

4. **magic-school-teacher.tsx** (line 141)
   - URL: `http://localhost:8001/agents/chat`
   - Context: Generating teaching materials

5. **agent-stats.tsx** (line 26)
   - URL: `http://localhost:8001/dashboard/agents/stats?hours=1`
   - Context: Fetching AI agent usage statistics

6. **real-time-monitor.tsx** (line 56)
   - URL: `http://localhost:8001/dashboard/students/active`
   - Context: Fetching active student list

7. **student-detail.tsx** (lines 36, 49)
   - URLs: 
     - `http://localhost:8001/dashboard/students/${studentId}/progress`
     - `http://localhost:8001/dashboard/interventions`
   - Context: Fetching student progress and sending interventions

8. **mwalimu-chat.tsx** (line 250)
   - URL: `http://localhost:8001/agents/chat`
   - Context: Student AI tutor chat interface

9. **interactive-sandbox.tsx** (line 172)
   - URL: `http://localhost:8001/telemetry/capture`
   - Context: Submitting student interaction telemetry

### Examples

**Example 1: Scheme of Work Generator in Production**
- **Trigger**: Teacher selects Grade 5, Mathematics, Term 1 and clicks "Generate Scheme of Work"
- **Current Behavior**: Fetch to `http://localhost:8001/agents/chat` fails with network error, toast shows "Generation Failed"
- **Expected Behavior**: Fetch to `${NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` (e.g., `https://syncsenta.vercel.app/api/agents/chat`) succeeds and generates scheme

**Example 2: Agent Stats Dashboard in Production**
- **Trigger**: Teacher dashboard loads and attempts to fetch agent statistics
- **Current Behavior**: Fetch to `http://localhost:8001/dashboard/agents/stats?hours=1` fails silently, displays "No agent activity yet"
- **Expected Behavior**: Fetch to `${NEXT_PUBLIC_AI_AGENTS_URL}/dashboard/agents/stats?hours=1` succeeds and displays real statistics

**Example 3: Student Chat in Production**
- **Trigger**: Student types "Help me with fractions" and clicks Send
- **Current Behavior**: Fetch to `http://localhost:8001/agents/chat` fails, error message displayed: "Sorry, I'm having trouble connecting right now"
- **Expected Behavior**: Fetch to `${NEXT_PUBLIC_AI_AGENTS_URL}/agents/chat` succeeds and AI tutor responds

**Example 4: Development Environment (Edge Case)**
- **Trigger**: Developer runs `npm run dev` locally with `NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001` in `.env`
- **Expected Behavior**: All components use `http://localhost:8001` from environment variable, maintaining current development workflow

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All API request payloads (request bodies, headers, method types) must remain identical
- All error handling logic and user-facing error messages must continue to work exactly as before
- All loading states, UI feedback, and success notifications must remain unchanged
- All response processing and data transformation logic must continue to function identically
- All form controls, user inputs, and interaction patterns must remain unchanged
- All WebSocket connection logic (in real-time-monitor.tsx and mwalimu-chat.tsx) must continue to work
- All features like copy-to-clipboard, download, voice input, text-to-speech must remain functional
- All toast notifications, progress indicators, and visual feedback must remain identical

**Scope:**
All inputs that do NOT involve the base URL construction should be completely unaffected by this fix. This includes:
- API endpoint paths (e.g., `/agents/chat`, `/dashboard/agents/stats`)
- Query parameters (e.g., `?hours=1`)
- Request methods (POST, GET)
- Request headers and authentication
- Request body structure and content
- Response parsing and error handling
- Component state management and UI rendering
- User interaction handlers (onClick, onChange, etc.)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear and straightforward:

1. **Direct String Literals**: All affected components use string literals like `'http://localhost:8001/agents/chat'` directly in their `fetch()` calls instead of constructing URLs dynamically from environment variables.

2. **Missing Environment Variable Usage**: The codebase has the `NEXT_PUBLIC_AI_AGENTS_URL` environment variable defined in `.env.example`, but the components were not updated to use it. This suggests the components were written during early development when only local testing was needed.

3. **Next.js Build-Time Variable Injection**: Next.js injects `NEXT_PUBLIC_*` environment variables at build time, making them available via `process.env.NEXT_PUBLIC_AI_AGENTS_URL`. The components simply need to reference this variable instead of hardcoded strings.

4. **No Fallback Logic**: None of the components implement fallback logic to default to `http://localhost:8001` when the environment variable is not set, which would provide better developer experience.

**Why This Causes Production Failures:**
- In development: `http://localhost:8001` works because the Python FastAPI backend runs locally
- In production (Vercel): `http://localhost:8001` is not accessible; requests must go to the production backend URL
- The environment variable `NEXT_PUBLIC_AI_AGENTS_URL` is set differently per environment, but components ignore it

## Correctness Properties

Property 1: Bug Condition - Dynamic URL Construction

_For any_ API fetch request in a component where the URL is currently hardcoded as `http://localhost:8001/[endpoint]`, the fixed code SHALL construct the URL using `${process.env.NEXT_PUBLIC_AI_AGENTS_URL}/[endpoint]` (or fallback to `http://localhost:8001/[endpoint]` if the environment variable is undefined), ensuring the request reaches the correct backend service in all deployment environments.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13**

Property 2: Preservation - API Request Behavior

_For any_ API fetch request where the base URL is correctly resolved (whether from environment variable or fallback), the fixed code SHALL execute the request with identical method, headers, body, error handling, and response processing as the original code, preserving all existing functionality and user experience.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13, 3.14, 3.15, 3.16**

## Fix Implementation

### Changes Required

The fix is straightforward and surgical: replace each hardcoded URL string with environment variable interpolation.

**Pattern to Apply:**

```typescript
// BEFORE (buggy)
const response = await fetch('http://localhost:8001/agents/chat', {
  method: 'POST',
  // ... rest of config
})

// AFTER (fixed)
const baseUrl = process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'
const response = await fetch(`${baseUrl}/agents/chat`, {
  method: 'POST',
  // ... rest of config
})
```

**Specific Changes by File:**

1. **studio/src/components/teacher/scheme-of-work-generator.tsx** (line 107)
   - Replace: `'http://localhost:8001/agents/chat'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/agents/chat\``

2. **studio/src/components/teacher/lesson-plan-generator.tsx** (line 212)
   - Replace: `'http://localhost:8001/agents/chat'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/agents/chat\``

3. **studio/src/components/teacher/assessment-generator.tsx** (line 322)
   - Replace: `'http://localhost:8001/agents/chat'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/agents/chat\``

4. **studio/src/components/teacher/magic-school-teacher.tsx** (line 141)
   - Replace: `'http://localhost:8001/agents/chat'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/agents/chat\``

5. **studio/src/components/teacher/agent-stats.tsx** (line 26)
   - Replace: `'http://localhost:8001/dashboard/agents/stats?hours=1'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/dashboard/agents/stats?hours=1\``

6. **studio/src/components/teacher/real-time-monitor.tsx** (line 56)
   - Replace: `'http://localhost:8001/dashboard/students/active'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/dashboard/students/active\``

7. **studio/src/components/teacher/student-detail.tsx** (lines 36, 49)
   - Replace (line 36): `` `http://localhost:8001/dashboard/students/${studentId}/progress` ``
   - With: `` `${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/dashboard/students/${studentId}/progress` ``
   - Replace (line 49): `'http://localhost:8001/dashboard/interventions'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/dashboard/interventions\``

8. **studio/src/components/student/mwalimu-chat.tsx** (line 250)
   - Replace: `'http://localhost:8001/agents/chat'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/agents/chat\``

9. **studio/src/components/student/interactive-sandbox.tsx** (line 172)
   - Replace: `'http://localhost:8001/telemetry/capture'`
   - With: `\`${process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'}/telemetry/capture\``

**Implementation Notes:**
- Use inline fallback `|| 'http://localhost:8001'` for developer convenience (works without .env file)
- Maintain exact same fetch configuration (method, headers, body)
- No changes to error handling, response processing, or UI logic
- No changes to WebSocket URLs (they use `ws://` protocol and need separate handling if needed)

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, demonstrate the bug exists in production-like conditions (exploratory testing), then verify the fix works correctly across all environments and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that hardcoded URLs cause failures in production-like environments.

**Test Plan**: Simulate production environment by temporarily unsetting or changing `NEXT_PUBLIC_AI_AGENTS_URL` to a non-localhost value, then attempt to use each affected feature. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Scheme Generator Production Simulation** (will fail on unfixed code)
   - Set `NEXT_PUBLIC_AI_AGENTS_URL=https://fake-production.com`
   - Attempt to generate a scheme of work
   - Expected failure: Network error, fetch to `http://localhost:8001` fails
   - Confirms: Hardcoded URL ignores environment variable

2. **Agent Stats Production Simulation** (will fail on unfixed code)
   - Set `NEXT_PUBLIC_AI_AGENTS_URL=https://fake-production.com`
   - Load teacher dashboard with agent stats component
   - Expected failure: Stats fetch fails silently, shows "No agent activity yet"
   - Confirms: Hardcoded URL causes silent failure

3. **Student Chat Production Simulation** (will fail on unfixed code)
   - Set `NEXT_PUBLIC_AI_AGENTS_URL=https://fake-production.com`
   - Send a chat message as student
   - Expected failure: Error message "Sorry, I'm having trouble connecting right now"
   - Confirms: Hardcoded URL breaks student experience

4. **Multiple Components Test** (will fail on unfixed code)
   - Deploy to Vercel preview environment (automatic production-like test)
   - Attempt to use lesson plan generator, assessment generator, real-time monitor
   - Expected failure: All features fail with network errors
   - Confirms: Bug affects all 9 components in production

**Expected Counterexamples**:
- All fetch requests to `http://localhost:8001` fail when not in local development
- Browser console shows "Failed to fetch" or "net::ERR_CONNECTION_REFUSED" errors
- Components display error messages or empty states
- Possible causes confirmed: hardcoded URLs, missing environment variable usage

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (production/staging environments), the fixed function produces the expected behavior (successful API requests using environment variable).

**Pseudocode:**
```
FOR ALL component IN affectedComponents DO
  FOR ALL environment IN ['development', 'production', 'staging'] DO
    SET process.env.NEXT_PUBLIC_AI_AGENTS_URL = getEnvironmentURL(environment)
    result := component.makeAPIRequest()
    ASSERT result.url STARTS_WITH process.env.NEXT_PUBLIC_AI_AGENTS_URL
    ASSERT result.requestSucceeds OR result.failsForNonURLReasons
  END FOR
END FOR
```

**Test Cases**:
1. **Development Environment**: Verify `NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001` works
2. **Production Environment**: Verify `NEXT_PUBLIC_AI_AGENTS_URL=https://syncsenta.vercel.app/api/agents` works
3. **Staging Environment**: Verify custom staging URL works
4. **Missing Environment Variable**: Verify fallback to `http://localhost:8001` works
5. **All 9 Components**: Verify each component constructs URLs correctly

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (correct URL resolution), the fixed function produces the same result as the original function (identical API behavior).

**Pseudocode:**
```
FOR ALL component IN affectedComponents DO
  FOR ALL apiRequest IN component.apiRequests DO
    original := captureOriginalBehavior(apiRequest)
    fixed := executeFixedCode(apiRequest)
    
    ASSERT fixed.method = original.method
    ASSERT fixed.headers = original.headers
    ASSERT fixed.body = original.body
    ASSERT fixed.errorHandling = original.errorHandling
    ASSERT fixed.responseProcessing = original.responseProcessing
    ASSERT fixed.uiState = original.uiState
  END FOR
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different inputs (grades, subjects, messages)
- It catches edge cases that manual unit tests might miss (empty responses, network errors, timeouts)
- It provides strong guarantees that behavior is unchanged for all non-URL-related aspects

**Test Plan**: First, observe and document the exact behavior of UNFIXED code in local development (where URLs work). Then, write property-based tests that capture this behavior and verify the FIXED code maintains it.

**Test Cases**:
1. **Request Configuration Preservation**: Verify all fetch calls maintain identical method, headers, body structure
   - Observe: Original code uses POST with `Content-Type: application/json`
   - Test: Fixed code uses identical configuration

2. **Error Handling Preservation**: Verify error messages and toast notifications remain unchanged
   - Observe: Original code shows "Generation Failed" toast on error
   - Test: Fixed code shows identical error messages

3. **Response Processing Preservation**: Verify data parsing and state updates remain identical
   - Observe: Original code extracts `data.response` and sets component state
   - Test: Fixed code processes responses identically

4. **UI State Preservation**: Verify loading states, buttons, and visual feedback unchanged
   - Observe: Original code shows loading spinner during fetch
   - Test: Fixed code maintains identical UI states

5. **Feature Functionality Preservation**: Verify all features work end-to-end
   - Observe: Original code generates schemes, lesson plans, assessments correctly
   - Test: Fixed code produces identical outputs

### Unit Tests

- Test URL construction with environment variable set
- Test URL construction with environment variable unset (fallback)
- Test URL construction with different environment values
- Test each component's fetch call uses correct URL pattern
- Test query parameters are preserved (e.g., `?hours=1`)
- Test dynamic URL segments are preserved (e.g., `${studentId}`)
- Test error handling when fetch fails (network error, 404, 500)
- Test success handling when fetch succeeds

### Property-Based Tests

- Generate random environment variable values and verify URL construction is correct
- Generate random API responses and verify processing is identical to original
- Generate random error conditions and verify error handling is preserved
- Generate random user inputs (grades, subjects, messages) and verify end-to-end functionality
- Test across many scenarios to ensure no regressions in any component

### Integration Tests

- Test full teacher workflow: generate scheme → generate lesson plan → generate assessment
- Test full student workflow: send chat message → receive response → send follow-up
- Test dashboard workflow: load stats → view real-time monitor → view student details
- Test environment switching: verify same code works in dev, staging, production
- Test deployment workflow: build for production → deploy to Vercel → verify all features work
- Test WebSocket connections continue to work (real-time monitor, chat)
- Test all UI interactions: copy, download, voice input, text-to-speech

### Manual Testing Checklist

After implementing the fix, manually verify:

1. ✅ Local development (`npm run dev`) works with default `.env`
2. ✅ All 9 components make successful API requests in development
3. ✅ Build succeeds (`npm run build`) without errors
4. ✅ Preview deployment to Vercel works
5. ✅ All 9 components work in Vercel preview environment
6. ✅ Production deployment works
7. ✅ All features function identically to local development
8. ✅ Error messages are appropriate (not URL-related errors)
9. ✅ No console errors related to fetch or network
10. ✅ WebSocket connections work in production
