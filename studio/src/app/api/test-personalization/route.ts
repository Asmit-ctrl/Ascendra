import { NextResponse } from 'next/server';

/**
 * Personalization endpoint backing the student dashboard.
 *
 * For now this returns deterministic mock data per `userId`. When the Python
 * backend exposes a real personalization endpoint, swap the implementation
 * to forward the request server-side (so secrets stay off the client).
 *
 * Supported queries:
 *   GET /api/test-personalization?action=profile&userId=<id>
 *   GET /api/test-personalization?action=progress&userId=<id>&subject=<name>
 */

interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  preferredLanguage: 'english' | 'kiswahili' | 'mixed';
  learningStyle: string;
  interests: string[];
  strengths: string[];
  challenges: string[];
  culturalContext: {
    region: string;
    culturalReferences: string[];
  };
}

interface LearningProgress {
  overallProgress: number;
  streakDays: number;
  totalSessions: number;
  averageSessionTime: number;
}

const profiles: Record<string, StudentProfile> = {
  user1: {
    id: 'user1',
    name: 'Amina',
    grade: 'Grade 6',
    preferredLanguage: 'mixed',
    learningStyle: 'visual',
    interests: ['football', 'music', 'science experiments'],
    strengths: ['mathematics', 'curiosity'],
    challenges: ['essay writing'],
    culturalContext: {
      region: 'Nairobi',
      culturalReferences: ['matatu', 'chapati', 'harambee'],
    },
  },
};

const progressBySubject: Record<string, LearningProgress> = {
  Mathematics: {
    overallProgress: 78,
    streakDays: 12,
    totalSessions: 24,
    averageSessionTime: 18,
  },
  English: {
    overallProgress: 64,
    streakDays: 5,
    totalSessions: 17,
    averageSessionTime: 22,
  },
  Science: {
    overallProgress: 71,
    streakDays: 8,
    totalSessions: 19,
    averageSessionTime: 16,
  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const userId = searchParams.get('userId') ?? 'user1';

  if (action === 'profile') {
    const profile = profiles[userId] ?? profiles.user1;
    return NextResponse.json({ success: true, profile });
  }

  if (action === 'progress') {
    const subject = searchParams.get('subject');
    if (!subject || !(subject in progressBySubject)) {
      return NextResponse.json(
        { success: false, error: `unknown subject: ${subject}` },
        { status: 400 },
      );
    }
    return NextResponse.json({
      success: true,
      progress: progressBySubject[subject],
    });
  }

  return NextResponse.json(
    { success: false, error: `unknown action: ${action}` },
    { status: 400 },
  );
}
