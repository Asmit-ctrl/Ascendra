"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDown, 
  ChevronRight, 
  LayoutDashboard,
  Calendar,
  FileText,
  ClipboardList,
  Users,
  Library,
  Brain,
  MessageSquare,
  Lightbulb,
  Target,
  GraduationCap,
  Loader2
} from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTeacherContext, useCurrentContextDisplay } from '@/stores/teacher-context';
import { cn } from '@/lib/utils';

/**
 * Teacher Sidebar Component
 * 
 * Displays teacher's grade/subject assignments with collapsible sections
 * following the CBC curriculum structure:
 * - Lower Primary (Grades 1-3): Generalist model - no subject breakdown
 * - Upper Primary (Grades 4-6): Specialist model - subject-specific sections
 * - Junior Secondary (Grades 7-9): Specialist model - subject-specific sections
 */

// ═══════════════════════════════════════════════════════════════════════════
// MENU ITEMS
// ═══════════════════════════════════════════════════════════════════════════

const menuItems = [
  { 
    label: 'Dashboard', 
    path: 'dashboard', 
    icon: LayoutDashboard,
    description: 'Overview and analytics'
  },
  { 
    label: 'Schemes of Work', 
    path: 'scheme-wizard', 
    icon: Calendar,
    description: 'Generate and manage schemes'
  },
  { 
    label: 'Lesson Plans', 
    path: 'lesson-plans', 
    icon: FileText,
    description: 'Create lesson plans'
  },
  { 
    label: 'Assessments', 
    path: 'assessments', 
    icon: ClipboardList,
    description: 'Create and manage assessments'
  },
  { 
    label: 'Students', 
    path: 'students', 
    icon: Users,
    description: 'Monitor student progress'
  },
  { 
    label: 'Interventions', 
    path: 'interventions', 
    icon: Target,
    description: 'Student support and interventions'
  },
  { 
    label: 'Resources', 
    path: 'resources', 
    icon: Library,
    description: 'Teaching resources library'
  },
  { 
    label: 'Differentiation', 
    path: 'differentiation', 
    icon: Brain,
    description: 'Differentiation tools'
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeacherSidebar() {
  const pathname = usePathname();
  const {
    assignments,
    isLoading,
    currentGrade,
    currentSubject,
    setContext,
    hasAssignments,
  } = useTeacherContext();
  
  const currentContextDisplay = useCurrentContextDisplay();
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());

  // Auto-expand current grade. We pass the previous Set into the
  // setter to avoid depending on `expandedGrades` (which would loop
  // every time we update it).
  useEffect(() => {
    if (!currentGrade) return;
    setExpandedGrades((prev) => {
      if (prev.has(currentGrade)) return prev;
      const next = new Set(prev);
      next.add(currentGrade);
      return next;
    });
  }, [currentGrade]);

  const toggleGrade = (grade: string) => {
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(grade)) next.delete(grade);
      else next.add(grade);
      return next;
    });
  };

  /**
   * Match the *full* link target against the current pathname. The
   * previous implementation did `pathname.includes(path)`, which lit
   * up "Dashboard" under every grade simultaneously because every URL
   * ends in `/dashboard`. We compare the exact href the sidebar would
   * emit instead.
   */
  const isActiveHref = (href: string) => {
    // Decode for the comparison so encoded grade names ("Grade%204")
    // match a pathname that the router has already decoded.
    try {
      return decodeURIComponent(pathname) === decodeURIComponent(href);
    } catch {
      return pathname === href;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <GraduationCap className="h-6 w-6" />
            <h2 className="font-headline text-lg font-semibold">SyncSenta</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // No Assignments State
  // ─────────────────────────────────────────────────────────────────────────

  if (!hasAssignments()) {
    return (
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2">
            <GraduationCap className="h-6 w-6" />
            <h2 className="font-headline text-lg font-semibold">SyncSenta</h2>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="p-4 space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p className="mb-2">No grade assignments yet</p>
              <Button size="sm" asChild>
                <Link href="/teacher/setup">
                  Set Up Assignments
                </Link>
              </Button>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main Sidebar
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex flex-col gap-2 px-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            <h2 className="font-headline text-lg font-semibold">SyncSenta</h2>
          </div>
          {currentGrade && (
            <Badge variant="secondary" className="text-xs">
              {currentContextDisplay}
            </Badge>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your Classes</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-1">
              {assignments.map((assignment) => {
                const isExpanded = expandedGrades.has(assignment.grade);
                const isGeneralist = assignment.teaching_model === 'generalist';
                const isCurrentGrade = currentGrade === assignment.grade;

                return (
                  <div key={assignment.id} className="space-y-1">
                    {/* Grade Header */}
                    <button
                      onClick={() => toggleGrade(assignment.grade)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isCurrentGrade
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        {assignment.grade}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="ml-2 border-l-2 border-muted pl-2 space-y-1">
                        {isGeneralist ? (
                          // Lower Primary: No subject breakdown
                          <div className="space-y-1">
                            {menuItems.map((item) => {
                              const href = `/teacher/grade/${encodeURIComponent(assignment.grade)}/${item.path}`;
                              const isActive = isActiveHref(href);

                              return (
                                <Link
                                  key={item.path}
                                  href={href}
                                  onClick={() => setContext(assignment.grade)}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                                    isActive
                                      ? "bg-muted font-medium"
                                      : "hover:bg-muted/50"
                                  )}
                                >
                                  <item.icon className="h-4 w-4" />
                                  {item.label}
                                </Link>
                              );
                            })}
                          </div>
                        ) : (
                          // Upper Primary+: Show subjects
                          <div className="space-y-2">
                            {assignment.subjects.map((subject) => {
                              const isCurrentSubject = currentSubject === subject && isCurrentGrade;

                              return (
                                <div key={subject} className="space-y-1">
                                  <div className={cn(
                                    "px-2 py-1 text-xs font-medium rounded",
                                    isCurrentSubject ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                  )}>
                                    {subject}
                                  </div>
                                  <div className="space-y-1">
                                    {menuItems.map((item) => {
                                      const href = `/teacher/grade/${encodeURIComponent(assignment.grade)}/subject/${encodeURIComponent(subject)}/${item.path}`;
                                      const isActive = isActiveHref(href);

                                      return (
                                        <Link
                                          key={`${subject}-${item.path}`}
                                          href={href}
                                          onClick={() => setContext(assignment.grade, subject)}
                                          className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors",
                                            isActive
                                              ? "bg-muted font-medium"
                                              : "hover:bg-muted/50"
                                          )}
                                        >
                                          <item.icon className="h-3 w-3" />
                                          {item.label}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/teacher/communication">
                    <MessageSquare className="h-4 w-4" />
                    <span>Communication</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/teacher/professional-dev">
                    <Lightbulb className="h-4 w-4" />
                    <span>Professional Dev</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          <p>CBC Curriculum</p>
          <p className="font-medium">{assignments.length} {assignments.length === 1 ? 'Assignment' : 'Assignments'}</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Made with Bob
