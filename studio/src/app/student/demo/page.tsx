'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, GraduationCap, Sparkles } from 'lucide-react';

/**
 * Demo Setup Page
 * 
 * Automatically configures the browser for student0 demo account with Grade 2 access.
 * This page sets up localStorage with the demo student ID and redirects to the dashboard.
 */
export default function DemoSetupPage() {
  const router = useRouter();
  const [isSetup, setIsSetup] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Check current setup
    const studentId = localStorage.getItem('studentId');
    setCurrentStudentId(studentId);
    setIsSetup(studentId === 'student0');
  }, []);

  const setupDemo = () => {
    // Set up student0 in localStorage
    localStorage.setItem('studentId', 'student0');
    localStorage.setItem('userName', 'Demo Student');
    localStorage.setItem('studentName', 'Demo Student');
    
    setIsSetup(true);
    setCurrentStudentId('student0');
    
    // Redirect to dashboard after a brief delay
    setTimeout(() => {
      router.push('/student');
    }, 1500);
  };

  const clearDemo = () => {
    localStorage.removeItem('studentId');
    localStorage.removeItem('userName');
    localStorage.removeItem('studentName');
    sessionStorage.clear();
    
    setIsSetup(false);
    setCurrentStudentId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Student0 Demo Setup</CardTitle>
          <CardDescription className="text-base">
            Configure your browser for the Grade 2 demo experience
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                <p className="text-lg font-semibold">
                  {currentStudentId === 'student0' ? (
                    <span className="text-green-600 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Demo Mode Active
                    </span>
                  ) : currentStudentId ? (
                    <span>Student ID: {currentStudentId}</span>
                  ) : (
                    <span className="text-muted-foreground">Not configured</span>
                  )}
                </p>
              </div>
              {isSetup && (
                <Badge variant="default" className="gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Grade 2
                </Badge>
              )}
            </div>
          </div>

          {/* What You'll Get */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">What You'll Get:</h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Automatic Grade 2 access (Lower Primary level)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Full access to Grade 2 subjects: Mathematics, English, Kiswahili, Environmental Activities, Creative Activities, CRE, and Indigenous Language</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Interactive learning sandbox with Grade 2 activities</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>AI-powered tutoring adapted to Grade 2 curriculum</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <span>Bypass grade selection - go straight to dashboard</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {!isSetup ? (
              <Button 
                onClick={setupDemo} 
                className="w-full sm:flex-1"
                size="lg"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Set Up Demo Mode
              </Button>
            ) : (
              <>
                <Button 
                  onClick={() => router.push('/student')} 
                  className="w-full sm:flex-1"
                  size="lg"
                >
                  <GraduationCap className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>
                <Button 
                  onClick={clearDemo} 
                  variant="outline"
                  className="w-full sm:flex-1"
                  size="lg"
                >
                  Clear Demo Mode
                </Button>
              </>
            )}
          </div>

          {/* Info Note */}
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            <p>
              This demo mode uses browser localStorage. Your demo session will persist until you clear it or use a different browser.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Made with Bob
