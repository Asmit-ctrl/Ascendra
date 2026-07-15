'use client'

/**
 * /student/sandbox — merged catalogue + telemetry playground.
 *
 * Previously this page hardcoded two activities (Fraction Builder G4
 * and Counting Tokens G1) and never used the Grade 2 catalogue that
 * lives in `src/lib/sandbox-activities.ts`. It now drives the same
 * `InteractiveSandbox` component from that catalogue, so every
 * Grade 2 activity that has a `manipulative` field becomes a
 * canvas-based lesson with the existing MeTTa telemetry pipeline.
 *
 * Design notes (informed by Synthesis Tutor research):
 *
 *   - The picker is sticky on desktop, not collapsing. The user
 *     explicitly chose "picker + sandbox" over the diagnostic-only
 *     experience, so we keep both visible.
 *   - Activities that haven't been classified into a manipulative yet
 *     fall through to a "Open in classic view" deep-link that routes
 *     to `/student/sandbox/[grade]/[subject]/[activityId]` and renders
 *     `GenericActivity` (the worksheet renderer). No silent fallback
 *     inside the canvas — that would lie in the telemetry stream.
 *   - Micro-assessment gating happens INSIDE `InteractiveSandbox` when
 *     the activity has `variations`. The student must answer
 *     `masteryThreshold` correctly before the lesson is marked done.
 *   - The student's grade is read from `localStorage.studentGrade`
 *     after hydration. The registry currently only contains Grade 2,
 *     so any other grade falls back to `g2` and we tell the user.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { StudentHeader } from '@/components/layout/student-header'
import {
  InteractiveSandbox,
  type SandboxActivityType,
  type SandboxVariation,
  type SandboxCompletionResult,
} from '@/components/student/interactive-sandbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Brain, Eye, Target, ExternalLink } from 'lucide-react'
import {
  getActivitiesForGradeSubject,
  getRecommendedActivities,
} from '@/lib/sandbox-activities'
import { getStudentSubmissions, submitActivity } from '@/lib/sandbox-submission'
import type {
  Activity,
  GradeId,
  Manipulative,
  SubjectId,
} from '@/lib/sandbox-types'

// ---- Mapping ----------------------------------------------------------------

/**
 * Map an activity's `manipulative` to the legacy `SandboxActivityType`
 * the canvas component currently understands. We keep the legacy slugs
 * stable so backend dashboards continue to roll up to the same bucket.
 * Unmapped manipulatives (e.g. shapes / number-line) return `null` —
 * the page treats them as un-canvasable and offers the deep-link.
 */
function manipulativeToActivityType(
  m: Manipulative | undefined,
): SandboxActivityType | null {
  switch (m) {
    case 'fraction-bars':
      return 'fractions'
    case 'tokens':
      return 'counting'
    default:
      return null
  }
}

/**
 * Derive a variations list for the canvas. If the activity declares
 * its own variations we use them; otherwise we fall back to a
 * single-shot from `targetValue` so the sandbox still has something
 * to grade.
 */
function variationsFor(activity: Activity): SandboxVariation[] | undefined {
  if (activity.variations && activity.variations.length > 0) {
    return activity.variations.map((v) => ({
      question: v.question,
      correctAnswerValue: v.targetValue,
      correctAnswerLabel: v.targetLabel,
    }))
  }
  if (activity.targetValue !== undefined) {
    return [
      {
        question: activity.description,
        correctAnswerValue: activity.targetValue,
        correctAnswerLabel: activity.targetLabel,
      },
    ]
  }
  return undefined
}

// ---- Subject options --------------------------------------------------------

const SUBJECTS: Array<{ id: SubjectId; label: string; emoji: string }> = [
  { id: 'mathematics', label: 'Mathematics', emoji: '🧮' },
  { id: 'english', label: 'English', emoji: '📖' },
  { id: 'kiswahili', label: 'Kiswahili', emoji: '🗣️' },
  { id: 'environmental', label: 'Environmental', emoji: '🌍' },
  { id: 'cre', label: 'CRE', emoji: '✝️' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'indigenous', label: 'Indigenous Language', emoji: '🪘' },
]

const REGISTRY_GRADE: GradeId = 'g2' // the only fully-authored grade today

// ---- Component --------------------------------------------------------------

