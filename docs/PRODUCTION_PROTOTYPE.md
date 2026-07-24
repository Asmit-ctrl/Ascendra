# Production Prototype Configuration

## Vercel (studio)

Set these environment variables in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_AI_AGENTS_URL=https://<ai-agents-service>
AUTH_WALL_ENABLED=false
```

Keep `AUTH_WALL_ENABLED=false` for the no-API presentation prototype. When
Supabase Auth is ready, set it to `true` to protect `/teacher/*` and
`/student/*`; users will then be sent to `/login` until they have a valid
Supabase session.

## AI agents service

The presentation prototype uses NVIDIA NIM by default:

```text
LLM_PROVIDER=nvidia
NVIDIA_API_KEY=<secret>
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning
```

To move to OpenAI later, replace the provider variables without a code change:

```text
LLM_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

Groq remains an optional fallback when `GROQ_API_KEY` is configured. Never
commit provider keys; set them only in the deployment provider's secret store.

## No-key fallback and RAG

When no NVIDIA, OpenAI, or Groq key is configured, scheme generation returns a
deterministic, labelled `prescribed-cbc-fallback` scheme. This keeps a demo
usable but is not a replacement for curriculum review.

The Scheme Wizard can accept text-based material (`.txt`, `.md`, `.csv`,
`.json`, `.rtf`) or pasted document text. The backend chunks the material and
retrieves the most relevant excerpts for the selected context before sending
the grounded prompt to the configured model. For PDFs or DOCX files, extract
the text first; binary document parsing is intentionally not part of this
prototype.
