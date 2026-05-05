# SyncSenta Production-Ready Tasks

## Phase 1: Code Cleanup (Parallel)

### 1.1 Remove Completely Unused Files
- [ ] Delete `/patch_unsloth_cpu.py` (not used anywhere)
- [ ] Delete `/jupyter_config.py` (not used)
- [ ] Delete `/app.py` (replaced by FastAPI)
- [ ] Delete `/render.yaml` (not used)
- [ ] Delete `/studio/[ABSOLUTE, FULL path to the file]` (corrupted file)
- [ ] Delete `/studio/.idx/` directory (IDX config)
- [ ] Delete `/studio/.modified` file
- [ ] Delete `/studio/src/app/test-personalization/` directory
- [ ] Delete `/studio/src/app/test-schemer/` directory
- [ ] Delete `/studio/src/app/quiz/` directory (old quiz page)
- [ ] Delete `/studio/src/app/login/` directory
- [ ] Delete `/studio/src/app/signin/` directory
- [ ] Delete `/studio/src/app/signup/` directory
- [ ] Test: No broken imports

### 1.2 Remove Unused Pages & Dashboards
- [ ] Remove `/studio/src/app/(main)/dashboard/` directory (complex admin dashboards)
- [ ] Remove `/studio/src/app/(main)/layout.tsx`
- [ ] Remove `/studio/src/app/(main)/` directory
- [ ] Update imports in remaining files
- [ ] Test: Student and teacher pages still work

### 1.3 Remove Unused Backend
- [ ] Remove `/backend/syncsenta-backend/` directory
- [ ] Remove `/backend/syncsenta-blockchain/` directory
- [ ] Remove `/backend/syncsenta-wasm/` directory
- [ ] Remove `/backend/syncsenta-common/` directory
- [ ] Remove `/backend/Cargo.toml` and `/backend/Cargo.lock`
- [ ] Keep only `/ai-agents/` in backend
- [ ] Test: Backend still runs on port 8001

### 1.4 Remove Unused Projects
- [ ] Remove `/ChatDev/` directory
- [ ] Remove `/notebooks/` directory
- [ ] Remove `/data/gikuyu_bible/` directory
- [ ] Update `.gitignore` if needed

### 1.5 Keep & Integrate Useful Code
- [ ] Keep `/studio/src/components/exam/` (quiz components)
- [ ] Keep `/studio/src/ai/flows/generate-rubric.ts` (rubric generation)
- [ ] Keep `/studio/src/ai/flows/generate-worksheet.ts` (worksheet generation)
- [ ] Keep `/studio/src/ai/flows/generate-lesson-plan.ts` (lesson plan generation)
- [ ] Keep `/studio/src/curriculum/` (CBC curriculum data)
- [ ] Integrate quiz components into teacher Magic School
- [ ] Integrate rubric generation into Magic School Agent
- [ ] Integrate worksheet generation into Magic School Agent
- [ ] Integrate lesson plan generation into Magic School Agent
- [ ] Test: All integrations work correctly

### 1.6 Organize Root Folder
- [ ] Keep only: `studio/`, `ai-agents/`, `docs/`, `scripts/`, `.env`, `.env.example`, `vercel.json`, `README.md`, `.gitignore`
- [ ] Remove: `app.py`, `pyproject.toml`, `render.yaml`, `jupyter_config.py`, `patch_unsloth_cpu.py`, `uv.lock`
- [ ] Test: Folder structure is clean

### 1.7 Clean Data Folders
- [ ] Consolidate curriculum data to `/studio/src/data/curriculum/`
- [ ] Remove duplicate data files
- [ ] Replace mock data in `/studio/src/lib/mock-data.ts` with real CBC data
- [ ] Update imports to use real data only
- [ ] Test: All curriculum data loads correctly

## Phase 2: Agent Implementation (Parallel)

### 2.1 Create Base Agent Class
- [ ] Create `/ai-agents/src/syncsenta_agents/agents/base.py`
- [ ] Implement `Agent` base class with:
  - State management
  - Monitoring hooks
  - Error handling
  - Logging
- [ ] Create `AgentState` data model
- [ ] Create `AgentResponse` data model

### 2.2 Implement Socratic Tutor Agent
- [ ] Create `/ai-agents/src/syncsenta_agents/agents/socratic_tutor.py`
- [ ] Implement state management (track student history)
- [ ] Implement monitoring (log interactions)
- [ ] Implement decision logic (analyze question, decide action)
- [ ] Implement Groq integration (call AI with context)
- [ ] Add student profile tracking
- [ ] Test: Agent responds with reasoning

### 2.3 Implement Assessment Agent
- [ ] Create `/ai-agents/src/syncsenta_agents/agents/assessment.py`
- [ ] Implement state management (track quiz history)
- [ ] Implement monitoring (log assessments)
- [ ] Implement decision logic (generate quiz, grade, feedback)
- [ ] Implement Groq integration
- [ ] Add competency tracking
- [ ] Test: Agent generates quizzes and tracks performance

### 2.4 Implement Magic School Agent
- [ ] Create `/ai-agents/src/syncsenta_agents/agents/magic_school.py`
- [ ] Implement state management (track content history)
- [ ] Implement monitoring (log content generation)
- [ ] Implement decision logic (analyze request, generate content)
- [ ] Implement Groq integration
- [ ] Add teacher preference tracking
- [ ] Test: Agent generates lesson plans, quizzes, rubrics

