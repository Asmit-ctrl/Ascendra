import type { ReactNode } from "react";
import { StudentHeader } from '@/components/layout/student-header';

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-muted/40 dark:bg-background flex flex-col min-h-screen">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

// Made with Bob
