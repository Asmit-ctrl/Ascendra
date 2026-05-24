/**
 * Competency Trends Panel
 * 
 * Shows per-competency drill-down: session count, misconception frequency,
 * severity distribution, and mastery histogram across all students.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  getCompetencySummary,
  getCompetencyTrends,
  type CompetencySummary,
  type CompetencyTrends,
} from '@/lib/phase2-dashboard-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface CompetencyTrendsPanelProps {
  limit?: number;
}

const severityColors = {
  low: '#3b82f6',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export function CompetencyTrendsPanel({ limit = 50 }: CompetencyTrendsPanelProps) {
  const [summary, setSummary] = useState<CompetencySummary[]>([]);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [trends, setTrends] = useState<CompetencyTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial summary
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await getCompetencySummary(limit);
        setSummary(data || []);
        if (data && data.length > 0) {
          setSelectedCompetency(data[0].competency);
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load competencies');
        setSummary([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [limit]);

  // Load trends when competency is selected
  useEffect(() => {
    if (!selectedCompetency) return;

    const loadTrends = async () => {
      try {
        setTrendLoading(true);
        const data = await getCompetencyTrends(selectedCompetency);
        setTrends(data);
      } catch (err) {
        console.error('Failed to load trends:', err);
        setTrends(null);
      } finally {
        setTrendLoading(false);
      }
    };

    loadTrends();
  }, [selectedCompetency]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Competency Analysis
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
            <TrendingUp className="h-5 w-5" />
            Competency Analysis
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (summary.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Competency Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No competency data available yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for misconception frequency chart
  const misconceptionData = trends
    ? Object.entries(trends.misconception_frequency).map(([type, count]) => ({
        name: type,
        value: count,
      }))
    : [];

  // Prepare data for severity distribution chart
  const severityData = trends
    ? Object.entries(trends.severity_distribution).map(([severity, count]) => ({
        name: severity,
        value: count,
        fill: severityColors[severity as keyof typeof severityColors] || '#999',
      }))
    : [];

  // Prepare mastery histogram data
  const masteryData = trends
    ? [
        { range: '0-20%', count: trends.mastery_histogram[0] || 0 },
        { range: '20-40%', count: trends.mastery_histogram[1] || 0 },
        { range: '40-60%', count: trends.mastery_histogram[2] || 0 },
        { range: '60-80%', count: trends.mastery_histogram[3] || 0 },
        { range: '80-100%', count: trends.mastery_histogram[4] || 0 },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Competency Analysis (Cohort-wide)
        </CardTitle>
        <CardDescription>Click a competency to view detailed trends</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Competency List */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Competencies</h3>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {summary.map((comp) => (
              <Button
                key={comp.competency}
                variant={selectedCompetency === comp.competency ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCompetency(comp.competency)}
                className="justify-start text-xs"
              >
                <span className="flex-1">{comp.competency}</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {comp.session_count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Trends for selected competency */}
        {selectedCompetency && trends && !trendLoading && (
          <div className="space-y-6 border-t pt-6">
            <div>
              <h3 className="text-sm font-semibold mb-3">
                Trends for: <span className="text-blue-600">{selectedCompetency}</span>
              </h3>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-muted-foreground">Sessions</p>
                  <p className="text-2xl font-bold text-blue-600">{trends.session_count}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded">
                  <p className="text-muted-foreground">Misconceptions</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Object.values(trends.misconception_frequency).reduce((a, b) => a + b, 0)}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-muted-foreground">Avg Mastery</p>
                  <p className="text-2xl font-bold text-green-600">
                    {trends.mastery_histogram
                      ? (
                          (trends.mastery_histogram.reduce((sum, count, idx) => {
                            const midpoint = (idx * 20 + 10) / 100;
                            return sum + count * midpoint;
                          }, 0) /
                            trends.mastery_histogram.reduce((a, b) => a + b, 0)) *
                          100
                        ).toFixed(0)
                      : '—'}
                    %
                  </p>
                </div>
              </div>
            </div>

            {/* Misconception Frequency */}
            {misconceptionData.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2">Misconception Frequency</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={misconceptionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Severity Distribution */}
            {severityData.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2">Severity Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Mastery Histogram */}
            {masteryData.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold mb-2">Mastery Distribution</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={masteryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
