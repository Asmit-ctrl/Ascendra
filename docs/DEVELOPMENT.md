# Development guide

## Scope

This guide starts the currently integrated Studio plus AI-agents path. It does
not assume that the legacy Rust references in scripts/ are present, and it
does not merge Scheme Scribe into the Studio deployment.

Read [Architecture](ARCHITECTURE.md) first if you are unsure which application
you need to run.

## Prerequisites

Install the following before starting:

| Tool or service | Why it is needed |
| --- | --- |
| Node.js with npm | Studio and Scheme Scribe builds and tests |
| Python 3.11 | AI-agents package declares Python 3.11 support |
| Groq API key | Required for Studio's production chat build and AI-agent LLM requests |
| Supabase project | Required for authentication and database-backed features |
| Upstash Redis account | Optional; enables Studio chat rate limiting |
| Supabase CLI | Optional; inspect/apply migrations only after selecting an authoritative schema source |
| Arduino IDE plus ESP32 support | Only for the firmware prototype |

Poetry is optional for the Python service. The repository provides both
pyproject.toml and requirements.txt.

## Environment configuration

Never commit real secrets. The repository's .gitignore is the enforcement
mechanism, but review the result of git status before every commit.

### Studio environment

Create studio/.env.local for local development:

    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
    GROQ_API_KEY=your-groq-key
    GROQ_MODEL=llama-3.3-70b-versatile
    NEXT_PUBLIC_AI_AGENTS_URL=http://localhost:8001
    UPSTASH_REDIS_REST_URL=https://your-redis-endpoint
    UPSTASH_REDIS_REST_TOKEN=your-redis-token

Required by the committed Studio build check:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- GROQ_API_KEY

Important behavior:

- NEXT_PUBLIC_AI_AGENTS_URL is optional at build time but is required for
  client features that use the FastAPI backend in production.
- SUPABASE_SERVICE_ROLE_KEY must remain server-only. Do not prefix it with
  NEXT_PUBLIC.
- Upstash values are optional. Without them, the rate limiter allows requests
  and logs that limiting is disabled.
- The voice-call route reads SUPABASE_SERVICE_KEY rather than
  SUPABASE_SERVICE_ROLE_KEY. If voice persistence is enabled, set the
  compatibility variable deliberately and review the implementation first.
- studio/.env.cbc-agent.example only covers an older CBC-agent configuration;
  it is not a complete Studio environment template.

### AI-agents environment

Create ai-agents/.env from ai-agents/.env.example, then add the deployment
credentials used by the actual service:

    ENVIRONMENT=development
    DEBUG=true
    GROQ_API_KEY=your-groq-key
    GROQ_MODEL=llama-3.3-70b-versatile
    SUPABASE_URL=https://your-project.supabase.co
    SUPABASE_SERVICE_KEY=your-server-only-service-role-key
    FRONTEND_URL=http://localhost:5173
    SYNCSENTA_OFFLINE_DEMO=0

Additional values in the checked-in template configure optional or historical
paths such as Ollama, Dify, Stellar, CouchDB, and ElevenLabs. The current
FastAPI deployment configuration requires Groq and uses Supabase
best-effort for database features.

Set SYNCSENTA_OFFLINE_DEMO=1 only when you intentionally want the deterministic
assessment stub. It does not make every agent feature offline.

### Scheme Scribe environment

Scheme Scribe reads its browser client configuration from:

    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-or-publishable-key

Its Edge Functions read secrets such as GROQ_API_KEY from the Supabase
Functions environment, not from the Vite bundle. Keep those settings in the
specific Supabase project used by Scheme Scribe.

## Run the primary stack on Windows PowerShell

Use two terminals. These commands avoid the repository's older all-in-one
scripts, several of which reference absent Rust directories.

### Terminal 1: AI Agents

    Set-Location D:codeAscedraai-agents
    py -3.11 -m venv .venv
    ..venvScriptsActivate.ps1
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    $env:PYTHONPATH = "$PWDsrc"
    python -m uvicorn syncsenta_agents.api.server:app --host 127.0.0.1 --port 8001 --reload

Verify the service in a second PowerShell window:

    Invoke-RestMethod http://127.0.0.1:8001/healthz

Expected shape:

    status       offline_demo
    ------       ------------
    ok           False

If you use Poetry instead, run the equivalent commands from ai-agents:

    poetry install
    poetry run python -m syncsenta_agents.main

The Poetry entry point starts Uvicorn on port 8001 without reload mode.

