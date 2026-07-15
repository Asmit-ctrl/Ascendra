'use client';

import { useEffect, useState } from 'react';
import { Trophy, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  getClassLeaderboard,
  getSchoolLeaderboard,
  getStudentRank,
} from '@/lib/gamification/points-system';

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalPoints: number;
  userId: string;
}

interface LeaderboardPanelProps {
  userId: string;
  classId?: string;
  schoolId?: string;
  scope?: 'class' | 'school'; // which leaderboard to show
}

export function LeaderboardPanel({
  userId,
  classId,
  schoolId,
  scope = 'class',
}: LeaderboardPanelProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);

        let leaderboardData: LeaderboardEntry[] = [];

        if (scope === 'class' && classId) {
          leaderboardData = await getClassLeaderboard(classId, 10);
        } else if (scope === 'school' && schoolId) {
          leaderboardData = await getSchoolLeaderboard(schoolId, 20);
        }

        setEntries(leaderboardData);

        // Get current user's rank
        const rank = await getStudentRank(userId);
        setUserRank(rank);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
    
    // Refresh leaderboard every 30 seconds
    const interval = setInterval(loadLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [userId, classId, schoolId, scope]);

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center text-gray-500">Loading leaderboard...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-lg">
          {scope === 'class' ? 'Class Leaderboard' : 'School Leaderboard'}
        </h3>
      </div>

      {entries.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          No leaderboard data yet. Start earning points!
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {entries.map((entry, index) => {
              const isCurrentUser = entry.rank === userRank;
              const isTopThree = entry.rank <= 3;

              return (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-100 border-2 border-blue-400'
                      : isTopThree
                      ? 'bg-white border border-amber-200'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="text-right w-8">
                      {isTopThree ? (
                        <span className="text-xl">
                          {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="font-bold text-gray-600">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {entry.name}
                        {isCurrentUser && <span className="text-blue-600 ml-1">(You)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-sm">{entry.totalPoints}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {userRank > 0 && userRank > 10 && (
            <div className="border-t pt-2 text-sm text-gray-600">
              <div className="p-2 bg-blue-50 rounded text-center">
                Your Rank: #{userRank}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
