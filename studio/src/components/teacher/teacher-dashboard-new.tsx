/**
 * Teacher Dashboard - Real-time Student Monitoring
 * 
 * Provides teachers with:
 * - Live view of active students
 * - Real-time alerts and interventions
 * - Class performance analytics
 * - Quick action buttons
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getTeacherClasses,
  getClassSummary,
  getTeacherStudents,
  getTeacherAlerts,
  subscribeToAlerts,
  type TeacherStudent,
  type StudentAlert,
  type ClassSummary,
} from '@/lib/teacher-dashboard';
import {
  Users,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Bell,
} from 'lucide-react';
import { StudentListView } from './student-list-view';
import { AlertsPanel } from './alerts-panel';
import { StudentDetailModal } from './student-detail-modal';
import { AnalyticsTab } from './analytics-tab';
import { BulkAssignStudents } from './bulk-assign-students';

export function TeacherDashboardNew() {
  const { user, profile } = useAuth();

  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classSummary, setClassSummary] = useState<ClassSummary | null>(null);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudent | null>(null);
  const [loading, setLoading] = useState(true);

  // Load teacher's classes
  useEffect(() => {
    if (!user) return;

    loadClasses();
  }, [user]);

  // Load class data when class is selected
  useEffect(() => {
    if (!user || !selectedClass) return;

    loadClassData();
  }, [user, selectedClass]);

  // Subscribe to real-time alerts
  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const unsubscribe = subscribeToAlerts(user.id, (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(`Alert: ${alert.title}`, {
          body: `${alert.student_name} - ${alert.description || alert.alert_type}`,
          icon: '/icon-192.png',
        });
      }
    });

    return unsubscribe;
  }, [user]);

  const loadClasses = async () => {
    if (!user) return;

    try {
      const classesData = await getTeacherClasses(user.id);
      setClasses(classesData);
      if (classesData.length > 0 && !selectedClass) {
        setSelectedClass(classesData[0]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadClassData = async () => {
    if (!user || !selectedClass) return;

    try {
      setLoading(true);
      const [summary, studentsData, alertsData] = await Promise.all([
        getClassSummary(user.id, selectedClass),
        getTeacherStudents(user.id, selectedClass),
        getTeacherAlerts(user.id),
      ]);

      setClassSummary(summary);
      setStudents(studentsData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadClassData();
  };

  if (!user || profile?.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          You must be logged in as a teacher to view this dashboard.
        </p>
      </div>
    );
  }

  if (loading && !classSummary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your students in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <BulkAssignStudents
            teacherId={user.id}
            className={selectedClass}
            onSuccess={handleRefresh}
          />
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((className) => (
                <SelectItem key={className} value={className}>
                  {className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {classSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classSummary.total_students}</div>
              <p className="text-xs text-muted-foreground">
                {classSummary.active_today} active today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Mastery</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classSummary.average_mastery_percentage}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all competencies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classSummary.total_messages_today}
              </div>
              <p className="text-xs text-muted-foreground">
                {classSummary.total_sessions_today} sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classSummary.struggling_students}
              </div>
              <p className="text-xs text-muted-foreground">
                {classSummary.excelling_students} excelling
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">
            Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts ({alerts.filter((a) => a.severity === 'high' || a.severity === 'critical').length})
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <StudentListView
            students={students}
            onStudentClick={setSelectedStudent}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <AlertsPanel
            alerts={alerts}
            onAlertAction={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {user && selectedClass && (
            <AnalyticsTab teacherId={user.id} className={selectedClass} />
          )}
        </TabsContent>
      </Tabs>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
