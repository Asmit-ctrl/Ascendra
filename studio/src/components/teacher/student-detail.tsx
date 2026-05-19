"use client"

import { useEffect, useRef, useState } from 'react'
import { Phone } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { CallInterface } from '@/components/voice/call-interface'

interface StudentProgress {
  subject: string
  topic: string
  mastery_level: number
  time_spent_minutes: number
  quiz_scores: number[]
  last_activity: string
}

interface StudentDetailProps {
  studentId: string
  studentName: string
  onClose: () => void
}

export function StudentDetail({ studentId, studentName, onClose }: StudentDetailProps) {
  const [progress, setProgress] = useState<StudentProgress[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Voice call about this specific student. The agent receives the
  // student's progress snapshot via `teacherContext` (compass mode), so
  // replies can reference real telemetry instead of speaking in generic
  // terms. History is kept in a local ref because the call doesn't need
  // to persist across page loads — it's a one-off teacher consultation.
  const [callOpen, setCallOpen] = useState(false)
  const callHistoryRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  useEffect(() => {
    fetchProgress()
  }, [studentId])

  const fetchProgress = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'
      const response = await fetch(`${apiUrl}/dashboard/students/${studentId}/progress`)
      const data = await response.json()
      setProgress(data)
    } catch (error) {
      console.error('Failed to fetch progress:', error)
    }
  }

  // Build a compact teacher-context blob from the data we already have on
  // screen. The /api/chat compass mode expects a string; JSON.stringify is
  // fine — the Socratic system prompt grounds responses in it.
  const teacherContext = () => {
    const summary = progress.map((p) => ({
      subject: p.subject,
      topic: p.topic,
      mastery_pct: Math.round(p.mastery_level * 100),
      time_min: p.time_spent_minutes,
      recent_quizzes: p.quiz_scores.slice(-3).map((s) => Math.round(s * 100)),
    }))
    return JSON.stringify({ student: studentName, progress: summary }, null, 2)
  }

  // Streams a single voice-turn through /api/chat. Resolves with the full
  // assistant text (the call UI hands it to TTS). Throws on transport
  // errors so CallInterface can surface them without ending the call.
  const handleCallTurn = async (userText: string): Promise<string> => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userText,
        history: callHistoryRef.current,
        // These two are required by the schema even in compass mode; we
        // pass sensible defaults — the actual grounding comes from
        // teacherContext.
        grade: 'Teacher',
        subject: 'Student Coaching',
        language: 'english',
        studentName: 'Teacher',
        mode: 'compass',
        teacherContext: teacherContext(),
      }),
    })

    if (!res.ok || !res.body) {
      let detail = `Request failed (${res.status})`
      try {
        const data = await res.json()
        if (data?.error) detail = `${data.error}${data.detail ? ` — ${data.detail}` : ''}`
      } catch { /* not JSON */ }
      throw new Error(detail)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let accumulated = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, sep).trim()
        buffer = buffer.slice(sep + 2)
        if (!frame.startsWith('data:')) continue
        const payload = frame.slice(5).trim()
        if (payload === '[DONE]') continue
        try {
          const parsed = JSON.parse(payload) as { delta?: string; error?: string; detail?: string }
          if (parsed.error) throw new Error(parsed.detail || parsed.error)
          if (parsed.delta) accumulated += parsed.delta
        } catch (err) {
          throw err instanceof Error ? err : new Error('Stream parse error')
        }
      }
    }

    // Strip any [CHOICE: ...] tokens so they aren't read aloud verbatim.
    const spoken = accumulated.replace(/\[CHOICE:[^\]]*\]/g, '').trim()
    callHistoryRef.current.push({ role: 'user', content: userText })
    callHistoryRef.current.push({ role: 'assistant', content: spoken })
    return spoken
  }

  const sendMessage = async () => {
    if (!message.trim()) return
    
    setSending(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'
      await fetch(`${apiUrl}/dashboard/interventions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          intervention_type: 'message',
          content: message,
          priority: 'normal'
        })
      })
      
      setMessage('')
      alert('Message sent to student!')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{studentName}</h2>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>

      {/* Progress by Topic */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progress.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.subject} - {item.topic}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.time_spent_minutes} minutes spent
                    </p>
                  </div>
                  <Badge variant={item.mastery_level > 0.7 ? 'default' : 'secondary'}>
                    {(item.mastery_level * 100).toFixed(0)}% Mastery
                  </Badge>
                </div>
                
                <Progress value={item.mastery_level * 100} className="h-2" />
                
                {item.quiz_scores.length > 0 && (
                  <div className="flex gap-2 text-sm">
                    <span className="text-muted-foreground">Quiz Scores:</span>
                    {item.quiz_scores.map((score, i) => (
                      <Badge key={i} variant="outline">
                        {(score * 100).toFixed(0)}%
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voice consult with the Synthesis Tutor about this student */}
      <Card>
        <CardHeader>
          <CardTitle>Discuss {studentName} with the Synthesis Tutor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ask follow-up questions out loud — the tutor sees this student's
            progress and can suggest next steps, interventions, or
            misconceptions to probe.
          </p>
          <Button
            onClick={() => {
              callHistoryRef.current = []
              setCallOpen(true)
            }}
            className="gap-2"
          >
            <Phone className="h-4 w-4" />
            Start voice call
          </Button>
        </CardContent>
      </Card>

      {/* Send Message */}
      <Card>
        <CardHeader>
          <CardTitle>Send Message to Student</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
          <Button onClick={sendMessage} disabled={sending || !message.trim()}>
            {sending ? 'Sending...' : 'Send Message'}
          </Button>
        </CardContent>
      </Card>

      <CallInterface
        open={callOpen}
        onOpenChange={setCallOpen}
        persona={{
          name: 'Synthesis Tutor',
          subtitle: `About ${studentName}`,
          initial: 'S',
        }}
        language="english"
        onUserTurn={handleCallTurn}
      />
    </div>
  )
}