export default function SandboxPage() {
  const router = useRouter()

  // Hydration-safe grade detection. We start `null` so the first render
  // matches SSR; the useEffect below populates from localStorage and
  // any subsequent renders use the resolved grade.
  const { user } = useAuth()
  const [studentGrade, setStudentGrade] = useState<GradeId | null>(null)
  const [subject, setSubject] = useState<SubjectId>('mathematics')
  const [selected, setSelected] = useState<Activity | null>(null)
  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem('studentGrade')
    const candidate = (stored ?? REGISTRY_GRADE) as GradeId
    setStudentGrade(candidate)
  }, [])

  // The catalogue currently only covers Grade 2. Any other grade falls
  // back to g2 — surfaced as a notice rather than hiding the mismatch.
  const effectiveGrade: GradeId = REGISTRY_GRADE
  const gradeMismatch =
    studentGrade !== null && studentGrade !== REGISTRY_GRADE

  // Activities and recommendations are derived state — memoised, not
  // effect-managed (the deep-route page has a latent infinite-effect
  // pattern we deliberately don't copy here).
  const activities = useMemo<Activity[]>(
    () => (studentGrade ? getActivitiesForGradeSubject(effectiveGrade, subject) : []),
    [studentGrade, effectiveGrade, subject],
  )

  const recommended = useMemo<Activity[]>(
    () =>
      studentGrade
        ? getRecommendedActivities(effectiveGrade, subject, completedIds)
        : [],
    [studentGrade, effectiveGrade, subject, completedIds],
  )

  useEffect(() => {
    if (!user?.id) {
      const raw = localStorage.getItem(`sandbox-progress-${effectiveGrade}-${subject}`)
      if (!raw) {
        setCompletedIds([])
        setTotalPoints(0)
        setCurrentStreak(0)
        return
      }

      try {
        const progress = JSON.parse(raw)
        setCompletedIds((progress.completedActivityIds as string[]) ?? [])
        setTotalPoints(progress.totalPoints ?? 0)
        setCurrentStreak(progress.currentStreak ?? 0)
      } catch (err) {
        console.error('Failed to load sandbox progress from localStorage:', err)
        setCompletedIds([])
        setTotalPoints(0)
        setCurrentStreak(0)
      }
      return
    }

    let canceled = false

    const getStreak = (dates: string[]) => {
      const today = new Date()
      const seen = new Set(dates)
      let streak = 0
      for (let offset = 0; offset < 30; offset += 1) {
        const date = new Date(today)
        date.setDate(today.getDate() - offset)
        const key = date.toISOString().slice(0, 10)
        if (seen.has(key)) {
          streak += 1
          continue
        }
        break
      }
      return streak
    }

    async function loadProgress() {
      try {
        const submissions = await getStudentSubmissions(user.id, 200)
        if (canceled) return

        const completedMap = new Map<string, number>()
        const seenDates: string[] = []

        submissions.forEach((submission) => {
          if (submission.grade !== effectiveGrade || submission.subject !== subject) {
            return
          }
          const answers = submission.answers as Record<string, unknown> | undefined
          const id =
            typeof answers?.activityId === 'string'
              ? answers.activityId
              : typeof answers?.lessonId === 'string'
              ? answers.lessonId
              : undefined
          if (!id) return

          const score = Number(submission.score) || 0
          const existing = completedMap.get(id) ?? 0
          completedMap.set(id, Math.max(existing, score))

          if (submission.completed_at) {
            const date = new Date(submission.completed_at)
            if (!Number.isNaN(date.getTime())) {
              seenDates.push(date.toISOString().slice(0, 10))
            }
          }
        })

        if (canceled) return

        setCompletedIds([...completedMap.keys()])
        setTotalPoints(
          Array.from(completedMap.values()).reduce((sum, score) => sum + Math.round(score * 10), 0),
        )
        setCurrentStreak(getStreak(Array.from(new Set(seenDates))))
      } catch (err) {
        console.error('Failed to load sandbox progress from Supabase:', err)
        setCompletedIds([])
        setTotalPoints(0)
        setCurrentStreak(0)
      }
    }

    loadProgress()
    return () => {
      canceled = true
    }
  }, [effectiveGrade, subject, user?.id])

  // Default selection: first recommended, else first activity in list.
  useEffect(() => {
    if (!studentGrade) return
    const next = recommended[0] ?? activities[0] ?? null
    setSelected(next)
  }, [studentGrade, recommended, activities])

  // ---- Completion handler --------------------------------------------------

  const handleComplete = async (result: SandboxCompletionResult) => {
    if (!selected || !result.mastered) return

    const points = result.score * 10
    setCompletedIds((prev) => (prev.includes(selected.id) ? prev : [...prev, selected.id]))
    setTotalPoints((prev) => prev + points)

    if (!user?.id) {
      try {
        const key = `sandbox-progress-${effectiveGrade}-${subject}`
        const raw = localStorage.getItem(key)
        const progress = raw
          ? JSON.parse(raw)
          : { completedActivityIds: [], totalPoints: 0, currentStreak: 0 }
        if (!progress.completedActivityIds.includes(selected.id)) {
          progress.completedActivityIds.push(selected.id)
          progress.totalPoints =
            (progress.totalPoints ?? 0) + points
        }
        localStorage.setItem(key, JSON.stringify(progress))
      } catch (err) {
        console.error('Failed to persist sandbox progress:', err)
      }
      return
    }

    try {
      const difficultyLevel: 'easy' | 'medium' | 'hard' =
        selected.difficulty <= 2 ? 'easy' : selected.difficulty <= 4 ? 'medium' : 'hard'

      await submitActivity({
        student_id: user.id,
        activity_type: selected.type,
        grade: selected.grade,
        subject: selected.subject,
        difficulty: difficultyLevel,
        score: points,
        time_spent: Math.ceil(result.timeSpent / 1000),
        answers: {
          activityId: selected.id,
          mastered: true,
          attempts: result.attempts.length,
        },
      })
    } catch (err) {
      console.error('Failed to persist sandbox progress to Supabase:', err)
    }
  }

  // ---- Render --------------------------------------------------------------

  const selectedActivityType = selected
    ? manipulativeToActivityType(selected.manipulative)
    : null
  const selectedVariations = selected ? variationsFor(selected) : undefined
  const canvasReady = selectedActivityType !== null && selectedVariations !== undefined

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader showBackButton onBack={() => router.back()} />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-headline">
              Practice Sandbox
            </h1>
            <p className="text-muted-foreground">
              Move, drag, and try things out. Mwalimu is watching how you think — not just
              whether you're right.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="outline" className="gap-1">
                <Brain className="h-3 w-3" /> Cognitive Data Streams
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" /> Live telemetry
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Target className="h-3 w-3" /> Mastery gating
              </Badge>
            </div>
            {gradeMismatch && (
              <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
                We're showing <strong>Grade 2</strong> activities — that's the only
                grade fully authored so far. Your account is set to{' '}
                <strong>{studentGrade?.toUpperCase()}</strong>.
              </div>
            )}
          </div>

          {/* Two-pane layout */}
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Sticky picker */}
            <div className="space-y-4 lg:sticky lg:top-4 self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Subject</CardTitle>
                  <CardDescription>Switch focus areas.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2">
                  {SUBJECTS.map((s) => (
                    <Button
                      key={s.id}
                      variant={subject === s.id ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => setSubject(s.id)}
                    >
                      <span aria-hidden>{s.emoji}</span>
                      <span className="truncate">{s.label}</span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activities</CardTitle>
                  <CardDescription>
                    {activities.length === 0
                      ? 'No activities for this subject yet.'
                      : `${activities.length} available • ${completedIds.length} done`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                  {activities.map((a) => {
                    const isActive = selected?.id === a.id
                    const isCompleted = completedIds.includes(a.id)
                    const supportsCanvas =
                      manipulativeToActivityType(a.manipulative) !== null
                    return (
                      <Button
                        key={a.id}
                        variant={isActive ? 'default' : 'outline'}
                        className="w-full justify-start gap-2 h-auto py-2 text-left"
                        onClick={() => setSelected(a)}
                      >
                        <span className="text-lg shrink-0" aria-hidden>
                          {a.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium truncate">
                            {a.title}
                            {isCompleted ? ' ✓' : ''}
                          </span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {supportsCanvas ? 'Canvas lesson' : 'Worksheet'}
                            {' · '}
                            {a.estimatedTime} min
                          </span>
                        </span>
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>

              <Button
                asChild
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <Link href={`/student/sandbox/${effectiveGrade}/${subject}`}>
                  Browse all in classic view
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Sandbox column */}
            <div className="space-y-4">
              {!studentGrade && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Loading your activities…
                  </CardContent>
                </Card>
              )}

              {studentGrade && !selected && (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    Pick an activity on the left to start.
                  </CardContent>
                </Card>
              )}

              {studentGrade && selected && canvasReady && selectedActivityType && selectedVariations && (
                <InteractiveSandbox
                  // Key by activity id so session state resets cleanly
                  // between activities (matches the existing pattern).
                  key={selected.id}
                  activityType={selectedActivityType}
                  competency={
                    selected.competency ??
                    `${selected.subject.toUpperCase()}.${selected.grade.toUpperCase()}.${selected.id}`
                  }
                  grade={selected.grade}
                  subject={selected.subject}
                  question={selectedVariations[0].question}
                  correctAnswerValue={selectedVariations[0].correctAnswerValue}
                  correctAnswerLabel={selectedVariations[0].correctAnswerLabel}
                  variations={selectedVariations}
                  masteryThreshold={
                    selected.masteryThreshold ??
                    Math.min(2, selectedVariations.length)
                  }
                  lessonId={selected.id}
                  onComplete={handleComplete}
                />
              )}

              {studentGrade && selected && !canvasReady && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selected.title}</CardTitle>
                    <CardDescription>{selected.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      This activity hasn't been wired into the canvas yet. Open
                      the classic worksheet view to do it now.
                    </p>
                    <Button asChild>
                      <Link
                        href={`/student/sandbox/${selected.grade}/${selected.subject}/${selected.id}`}
                      >
                        Open in classic view
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
