'use client';

/**
 * /student/chat/[subject]
 *
 * Thin client wrapper that decodes the subject + grade and renders
 * <SocraticChat />. Grade is read from the ?grade= query param first, then
 * from sessionStorage (set by /student/journey), then a sensible default.
 *
 * No data fetching here — everything chat-related is in the SocraticChat
 * component which POSTs to /api/chat.
 */

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StudentHeader } from '@/components/layout/student-header';
import { SocraticChat } from '@/components/student/socratic-chat';
import { getStudentId } from '@/lib/auth/student-id';

const STORAGE_GRADE = 'learningJourney.grade';
const DEFAULT_GRADE = 'Grade 4';

interface PageProps {
  // Next.js 16 wraps dynamic route params in a Promise; React.use() unwraps it.
  params: Promise<{ subject: string }>;
}

export default function StudentChatPage({ params }: PageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subject: subjectParam } = use(params);

  const subject = decodeURIComponent(subjectParam);
  const [grade, setGrade] = useState<string>(DEFAULT_GRADE);
  const [studentId, setStudentId] = useState<string>('user1');
  const [studentName, setStudentName] = useState<string>('Mwanafunzi');

  useEffect(() => {
    const queryGrade = searchParams.get('grade');
    if (queryGrade) {
      setGrade(queryGrade);
    } else if (typeof window !== 'undefined') {
      const stored = window.sessionStorage.getItem(STORAGE_GRADE);
      if (stored) setGrade(stored);
    }

    setStudentId(getStudentId());

    if (typeof window !== 'undefined') {
      const name =
        window.localStorage.getItem('studentName') ||
        window.localStorage.getItem('userName');
      if (name) setStudentName(name);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <StudentHeader showBackButton onBack={() => router.push('/student/journey')} />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Mwalimu AI · {subject}</h1>
          <p className="text-sm text-muted-foreground">
            {grade} · Socratic Mentor · grounded in Kenyan CBC
          </p>
        </div>

        <div className="flex-1 min-h-0">
          <SocraticChat
            studentId={studentId}
            studentName={studentName}
            grade={grade}
            subject={subject}
            language="mixed"
          />
        </div>
      </main>
    </div>
  );
}
