"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { StudentHeader } from '@/components/layout/student-header';
import { getActivityById } from '@/lib/sandbox-activities';
import { Activity } from '@/lib/sandbox-types';

// Import generic activity component
import GenericActivity from '@/components/sandbox/activities/GenericActivity';

export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const activityId = params.activityId as string;
  const grade = params.grade as string;
  const subject = params.subject as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const foundActivity = getActivityById(activityId);
    if (foundActivity) {
      setActivity(foundActivity);
    }
    setLoading(false);
  }, [activityId]);

  const handleBack = () => {
    router.push(`/student/sandbox/${grade}/${subject}`);
  };

  const handleComplete = (score: number, timeSpent: number) => {
    // Save progress to localStorage (in production, use Firebase)
    const progressKey = `sandbox-progress-${grade}-${subject}`;
    const savedProgress = localStorage.getItem(progressKey);
    const progress = savedProgress ? JSON.parse(savedProgress) : {
      completedActivityIds: [],
      totalPoints: 0,
      currentStreak: 0
    };

    // Add activity to completed if not already there
    if (!progress.completedActivityIds.includes(activityId)) {
      progress.completedActivityIds.push(activityId);
      progress.totalPoints += score;
      localStorage.setItem(progressKey, JSON.stringify(progress));
    }

    // Navigate back to sandbox
    router.push(`/student/sandbox/${grade}/${subject}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading activity...</p>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Activity Not Found</h2>
          <button 
            onClick={handleBack}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Use GenericActivity for all activities
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <StudentHeader showBackButton onBack={handleBack} />
      
      <div className="container mx-auto px-4 py-8">
        <GenericActivity
          activity={activity}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      </div>
    </div>
  );
}

// Made with Bob
