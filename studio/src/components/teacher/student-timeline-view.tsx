/**
 * Student Timeline View
 * 
 * Shows a session-by-session timeline with misconception and intervention counts
 * for a single student, ordered from newest to oldest.
 */

'use client';

import { useEffect, useState } from 'react';
import { getStudentTimeline, type TimelineSession } from '@/lib/phase2-dashboard-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Zap, Clock } from 'lucide-react';

interface StudentTimelineViewProps {
  studentId: string;
  studentName?: string;
  limit?: number;
}

export function StudentTimelineView({
  studentId,
  studentName,
  limit = 30,
}: StudentTimelineViewProps) {
  const [sessions, setSessions] = useState<TimelineSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getStudentTimeline(studentId, limit);
        setSessions(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timeline');
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [studentId, limit]);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No sessions recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
        <CardDescription>
          {studentName || 'Student'}'s recent sessions (newest first)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session, idx) => (
            <div
              key={session.session_id}
              className="relative pb-4 last:pb-0"
            >
              {/* Timeline connector */}
              {idx < sessions.length - 1 && (
                <div className="absolute left-5 top-10 w-0.5 h-6 bg-gray-200" />
              )}

              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center">
                  <div className="h-3 w-3 rounded-full bg-blue-500 mt-1.5" />
                </div>

                {/* Session details */}
                <div className="flex-1 bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold">
                        {session.topic || session.competency || 'Session'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(session.started_at)}
                        {session.ended_at && ` - ${formatTime(session.ended_at)}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">
                        {session.duration_minutes}m
                      </p>
                    </div>
                  </div>

                  {/* Mastery indicator */}
                  {session.mastery_indicator !== undefined && (
                    <div className="mb-2">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="text-muted-foreground">Mastery</span>
                        <span className="font-semibold">
                          {(session.mastery_indicator * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{
                            width: `${session.mastery_indicator * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Alerts/Issues */}
                  <div className="flex flex-wrap gap-2">
                    {session.misconception_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {session.misconception_count} misconception
                        {session.misconception_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {session.intervention_count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {session.intervention_count} intervention
                        {session.intervention_count !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
