"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, Search, TrendingUp, TrendingDown, AlertCircle, 
  CheckCircle2, Brain, Target, Clock, Eye, Filter
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface StudentData {
  id: string
  name: string
  admNo: string
  mastery: number
  engagement: number
  lastActive: string
  interventionUrgency: 'low' | 'medium' | 'high' | 'critical'
  primaryPattern: string
  misconceptions: number
  completedLessons: number
  totalLessons: number
  trend: 'up' | 'down' | 'stable'
}

export function StudentMonitoring() {
  const [students, setStudents] = useState<StudentData[]>([])
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUrgency, setFilterUrgency] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)

  // Mock data - in production, this would come from the backend API
  useEffect(() => {
    const mockStudents: StudentData[] = [
      {
        id: 'std_001',
        name: 'Mary Wanjiku',
        admNo: 'ADM001',
        mastery: 45,
        engagement: 60,
        lastActive: '2 hours ago',
        interventionUrgency: 'critical',
        primaryPattern: 'Stuck',
        misconceptions: 3,
        completedLessons: 8,
        totalLessons: 15,
        trend: 'down'
      },
      {
        id: 'std_002',
        name: 'David Mwangi',
        admNo: 'ADM002',
        mastery: 52,
        engagement: 55,
        lastActive: '1 hour ago',
        interventionUrgency: 'high',
        primaryPattern: 'Circular Pathing',
        misconceptions: 2,
        completedLessons: 9,
        totalLessons: 15,
        trend: 'down'
      },
      {
        id: 'std_003',
        name: 'Grace Akinyi',
        admNo: 'ADM003',
        mastery: 78,
        engagement: 85,
        lastActive: '30 minutes ago',
        interventionUrgency: 'low',
        primaryPattern: 'Confident',
        misconceptions: 0,
        completedLessons: 14,
        totalLessons: 15,
        trend: 'up'
      },
      {
        id: 'std_004',
        name: 'John Kamau',
        admNo: 'ADM004',
        mastery: 65,
        engagement: 70,
        lastActive: '45 minutes ago',
        interventionUrgency: 'medium',
        primaryPattern: 'Trial and Error',
        misconceptions: 1,
        completedLessons: 11,
        totalLessons: 15,
        trend: 'stable'
      },
      {
        id: 'std_005',
        name: 'Faith Njeri',
        admNo: 'ADM005',
        mastery: 88,
        engagement: 92,
        lastActive: '15 minutes ago',
        interventionUrgency: 'low',
        primaryPattern: 'Exploratory',
        misconceptions: 0,
        completedLessons: 15,
        totalLessons: 15,
        trend: 'up'
      },
    ]
    setStudents(mockStudents)
    setFilteredStudents(mockStudents)
  }, [])

  // Filter and sort students
  useEffect(() => {
    let filtered = students.filter(student => {
      const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           student.admNo.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesUrgency = filterUrgency === 'all' || student.interventionUrgency === filterUrgency
      return matchesSearch && matchesUrgency
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'mastery':
          return b.mastery - a.mastery
        case 'urgency':
          const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          return urgencyOrder[a.interventionUrgency] - urgencyOrder[b.interventionUrgency]
        case 'engagement':
          return b.engagement - a.engagement
        default:
          return 0
      }
    })

    setFilteredStudents(filtered)
  }, [students, searchQuery, filterUrgency, sortBy])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive'
      case 'high': return 'default'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <div className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">
              {students.filter(s => s.lastActive.includes('minutes')).length} active now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Mastery</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(students.reduce((sum, s) => sum + s.mastery, 0) / students.length)}%
            </div>
            <Progress 
              value={students.reduce((sum, s) => sum + s.mastery, 0) / students.length} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Need Intervention</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.interventionUrgency === 'critical' || s.interventionUrgency === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">
                {students.filter(s => s.interventionUrgency === 'critical').length} critical
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {students.filter(s => s.mastery >= 70).length}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">
                {students.filter(s => s.mastery >= 85).length} excelling
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Student List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Student Progress Tracking</CardTitle>
              <CardDescription>Real-time monitoring of student learning</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={filterUrgency} onValueChange={setFilterUrgency}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="mastery">Mastery</SelectItem>
                  <SelectItem value="urgency">Urgency</SelectItem>
                  <SelectItem value="engagement">Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredStudents.map((student) => (
                <Card 
                  key={student.id} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedStudent(student)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{student.name}</h4>
                          <Badge variant="outline" className="text-xs">{student.admNo}</Badge>
                          <Badge variant={getUrgencyColor(student.interventionUrgency) as any}>
                            {student.interventionUrgency}
                          </Badge>
                          {getTrendIcon(student.trend)}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Mastery</p>
                            <div className="flex items-center gap-2">
                              <Progress value={student.mastery} className="h-2 flex-1" />
                              <span className="font-medium">{student.mastery}%</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground text-xs">Engagement</p>
                            <div className="flex items-center gap-2">
                              <Progress value={student.engagement} className="h-2 flex-1" />
                              <span className="font-medium">{student.engagement}%</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground text-xs">Progress</p>
                            <p className="font-medium">{student.completedLessons}/{student.totalLessons} lessons</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground text-xs">Last Active</p>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {student.lastActive}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Pattern: <span className="text-foreground font-medium">{student.primaryPattern}</span></span>
                          {student.misconceptions > 0 && (
                            <span className="text-red-600">
                              {student.misconceptions} misconception{student.misconceptions > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Student Detail Modal (simplified) */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedStudent.name} - Detailed View</CardTitle>
                <CardDescription>Comprehensive student profile and analytics</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
                <TabsTrigger value="behavior">Behavior Patterns</TabsTrigger>
                <TabsTrigger value="interventions">Interventions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Mastery Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedStudent.mastery}%</div>
                      <Progress value={selectedStudent.mastery} className="mt-2" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Engagement Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{selectedStudent.engagement}%</div>
                      <Progress value={selectedStudent.engagement} className="mt-2" />
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Learning Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-2">
                      Completed {selectedStudent.completedLessons} out of {selectedStudent.totalLessons} lessons
                    </p>
                    <Progress 
                      value={(selectedStudent.completedLessons / selectedStudent.totalLessons) * 100} 
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="misconceptions">
                <Card>
                  <CardContent className="pt-6">
                    {selectedStudent.misconceptions > 0 ? (
                      <p className="text-muted-foreground">
                        {selectedStudent.misconceptions} misconception{selectedStudent.misconceptions > 1 ? 's' : ''} identified. 
                        Detailed analysis available in Interventions tab.
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <p>No misconceptions identified</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="behavior">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                      Primary Pattern: <span className="font-semibold text-foreground">{selectedStudent.primaryPattern}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Detailed behavioral analytics coming from telemetry data...
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="interventions">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground">
                      Intervention Urgency: <Badge variant={getUrgencyColor(selectedStudent.interventionUrgency) as any}>
                        {selectedStudent.interventionUrgency}
                      </Badge>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      AI-generated interventions will appear here based on identified misconceptions...
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
