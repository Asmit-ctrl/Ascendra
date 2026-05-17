/**
 * POST /api/chat
 *
 * Streams a Socratic Mentor response from Groq back to the browser as
 * Server-Sent Events (SSE). The browser parses these into incremental tokens
 * and renders them in the chat panel.
 *
 * Mode 'socratic' uses buildSocraticSystemPrompt; mode 'compass' uses
 * buildCompassSystemPrompt with the supplied teacherContext.
 *
 * Guardrails:
 *   - 30 s timeout on the upstream Groq call (AbortSignal.timeout).
 *   - Inbound history truncated to MAX_HISTORY_TURNS (defence in depth — the
 *     client also caps, but a malicious client could lie).
 *   - In-memory per-IP token-bucket rate limit (see lib/rate-limit.ts for
 *     honest limitations).
 *
 * Errors return JSON with the appropriate status — we deliberately do NOT
 * fall back to canned text. A broken backend should be visibly broken.
 */

import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import {
  buildSocraticSystemPrompt,
  buildCompassSystemPrompt,
} from "@/lib/socratic-prompts";
import { capHistory } from "@/lib/socratic-history";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ──────────────────────────────────────────────────────────────────────────
// Tunables
// ──────────────────────────────────────────────────────────────────────────

/** Upstream timeout. Groq is usually < 5 s; 30 s catches the long tail. */
const GROQ_TIMEOUT_MS = 30_000;

/** Hard cap on inbound history turns. Matches the persistence cap. */
const MAX_HISTORY_TURNS = 40;

/**
 * Burst: 30 messages allowed in a tight burst per IP.
 * Sustained: ~1 message every 2 seconds long-term (0.5 / sec).
 * These are per-process — see lib/rate-limit.ts for caveats on Vercel.
 */
const RATE_LIMIT = { capacity: 30, refillPerSec: 0.5 };

// ──────────────────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────────────────

const HistoryEntry = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatRequest = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(HistoryEntry).max(MAX_HISTORY_TURNS * 2).default([]),
  grade: z.string().min(1).max(40),
  subject: z.string().min(1).max(80),
  language: z.enum(["english", "kiswahili", "mixed"]).default("mixed"),
  studentName: z.string().max(80).optional(),
  mode: z.enum(["socratic", "compass"]).default("socratic"),
  teacherContext: z.string().max(20000).optional(),
});

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function clientKey(req: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to a constant so local dev still
  // exercises the limiter (rather than skipping it entirely).
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "local";
}

function sseError(message: string, detail?: string): string {
  const payload = detail ? { error: message, detail } : { error: message };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

// ──────────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ---- Rate limit (cheap; runs before parsing) ------------------------------
  const ip = clientKey(req);
  const decision = rateLimit(`chat:${ip}`, RATE_LIMIT);
  if (!decision.allowed) {
    return Response.json(
      {
        error: "Too many requests",
        detail: `Try again in ${decision.retryAfterSec}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(decision.retryAfterSec),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // ---- Parse + validate -----------------------------------------------------
  let body: z.infer<typeof ChatRequest>;
  try {
    const json = await req.json();
    body = ChatRequest.parse(json);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Invalid JSON";
    return Response.json(
      { error: "Invalid request body", detail },
      { status: 400 }
    );
  }

  if (body.mode === "compass" && !body.teacherContext) {
    return Response.json(
      { error: "Compass mode requires teacherContext" },
      { status: 400 }
    );
  }

  // ---- Env ------------------------------------------------------------------
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "Server is missing GROQ_API_KEY",
        detail:
          "Set GROQ_API_KEY in your environment (Vercel project settings for prod).",
      },
      { status: 500 }
    );
  }
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  // ---- Build messages -------------------------------------------------------
  const systemPrompt =
    body.mode === "compass"
      ? buildCompassSystemPrompt({
          teacherContext: body.teacherContext!,
          language: body.language,
          studentName: body.studentName,
        })
      : buildSocraticSystemPrompt({
          grade: body.grade,
          subject: body.subject,
          language: body.language,
          studentName: body.studentName,
        });

  // Defence in depth: cap server-side even though the client also trims.
  const trimmedHistory = capHistory(body.history, MAX_HISTORY_TURNS);

  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      { role: "system", content: systemPrompt },
      ...trimmedHistory,
      { role: "user", content: body.message },
    ];

  // ---- Call Groq (streaming, with timeout) ----------------------------------
  const groq = new Groq({ apiKey });

  // AbortSignal.timeout is available on Node 18+ — Vercel's runtime is fine.
  // If the SDK doesn't honour signal natively for every version, our stream
  // loop will still bail out when the connection drops.
  const timeoutSignal = AbortSignal.timeout(GROQ_TIMEOUT_MS);

  let groqStream: Awaited<ReturnType<typeof groq.chat.completions.create>>;
  try {
    groqStream = await groq.chat.completions.create(
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 600,
        top_p: 1,
        stream: true,
      },
      { signal: timeoutSignal }
    );
  } catch (err) {
    const aborted =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    const detail = err instanceof Error ? err.message : "Unknown Groq error";
    console.error("[/api/chat] Groq request failed:", detail);
    return Response.json(
      {
        error: aborted ? "Upstream timeout" : "Upstream model error",
        detail,
      },
      { status: aborted ? 504 : 502 }
    );
  }

  // ---- Convert AsyncIterable -> SSE ReadableStream --------------------------
  const encoder = new TextEncoder();
  const sse = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of groqStream as AsyncIterable<{
          choices?: { delta?: { content?: string | null } }[];
        }>) {
          if (timeoutSignal.aborted) {
            controller.enqueue(
              encoder.encode(sseError("stream_timeout", "Upstream timed out mid-stream."))
            );
            controller.close();
            return;
          }
          const delta = chunk?.choices?.[0]?.delta?.content;
          if (delta) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Stream interrupted";
        console.error("[/api/chat] Stream error:", detail);
        controller.enqueue(encoder.encode(sseError("stream_interrupted", detail)));
        controller.close();
      }
    },
    cancel() {
      // Client disconnected (Stop button / page nav). Best-effort cleanup;
      // the AsyncIterable will throw on next read and the catch above runs.
    },
  });

  return new Response(sse, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-RateLimit-Remaining": String(decision.remaining),
    },
  });
}
