"use client";

/**
 * Teacher Setup Stub
 *
 * Target of the sidebar's "Set Up Assignments" CTA when a teacher has
 * no grade/subject assignments. The full multi-step signup wizard is
 * Phase 4 of the CBC refactor; until then this page tells the teacher
 * what's happening and gives them a way out (contact admin, or jump
 * to the dashboard if they think their assignments should be live).
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Mail } from 'lucide-react';

export default function TeacherSetupPage() {
  return (
    <main className="education-shell px-5 py-12 sm:px-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Set up your teaching assignments</CardTitle>
          <CardDescription>
            We don't have any grade or subject assignments for your account yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 rounded-xl border border-border/80 bg-secondary/45 p-4 text-sm text-muted-foreground">
            <p>
              The self-service setup wizard is on the roadmap. In the meantime,
              ask your school administrator to add you to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>One or more grades you teach (e.g. Grade 4)</li>
              <li>
                For Upper Primary and Junior Secondary, the specific subjects
                you handle in each grade
              </li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button asChild variant="outline">
              <a href="mailto:support@syncsenta.com?subject=Grade%20assignment%20request">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </a>
            </Button>
            <Button asChild>
              <Link href="/teacher/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// Made with Bob
