"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StudentHeader } from '@/components/layout/student-header';
import { ArrowLeft, Clock, Target, Trophy, Star, Lock } from 'lucide-react';
import { getActivitiesForGradeSubject, getRecommendedActivities } from '@/lib/sandbox-activities';
import { Activity, GradeId, SubjectId } from '@/lib/sandbox-types';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SandboxPage() {
  const params = useParams();
  const router = useRouter();
  const grade = params.grade as GradeId;
  const subject = params.subject as SubjectId;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);
  const [recommendedActivities, setRecommendedActivities] = useState<Activity[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    // Load activities for this grade and subject
    const allActivities = getActivitiesForGradeSubject(grade, subject);
    setActivities(allActivities);

    // Load student progress from localStorage (in production, use Firebase)
    const savedProgress = localStorage.getItem(`sandbox-progress-${grade}-${subject}`);
    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      setCompletedActivityIds(progress.completedActivityIds || []);
      setTotalPoints(progress.totalPoints || 0);
      setCurrentStreak(progress.currentStreak || 0);
    }

    // Get recommended activities
    const recommended = getRecommendedActivities(grade, subject, completedActivityIds);
    setRecommendedActivities(recommended);
  }, [grade, subject, completedActivityIds]);

  const handleBack = () => {
    router.push('/student/journey?step=subject');
  };

  const isActivityLocked = (activity: Activity): boolean => {
    return activity.prerequisites.some(prereq => !completedActivityIds.includes(prereq));
  };

  const getCompletionPercentage = (): number => {
    if (activities.length === 0) return 0;
    return Math.round((completedActivityIds.length / activities.length) * 100);
  };

  const getGradeName = (gradeId: GradeId): string => {
    return `Grade ${gradeId.replace('g', '')}`;
  };

  const getSubjectName = (subjectId: SubjectId): string => {
    return subjectId.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const activityTypeLabels = {
    explore: 'Explore',
    practice: 'Practice',
    challenge: 'Challenge',
    create: 'Create'
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <StudentHeader showBackButton onBack={handleBack} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {getSubjectName(subject)} Sandbox
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {getGradeName(grade)} • Interactive Learning Activities
              </p>
            </div>
            <div className="flex gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Points</p>
                    <p className="text-2xl font-bold">{totalPoints}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-orange-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Streak</p>
                    <p className="text-2xl font-bold">{currentStreak} days</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Overall Progress</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {completedActivityIds.length} of {activities.length} activities completed
              </p>
            </div>
            <Progress value={getCompletionPercentage()} className="h-3" />
          </Card>
        </div>

        {/* Recommended Activities */}
        {recommendedActivities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-500" />
              Recommended for You
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {recommendedActivities.map((activity) => (
                <Link 
                  key={activity.id} 
                  href={`/student/sandbox/${grade}/${subject}/${activity.id}`}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="text-4xl mb-2">{activity.icon}</div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                          Recommended
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{activity.title}</CardTitle>
                      <CardDescription>{activity.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {activity.estimatedTime} min
                        </div>
                        <Badge variant="outline">{activityTypeLabels[activity.type]}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Activities by Type */}
        {['explore', 'practice', 'challenge', 'create'].map((type) => {
          const typeActivities = activities.filter(a => a.type === type);
          if (typeActivities.length === 0) return null;

          return (
            <div key={type} className="mb-8">
              <h2 className="text-2xl font-bold mb-4 capitalize">
                {activityTypeLabels[type as keyof typeof activityTypeLabels]} Activities
              </h2>
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
                {typeActivities.map((activity) => {
                  const isLocked = isActivityLocked(activity);
                  const isCompleted = completedActivityIds.includes(activity.id);

                  return (
                    <Link 
                      key={activity.id} 
                      href={isLocked ? '#' : `/student/sandbox/${grade}/${subject}/${activity.id}`}
                      className={cn(isLocked && 'pointer-events-none')}
                    >
                      <Card className={cn(
                        "h-full transition-all",
                        isLocked && "opacity-50",
                        !isLocked && "hover:shadow-lg cursor-pointer",
                        isCompleted && "border-2 border-green-500"
                      )}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="text-4xl mb-2">{activity.icon}</div>
                            {isLocked && <Lock className="w-5 h-5 text-gray-400" />}
                            {isCompleted && <Star className="w-5 h-5 text-green-500 fill-green-500" />}
                          </div>
                          <CardTitle className="text-lg">{activity.title}</CardTitle>
                          <CardDescription className="line-clamp-2">
                            {activity.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              {activity.estimatedTime} min
                            </div>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                activity.color.replace('bg-', 'border-'),
                                'text-xs'
                              )}
                            >
                              Level {activity.difficulty}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {activities.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h3 className="text-2xl font-bold mb-2">Coming Soon!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              We're building amazing activities for {getSubjectName(subject)} in {getGradeName(grade)}.
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Choose Another Subject
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

// Made with Bob
