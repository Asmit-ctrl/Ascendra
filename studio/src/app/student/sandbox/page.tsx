'use client'

/**
 * /student/sandbox
 *
 * Phase 1 MeTTa entry-point: a Canvas-based manipulative playground that
 * generates rich behavioural telemetry (dwell / pathing / erasure / tool
 * usage) for every learner action. See
 * `studio/src/components/student/interactive-sandbox.tsx` for the
 * capture logic and `ai-agents/.../telemetry_api.py` for the backend
 * pipeline this page feeds.
 *
 * The page is intentionally light — activity picker on the left, the
 * sandbox itself on the right. We surface the activity controls here
 * rather than inside the sandbox so the component stays focused on
 * input capture and the choice of activity feels like a deliberate
 * student decision (not a hidden configuration).
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StudentHeader } from '@/components/layout/student-header'
import {
  InteractiveSandbox,
  type SandboxActivityType,
} from '@/components/student/interactive-sandbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calculator, Hash, Brain, Eye } from 'lucide-react'

interface Activity {
  id: SandboxActivityType
  title: string
  subtitle: string
  competency: string
  grade: string
  subject: string
  question: string
  correctAnswerValue: number
  correctAnswerLabel: string
  icon: typeof Calculator
}

const ACTIVITIES: Activity[] = [
  {
    id: 'fractions',
    title: 'Fraction Builder',
    subtitle: 'Drag fraction bars to make 3/4.',
    competency: 'MATH.G4.FRACTIONS.ADD',
    grade: 'Grade 4',
    subject: 'Mathematics',
    question: 'Drag fraction bars into the answer box so they add up to 3/4.',
    correctAnswerValue: 0.75,
    correctAnswerLabel: '3/4',
    icon: Calculator,
  },
  {
    id: 'counting',
    title: 'Counting Tokens',
    subtitle: 'Drag tokens to show the number 7.',
    competency: 'MATH.G1.NUMBERS.COUNT',
    grade: 'Grade 1',
    subject: 'Mathematics',
    question: 'Drag exactly 7 tokens into the answer box.',
    correctAnswerValue: 7,
    correctAnswerLabel: '7',
    icon: Hash,
  },
]

export default function SandboxPage() {
  const router = useRouter()
  const [activity, setActivity] = useState<Activity>(ACTIVITIES[0])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StudentHeader showBackButton onBack={() => router.back()} />
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
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
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Choose an activity</CardTitle>
                <CardDescription>Each one captures different signals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {ACTIVITIES.map((a) => {
                  const Icon = a.icon
                  const isActive = a.id === activity.id
                  return (
                    <Button
                      key={a.id}
                      variant={isActive ? 'default' : 'outline'}
                      className="w-full justify-start gap-2 h-auto py-3"
                      onClick={() => setActivity(a)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="text-left">
                        <span className="block font-medium">{a.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {a.subtitle}
                        </span>
                      </span>
                    </Button>
                  )
                })}
              </CardContent>
            </Card>

            <InteractiveSandbox
              // Force a fresh component instance per activity so the
              // session-id, undo stack, and event buffer reset cleanly.
              key={activity.id}
              activityType={activity.id}
              competency={activity.competency}
              grade={activity.grade}
              subject={activity.subject}
              question={activity.question}
              correctAnswerValue={activity.correctAnswerValue}
              correctAnswerLabel={activity.correctAnswerLabel}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
