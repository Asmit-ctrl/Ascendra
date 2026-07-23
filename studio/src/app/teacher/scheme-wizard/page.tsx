'use client';

/**
 * Scheme Wizard Page
 * Teacher-facing page for generating CBC schemes of work
 */

import React from 'react';
import { SchemeWizard } from '@/components/scheme-wizard/scheme-wizard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SchemeWizardPage() {
  const router = useRouter();

  return (
    <main className="education-shell">
      <header className="border-b border-border/80 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 sm:px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="education-kicker mb-1">Educator studio</p>
            <h1 className="font-headline text-2xl font-bold">CBC Scheme Generator</h1>
            <p className="text-sm text-muted-foreground">
              Create professional, KICD-compliant schemes of work in minutes
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <SchemeWizard />
      </section>
    </main>
  );
}

