"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'

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
    </div>
  )
}
