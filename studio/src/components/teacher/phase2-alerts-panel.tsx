/**
 * Phase 2 Alerts Panel
 * 
 * Displays live alerts from behavioral profiles flagged for intervention,
 * with severity levels and action buttons.
 */

'use client';

import { useEffect, useState } from 'react';
import { getAlerts, type DashboardAlert } from '@/lib/phase2-dashboard-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Phase2AlertsPanelProps {
  limit?: number;
  onAlertClick?: (alert: DashboardAlert) => void;
}

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const severityPriority = { critical: 0, high: 1, medium: 2, low: 3 };

export function Phase2AlertsPanel({
  limit = 50,
  onAlertClick,
}: Phase2AlertsPanelProps) {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await getAlerts(false, limit);
      setAlerts(
        (data || []).sort((a, b) => {
          const aPriority = severityPriority[a.severity as keyof typeof severityPriority] || 99;
          const bPriority = severityPriority[b.severity as keyof typeof severityPriority] || 99;
          return aPriority - bPriority;
        })
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // Auto-refresh every 30 seconds if enabled
    if (!autoRefresh) return;

    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, limit]);

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return isoString;
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Live Alerts
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
            Live Alerts
          </CardTitle>
          <CardDescription className="text-red-600">{error}</CardDescription>
          <Button onClick={loadAlerts} size="sm" variant="outline" className="mt-2">
            Retry
          </Button>
        </CardHeader>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Live Alerts
          </CardTitle>
          <CardDescription>No active alerts. All students are on track!</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={loadAlerts} size="sm" variant="outline">
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Live Alerts
            </CardTitle>
            <CardDescription>
              {alerts.length} active
              {criticalCount > 0 && ` • ${criticalCount} critical`}
              {highCount > 0 && ` • ${highCount} high`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadAlerts}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              size="sm"
              variant={autoRefresh ? 'default' : 'outline'}
            >
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition"
            onClick={() => onAlertClick?.(alert)}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-start gap-2 flex-1">
                <div className="mt-0.5">
                  <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">
                    {alert.student_name}
                  </h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.message}
                  </p>
                </div>
              </div>
              <Badge className={severityColors[alert.severity]}>
                {alert.severity}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatTime(alert.created_at)}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
