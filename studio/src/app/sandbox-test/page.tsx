"use client"

import { useState } from 'react'
import { InteractiveSandbox } from '@/components/student/interactive-sandbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle2, AlertCircle, Brain, TrendingUp, TrendingDown } from 'lucide-react'

export default function SandboxTestPage() {
  const [result, setResult] = useState<any>(null)
  
  const handleComplete = (analysisResult: any) => {
    setResult(analysisResult)
  }
  
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Interactive Sandbox Test</h1>
        <p className="text-muted-foreground">
          Test the behavioral telemetry and AI analysis system
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sandbox */}
        <div>
          <InteractiveSandbox
            activityType="fraction_sandbox"
            competency="MATH.G4.FRACTIONS"
            grade="Grade 4"
            subject="Mathematics"
            question="Add 1/2 + 1/4"
            correctAnswer="3/4"
            onComplete={handleComplete}
          />
        </div>
        
        {/* Analysis Results */}
        <div className="space-y-4">
          {!result ? (
            <Card>
              <CardHeader>
                <CardTitle>Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Complete the activity to see AI analysis
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Behavioral Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Behavioral Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Primary Pattern:</span>
                    <Badge>{result.behavioral_profile.primary_pattern}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Mastery Level:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ width: `${result.behavioral_profile.mastery_indicator * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {(result.behavioral_profile.mastery_indicator * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Engagement:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500"
                          style={{ width: `${result.behavioral_profile.engagement_score * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {(result.behavioral_profile.engagement_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Intervention Urgency:</span>
                    <Badge variant={
                      result.behavioral_profile.intervention_urgency === 'critical' ? 'destructive' :
                      result.behavioral_profile.intervention_urgency === 'high' ? 'destructive' :
                      result.behavioral_profile.intervention_urgency === 'medium' ? 'default' :
                      'secondary'
                    }>
                      {result.behavioral_profile.intervention_urgency}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              {/* Detailed Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pathing */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pathing Analysis</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Total Actions:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.pathing.total_actions}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Complexity:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.pathing.path_complexity.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Backtracks:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.pathing.backtrack_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Circular:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.pathing.is_circular ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Dwell */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Dwell Analysis</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Mean Dwell:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.dwell.mean_dwell_ms.toFixed(0)}ms
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="ml-2 font-medium">
                          {(result.behavioral_profile.dwell.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Hesitations:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.dwell.hesitation_count}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Erasure */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Erasure Analysis</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Undo Count:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.erasure.undo_count}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Erasure Rate:</span>
                        <span className="ml-2 font-medium">
                          {(result.behavioral_profile.erasure.erasure_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uncertainty:</span>
                        <span className="ml-2 font-medium">
                          {(result.behavioral_profile.erasure.uncertainty_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Velocity */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Velocity Analysis</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Actions/Min:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.velocity.actions_per_minute.toFixed(1)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trend:</span>
                        <span className="ml-2 font-medium flex items-center gap-1">
                          {result.behavioral_profile.velocity.velocity_trend === 'accelerating' && (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          )}
                          {result.behavioral_profile.velocity.velocity_trend === 'decelerating' && (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          {result.behavioral_profile.velocity.velocity_trend}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rushed:</span>
                        <span className="ml-2 font-medium">
                          {result.behavioral_profile.velocity.is_rushed ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Misconceptions */}
              {result.misconceptions && result.misconceptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Identified Misconceptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.misconceptions.map((m: any, i: number) => (
                      <Alert key={i}>
                        <AlertTitle className="flex items-center justify-between">
                          <span>{m.description}</span>
                          <Badge variant={
                            m.severity === 'critical' ? 'destructive' :
                            m.severity === 'high' ? 'destructive' :
                            m.severity === 'medium' ? 'default' :
                            'secondary'
                          }>
                            {m.severity}
                          </Badge>
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <p className="text-sm mb-2">
                            <strong>Confidence:</strong> {(m.confidence * 100).toFixed(0)}%
                          </p>
                          <p className="text-sm">
                            <strong>Intervention:</strong> {m.suggested_intervention}
                          </p>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </CardContent>
                </Card>
              )}
              
              {/* Intervention Plan */}
              {result.intervention_plan && result.intervention_plan.interventions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Intervention Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Priority:</span>
                      <Badge variant={
                        result.intervention_plan.priority === 'critical' ? 'destructive' :
                        result.intervention_plan.priority === 'high' ? 'destructive' :
                        result.intervention_plan.priority === 'medium' ? 'default' :
                        'secondary'
                      }>
                        {result.intervention_plan.priority}
                      </Badge>
                    </div>
                    
                    {result.intervention_plan.interventions.map((intervention: any, i: number) => (
                      <div key={i} className="border border-border rounded-lg p-3">
                        <h4 className="font-medium mb-2">{intervention.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {intervention.objective}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>⏱️ {intervention.duration_minutes} min</span>
                          <span>📚 {intervention.intervention_type}</span>
                          <span>🎯 {intervention.difficulty_level}</span>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">
                        {result.intervention_plan.teacher_summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
