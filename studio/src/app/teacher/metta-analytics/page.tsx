/**
 * MeTTa Analytics Dashboard Page (Phase 2)
 * 
 * Advanced adaptive learning analytics with misconception detection,
 * behavioral profiling, and competency trends.
 */

import { Phase2TeacherDashboard } from '@/components/teacher/phase2-teacher-dashboard';

export const metadata = {
  title: 'MeTTa Analytics - Mwalimu AI',
  description: 'Advanced behavioral analytics and misconception detection dashboard',
};

export default function MeTTaAnalyticsDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Phase2TeacherDashboard />
    </div>
  );
}
