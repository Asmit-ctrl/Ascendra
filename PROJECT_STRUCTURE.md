# SyncSenta Project Structure

## 📁 Root Directory Structure

```
/sync/
├── studio/              # Frontend (Next.js)
├── ai-agents/           # Backend (FastAPI + Python)
├── docs/                # All documentation
├── scripts/             # Build and utility scripts
├── .kiro/               # Kiro AI configuration and specs
├── .github/             # GitHub workflows and actions
├── .vscode/             # VS Code settings
├── .devcontainer/       # Dev container configuration
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # Main project README
└── vercel.json          # Vercel deployment config
```

## 🎯 Core Directories

### 1. `studio/` - Frontend Application
**Technology**: Next.js 14, React, TypeScript, Tailwind CSS

**Purpose**: Student and teacher interfaces

**Key Components**:
- `/src/app/` - Next.js app router pages
- `/src/components/` - React components
  - `/teacher/` - Teacher dashboard components
  - `/student/` - Student interface components
- `/src/data/curriculum/` - CBC curriculum data (from scheme-scribe-ai)
- `/src/lib/` - Utility functions and services
- `/public/` - Static assets

**Running**:
```bash
cd studio
npm run dev  # Runs on http://localhost:5173
```

### 2. `ai-agents/` - Backend Application
**Technology**: FastAPI, Python 3.12, Groq AI

**Purpose**: AI agents for tutoring, assessment, and orchestration

**Key Components**:
- `/src/syncsenta_agents/` - Main package
  - `/agents/` - Individual AI agents (tutoring, assessment, etc.)
  - `/api/` - FastAPI endpoints
  - `/orchestrator/` - Multi-agent orchestration
  - `/inference/` - Groq AI client
  - `/core/` - Core utilities and models

