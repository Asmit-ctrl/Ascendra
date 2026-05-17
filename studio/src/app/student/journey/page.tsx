'use client';

/**
 * /student/journey
 *
 * Two-step wizard that funnels a student into a chat session:
 *   Step 1: pick a Grade (from the CBC grade list).
 *   Step 2: pick a Subject (from the subjects valid for that grade).
 *
 * On subject click → persist {grade, subject} to localStorage and navigate to
 *   /student/chat/[subject]?grade=...
 *
 * Data source: studio/src/data/curriculum/index.ts (getAllGrades, getSubjectsForGrade).
 * No new curriculum constants live here.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, GraduationCap, BookOpen, MessageCircle } from 'lucide-react';
import { StudentHeader } from '@/components/layout/student-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getAllGrades, getSubjectsForGrade } from '@/data/curriculum';

const STORAGE_GRADE = 'learningJourney.grade';
const STORAGE_SUBJECT = 'learningJourney.subject';

export default function JourneyPage() {
  const router = useRouter();
  const [step, setStep] = useState<'grade' | 'subject'>('grade');
  const [grade, setGrade] = useState<string | null>(null);

  // Restore previous selection so a returning student sees a sensible default.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedGrade = window.localStorage.getItem(STORAGE_GRADE);
    if (savedGrade) setGrade(savedGrade);
  }, []);

  const grades = useMemo(() => getAllGrades(), []);
  const subjects = useMemo(
    () => (grade ? getSubjectsForGrade(grade) : []),
    [grade]
  );

  const pickGrade = (g: string) => {
    setGrade(g);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_GRADE, g);
    }
    setStep('subject');
  };

  const pickSubject = (subject: string) => {
    if (!grade) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_SUBJECT, subject);
    }
    router.push(
      `/student/chat/${encodeURIComponent(subject)}?grade=${encodeURIComponent(grade)}`
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentHeader showBackButton onBack={() => router.back()} />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-primary">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">
              Learning Journey
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">
            {step === 'grade' ? 'Choose your grade' : 'Choose a subject'}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {step === 'grade'
              ? 'Mwalimu AI will tailor the conversation to your level.'
              : `You're in ${grade}. Pick the subject you'd like to explore today.`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8 text-sm">
          <Badge
            variant={step === 'grade' ? 'default' : 'secondary'}
            className="cursor-pointer"
            onClick={() => setStep('grade')}
          >
            1. Grade {grade ? `· ${grade}` : ''}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge
            variant={step === 'subject' ? 'default' : 'secondary'}
            className={grade ? 'cursor-pointer' : 'opacity-50'}
            onClick={() => grade && setStep('subject')}
          >
            2. Subject
          </Badge>
        </div>

        {step === 'grade' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3">
            {grades.map((g) => (
              <Card
                key={g}
                role="button"
                tabIndex={0}
                onClick={() => pickGrade(g)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') pickGrade(g);
                }}
                className="cursor-pointer transition hover:border-primary hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {g}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    CBC level · {gradeBand(g)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 'subject' && grade && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((subject) => (
                <Card
                  key={subject}
                  role="button"
                  tabIndex={0}
                  onClick={() => pickSubject(subject)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') pickSubject(subject);
                  }}
                  className="cursor-pointer transition hover:border-primary hover:shadow-md group"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {subject}
                    </CardTitle>
                    <CardDescription>{grade}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Start chatting
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                variant="ghost"
                onClick={() => setStep('grade')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Change grade
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function gradeBand(grade: string): string {
  const n = parseInt(grade.replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n)) return 'Primary';
  if (n <= 3) return 'Lower Primary';
  if (n <= 6) return 'Upper Primary';
  return 'Junior Secondary';
}
