'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Trophy,
  Star,
  Flame,
  Zap,
  Award,
  Target,
  TrendingUp,
  Crown,
  Medal,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface GamificationData {
  points: number;
  level: number;
  streak: number;
  badges: Badge[];
  rank: number;
  totalStudents: number;
  pointsToNextLevel: number;
  currentLevelPoints: number;
}

interface GamificationPanelProps {
  data: GamificationData;
  className?: string;
}

const rarityColors = {
  common: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  rare: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  epic: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  legendary: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
};

const badgeIcons: Record<string, React.ReactNode> = {
  trophy: <Trophy className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
  flame: <Flame className="h-6 w-6" />,
  zap: <Zap className="h-6 w-6" />,
  award: <Award className="h-6 w-6" />,
  target: <Target className="h-6 w-6" />,
  crown: <Crown className="h-6 w-6" />,
  medal: <Medal className="h-6 w-6" />,
  sparkles: <Sparkles className="h-6 w-6" />,
};

export function GamificationPanel({ data, className }: GamificationPanelProps) {
  const levelProgress = (data.currentLevelPoints / data.pointsToNextLevel) * 100;
  const earnedBadges = data.badges.filter((b) => b.earned);
  const nextBadges = data.badges.filter((b) => !b.earned).slice(0, 3);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Points & Level */}
      <Card className="bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950 dark:to-pink-950 border-violet-200 dark:border-violet-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                Level {data.level}
              </CardTitle>
              <CardDescription className="text-violet-600 dark:text-violet-400">
                {data.points.toLocaleString()} points
              </CardDescription>
            </div>
            <Avatar className="h-16 w-16 bg-violet-600">
              <AvatarFallback className="bg-violet-600 text-white">
                <Crown className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-violet-700 dark:text-violet-300 font-medium">
                Progress to Level {data.level + 1}
              </span>
              <span className="text-violet-600 dark:text-violet-400">
                {data.currentLevelPoints} / {data.pointsToNextLevel}
              </span>
            </div>
            <Progress value={levelProgress} className="h-3 bg-violet-200 dark:bg-violet-900">
              <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all" />
            </Progress>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-semibold text-violet-700 dark:text-violet-300">
                {data.streak} day streak
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-violet-600 dark:text-violet-400">
                Rank #{data.rank} of {data.totalStudents}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Earned Badges ({earnedBadges.length})
            </CardTitle>
            <CardDescription>Your achievements so far</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all hover:scale-105',
                    rarityColors[badge.rarity]
                  )}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="p-2 rounded-full bg-white/50 dark:bg-black/20">
                      {badgeIcons[badge.icon] || <Award className="h-6 w-6" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{badge.name}</p>
                      <p className="text-xs opacity-75">{badge.description}</p>
                      {badge.earnedAt && (
                        <p className="text-xs opacity-60 mt-1">
                          {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Badges to Earn */}
      {nextBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Next Badges
            </CardTitle>
            <CardDescription>Keep learning to unlock these</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nextBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 opacity-60"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {badgeIcons[badge.icon] || <Award className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {badge.rarity}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {earnedBadges.length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Badges Earned</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950">
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {data.streak}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Day Streak</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                #{data.rank}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Class Rank</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {data.level}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Current Level</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
