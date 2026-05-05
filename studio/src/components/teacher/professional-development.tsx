"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Lightbulb, BookOpen, Video, Award, Clock, CheckCircle2,
  TrendingUp, Target, Users, PlayCircle, FileText
} from 'lucide-react'

interface Course {
  id: string
  title: string
  description: string
  category: 'pedagogy' | 'technology' | 'assessment' | 'cbc' | 'classroom-management'
  duration: string
  modules: number
  completed: number
  progress: number
  level: 'beginner' | 'intermediate' | 'advanced'
  certificate: boolean
}

interface Tip {
  id: string
  title: string
  description: string
  category: string
  readTime: string
}

export function ProfessionalDevelopment() {
  const [activeTab, setActiveTab] = useState('courses')

  // Mock courses
  const [courses] = useState<Course[]>([
    {
      id: 'course_001',
      title: 'Effective CBC Assessment Strategies',
      description: 'Learn how to design and implement formative and summative assessments aligned with CBC competencies',
      category: 'assessment',
      duration: '4 weeks',
      modules: 8,
      completed: 3,
      progress: 38,
      level: 'intermediate',
      certificate: true
    },
    {
      id: 'course_002',
      title: 'Teaching Mathematics with Kenyan Context',
      description: 'Strategies for making mathematics relevant using local examples and culturally responsive teaching',
      category: 'pedagogy',
      duration: '3 weeks',
      modules: 6,
      completed: 6,
      progress: 100,
      level: 'beginner',
      certificate: true
    },
    {
      id: 'course_003',
      title: 'Differentiation in Mixed-Ability Classrooms',
      description: 'Practical strategies for supporting all learners in diverse Kenyan classrooms',
      category: 'pedagogy',
      duration: '5 weeks',
      modules: 10,
      completed: 0,
      progress: 0,
      level: 'intermediate',
      certificate: true
    },
    {
      id: 'course_004',
      title: 'Using Technology for Enhanced Learning',
      description: 'Integrate digital tools and resources into your teaching practice',
      category: 'technology',
      duration: '3 weeks',
      modules: 6,
      completed: 2,
      progress: 33,
      level: 'beginner',
      certificate: false
    },
  ])

  // Mock teaching tips
  const [tips] = useState<Tip[]>([
    {
      id: 'tip_001',
      title: 'Using Matatu Math for Real-World Problem Solving',
      description: 'Engage students with word problems about matatu fares, routes, and passenger calculations',
      category: 'Mathematics',
      readTime: '3 min'
    },
    {
      id: 'tip_002',
      title: 'Quick Formative Assessment Techniques',
      description: '5 strategies to check understanding without disrupting lesson flow',
      category: 'Assessment',
      readTime: '5 min'
    },
    {
      id: 'tip_003',
      title: 'Managing Large Classes Effectively',
      description: 'Practical tips for teaching 40+ students in Kenyan classrooms',
      category: 'Classroom Management',
      readTime: '4 min'
    },
    {
      id: 'tip_004',
      title: 'Creating Low-Cost Visual Aids',
      description: 'Make effective teaching materials using locally available resources',
      category: 'Resources',
      readTime: '6 min'
    },
  ])

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pedagogy': return 'default'
      case 'technology': return 'secondary'
      case 'assessment': return 'destructive'
      case 'cbc': return 'outline'
      case 'classroom-management': return 'outline'
      default: return 'outline'
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'default'
      case 'intermediate': return 'secondary'
      case 'advanced': return 'destructive'
      default: return 'outline'
    }
  }

  const stats = {
    coursesInProgress: courses.filter(c => c.progress > 0 && c.progress < 100).length,
    coursesCompleted: courses.filter(c => c.progress === 100).length,
    certificatesEarned: courses.filter(c => c.progress === 100 && c.certificate).length,
    totalHours: courses.reduce((sum, c) => sum + parseInt(c.duration), 0),
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coursesInProgress}</div>
            <p className="text-xs text-muted-foreground">Active courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coursesCompleted}</div>
            <p className="text-xs text-muted-foreground">Courses finished</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.certificatesEarned}</div>
            <p className="text-xs text-muted-foreground">Earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
            <p className="text-xs text-muted-foreground">Weeks invested</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Development</CardTitle>
          <CardDescription>
            Continuous learning resources for Kenyan CBC teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="tips">Teaching Tips</TabsTrigger>
              <TabsTrigger value="community">Community</TabsTrigger>
            </TabsList>

            {/* Courses Tab */}
            <TabsContent value="courses" className="space-y-4 mt-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {courses.map((course) => (
                    <Card key={course.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{course.title}</h4>
                              <Badge variant={getCategoryColor(course.category) as any}>
                                {course.category.replace('-', ' ')}
                              </Badge>
                              <Badge variant={getLevelColor(course.level) as any}>
                                {course.level}
                              </Badge>
                              {course.certificate && (
                                <Badge variant="outline">
                                  <Award className="h-3 w-3 mr-1" />
                                  Certificate
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {course.description}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {course.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {course.modules} modules
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {course.completed}/{course.modules} completed
                              </span>
                            </div>
                          </div>
                        </div>

                        {course.progress > 0 && (
                          <div className="mb-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Progress</span>
                              <span className="font-medium">{course.progress}%</span>
                            </div>
                            <Progress value={course.progress} />
                          </div>
                        )}

                        <div className="flex gap-2">
                          {course.progress === 0 ? (
                            <Button>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Start Course
                            </Button>
                          ) : course.progress === 100 ? (
                            <>
                              <Button variant="outline">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Completed
                              </Button>
                              {course.certificate && (
                                <Button>
                                  <Award className="h-4 w-4 mr-2" />
                                  View Certificate
                                </Button>
                              )}
                            </>
                          ) : (
                            <Button>
                              <PlayCircle className="h-4 w-4 mr-2" />
                              Continue Learning
                            </Button>
                          )}
                          <Button variant="outline">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Teaching Tips Tab */}
            <TabsContent value="tips" className="space-y-4 mt-6">
              <ScrollArea className="h-[600px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tips.map((tip) => (
                    <Card key={tip.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          <Badge variant="outline">{tip.readTime}</Badge>
                        </div>
                        <h4 className="font-semibold mb-2">{tip.title}</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          {tip.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary">{tip.category}</Badge>
                          <Button size="sm" variant="ghost">
                            Read More →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Community Tab */}
            <TabsContent value="community" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Teacher Community</CardTitle>
                  <CardDescription>
                    Connect with fellow CBC teachers across Kenya
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Discussion Forums</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Share experiences, ask questions, and learn from other teachers
                      </p>
                      <Button variant="outline">Join Discussions</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Target className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Best Practices</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Discover proven teaching strategies from successful Kenyan teachers
                      </p>
                      <Button variant="outline">Explore</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Video className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Webinars & Workshops</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Attend live sessions with education experts and CBC specialists
                      </p>
                      <Button variant="outline">View Schedule</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Resource Sharing</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Share and download teaching resources created by the community
                      </p>
                      <Button variant="outline">Browse Resources</Button>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Recommended Learning Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommended Learning Path
          </CardTitle>
          <CardDescription>
            Personalized course recommendations based on your teaching profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Master CBC Assessment</p>
                <p className="text-xs text-muted-foreground">Build strong assessment skills</p>
              </div>
              <Button size="sm" variant="outline">Start</Button>
            </div>

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Differentiation Strategies</p>
                <p className="text-xs text-muted-foreground">Support all learners effectively</p>
              </div>
              <Button size="sm" variant="ghost" disabled>Locked</Button>
            </div>

            <div className="flex items-center gap-3 p-3 border border-border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Technology Integration</p>
                <p className="text-xs text-muted-foreground">Enhance learning with digital tools</p>
              </div>
              <Button size="sm" variant="ghost" disabled>Locked</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
