# SyncSenta Production-Ready Spec

## Overview
Transform SyncSenta from a prototype with scattered code into a production-ready platform with:
1. Clean, minimal codebase (only what's used)
2. Real AI agents with monitoring and state management
3. Professional UI/UX (circular favicon, polished design)
4. Organized folder structure

## Current State
- ✅ Frontend (Next.js) running on localhost:5173
- ✅ Backend (FastAPI + Groq) running on localhost:8001
- ✅ Student chat working
- ✅ Teacher Magic School working
- ❌ Agents are just Groq wrappers (no monitoring/state)
- ❌ Codebase has 60%+ unused code
- ❌ Favicon is generic Firebase default
- ❌ Folder structure is messy

## Requirements

### R1: Code Cleanup & Organization
**Goal**: Remove unused code, keep only MVP features

**Usefulness Criteria**:
- ✅ **KEEP**: Code that is useful for MVP (student chat, teacher Magic School, quiz generation)
- ✅ **KEEP & INTEGRATE**: Code that is useful but not yet integrated (quiz code, assessment logic)
- ❌ **REMOVE**: Code that is completely unused and not useful (unsloth.py, patch files, test pages)

**R1.1 - Remove Completely Unused Code**
- Remove `/patch_unsloth_cpu.py` (not used anywhere)
- Remove `/jupyter_config.py` (not used)
- Remove `/app.py` (not used, replaced by FastAPI)
- Remove `/studio/src/app/test-*` (test pages, not useful)
- Remove `/studio/src/app/quiz/` (old quiz page, quiz logic exists elsewhere)
- Remove `/studio/src/app/login/signin/signup/` (auth not implemented)
- Remove `/studio/src/app/(main)/dashboard/` (complex admin dashboards, not MVP)
- Remove `/render.yaml` (not used)
- Remove `/studio/.idx/` (IDX config, not needed)
- Remove `/studio/[ABSOLUTE, FULL path to the file]` (corrupted file)

**R1.2 - Keep & Integrate Useful Code**
- Keep `/studio/src/components/exam/` (quiz components - INTEGRATE into teacher Magic School)
- Keep `/studio/src/ai/flows/generate-rubric.ts` (rubric generation - INTEGRATE)
- Keep `/studio/src/ai/flows/generate-worksheet.ts` (worksheet generation - INTEGRATE)
- Keep `/studio/src/ai/flows/generate-lesson-plan.ts` (lesson plan - INTEGRATE)
- Keep `/studio/src/curriculum/` (CBC curriculum data - CONSOLIDATE)
- Keep `/studio/src/lib/mock-data.ts` (mock data - REPLACE with real data)

**R1.3 - Remove Unused Pages**
- Remove `/studio/src/app/(main)/dashboard/` (complex admin dashboards)
- Remove `/studio/src/app/test-*` (test pages)
- Remove `/studio/src/app/login/signin/signup/` (auth not implemented)
- Keep: `/studio/src/app/student/` and `/studio/src/app/teacher/`

**R1.4 - Remove Unused Backend**
- Remove `/backend/syncsenta-backend/` (Rust backend replaced by Python)
- Remove `/backend/syncsenta-blockchain/` (Web3 not needed)
- Remove `/backend/syncsenta-wasm/` (WASM not needed)
- Remove `/backend/syncsenta-common/` (Rust utilities)
- Keep: `/ai-agents/` (Python FastAPI)

**R1.5 - Remove Unused Projects**
- Remove `/ChatDev/` (separate project)
- Remove `/notebooks/` (training not in MVP)
- Remove `/data/gikuyu_bible/` (not used)

**R1.6 - Organize Root Folder**
```
/syncsenta/
├── studio/              # Frontend (Next.js)
├── ai-agents/           # Backend (Python FastAPI)
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── .env                 # Configuration
├── .env.example         # Configuration template
├── vercel.json          # Vercel config
├── README.md            # Project README
└── .gitignore           # Git ignore rules
```

**R1.7 - Consolidate & Clean Data**
- Consolidate curriculum data to: `/studio/src/data/curriculum/`
- Remove duplicate data files
- Replace mock data with real CBC curriculum data
- Remove unused data directories

### R2: Real AI Agents Implementation
**Goal**: Make agents actually monitor, track state, and provide intelligent responses

**R2.1 - Agent Architecture**
Each agent should have:
- **State Management**: Track conversation history, student progress, teacher actions
- **Monitoring**: Log all interactions, decisions, and outcomes
- **Memory**: Remember previous interactions with same user
- **Reasoning**: Not just call Groq, but analyze context and decide best action

**R2.2 - Socratic Tutor Agent**
- Monitor: Student question patterns, misconceptions, learning pace
- State: Track topics covered, mastery level, struggle areas
- Action: Ask guiding questions, provide hints, adapt difficulty
- Memory: Remember student's learning history

**R2.3 - Assessment Agent**
- Monitor: Quiz performance, competency mastery, time spent
- State: Track quiz history, scores, weak areas
- Action: Generate targeted quizzes, provide feedback
- Memory: Remember student's assessment history

**R2.4 - Teacher Magic School Agent**
- Monitor: Teacher requests, content generation patterns
- State: Track generated content, usage patterns
- Action: Generate lesson plans, quizzes, rubrics
- Memory: Remember teacher's preferences and previous content

**R2.5 - Agent Monitoring Dashboard**
- Real-time agent activity log
- Student progress tracking
- Teacher content generation history
- System health metrics

### R3: UI/UX Polish
**Goal**: Professional, polished interface

**R3.1 - Favicon**
- Replace generic Firebase favicon with professional circular SyncSenta logo
- Perfect circle shape (not other shapes)
- Blue gradient (brand color)
- Scalable SVG format

**R3.2 - Student Chat UI**
- Clean message interface
- Real-time typing indicators
- Agent thinking/processing state
- Clear response attribution (which agent responded)

**R3.3 - Teacher Magic School UI**
- Content generation progress indicator
- Preview before generation
- Easy export/download
- History of generated content

### R4: Data Management
**Goal**: Organized, minimal data structure

**R4.1 - Curriculum Data**
- Single source of truth: `/studio/src/data/curriculum/`
- CBC-aligned structure
- Grade-level organization
- Subject-based organization

**R4.2 - Mock vs Real Data**
- Remove all mock data
- Use real CBC curriculum data only
- Prepare for database integration (future)

## Success Criteria

| Criterion | Status |
|-----------|--------|
| Unused code removed | ⏳ |
| Root folder organized | ⏳ |
| Agents have state management | ⏳ |
| Agents have monitoring | ⏳ |
| Favicon is circular | ⏳ |
| Student chat shows agent state | ⏳ |
| Teacher Magic School shows history | ⏳ |
| All tests pass | ⏳ |
| Codebase size reduced by 60% | ⏳ |
| Localhost still works | ⏳ |
| Vercel deployment ready | ⏳ |

## Acceptance Criteria

1. **Code Cleanup**
   - [ ] Unused pages removed
   - [ ] Unused backends removed
   - [ ] Root folder organized
   - [ ] Data consolidated
   - [ ] No broken imports

2. **Agent Implementation**
   - [ ] Socratic Tutor has state management
   - [ ] Assessment Agent has monitoring
   - [ ] Teacher Magic School tracks history
   - [ ] All agents log interactions
   - [ ] Agent responses show reasoning

3. **UI/UX**
   - [ ] Favicon is perfect circle
   - [ ] Student chat shows agent state
   - [ ] Teacher interface shows content history
   - [ ] All pages load without errors

4. **Testing**
   - [ ] Localhost works (student chat, teacher Magic School)
   - [ ] No console errors
   - [ ] All API endpoints respond
   - [ ] Vercel deployment ready

## Timeline
- **Phase 1**: Code cleanup (parallel with agent implementation)
- **Phase 2**: Agent state management
- **Phase 3**: Agent monitoring
- **Phase 4**: UI/UX polish
- **Phase 5**: Testing & verification

## Dependencies
- None (all dependencies already installed)

## Risks
- Breaking existing functionality during cleanup
- Agent state management complexity
- Performance impact of monitoring

## Mitigation
- Test after each cleanup step
- Use simple state management (in-memory for now)
- Optimize monitoring queries
