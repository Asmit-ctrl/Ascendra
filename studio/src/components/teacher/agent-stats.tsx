"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface AgentStats {
  agent_type: string
  request_count: number
  avg_response_time_ms: number
  success_rate: number
  total_tokens: number
}

export function AgentStats() {
  const [stats, setStats] = useState<AgentStats[]>([])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8001/dashboard/agents/stats?hours=1')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch agent stats:', error)
    }
  }

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'tutor': return '🤖'
      case 'assessment': return '📝'
      case 'translation': return '🌍'
      case 'cbc_advisor': return '🎯'
      default: return '💡'
    }
  }

  const getAgentName = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Agent Usage (Last Hour)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stats.map((agent) => (
            <div key={agent.agent_type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getAgentIcon(agent.agent_type)}</span>
                  <span className="font-medium">{getAgentName(agent.agent_type)}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {agent.request_count} requests
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Avg Response</p>
                  <p className="font-medium">{agent.avg_response_time_ms}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Success Rate</p>
                  <p className="font-medium">{(agent.success_rate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tokens</p>
                  <p className="font-medium">{agent.total_tokens.toLocaleString()}</p>
                </div>
              </div>
              
              <Progress value={agent.success_rate * 100} className="h-2" />
            </div>
          ))}
          
          {stats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No agent activity yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
