"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, Users, Target, AlertCircle, 
  CheckCircle2, Brain, ArrowRight
} from 'lucide-react'

export function AnalyticsDashboard() {
  const classStats = {
    totalStudents: 35,
    activeToday: 28,
    averageMastery: 67,
    needingIntervention: 8,
    onTrack: 22,
    excelling: 5
  }

  const interventionAlerts = [
    {
      student: "Mary Wanjiku",
      issue: "Confuses numerator and denominator",
      urgency: "high",
      recommendation: "Visual fraction models needed"
    },
    {
      student: "David Mwangi",
      issue: "Circular pathing in word problems",
      urgency: "critical",
      recommendation: "Scaffolded problem-solving"
    }
  ]

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{classStats.activeToday} active today</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Mastery</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.averageMastery}%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +5% from last week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Intervention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.needingIntervention}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">2 critical, 6 medium</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats.onTrack}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{classStats.excelling} excelling</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Intervention Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Intervention Alerts
          </CardTitle>
          <CardDescription>Students needing immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {interventionAlerts.map((alert, i) => (
              <div key={i} className="p-3 border border-border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{alert.student}</p>
                  <Badge variant={alert.urgency === 'critical' ? 'destructive' : 'default'}>
                    {alert.urgency}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{alert.issue}</p>
                <p className="text-xs text-primary">💡 {alert.recommendation}</p>
                <Button size="sm" variant="outline" className="w-full">
                  Generate Intervention
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
