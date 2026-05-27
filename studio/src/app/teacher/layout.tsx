"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/layout/teacher-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useTeacherContext } from "@/stores/teacher-context";
import Link from "next/link";

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { setAssignments, setLoading } = useTeacherContext();

  // Load teacher assignments on mount
  useEffect(() => {
    async function loadAssignments() {
      setLoading(true);
      try {
        // Get teacher ID from localStorage (demo mode)
        const teacherId = localStorage.getItem('teacherId') || '00000000-0000-0000-0000-000000000001';
        
        const response = await fetch(`/api/teacher/assignments?teacherId=${teacherId}`);
        const data = await response.json();
        
        if (data.success && data.data.grouped) {
          setAssignments(data.data.grouped);
        }
      } catch (error) {
        console.error('Failed to load teacher assignments:', error);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, [setAssignments, setLoading]);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <SidebarInset className="flex flex-col">
        <AppHeader />
        <main className="p-4 md:p-6 flex-grow">
          {children}
        </main>
        <footer className="mt-auto p-4 text-center text-xs text-muted-foreground">
          © 2025 SyncSenta. All rights reserved. | <Link href="/terms" className="hover:underline">Terms & Conditions</Link> | <Link href="https://forms.gle/3vQhgtJbnEaGD6xV8" target="_blank" rel="noopener noreferrer" className="hover:underline">Provide Feedback</Link>
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
