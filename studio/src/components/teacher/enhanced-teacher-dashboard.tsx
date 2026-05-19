"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, FileText, ClipboardList, BookOpen, Users, 
  MessageSquare, Award, Brain, TrendingUp, AlertCircle,
  BarChart3, Target, Lightbulb, GraduationCap, Sparkles,
  LogOut, Settings, User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Import sub-components
import { SchemeOfWorkGenerator } from './scheme-of-work-generator'
import { LessonPlanGenerator } from './lesson-plan-generator'
import { AssessmentGenerator } from './assessment-generator'
import { StudentMonitoring } from './student-monitoring'
import { InterventionCenter } from './intervention-center'
import { ResourceLibrary } from './resource-library'
import { AnalyticsDashboard } from './analytics-dashboard'
import { ProfessionalDevelopment } from './professional-development'

export function EnhancedTeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()

  const handleLogout = () => {
    // Clear any teacher-specific data
    localStorage.removeItem('teacherName')
    localStorage.removeItem('userAvatar')
    // Redirect to login
    router.push('/login')
  }

  return (
    <div className="container mx-auto p-6 max-w-[1600px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-4xl font-bold">SyncSenta Teacher Studio</h1>
              <p className="text-muted-foreground">
                AI-Powered Teaching Assistant for Kenyan CBC Curriculum
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <GraduationCap className="h-3 w-3" />
              Grade 4 Mathematics
            </Badge>
            <Badge variant="secondary">Term 2, Week 5</Badge>
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 rounded-full h-12 px-4"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">Teacher</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-auto p-2">
          <TabsTrigger value="overview" className="flex-col gap-1 min-h-16 h-auto py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="scheme-of-work" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Calendar className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">
              Schemes<br />of work
            </span>
          </TabsTrigger>
          <TabsTrigger value="lesson-plans" className="flex-col gap-1 min-h-16 h-auto py-2">
            <FileText className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">
              Lesson<br />plans
            </span>
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex-col gap-1 min-h-16 h-auto py-2">
            <ClipboardList className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Assessments</span>
          </TabsTrigger>
          <TabsTrigger value="students" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Users className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Students</span>
          </TabsTrigger>
          <TabsTrigger value="interventions" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Target className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Interventions</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex-col gap-1 min-h-16 h-auto py-2">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="professional-dev" className="flex-col gap-1 min-h-16 h-auto py-2">
            <Lightbulb className="h-4 w-4" />
            <span className="text-xs text-center leading-tight">Prof. Dev</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <AnalyticsDashboard />
        </TabsContent>

        {/* Scheme of Work Tab */}
        <TabsContent value="scheme-of-work">
          <SchemeOfWorkGenerator />
        </TabsContent>

        {/* Lesson Plans Tab */}
        <TabsContent value="lesson-plans">
          <LessonPlanGenerator />
        </TabsContent>

        {/* Assessments Tab */}
        <TabsContent value="assessments">
          <AssessmentGenerator />
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students">
          <StudentMonitoring />
        </TabsContent>

        {/* Interventions Tab */}
        <TabsContent value="interventions">
          <InterventionCenter />
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources">
          <ResourceLibrary />
        </TabsContent>

        {/* Professional Development Tab */}
        <TabsContent value="professional-dev">
          <ProfessionalDevelopment />
        </TabsContent>
      </Tabs>
    </div>
  )
}
