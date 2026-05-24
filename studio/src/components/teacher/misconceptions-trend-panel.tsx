/**
 * Misconceptions Trend Panel
 * 
 * Displays misconceptions grouped by type, with severity distribution,
 * frequency, and latest confidence levels.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  getStudentMisconceptionsSummary,
  type MisconceptionSummary,
} from '@/lib/phase2-dashboard-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface MisconceptionsTrendPanelProps {
  studentId: string;
  studentName?: string;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };

export function MisconceptionsTrendPanel({
  studentId,
  studentName,
}: MisconceptionsTrendPanelProps) {
  const [misconceptions, setMisconceptions] = useState<MisconceptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getStudentMisconceptionsSummary(studentId);
        setMisconceptions(data || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load misconceptions');
        setMisconceptions([]);
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
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Misconceptions
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
            <AlertTriangle className="h-5 w-5" />
            Misconceptions
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (misconceptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Misconceptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No misconceptions detected. {studentName || 'Student'} is on track!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Misconceptions
        </CardTitle>
        <CardDescription>Grouped by type (ordered by frequency & severity)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {misconceptions.map((m) => (
          <div key={m.misconception_type} className="border-b pb-4 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm">
                  {m.misconception_type}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {m.latest_description}
                </p>
              </div>
              <Badge className={severityColors[m.max_severity]}>
                {m.max_severity}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Occurrences:</span>
                <p className="font-semibold">{m.count}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Confidence:</span>
                <p className="font-semibold">
                  {(m.latest_confidence * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Competencies:</span>
                <p className="font-semibold">{m.competencies.length}</p>
              </div>
            </div>

            {m.competencies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.competencies.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
