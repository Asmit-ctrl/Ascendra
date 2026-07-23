import type { ReactNode } from "react";
import { StudentHeader } from '@/components/layout/student-header';

export default function SandboxLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
}

// Made with Bob