**Running**:
```bash
cd ai-agents
source venv/bin/activate
PYTHONPATH=src uvicorn syncsenta_agents.api.server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. `docs/` - Documentation
**Purpose**: All project documentation organized by category

**Structure**:
- `/architecture/` - System architecture documents
- `/deployment/` - Deployment guides (Vercel, Render, etc.)
- `/development/` - Development setup and guides
- `/status/` - Implementation status and reports
- `/setup/` - Initial setup guides
- `/troubleshooting/` - Common issues and fixes
- `/archive/` - Old/deprecated documentation

### 4. `scripts/` - Utility Scripts
**Purpose**: Build, deployment, and utility scripts

**Key Scripts**:
- `start-dev.sh` - Start both frontend and backend
- `cleanup-for-vercel.sh` - Clean up for Vercel deployment
- `test_ai_services.js` - Test AI services

### 5. `.kiro/` - Kiro AI Configuration
**Purpose**: Kiro AI specs, skills, and steering files

**Structure**:
- `/specs/` - Feature specifications
  - `/adaptive-learning-ecosystem/` - **ACTIVE** - Main feature spec
  - `/syncsenta-production-ready/` - **ACTIVE** - Production cleanup spec
  - `/archive/` - Old specs (gikuyu-mwalimu, schemer-integration, etc.)
- `/skills/` - Kiro AI skills
- `/steering/` - Kiro AI steering rules

## 🚀 Active Specifications

### 1. Adaptive Learning Ecosystem
**Location**: `.kiro/specs/adaptive-learning-ecosystem/`

**Status**: In Progress

**Goal**: Build Synthesis/DreamBox/MagicSchool mashup with:
- Interactive sandbox (Canvas/WebGL)
- Behavioral telemetry (dwell time, pathing, erasure rate)
- xAPI Learning Record Store
- Adaptive AI agents
- Real-time intervention alerts
- Scheme of work generation (✅ DONE)

**Files**:
- `requirements.md` - Comprehensive requirements
- `design.md` - System design
- `.config.kiro` - Spec configuration

### 2. SyncSenta Production Ready
**Location**: `.kiro/specs/syncsenta-production-ready/`

**Status**: Completed

**Goal**: Clean up unused code and streamline for production

**Files**:
- `requirements.md` - Cleanup requirements
- `design.md` - Cleanup design
- `tasks.md` - Implementation tasks
- `CLEANUP_GUIDE.md` - Keep vs Remove checklist

## 📦 Technology Stack

### Frontend (studio/)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Charts**: Recharts
- **Maps**: Mapbox GL
- **Math**: Mafs, KaTeX

### Backend (ai-agents/)
- **Framework**: FastAPI
- **Language**: Python 3.12
- **AI**: Groq AI (llama-3.3-70b-versatile)
- **Database**: Supabase (PostgreSQL)
- **Testing**: pytest, hypothesis (property-based testing)
- **Orchestration**: LangGraph

### Infrastructure
- **Deployment**: Vercel (frontend + backend)
- **Database**: Supabase (hosted PostgreSQL)
- **AI**: Groq (free tier)
- **Version Control**: Git + GitHub

## 🔧 Configuration Files

### Root Level
- `.env` - Environment variables (gitignored)
- `.env.example` - Environment template
- `vercel.json` - Vercel deployment configuration
- `.gitignore` - Git ignore rules
- `README.md` - Main project documentation

### Frontend (studio/)
- `package.json` - Node dependencies
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

### Backend (ai-agents/)
- `pyproject.toml` - Python project configuration
- `.env` - Backend environment variables
- `.env.example` - Backend environment template

## 🗂️ Archived Content

### Archived Specs (.kiro/specs/archive/)
- `gikuyu-mwalimu-integration/` - Gikuyu language integration
- `schemer-integration/` - Scheme-scribe-ai integration (now merged)
- `syncsenta-core-mvp/` - Initial MVP spec
- `syncsenta-education-os/` - Education OS concept

### Archived Docs (docs/archive/)
- Old architecture documents
- Deprecated setup guides
- Historical project status

## 📝 Key Files

### Essential Root Files
- `README.md` - Project overview and quick start
- `vercel.json` - Vercel deployment config
- `.env.example` - Environment variable template
- `.gitignore` - Git ignore rules

### Essential Frontend Files
- `studio/package.json` - Dependencies
- `studio/next.config.ts` - Next.js config
- `studio/src/app/layout.tsx` - Root layout
- `studio/src/app/page.tsx` - Home page
- `studio/src/app/teacher/page.tsx` - Teacher dashboard
- `studio/src/components/teacher/magic-school-teacher.tsx` - Teacher interface
- `studio/src/components/teacher/scheme-of-work-generator.tsx` - Scheme generator
- `studio/src/data/curriculum/` - CBC curriculum data

### Essential Backend Files
- `ai-agents/pyproject.toml` - Python dependencies
- `ai-agents/src/syncsenta_agents/api/server.py` - FastAPI server
- `ai-agents/src/syncsenta_agents/orchestrator/workflow.py` - Agent orchestrator
- `ai-agents/src/syncsenta_agents/agents/tutoring.py` - Tutoring agent
- `ai-agents/src/syncsenta_agents/agents/assessment.py` - Assessment agent
- `ai-agents/src/syncsenta_agents/inference/groq_client.py` - Groq AI client

## 🎯 Current Focus

### ✅ Completed
- Project structure cleanup
- Scheme of work generation
- Groq AI integration
- Teacher dashboard
- Student flow
- CBC curriculum data integration

### 🚧 In Progress
- Interactive sandbox (Canvas/WebGL)
- Behavioral telemetry capture
- xAPI Learning Record Store
- Adaptive AI agents

### 📋 Next Steps
1. Create interactive sandbox component
2. Implement telemetry capture system
3. Set up Supabase tables for telemetry
4. Build adaptive agents (Telemetry, Analysis, Intervention)
5. Create real-time intervention alerts
6. Implement automated differentiation engine

## 🔗 Quick Links

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs
- **Health Check**: http://localhost:8001/healthz
- **Groq Setup**: docs/development/GROQ_SETUP.md
- **Deployment Guide**: docs/deployment/VERCEL_DEPLOYMENT.md
- **Status**: docs/status/ADAPTIVE_LEARNING_STATUS.md

---

**Last Updated**: 2026-05-05
**Maintainer**: SyncSenta Team
**License**: Proprietary
