"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Target, AlertCircle, CheckCircle2, Clock, User, 
  BookOpen, Lightbulb, TrendingUp, Download, Eye
} from 'lucide-react'

interface Intervention {
  id: string
  studentName: string
  studentId: string
  title: string
  misconception: string
  type: string
  duration: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'in-progress' | 'completed'
  createdAt: string
  objective: string
  materials: string[]
}

export function InterventionCenter() {
  const [interventions, setInterventions] = useState<Intervention[]>([
    {
      id: 'int_001',
      studentName: 'Mary Wanjiku',
      studentId: 'std_001',
      title: 'Understanding Fractions with Chapati',
      misconception: 'Confuses numerator and denominator',
      type: 'Visual Model',
      duration: 15,
      urgency: 'critical',
      status: 'pending',
      createdAt: '2 hours ago',
      objective: 'Student will correctly identify numerator and denominator in fractions',
      materials: ['Paper circles', 'Markers', 'Scissors', 'Real chapati (optional)']
    },
    {
      id: 'int_002',
      studentName: 'David Mwangi',
      studentId: 'std_002',
      title: 'Word Problem Strategy Guide',
      misconception: 'Circular pathing in word problems',
      type: 'Scaffolded Problem',
      duration: 20,
      urgency: 'high',
      status: 'in-progress',
      createdAt: '1 day ago',
      objective: 'Student will use systematic approach to solve word problems',
      materials: ['Problem-solving worksheet', 'Step-by-step guide', 'Practice cards']
    },
    {
      id: 'int_003',
      studentName: 'John Kamau',
      studentId: 'std_004',
      title: 'Fraction Addition Practice',
      misconception: 'Adds denominators incorrectly',
      type: 'Worked Example',
      duration: 15,
      urgency: 'medium',
      status: 'completed',
      createdAt: '3 days ago',
      objective: 'Student will add fractions with like denominators correctly',
      materials: ['Visual fraction strips', 'Practice problems', 'Answer key']
    },
  ])

  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null)
  const [activeTab, setActiveTab] = useState('pending')

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'in-progress': return 'secondary'
      case 'pending': return 'outline'
      default: return 'outline'
    }
  }

  const filteredInterventions = interventions.filter(i => {
    if (activeTab === 'all') return true
    return i.status === activeTab
  })

  const stats = {
    total: interventions.length,
    pending: interventions.filter(i => i.status === 'pending').length,
    inProgress: interventions.filter(i => i.status === 'in-progress').length,
    completed: interventions.filter(i => i.status === 'completed').length,
    critical: interventions.filter(i => i.urgency === 'critical').length,
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All interventions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Not started</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <p className="text-xs text-muted-foreground">Urgent attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Interventions List */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Interventions</CardTitle>
          <CardDescription>
            Personalized learning interventions based on identified misconceptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-md">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredInterventions.map((intervention) => (
                    <Card 
                      key={intervention.id}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => setSelectedIntervention(intervention)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{intervention.title}</h4>
                              <Badge variant={getUrgencyColor(intervention.urgency) as any}>
                                {intervention.urgency}
                              </Badge>
                              <Badge variant={getStatusColor(intervention.status) as any}>
                                {intervention.status}
                              </Badge>
                            </div>

                            <div className="space-y-1 text-sm">
                              <p className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-3 w-3" />
                                {intervention.studentName}
                              </p>
                              <p className="flex items-center gap-2 text-muted-foreground">
                                <AlertCircle className="h-3 w-3" />
                                {intervention.misconception}
                              </p>
                              <p className="flex items-center gap-2 text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                {intervention.type} • {intervention.duration} minutes
                              </p>
                              <p className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Created {intervention.createdAt}
                              </p>
                            </div>

                            <div className="mt-3 flex gap-2">
                              <Button size="sm" variant="outline">
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Button>
                              {intervention.status === 'pending' && (
                                <Button size="sm">
                                  Start Intervention
                                </Button>
                              )}
                              {intervention.status === 'in-progress' && (
                                <Button size="sm" variant="secondary">
                                  Mark Complete
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Intervention Detail View */}
      {selectedIntervention && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedIntervention.title}</CardTitle>
                <CardDescription>
                  For {selectedIntervention.studentName} • {selectedIntervention.duration} minutes
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedIntervention(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Intervention Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Misconception</h4>
                  <p className="text-sm text-muted-foreground">{selectedIntervention.misconception}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Learning Objective</h4>
                  <p className="text-sm text-muted-foreground">{selectedIntervention.objective}</p>
                </div>
              </div>

              {/* Materials Needed */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Materials Needed</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIntervention.materials.map((material, i) => (
                    <Badge key={i} variant="outline">{material}</Badge>
                  ))}
                </div>
              </div>

              {/* Intervention Content */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Intervention Content</h4>
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose prose-sm max-w-none">
                      <h5>Introduction</h5>
                      <p className="text-muted-foreground">
                        Imagine you have a chapati. When we cut it into equal parts, we create fractions...
                      </p>
                      
                      <h5>Main Activity</h5>
                      <p className="text-muted-foreground">
                        1. Show the student a paper circle (representing chapati)<br />
                        2. Cut it into 4 equal parts<br />
                        3. Explain: "We have 4 parts total - this is the denominator"<br />
                        4. Take 3 parts: "We have 3 parts - this is the numerator"<br />
                        5. Write: 3/4 and explain each number's meaning
                      </p>

                      <h5>Practice</h5>
                      <p className="text-muted-foreground">
                        Have the student create their own fractions using paper circles...
                      </p>

                      <h5>Assessment</h5>
                      <p className="text-muted-foreground">
                        Ask student to draw and label 3 different fractions, correctly identifying numerator and denominator.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Download Full Plan
                </Button>
                <Button variant="outline">
                  Print
                </Button>
                {selectedIntervention.status === 'pending' && (
                  <Button variant="secondary">
                    Start Intervention
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate New Intervention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Generate New Intervention
          </CardTitle>
          <CardDescription>
            Create AI-powered interventions for students needing support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Interventions are automatically generated when misconceptions are identified through the telemetry system. 
            You can also manually generate interventions for specific students.
          </p>
          <Button>
            <Target className="h-4 w-4 mr-2" />
            Generate Intervention
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
