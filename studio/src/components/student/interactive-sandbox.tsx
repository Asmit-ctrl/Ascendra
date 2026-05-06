"use client"

import { useRef, useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, RotateCcw, Send } from 'lucide-react'

interface TelemetryEvent {
  timestamp: number
  event_type: string
  target: string
  position?: [number, number]
  duration?: number
  metadata?: Record<string, any>
}

interface InteractiveSandboxProps {
  activityType: string
  competency: string
  grade: string
  subject: string
  question: string
  correctAnswer: string
  onComplete?: (result: any) => void
}

export function InteractiveSandbox({
  activityType,
  competency,
  grade,
  subject,
  question,
  correctAnswer,
  onComplete
}: InteractiveSandboxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentAnswer, setStudentAnswer] = useState('')
  const [hoverStart, setHoverStart] = useState<number | null>(null)
  const [sessionId] = useState(`session_${Date.now()}`)
  
  // Capture telemetry event
  const captureEvent = useCallback((
    eventType: string,
    target: string,
    position?: [number, number],
    duration?: number,
    metadata?: Record<string, any>
  ) => {
    const event: TelemetryEvent = {
      timestamp: Date.now(),
      event_type: eventType,
      target,
      position,
      duration,
      metadata
    }
    
    setEvents(prev => [...prev, event])
    console.log('Telemetry event:', event)
  }, [])
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    
    // Draw initial state (example: fraction bars)
    drawFractionBars(ctx, canvas.width, canvas.height)
  }, [])
  
  const drawFractionBars = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)
    
    // Draw 1/2 fraction bar
    ctx.fillStyle = '#3b82f6'
    ctx.fillRect(50, 50, 200, 60)
    ctx.fillStyle = '#ffffff'
    ctx.font = '24px Arial'
    ctx.fillText('1/2', 130, 85)
    
    // Draw 1/4 fraction bar
    ctx.fillStyle = '#10b981'
    ctx.fillRect(50, 150, 100, 60)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('1/4', 80, 185)
    
    // Draw answer box
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 2
    ctx.strokeRect(350, 100, 150, 80)
    ctx.fillStyle = '#6b7280'
    ctx.font = '16px Arial'
    ctx.fillText('Drop answer here', 360, 145)
  }
  
  // Handle canvas interactions
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Detect which element was clicked
    let target = 'canvas_background'
    if (x >= 50 && x <= 250 && y >= 50 && y <= 110) {
      target = 'fraction_1_2'
    } else if (x >= 50 && x <= 150 && y >= 150 && y <= 210) {
      target = 'fraction_1_4'
    } else if (x >= 350 && x <= 500 && y >= 100 && y <= 180) {
      target = 'answer_box'
    }
    
    captureEvent('click', target, [x, y])
  }
  
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Detect hover target
    let target = 'canvas_background'
    if (x >= 50 && x <= 250 && y >= 50 && y <= 110) {
      target = 'fraction_1_2'
    } else if (x >= 50 && x <= 150 && y >= 150 && y <= 210) {
      target = 'fraction_1_4'
    } else if (x >= 350 && x <= 500 && y >= 100 && y <= 180) {
      target = 'answer_box'
    }
    
    // Start hover timer
    if (!hoverStart) {
      setHoverStart(Date.now())
    }
  }
  
  const handleCanvasMouseLeave = () => {
    // End hover and capture duration
    if (hoverStart) {
      const duration = Date.now() - hoverStart
      captureEvent('hover', 'canvas', undefined, duration)
      setHoverStart(null)
    }
  }
  
  const handleUndo = () => {
    captureEvent('undo', 'undo_button')
    // Implement undo logic
  }
  
  const handleSubmit = async () => {
    captureEvent('submit', 'submit_button')
    setIsSubmitting(true)
    
    try {
      // Send telemetry to backend
      const apiUrl = process.env.NEXT_PUBLIC_AI_AGENTS_URL || 'http://localhost:8001'
      const response = await fetch(`${apiUrl}/telemetry/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          student_id: 'student_001', // TODO: Get from auth
          activity_type: activityType,
          competency: competency,
          grade: grade,
          subject: subject,
          events: events,
          activity_data: {
            question: question,
            correct_answer: correctAnswer,
            student_answer: studentAnswer
          }
        })
      })
      
      const result = await response.json()
      console.log('Telemetry analysis:', result)
      
      if (onComplete) {
        onComplete(result)
      }
      
    } catch (error) {
      console.error('Failed to submit telemetry:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{question}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {grade} • {subject} • {competency}
            </p>
          </div>
          <Badge variant="outline">
            {events.length} interactions
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Interactive Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-[300px] border border-border rounded-lg cursor-pointer bg-background"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
          />
          <div className="absolute top-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            Session: {sessionId.slice(-8)}
          </div>
        </div>
        
        {/* Answer Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Answer:</label>
          <input
            type="text"
            value={studentAnswer}
            onChange={(e) => {
              setStudentAnswer(e.target.value)
              captureEvent('input', 'answer_input', undefined, undefined, {
                value: e.target.value
              })
            }}
            className="w-full px-3 py-2 border border-border rounded-md"
            placeholder="Enter your answer..."
          />
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={isSubmitting}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Undo
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !studentAnswer}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Answer
              </>
            )}
          </Button>
        </div>
        
        {/* Telemetry Debug Info */}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Debug: {events.length} events captured
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40">
            {JSON.stringify(events.slice(-5), null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}
