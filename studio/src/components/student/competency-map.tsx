'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  AlertCircle,
  Gamepad2,
  BookOpen,
  Target,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Competency {
  id: string;
  name: string;
  mastery: number; // 0-100
  status: 'not-started' | 'in-progress' | 'mastered';
  gamesRecommended: boolean;
  lastPracticed?: string;
  totalPractices: number;
}

interface Topic {
  id: string;
  name: string;
  competencies: Competency[];
  overallMastery: number;
}

interface Subject {
  id: string;
  name: string;
  icon: string;
  topics: Topic[];
  overallMastery: number;
}

interface CompetencyMapProps {
  subjects: Subject[];
  onStartPractice?: (competencyId: string) => void;
  className?: string;
}

export function CompetencyMap({ subjects, onStartPractice, className }: CompetencyMapProps) {
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  };

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 90) return 'text-green-600 dark:text-green-400';
    if (mastery >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMasteryBgColor = (mastery: number) => {
    if (mastery >= 90) return 'bg-green-100 dark:bg-green-950';
    if (mastery >= 50) return 'bg-amber-100 dark:bg-amber-950';
    return 'bg-red-100 dark:bg-red-950';
  };

  const getStatusIcon = (status: Competency['status'], mastery: number) => {
    if (status === 'mastered' || mastery >= 90) {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    }
    if (status === 'in-progress' || mastery > 0) {
      return <Circle className="h-4 w-4 text-amber-600" />;
    }
    return <Circle className="h-4 w-4 text-slate-400" />;
  };

  // Find recommended next competency
  const getRecommendedNext = () => {
    for (const subject of subjects) {
      for (const topic of subject.topics) {
        const needsPractice = topic.competencies.find(
          (c) => c.gamesRecommended || (c.mastery < 70 && c.mastery > 0)
        );
        if (needsPractice) {
          return {
            subject: subject.name,
            topic: topic.name,
            competency: needsPractice,
          };
        }
      }
    }
    return null;
  };

  const recommended = getRecommendedNext();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Recommended Next */}
      {recommended && (
        <Card className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950 dark:to-violet-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Sparkles className="h-5 w-5" />
              Recommended for You
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-400">
              Based on your learning patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {recommended.subject} → {recommended.topic}
              </p>
              <p className="font-semibold text-blue-700 dark:text-blue-300">
                {recommended.competency.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Progress
                value={recommended.competency.mastery}
                className="flex-1 h-2 bg-blue-200 dark:bg-blue-900"
              />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {recommended.competency.mastery}%
              </span>
            </div>
            {recommended.competency.gamesRecommended && (
              <Badge variant="secondary" className="gap-1">
                <Gamepad2 className="h-3 w-3" />
                More games recommended
              </Badge>
            )}
            <Button
              onClick={() => onStartPractice?.(recommended.competency.id)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Target className="mr-2 h-4 w-4" />
              Start Practice
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Competency Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Your Learning Map
          </CardTitle>
          <CardDescription>
            Track your mastery across all subjects and topics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-2">
              {subjects.map((subject) => {
                const isExpanded = expandedSubjects.has(subject.id);
                return (
                  <div key={subject.id} className="space-y-2">
                    {/* Subject */}
                    <button
                      onClick={() => toggleSubject(subject.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:bg-muted',
                        getMasteryBgColor(subject.overallMastery)
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 flex-shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{subject.name}</span>
                          <span className={cn('text-sm font-bold', getMasteryColor(subject.overallMastery))}>
                            {subject.overallMastery}%
                          </span>
                        </div>
                        <Progress value={subject.overallMastery} className="h-2" />
                      </div>
                    </button>

                    {/* Topics */}
                    {isExpanded && (
                      <div className="ml-6 space-y-2">
                        {subject.topics.map((topic) => {
                          const isTopicExpanded = expandedTopics.has(topic.id);
                          return (
                            <div key={topic.id} className="space-y-2">
                              {/* Topic */}
                              <button
                                onClick={() => toggleTopic(topic.id)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg border hover:bg-muted transition-all"
                              >
                                {isTopicExpanded ? (
                                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                                )}
                                <div className="flex-1 text-left">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{topic.name}</span>
                                    <span className={cn('text-xs font-semibold', getMasteryColor(topic.overallMastery))}>
                                      {topic.overallMastery}%
                                    </span>
                                  </div>
                                  <Progress value={topic.overallMastery} className="h-1.5" />
                                </div>
                              </button>

                              {/* Competencies */}
                              {isTopicExpanded && (
                                <div className="ml-6 space-y-1">
                                  {topic.competencies.map((competency) => (
                                    <div
                                      key={competency.id}
                                      className={cn(
                                        'flex items-center gap-2 p-2 rounded-lg border transition-all',
                                        competency.gamesRecommended && 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700'
                                      )}
                                    >
                                      {getStatusIcon(competency.status, competency.mastery)}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-medium truncate">
                                            {competency.name}
                                          </span>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {competency.gamesRecommended && (
                                              <Badge variant="secondary" className="text-xs gap-1 px-1.5 py-0">
                                                <Gamepad2 className="h-3 w-3" />
                                              </Badge>
                                            )}
                                            <span className={cn('text-xs font-semibold', getMasteryColor(competency.mastery))}>
                                              {competency.mastery}%
                                            </span>
                                          </div>
                                        </div>
                                        <Progress value={competency.mastery} className="h-1 mt-1" />
                                        {competency.lastPracticed && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            Last: {new Date(competency.lastPracticed).toLocaleDateString()} • {competency.totalPractices} practices
                                          </p>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onStartPractice?.(competency.id)}
                                        className="h-7 px-2"
                                      >
                                        <Target className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Mastery Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>90%+ Mastered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>50-89% Learning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>&lt;50% Needs Practice</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
