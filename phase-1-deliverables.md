# Phase 1 Deliverables — Ascendra MVP

## Objective
Deliver a working student-centric MVP that aligns the current AI backend, student UX, and active documentation. This phase should focus on a stable Socratic student experience, matched language support, and a production-safe backend path.

## Core Phase 1 Deliverables

### 1. Student AI Chat MVP
- Standardize on the current student chat path using `studio/src/components/student/socratic-chat.tsx` and `/api/chat`.
- Ensure grade and subject selection are required before chat entry.
- Persist chat sessions and student progress centrally instead of only localStorage.
- Validate supported languages end-to-end and remove or implement Kikuyu support consistently.
- Keep the student experience lightweight and mobile-responsive.

### 2. AI Backend Alignment
- Confirm the active agent registry in `ai-agents/src/syncsenta_agents/orchestrator/main.py`.
- Update documentation to reflect only implemented agents (`socratic_tutor`, `assessment`, `lesson_architect`) or add missing agents as real implementations.
- Remove placeholder or unsupported agent claims from UI docs and root-level documentation.
- Harden the orchestrator routing logic so student requests reliably reach the correct agent.

### 3. Production Safety and Hardening
- Replace brittle in-memory rate limiting with a shared store or centralized limiter.
- Ensure backend behavior is stable when `GROQ_API_KEY` is missing or invalid.
- Confirm the chat route and student flow do not require Render-specific deployment assumptions.
- Add minimal end-to-end checks for student chat flow and language selection.

### 4. Documentation and active planning
- Keep `mega.md` as the critique and roadmap summary document.
- Keep `REMAINING_TASKS.md` as the active task tracker for sprint work.
- Keep `PROJECT_STATUS.md` for current progress and milestone reporting.
- Use `phase-1-deliverables.md` for the concrete Phase 1 MVP scope and implementation checkpoints.

## Phase 1 Milestones

### Milestone 1 — Stabilize Student Path
- [ ] Grade/subject selection must be completed before chat.
- [ ] Chat history saves to a backend session store.
- [ ] Language selector only exposes supported modes.
- [ ] Student-specific UX flows render without localStorage-only dependency.

### Milestone 2 — Align Backend and Docs
- [ ] Confirm actual agent registry and remove unsupported claims.
- [ ] Document the exact active agent set in `mega.md` and `PROJECT_STATUS.md`.
- [ ] Remove outdated root docs; keep only active documentation files.

### Milestone 3 — Harden Operations
- [ ] Swap in-memory rate limiting for shared rate-limiter or stable store.
- [ ] Add a fallback error path for backend model key issues.
- [ ] Add at least one end-to-end test for student chat + language selection.

## Success Criteria
- Student chat can be started only after grade/subject selection.
- Student language selection matches backend support.
- The backend no longer has a claimed-but-unimplemented multi-agent system in active docs.
- Root-level documentation is reduced to the active, useful set.
- The project has a clear, executable Phase 1 implementation plan.
