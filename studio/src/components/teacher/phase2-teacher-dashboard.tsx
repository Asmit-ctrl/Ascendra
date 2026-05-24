/**
 * Phase 2 Teacher Dashboard
 * 
 * Comprehensive real-time monitoring dashboard with:
 * - Live alerts from behavioral profiling
 * - Per-student misconception analysis
 * - Competency-wide trends and misconception patterns
 * - Session timelines and intervention tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  Bell,
} from 'lucide-react';
import { getActiveStudents, type StudentActivitySummary } from '@/lib/phase2-dashboard-client';
import { Phase2AlertsPanel } from './phase2-alerts-panel';
import { CompetencyTrendsPanel } from './competency-trends-panel';
import { MisconceptionsTrendPanel } from './misconceptions-trend-panel';
import { StudentTimelineView } from './student-timeline-view';
import { Phase2StudentDetail } from './phase2-student-detail';

export function Phase2TeacherDashboard() {
  const { user, profile } = useAuth();

  const [activeStudents, setActiveStudents] = useState<StudentActivitySummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadActiveStudents = async () => {
    try {
      setLoading(true);
      const data = await getActiveStudents(50);
      setActiveStudents(data || []);
      if (data && data.length > 0 && !selectedStudentId) {
        setSelectedStudentId(data[0].student_id);
        setSelectedStudentName(data[0].student_name);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
      setActiveStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadActiveStudents();
  }, [user]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadActiveStudents, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  if (!user || profile?.role !== 'teacher') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          You must be logged in as a teacher to view this dashboard.
        </p>
      </div>
    );
  }

  const currentStudent = activeStudents.find((s) => s.student_id === selectedStudentId);
  const strugglingCount = activeStudents.filter((s) => s.status === 'struggling').length;
  const activeCount = activeStudents.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MeTTa Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time adaptive learning analytics powered by behavioral profiling
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={loadActiveStudents}
            size="sm"
            variant="outline"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
            variant={autoRefresh ? 'default' : 'outline'}
          >
            {autoRefresh ? '🔄 Auto' : '⏸ Manual'}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Struggling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{strugglingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Intervention needed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{activeStudents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">With recorded sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="student">
            <Users className="h-4 w-4 mr-1" />
            Student Detail
          </TabsTrigger>
          <TabsTrigger value="competencies">
            <Zap className="h-4 w-4 mr-1" />
            Competencies
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-1" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Alerts */}
            <div className="col-span-2 lg:col-span-1">
              <Phase2AlertsPanel limit={10} />
            </div>

            {/* Student List */}
            <div className="col-span-2 lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Active Students</CardTitle>
                  <CardDescription>Click to view detailed analytics</CardDescription>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <p className="text-sm text-red-600">{error}</p>
                  ) : loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : activeStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active students</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {activeStudents.map((student) => (
                        <Button
                          key={student.student_id}
                          variant={
                            selectedStudentId === student.student_id ? 'default' : 'ghost'
                          }
                          className="w-full justify-start text-left h-auto py-2"
                          onClick={() => {
                            setSelectedStudentId(student.student_id);
                            setSelectedStudentName(student.student_name);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                              {student.student_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <Badge
                                variant="outline"
                                className={
                                  student.status === 'struggling'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-green-100 text-green-800'
                                }
                              >
                                {student.status}
                              </Badge>
                              {student.current_topic && (
                                <span className="text-muted-foreground">
                                  {student.current_topic}
                                </span>
                              )}
                            </div>
                          </div>
                          {student.mastery_indicator !== undefined && (
                            <div className="text-right">
                              <p className="text-xs font-semibold">
                                {(student.mastery_indicator * 100).toFixed(0)}%
                              </p>
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Competency Trends */}
          <CompetencyTrendsPanel limit={20} />
        </TabsContent>

        {/* Student Detail Tab */}
        <TabsContent value="student">
          {selectedStudentId ? (
            <div className="space-y-6">
              <Phase2StudentDetail studentId={selectedStudentId} studentName={selectedStudentName} />
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">Select a student from the list to view details.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Competencies Tab */}
        <TabsContent value="competencies">
          <CompetencyTrendsPanel />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Phase2AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
