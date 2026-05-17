/**
 * End-to-end smoke test for the Socratic Mentor.
 *
 * Hits the locally-running dev server's /api/chat endpoint with three
 * representative student turns and prints the streamed responses.
 *
 * Usage:
 *   1. Set GROQ_API_KEY in studio/.env.local
 *   2. In one terminal: `npm run dev` (port 5173)
 *   3. In another:      `npx tsx scripts/socratic-smoke.ts`
 *
 * Pass --url=http://...  to point at a non-localhost deployment.
 */

const DEFAULT_URL = 'http://localhost:5173/api/chat';

interface Turn {
  label: string;
  message: string;
}

const turns: Turn[] = [
  {
    label: 'Confused student',
    message: "I don't understand fractions.",
  },
  {
    label: 'Correct answer (acknowledge + advance)',
    message: 'Half plus half is one.',
  },
  {
    label: 'Off-topic (reground)',
    message: 'When is the next football match?',
  },
];

const urlArg = process.argv.find((a) => a.startsWith('--url='));
const url = urlArg ? urlArg.slice('--url='.length) : DEFAULT_URL;

async function runTurn(turn: Turn): Promise<void> {
  console.log(`\n── ${turn.label} ─────────────────────────────`);
  console.log(`STUDENT: ${turn.message}`);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: turn.message,
      history: [],
      grade: 'Grade 4',
      subject: 'Mathematics',
      language: 'mixed',
      studentName: 'Amani',
      mode: 'socratic',
    }),
  });

  if (!res.ok || !res.body) {
    let detail = `${res.status}`;
    try {
      const data = await res.json();
      detail = `${data.error || res.status}${data.detail ? ' — ' + data.detail : ''}`;
    } catch {
      /* */
    }
    console.error(`MENTOR: ⚠️ ${detail}`);
    return;
  }

  process.stdout.write('MENTOR: ');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = frame.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const parsed = JSON.parse(payload) as {
          delta?: string;
          error?: string;
        };
        if (parsed.error) {
          process.stdout.write(`\n⚠️ ${parsed.error}\n`);
          return;
        }
        if (parsed.delta) {
          process.stdout.write(parsed.delta);
        }
      } catch {
        /* malformed frame */
      }
    }
  }
  process.stdout.write('\n');
}

(async () => {
  console.log(`Socratic Mentor smoke test → ${url}`);
  for (const turn of turns) {
    try {
      await runTurn(turn);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`✖ ${turn.label}: ${detail}`);
    }
  }
})();
