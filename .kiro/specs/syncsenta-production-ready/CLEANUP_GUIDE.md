# Code Cleanup Guide: Keep vs Remove

## Usefulness Criteria

### ✅ KEEP & INTEGRATE (Useful but not yet integrated)
These are valuable for MVP and should be integrated into the system:

| Code | Location | Why Keep | Integration |
|------|----------|----------|-------------|
| Quiz Components | `/studio/src/components/exam/` | Needed for teacher Magic School | Integrate into teacher interface |
| Rubric Generation | `/studio/src/ai/flows/generate-rubric.ts` | Needed for assessments | Integrate into Magic School Agent |
| Worksheet Generation | `/studio/src/ai/flows/generate-worksheet.ts` | Needed for teacher tools | Integrate into Magic School Agent |
| Lesson Plan Generation | `/studio/src/ai/flows/generate-lesson-plan.ts` | Needed for teacher tools | Integrate into Magic School Agent |
| CBC Curriculum Data | `/studio/src/curriculum/` | Core data for education | Consolidate to `/studio/src/data/curriculum/` |
| Curriculum Extractor | `/studio/src/lib/curriculum-extractor.ts` | Useful for data processing | Keep and use |

### ❌ REMOVE (Completely unused, not useful)
These are not used anywhere and not useful for MVP:

| Code | Location | Why Remove |
|------|----------|-----------|
| Unsloth Patch | `/patch_unsloth_cpu.py` | Not used anywhere, not needed |
| Jupyter Config | `/jupyter_config.py` | Not used, training not in MVP |
| Root App | `/app.py` | Replaced by FastAPI backend |
| Render Config | `/render.yaml` | Not used, using Vercel |
| IDX Config | `/studio/.idx/` | Not needed |
| Corrupted File | `/studio/[ABSOLUTE, FULL path to the file]` | Corrupted, not useful |
| Test Pages | `/studio/src/app/test-*` | Test pages, not MVP |
| Old Quiz Page | `/studio/src/app/quiz/` | Old implementation, quiz logic exists elsewhere |
| Auth Pages | `/studio/src/app/login/signin/signup/` | Auth not implemented in MVP |
| Admin Dashboards | `/studio/src/app/(main)/dashboard/` | Complex dashboards, not MVP |
| ChatDev | `/ChatDev/` | Separate project, not needed |
| Notebooks | `/notebooks/` | Training not in MVP |
| Gikuyu Bible | `/data/gikuyu_bible/` | Not used |
| Rust Backend | `/backend/syncsenta-backend/` | Replaced by Python FastAPI |
| Blockchain | `/backend/syncsenta-blockchain/` | Web3 not needed |
| WASM | `/backend/syncsenta-wasm/` | Not needed |
| Rust Common | `/backend/syncsenta-common/` | Rust utilities, not needed |

## Cleanup Checklist

### Phase 1: Remove Completely Unused Files
```bash
# Remove unused root files
rm /patch_unsloth_cpu.py
rm /jupyter_config.py
rm /app.py
rm /render.yaml
rm /studio/[ABSOLUTE, FULL path to the file]
rm -rf /studio/.idx/
rm /studio/.modified

# Remove unused test pages
rm -rf /studio/src/app/test-personalization/
rm -rf /studio/src/app/test-schemer/
rm -rf /studio/src/app/quiz/
rm -rf /studio/src/app/login/
rm -rf /studio/src/app/signin/
rm -rf /studio/src/app/signup/

# Remove admin dashboards
rm -rf /studio/src/app/(main)/

# Remove unused projects
rm -rf /ChatDev/
rm -rf /notebooks/
rm -rf /data/gikuyu_bible/

# Remove unused backend
rm -rf /backend/syncsenta-backend/
rm -rf /backend/syncsenta-blockchain/
rm -rf /backend/syncsenta-wasm/
rm -rf /backend/syncsenta-common/
rm /backend/Cargo.toml
rm /backend/Cargo.lock
```

