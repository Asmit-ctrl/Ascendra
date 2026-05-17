/**
 * Teacher Dashboard Page
 * 
 * Main entry point for teacher real-time monitoring dashboard.
 */

import { TeacherDashboardNew } from '@/components/teacher/teacher-dashboard-new';

export const metadata = {
  title: 'Teacher Dashboard - Mwalimu AI',
  description: 'Monitor your students in real-time and provide timely interventions',
};

export default function TeacherDashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <TeacherDashboardNew />
    </div>
  );
}
