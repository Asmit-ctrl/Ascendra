/**
 * Achievement System (FREE)
 * Gamification with badges, points, and streaks
 */

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  category: 'learning' | 'streak' | 'mastery' | 'social' | 'special';
  requirement: (progress: UserProgress) => boolean;
}

export interface UserProgress {
  userId: string;
  lessonsCompleted: number;
  quizzesCompleted: number;
  perfectScores: number;
  loginDates: string[];
  totalPoints: number;
  achievements: Record<string, boolean>;
  currentStreak: number;
  longestStreak: number;
  subjectsStarted: string[];
  helpedOthers: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_lesson',
    title: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎓',
    points: 10,
    category: 'learning',
    requirement: (p) => p.lessonsCompleted >= 1,
  },
  {
    id: 'five_lessons',
    title: 'Getting Started',
    description: 'Complete 5 lessons',
    icon: '📚',
    points: 25,
    category: 'learning',
    requirement: (p) => p.lessonsCompleted >= 5,
  },
  {
    id: 'ten_lessons',
    title: 'Dedicated Learner',
    description: 'Complete 10 lessons',
    icon: '🌟',
    points: 50,
    category: 'learning',
    requirement: (p) => p.lessonsCompleted >= 10,
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Login 7 days in a row',
    icon: '🔥',
    points: 50,
    category: 'streak',
    requirement: (p) => p.currentStreak >= 7,
  },
  {
    id: 'month_streak',
    title: 'Consistency King',
    description: 'Login 30 days in a row',
    icon: '👑',
    points: 200,
    category: 'streak',
    requirement: (p) => p.currentStreak >= 30,
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    description: 'Get 100% on a quiz',
    icon: '⭐',
    points: 25,
    category: 'mastery',
    requirement: (p) => p.perfectScores >= 1,
  },
  {
    id: 'five_perfect',
    title: 'Master Student',
    description: 'Get 100% on 5 quizzes',
    icon: '🏆',
    points: 100,
    category: 'mastery',
    requirement: (p) => p.perfectScores >= 5,
  },
  {
    id: 'multi_subject',
    title: 'Renaissance Learner',
    description: 'Start lessons in 3 different subjects',
    icon: '🎨',
    points: 30,
    category: 'learning',
    requirement: (p) => p.subjectsStarted.length >= 3,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a lesson before 8 AM',
    icon: '🌅',
    points: 15,
    category: 'special',
    requirement: (p) => p.achievements?.early_bird || false,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a lesson after 10 PM',
    icon: '🦉',
    points: 15,
    category: 'special',
    requirement: (p) => p.achievements?.night_owl || false,
  },
];

/**
 * Check for newly unlocked achievements
 */
export function checkAchievements(userId: string): Achievement[] {
  if (typeof window === 'undefined') return [];

  const progress = getUserProgress(userId);
  const unlockedAchievements: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (progress.achievements?.[achievement.id]) continue;

    // Check if requirement is met
    if (achievement.requirement(progress)) {
      unlockedAchievements.push(achievement);
      
      // Mark as unlocked
      progress.achievements = progress.achievements || {};
      progress.achievements[achievement.id] = true;
      progress.totalPoints += achievement.points;
      
      saveUserProgress(userId, progress);
    }
  }

  return unlockedAchievements;
}

/**
 * Get user progress
 */
export function getUserProgress(userId: string): UserProgress {
  if (typeof window === 'undefined') {
    return getDefaultProgress(userId);
  }

  const key = `progress:${userId}`;
  const stored = localStorage.getItem(key);
  
  if (!stored) {
    return getDefaultProgress(userId);
  }

  return JSON.parse(stored);
}

/**
 * Save user progress
 */
export function saveUserProgress(userId: string, progress: UserProgress): void {
  if (typeof window === 'undefined') return;

  const key = `progress:${userId}`;
  localStorage.setItem(key, JSON.stringify(progress));
}

/**
 * Get default progress
 */
function getDefaultProgress(userId: string): UserProgress {
  return {
    userId,
    lessonsCompleted: 0,
    quizzesCompleted: 0,
    perfectScores: 0,
    loginDates: [],
    totalPoints: 0,
    achievements: {},
    currentStreak: 0,
    longestStreak: 0,
    subjectsStarted: [],
    helpedOthers: 0,
  };
}

/**
 * Update progress
 */
export function updateProgress(
  userId: string,
  updates: Partial<UserProgress>
): Achievement[] {
  const progress = getUserProgress(userId);
  Object.assign(progress, updates);
  saveUserProgress(userId, progress);
  
  return checkAchievements(userId);
}

/**
 * Track login streak
 */
export function trackLogin(userId: string): void {
  const progress = getUserProgress(userId);
  const today = new Date().toISOString().split('T')[0];
  
  if (!progress.loginDates.includes(today)) {
    progress.loginDates.push(today);
    
    // Calculate streak
    const sortedDates = progress.loginDates.sort();
    let streak = 1;
    
    for (let i = sortedDates.length - 1; i > 0; i--) {
      const current = new Date(sortedDates[i]);
      const previous = new Date(sortedDates[i - 1]);
      const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    
    progress.currentStreak = streak;
    progress.longestStreak = Math.max(progress.longestStreak, streak);
    
    saveUserProgress(userId, progress);
    checkAchievements(userId);
  }
}

/**
 * Achievement Unlocked Component
 */
export function AchievementUnlocked({ 
  achievement,
  onClose,
}: { 
  achievement: Achievement;
  onClose?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 animate-in fade-in pointer-events-none">
      <div className="bg-card border-2 border-primary rounded-lg p-6 shadow-2xl animate-in zoom-in pointer-events-auto max-w-sm">
        <div className="text-6xl text-center mb-4">{achievement.icon}</div>
        <h3 className="text-2xl font-bold text-center mb-2">Achievement Unlocked!</h3>
        <p className="text-xl font-semibold text-center mb-2">{achievement.title}</p>
        <p className="text-muted-foreground text-center mb-4">{achievement.description}</p>
        <div className="text-center">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            +{achievement.points} points
          </Badge>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Achievement List Component
 */
export function AchievementList({ userId }: { userId: string }) {
  const progress = getUserProgress(userId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Achievements</h3>
        <Badge variant="outline">{progress.totalPoints} points</Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = progress.achievements?.[achievement.id] || false;
          
          return (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border ${
                isUnlocked
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 border-muted opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold">{achievement.title}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  <Badge variant="secondary" className="mt-2">
                    {achievement.points} points
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * React hook for achievements
 */
export function useAchievements(userId: string) {
  const [progress, setProgress] = useState<UserProgress>(getDefaultProgress(userId));
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    setProgress(getUserProgress(userId));
  }, [userId]);

  const update = (updates: Partial<UserProgress>) => {
    const unlocked = updateProgress(userId, updates);
    setProgress(getUserProgress(userId));
    
    if (unlocked.length > 0) {
      setNewAchievements(unlocked);
    }
  };

  const dismissAchievement = (achievementId: string) => {
    setNewAchievements(prev => prev.filter(a => a.id !== achievementId));
  };

  return {
    progress,
    newAchievements,
    update,
    dismissAchievement,
    trackLogin: () => trackLogin(userId),
  };
}

// Made with Bob
