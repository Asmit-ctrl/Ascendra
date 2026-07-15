# Agent Communication & Verifiable Feedback (Design)

Goal: design an architecture so autonomous agents produce verifiable, auditable feedback and actions — not opaque chat responses.

Core ideas
- Event-sourcing / audit log: persist every agent input, decision, and output as immutable events. Use Supabase/Postgres append-only tables or an append-only log (e.g., Kafka). Events form the canonical trace of what happened.
- Signed traces: each agent instance has an API key + private signing key (HMAC or ECDSA). When an agent emits a response, it signs the canonical event payload (input, prompt, model, output, confidence, timestamp) and the signature is stored with the event.
- Deterministic trace IDs: compute a trace_id = H("agent_id|timestamp|nonce|sha256(payload)") to allow independent verification.
- Replayability: with event log + snapshots we can replay an agent's decisions deterministically for debugging or grading.
- Gateways for external effects: external side-effects (notifications, grade updates, SMS/M-Pesa) go through gateways that only act when they see committed, non-replayed events and check replay-mode flags.

Minimal event schema (Postgres / Supabase table `agent_traces`):
- `id` UUID PK
- `trace_id` text (deterministic id)
- `agent_id` text
- `session_id` UUID (chat/session id)
- `input` jsonb (user message + context)
- `prompt` text
- `model` text
- `output` jsonb
- `confidence` numeric
- `signed_hash` text (sha256 of canonical payload)
- `signature` text (HMAC/ECDSA signature)
- `created_at` timestamptz default now()

Verification flow
1. Fetch `agent_traces` row by `trace_id`.
2. Recompute canonical payload hash and verify signature using agent public key (stored in `agent_keys` table).
3. Replay prompts + inputs into the same model + deterministic decoding (use fixed seed / sampling disabled) to compare outputs if needed.

API endpoints (to implement)
- `POST /api/agent/trace` — agent writes signed trace (validate signature optional server-side); store row and emit event to `events` stream.
- `GET /api/agent/trace/:trace_id/verify` — verify signature and return verification result and raw payload.
- `GET /api/agent/trace/:session_id` — list traces for a session (teacher review UI).

Operational notes
- Use short-lived agent keys and rotate regularly.
- Keep raw prompts and outputs accessible for teacher review, but redact PII for student privacy.
- For LLM non-determinism, store model version + sampling params; for strict reproducibility use deterministic decoding or record samples and seeds.
- Emit telemetry events for each trace to the event bus so other services (mastery model, scoring, notifications) can react.

References
- Event Sourcing (Martin Fowler): canonical audit log and replayability patterns.
- LangChain Agents / ReAct patterns: agent reasoning traces should include chain-of-thought steps and intermediate tool calls to provide fine-grained evidence.

Next implementation steps (Phase 2 initial slice)
1. Add `agent_traces` table migration (SQL).
2. Implement minimal `POST /api/agent/trace` endpoint to accept signed traces and persist.
3. Add verification endpoint and a small UI for teacher review of agent traces.
4. Wire agent proxies (teacher generators) to emit signed traces when they call LLMs or tools.