### Terminal 2: Studio

    Set-Location D:codeAscedrastudio
    npm ci
    npm run dev

Open:

    http://localhost:5173

Set NEXT_PUBLIC_AI_AGENTS_URL before starting Next.js because public
environment values are bundled during development and build.

### Validate browser-to-service connectivity

Studio makes some direct browser calls to the FastAPI service. The FastAPI
CORS allow-list currently names localhost ports 3000 and 3001, while Studio
uses 5173. If a direct call fails in the browser but /healthz works from
PowerShell, inspect the browser console and update the CORS configuration in
ai-agents/src/syncsenta_agents/api/server.py as part of a reviewed change.

## Run Scheme Scribe independently

    Set-Location D:codeAscedrascheme-scribe
    npm ci
    npm run dev

The Vite dev server prints its local URL. It is not a child process of Studio
and is expected to use the Scheme Scribe Supabase configuration.

## Test and build commands

Run commands from the relevant component directory.

| Component | Unit tests | Static checks / production build |
| --- | --- | --- |
| Studio | npx vitest run | npm run typecheck, npm run lint, npm run build |
| AI agents | Set PYTHONPATH to src, then pytest | pytest and any configured Python quality tools |
| Scheme Scribe | npm run test | npm run lint, npm run build |

For AI-agents tests in PowerShell:

    Set-Location D:codeAscedraai-agents
    ..venvScriptsActivate.ps1
    $env:PYTHONPATH = "$PWDsrc"
    pytest

For a documentation-only change, use at least:

    git diff --check
    git status --short

Studio's build invokes scripts/check-env.js first, so a missing Studio
environment variable will fail the build before Next.js compiles the app.

## Database and migrations

Do not run every SQL file in the repository against one database. The
repository contains overlapping history.

Before applying a migration:

1. Identify the target Supabase project and export/back up the relevant
   schema/data.
2. Inspect the current migration history in that project.
3. Select the matching source family:
   - SQL Studio sources: sql/studio_migrations
   - newer shared/root migrations: supabase/migrations
   - Scheme Scribe migrations: scheme-scribe/supabase/migrations
4. Verify whether an equivalent migration has already been applied from
   sql/supabase_migrations or studio/supabase/migrations.
5. Apply one reviewed migration to staging first, then regenerate Studio
   database types if the Studio schema changed.

The numbered 001 through 005 files below root supabase/migrations and
studio/supabase/migrations are not usable source files in this checkout:
they contain absolute Linux paths. Use the full SQL in sql/studio_migrations
for the corresponding Studio schema definitions.

## Deployment

### Studio

studio/vercel.json configures a Vercel build and selected rewrites to the
Render backend. netlify.toml is a separate Netlify configuration and declares
a different backend URL. Select one deployment platform and keep its
environment variables authoritative.

### AI agents

ai-agents/render.yaml declares:

- a Python web service started with Uvicorn;
- a health check at /healthz;
- a scheduled rule-learning job;
- Groq and Supabase server-side variables.

The production command sets PYTHONPATH=src before starting Uvicorn. Mirror
that behavior in any non-Render host.

### Scheme Scribe

Deploy the Vite frontend separately and deploy its Supabase Edge Functions to
the matching Supabase project. Review Edge Function secrets before publishing.

## Known setup traps

| Symptom | Likely cause | First check |
| --- | --- | --- |
| Studio build fails immediately | Required Studio environment variable is missing | studio/scripts/check-env.js |
| Browser shows a CORS error | Studio uses port 5173 but FastAPI CORS lacks that port | FastAPI server CORS configuration |
| AI agent import cannot be found | PYTHONPATH does not include ai-agents/src | Set PYTHONPATH before Uvicorn or pytest |
| A shell script fails in backend or frontend | Script refers to a retired Rust layout | Run the manual commands in this guide |
| SQL migration errors on a path string | A pointer-file migration was selected | Use sql/studio_migrations for 001 through 005 |
| Teacher feedback endpoint returns 404 from FastAPI | The feedback router exists but is not included in api/server.py | Verify router registration |
| Voice UI does not behave as a full backend call | Voice-call orchestrator contains a placeholder AI method | Review the route and client implementation |

## Safe change workflow

1. Work in one component at a time.
2. Keep secrets in component-local environment files.
3. Add or update a migration only in the selected canonical source family.
4. Run targeted tests, then the component build.
5. Update the matching document in docs when an interface, environment
   variable, or deployment contract changes.
