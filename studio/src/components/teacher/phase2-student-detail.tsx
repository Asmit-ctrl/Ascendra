/**
 * Phase 2 Student Detail View
 * 
 * Comprehensive view for a single student showing:
 * - Misconceptions with severity and confidence
 * - Session-by-session timeline
 * - Recent interventions
 * - Competency mastery trends
 */

'use client';

import { useEffect, useState } from 'react';
import {
  getStudentProgress,
  getStudentMisconceptions,
  getStudentInterventions,
  type StudentProgressDetail,
  type Misconception,
  type Intervention,
} from '@/lib/phase2-dashboard-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AlertTriangle,
  TrendingUp,
  Zap,
  Clock,
  BookOpen,
} from 'lucide-react';

interface Phase2StudentDetailProps {
  studentId: string;
  studentName?: string;
}

export function Phase2StudentDetail({
  studentId,
  studentName = 'Student',
}: Phase2StudentDetailProps) {
  const [progress, setProgress] = useState<StudentProgressDetail[]>([]);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [prog, misc, intv] = await Promise.all([
          getStudentProgress(studentId, 25),
          getStudentMisconceptions(studentId, 50),
          getStudentInterventions(studentId, 25),
        ]);
        setProgress(prog || []);
        setMisconceptions(misc || []);
        setInterventions(intv || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{studentName}</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>{studentName}</CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Compute stats
  const avgMastery =
    progress.length > 0
      ? (progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length * 100).toFixed(0)
      : '—';

  const totalTimeSpent = progress.reduce((sum, p) => sum + p.time_spent_minutes, 0);
  const topicsByCompetency = Array.from(
    new Set(progress.map((p) => p.competency || p.subject))
  ).length;

  // Chart data: mastery by topic
  const masteryData = progress
    .slice(0, 10)
    .sort((a, b) => (b.last_activity > a.last_activity ? 1 : -1))
    .map((p) => ({
      name: (p.topic || p.subject).substring(0, 15),
      mastery: Math.round(p.mastery_level * 100),
    }));

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{studentName}</CardTitle>
            <CardDescription>Comprehensive learning analytics</CardDescription>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-3 mt-6">
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs text-muted-foreground">Avg Mastery</p>
            <p className="text-lg font-bold text-blue-600">{avgMastery}%</p>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <p className="text-xs text-muted-foreground">Time Spent</p>
            <p className="text-lg font-bold text-green-600">{totalTimeSpent}m</p>
          </div>
          <div className="bg-purple-50 p-3 rounded">
            <p className="text-xs text-muted-foreground">Competencies</p>
            <p className="text-lg font-bold text-purple-600">{topicsByCompetency}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded">
            <p className="text-xs text-muted-foreground">Issues Found</p>
            <p className="text-lg font-bold text-orange-600">{misconceptions.length}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="progress" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="progress" className="text-xs">
              <TrendingUp className="h-4 w-4 mr-1" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="misconceptions" className="text-xs">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Issues
            </TabsTrigger>
            <TabsTrigger value="interventions" className="text-xs">
              <Zap className="h-4 w-4 mr-1" />
              Help
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs">
              <BookOpen className="h-4 w-4 mr-1" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">Mastery by Topic (Recent)</h3>
              {masteryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={masteryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="mastery" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No progress data available.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Recent Sessions</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {progress.slice(0, 10).map((p, idx) => (
                  <div
                    key={idx}
                    className="border rounded p-2 text-sm flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold text-xs">{p.topic || p.subject}</p>
                      <p className="text-xs text-muted-foreground">{p.time_spent_minutes}m</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {(p.mastery_level * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Misconceptions Tab */}
          <TabsContent value="misconceptions" className="space-y-3">
            {misconceptions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No misconceptions detected!</p>
            ) : (
              misconceptions.map((m, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-semibold">{m.misconception_type}</h4>
                    <Badge variant="outline">{(m.confidence * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{m.description}</p>
                  <div className="flex gap-2 flex-wrap text-xs">
                    <Badge className="text-xs bg-red-100 text-red-800">
                      {m.severity}
                    </Badge>
                    {m.competency && (
                      <Badge className="text-xs" variant="outline">
                        {m.competency}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* Interventions Tab */}
          <TabsContent value="interventions" className="space-y-3">
            {interventions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No interventions yet.</p>
            ) : (
              interventions.map((i, idx) => (
                <div key={idx} className="border rounded-lg p-3 bg-blue-50">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-semibold">{i.intervention_type}</h4>
                    <Badge className="text-xs">{i.priority}</Badge>
                  </div>
                  <p className="text-xs text-gray-700">{i.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(i.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Sessions with Data</p>
                <p className="text-lg font-bold">{progress.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total Issues Found</p>
                <p className="text-lg font-bold text-orange-600">{misconceptions.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Unique Competencies</p>
                <p className="text-lg font-bold">
                  {Array.from(new Set(progress.map((p) => p.competency))).filter(Boolean).length}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Interventions Provided</p>
                <p className="text-lg font-bold text-blue-600">{interventions.length}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">Competencies Covered</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(progress.map((p) => p.competency))).map((c) => (
                  <Badge key={c} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
