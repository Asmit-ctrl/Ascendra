import { NextRequest, NextResponse } from 'next/server';
import { buildApiUrl } from '@/lib/api-config';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// The local AI service is reached over the server network. Edge runtime cannot
// open that localhost connection during development, so keep this proxy in the
// Node.js runtime (which also works for normal server deployments).
export const runtime = 'nodejs';

type SchemeRequest = {
  grade?: string;
  subject?: string;
  term?: string;
  strands?: Array<{
    strand?: string;
    name?: string;
    subStrands?: string[];
    sub_strands?: string[];
  }>;
};

/**
 * Keeps the presentation and offline experience usable when the optional AI
 * service is not configured in a deployment. The Python service has the same
 * safety net, but this proxy also needs one when Vercel cannot reach it.
 */
function prescribedScheme(payload: SchemeRequest, reason: string) {
  const grade = payload.grade || 'Grade 4';
  const subject = payload.subject || 'General Studies';
  const term = payload.term || 'Term 1';
  const selectedStrands = Array.isArray(payload.strands) ? payload.strands : [];
  const strandChoices = selectedStrands.length
    ? selectedStrands
    : [{ strand: `${subject} foundations`, subStrands: ['Core concepts'] }];

  const rows = strandChoices.flatMap((choice, strandIndex) => {
    const strand = choice.strand || choice.name || `${subject} foundations`;
    const subStrands = choice.subStrands || choice.sub_strands || ['Core concepts'];

    return (subStrands.length ? subStrands : ['Core concepts']).map((subStrand, subIndex) => {
      const lesson = strandIndex * 2 + subIndex + 1;
      return {
        week: Math.ceil(lesson / 2),
        lesson,
        strand,
        subStrand,
        specificLearningOutcome: `By the end of the lesson, the learner should be able to explain and apply ${subStrand}.`,
        learningExperiences: `Activate prior knowledge, model the concept, practise ${subStrand} in pairs, and share a short reflection.`,
        keyInquiryQuestion: `How can we use ${subStrand} in everyday learning?`,
        learningResources: 'Learner book, teacher guide, chart paper, and locally available materials.',
        assessmentMethods: 'Observation checklist, oral questions, and an exit task.',
        reflection: '',
      };
    });
  });

  return {
    scheme_id: `prescribed_${Date.now()}`,
    title: `${grade} ${subject} ${term} - Prescribed CBC Scheme`,
    grade,
    subject,
    term,
    rows,
    total_weeks: Math.max(...rows.map((row) => row.week)),
    lessons_per_week: 2,
    source: 'frontend-prescribed-fallback',
    fallback_reason: reason,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SchemeRequest;
  let target: string;
  try {
    target = buildApiUrl('/lesson-architect/generate-scheme');
  } catch {
    return NextResponse.json(
      prescribedScheme(body, 'AI service is not configured for this deployment.'),
    );
  }

  const supabase = getSupabaseServerClient();
  const authResult: any = await supabase.auth.getUser().catch(() => ({}));
  const user = authResult.data?.user;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user?.id) headers['X-Forwarded-User'] = user.id;

  try {
    const res = await fetch(target, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        prescribedScheme(body, 'AI service is temporarily unavailable.'),
      );
    }

    const data = await res.json();
    if (!Array.isArray(data?.rows) || data.rows.length === 0) {
      return NextResponse.json(
        prescribedScheme(body, 'AI service returned no usable scheme rows.'),
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      prescribedScheme(body, 'AI service could not be reached from this deployment.'),
    );
  }
}
