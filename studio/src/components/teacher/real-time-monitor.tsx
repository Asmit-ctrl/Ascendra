"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

interface StudentActivity {
  student_id: string
  student_name: string
  status: 'active' | 'idle' | 'struggling' | 'offline'
  current_subject?: string
  current_topic?: string
  current_agent?: string
  duration_minutes: number
  last_activity: string
}

export function RealTimeMonitor() {
  const [students, setStudents] = useState<StudentActivity[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Connect to WebSocket
    const websocket = new WebSocket('ws://localhost:8001/dashboard/ws/teacher')
    
    websocket.onopen = () => {
      console.log('Connected to teacher dashboard')
    }
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      
      if (message.type === 'student_activity') {
        updateStudentActivity(message.data)
      }
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    setWs(websocket)
    
    // Fetch initial data
    fetchActiveStudents()
    
    // Cleanup
    return () => {
      websocket.close()
    }
  }, [])

  const fetchActiveStudents = async () => {
    try {
      const response = await fetch('http://localhost:8001/dashboard/students/active')
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error('Failed to fetch students:', error)
    }
  }

  const updateStudentActivity = (activity: any) => {
    setStudents(prev => {
      const existing = prev.find(s => s.student_id === activity.student_id)
      
      if (existing) {
        return prev.map(s => 
          s.student_id === activity.student_id
            ? { ...s, ...activity }
            : s
        )
      } else {
        return [...prev, activity]
      }
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'struggling': return 'bg-yellow-500'
      case 'idle': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢'
      case 'struggling': return '🟡'
      case 'idle': return '🔴'
      default: return '⚪'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Active Students</span>
          <Badge variant="secondary">{students.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.student_id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{getStatusIcon(student.status)}</span>
                  <div>
                    <p className="font-medium">{student.student_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.current_subject && student.current_topic
                        ? `${student.current_subject}: ${student.current_topic}`
                        : 'No active session'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {student.current_agent && (
                    <Badge variant="outline" className="mb-1">
                      {student.current_agent}
                    </Badge>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {student.duration_minutes}m
                  </p>
                </div>
              </div>
            ))}
            
            {students.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active students
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