### Phase 2: Keep & Integrate Useful Code
```bash
# These stay and get integrated:
# - /studio/src/components/exam/ → Integrate into teacher Magic School
# - /studio/src/ai/flows/generate-*.ts → Integrate into Magic School Agent
# - /studio/src/curriculum/ → Consolidate to /studio/src/data/curriculum/
# - /studio/src/lib/curriculum-extractor.ts → Keep and use
```

### Phase 3: Organize Root Folder
```bash
# Final structure:
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

## Files to Keep (MVP Only)

### Frontend
```
studio/
├── src/
│   ├── app/
│   │   ├── student/          ✅ KEEP
│   │   ├── teacher/          ✅ KEEP
│   │   ├── api/              ✅ KEEP
│   │   └── layout.tsx        ✅ KEEP
│   ├── components/
│   │   ├── student/          ✅ KEEP
│   │   ├── teacher/          ✅ KEEP
│   │   ├── exam/             ✅ KEEP & INTEGRATE
│   │   └── ui/               ✅ KEEP
│   ├── data/
│   │   └── curriculum/       ✅ KEEP & CONSOLIDATE
│   ├── ai/
│   │   └── flows/
│   │       ├── generate-rubric.ts        ✅ KEEP & INTEGRATE
│   │       ├── generate-worksheet.ts     ✅ KEEP & INTEGRATE
│   │       ├── generate-lesson-plan.ts   ✅ KEEP & INTEGRATE
│   │       └── mwalimu-ai-flow.ts        ✅ KEEP
│   ├── lib/
│   │   ├── curriculum-extractor.ts       ✅ KEEP
│   │   ├── groq-client.ts                ✅ KEEP
│   │   ├── types.ts                      ✅ KEEP
│   │   └── utils.ts                      ✅ KEEP
│   └── styles/                           ✅ KEEP
├── public/
│   ├── favicon.svg                       ✅ KEEP (update)
│   └── ...                               ✅ KEEP
└── package.json                          ✅ KEEP
```

### Backend
```
ai-agents/
├── src/syncsenta_agents/
│   ├── api/                              ✅ KEEP
│   ├── agents/                           ✅ KEEP & ENHANCE
│   ├── orchestrator/                     ✅ KEEP & ENHANCE
│   ├── core/                             ✅ KEEP
│   └── monitoring/                       ✅ KEEP & ADD
├── requirements.txt                      ✅ KEEP
└── pyproject.toml                        ✅ KEEP
```

### Documentation & Config
```
docs/                                     ✅ KEEP
scripts/                                  ✅ KEEP
.env                                      ✅ KEEP
.env.example                              ✅ KEEP
vercel.json                               ✅ KEEP
README.md                                 ✅ KEEP
.gitignore                                ✅ KEEP
```

## Size Reduction Estimate

| Category | Before | After | Reduction |
|----------|--------|-------|-----------|
| Frontend | ~500MB | ~150MB | 70% |
| Backend | ~200MB | ~50MB | 75% |
| Projects | ~300MB | 0MB | 100% |
| **Total** | **~1GB** | **~200MB** | **80%** |

## Integration Tasks

After cleanup, integrate useful code:

1. **Quiz Components** → Teacher Magic School
   - Move `/studio/src/components/exam/` components into teacher interface
   - Use in quiz generation flow

2. **Rubric Generation** → Magic School Agent
   - Integrate `/studio/src/ai/flows/generate-rubric.ts` into agent
   - Call from teacher interface

3. **Worksheet Generation** → Magic School Agent
   - Integrate `/studio/src/ai/flows/generate-worksheet.ts` into agent
   - Call from teacher interface

4. **Lesson Plan Generation** → Magic School Agent
   - Integrate `/studio/src/ai/flows/generate-lesson-plan.ts` into agent
   - Call from teacher interface

5. **Curriculum Data** → Consolidate
   - Move all curriculum data to `/studio/src/data/curriculum/`
   - Update all imports
   - Remove duplicates

## Verification

After cleanup, verify:
- [ ] No broken imports
- [ ] Student chat still works
- [ ] Teacher Magic School still works
- [ ] Backend still runs
- [ ] Frontend still builds
- [ ] No console errors
- [ ] Folder structure is clean
- [ ] Codebase size reduced by 60%+