### 2.5 Create Agent Monitoring System
- [ ] Create `/ai-agents/src/syncsenta_agents/monitoring/agent_monitor.py`
- [ ] Implement request logging
- [ ] Implement response logging
- [ ] Implement metrics collection
- [ ] Implement error tracking
- [ ] Create monitoring dashboard endpoint
- [ ] Test: Monitoring data is collected and accessible

### 2.6 Update Orchestrator
- [ ] Update `/ai-agents/src/syncsenta_agents/orchestrator/workflow.py`
- [ ] Register all agents
- [ ] Update routing logic to use new agents
- [ ] Add monitoring hooks
- [ ] Test: Orchestrator routes to correct agents

## Phase 3: UI/UX Polish (Parallel)

### 3.1 Fix Favicon
- [ ] Create perfect circular SVG favicon
- [ ] Update `/studio/public/favicon.svg`
- [ ] Update `/studio/src/app/layout.tsx` metadata
- [ ] Test: Favicon displays correctly in browser

### 3.2 Update Student Chat UI
- [ ] Add agent state indicator (thinking, responding)
- [ ] Show which agent is responding
- [ ] Add typing indicators
- [ ] Add response metadata (agent name, reasoning)
- [ ] Test: UI shows agent information

### 3.3 Update Teacher Magic School UI
- [ ] Add content generation progress
- [ ] Show content history
- [ ] Add preview before generation
- [ ] Add export/download buttons
- [ ] Test: UI is polished and functional

### 3.4 Create Agent Monitor Dashboard
- [ ] Create `/studio/src/app/admin/monitor/` page
- [ ] Display real-time agent activity
- [ ] Show performance metrics
- [ ] Show error logs
- [ ] Test: Dashboard displays monitoring data

## Phase 4: Testing & Verification

### 4.1 Functional Testing
- [ ] Test student chat works
- [ ] Test teacher Magic School works
- [ ] Test all agents respond correctly
- [ ] Test monitoring data is collected
- [ ] Test error handling

### 4.2 Integration Testing
- [ ] Test frontend-backend communication
- [ ] Test agent orchestration
- [ ] Test state management
- [ ] Test monitoring system

### 4.3 Performance Testing
- [ ] Measure response times
- [ ] Check memory usage
- [ ] Verify no memory leaks
- [ ] Test with multiple concurrent users

### 4.4 Cleanup Verification
- [ ] Verify no broken imports
- [ ] Verify no unused code
- [ ] Verify folder structure is clean
- [ ] Verify codebase size reduced

## Phase 5: Deployment

### 5.1 Commit Changes
- [ ] Commit cleanup changes
- [ ] Commit agent implementation
- [ ] Commit UI/UX changes
- [ ] Push to Ascendra repository

### 5.2 Vercel Deployment
- [ ] Deploy to Vercel
- [ ] Test production deployment
- [ ] Verify all features work
- [ ] Monitor for errors

## Subtasks

### 1.1.1 Remove Dashboard Pages
- [ ] Delete `/studio/src/app/(main)/dashboard/county-comms/`
- [ ] Delete `/studio/src/app/(main)/dashboard/county-finance/`
- [ ] Delete `/studio/src/app/(main)/dashboard/county-resources/`
- [ ] Delete `/studio/src/app/(main)/dashboard/county-teachers/`
- [ ] Delete `/studio/src/app/(main)/dashboard/curriculum/`
- [ ] Delete `/studio/src/app/(main)/dashboard/guide/`
- [ ] Delete `/studio/src/app/(main)/dashboard/improvements/`
- [ ] Delete `/studio/src/app/(main)/dashboard/learning-lab/`
- [ ] Delete `/studio/src/app/(main)/dashboard/reports/`
- [ ] Delete `/studio/src/app/(main)/dashboard/school-finance/`
- [ ] Delete `/studio/src/app/(main)/dashboard/school-staff/`
- [ ] Delete `/studio/src/app/(main)/dashboard/schools/`
- [ ] Delete `/studio/src/app/(main)/dashboard/tools/`
- [ ] Delete `/studio/src/app/(main)/dashboard/page.tsx`
- [ ] Delete `/studio/src/app/(main)/layout.tsx`
- [ ] Delete `/studio/src/app/(main)/` directory

### 2.2.1 Socratic Tutor - Student Profile
- [ ] Create student profile model
- [ ] Track topics covered
- [ ] Track mastery levels
- [ ] Track struggle areas
- [ ] Track learning pace

### 2.3.1 Assessment Agent - Quiz Generation
- [ ] Implement quiz generation logic
- [ ] Implement grading logic
- [ ] Implement feedback generation
- [ ] Implement competency tracking

### 2.4.1 Magic School - Content Types
- [ ] Implement lesson plan generation
- [ ] Implement quiz generation
- [ ] Implement worksheet generation
- [ ] Implement rubric generation
- [ ] Implement differentiation strategies

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Codebase size reduction | 60% | ⏳ |
| Unused code removed | 100% | ⏳ |
| Agent response time | <2s | ⏳ |
| Monitoring coverage | 100% | ⏳ |
| Test pass rate | 100% | ⏳ |
| Favicon circular | Yes | ⏳ |
| Localhost working | Yes | ⏳ |
| Vercel deployment ready | Yes | ⏳ |

## Timeline

- **Week 1**: Phase 1 & 2 (cleanup + agent implementation)
- **Week 2**: Phase 3 & 4 (UI/UX + testing)
- **Week 3**: Phase 5 (deployment + monitoring)

## Dependencies

- None (all dependencies already installed)

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing code | Test after each step |
| Agent complexity | Start simple, iterate |
| Performance issues | Monitor and optimize |
| Deployment failures | Test locally first |
