'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Target,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Award,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedbackType = 'correct' | 'hint' | 'explanation' | 'encouragement';

interface FeedbackMessage {
  type: FeedbackType;
  message: string;
  points?: number;
  streakBonus?: boolean;
}

interface RealTimeFeedbackProps {
  feedback: FeedbackMessage | null;
  onRequestHint?: () => void;
  onRequestExplanation?: () => void;
  className?: string;
}

export function RealTimeFeedback({
  feedback,
  onRequestHint,
  onRequestExplanation,
  className,
}: RealTimeFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (feedback) {
      setIsVisible(true);
      if (feedback.type === 'correct') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    }
  }, [feedback]);

  if (!feedback && !isVisible) {
    return (
      <div className={cn('flex gap-2', className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={onRequestHint}
          className="gap-1"
        >
          <Target className="h-4 w-4" />
          Need a Hint?
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRequestExplanation}
          className="gap-1"
        >
          <Lightbulb className="h-4 w-4" />
          Explain This
        </Button>
      </div>
    );
  }

  const getFeedbackConfig = (type: FeedbackType) => {
    switch (type) {
      case 'correct':
        return {
          icon: <CheckCircle2 className="h-6 w-6" />,
          bgColor: 'bg-green-50 dark:bg-green-950',
          borderColor: 'border-green-300 dark:border-green-700',
          textColor: 'text-green-700 dark:text-green-300',
          iconColor: 'text-green-600',
          title: 'Correct! 🎉',
        };
      case 'hint':
        return {
          icon: <Target className="h-6 w-6" />,
          bgColor: 'bg-amber-50 dark:bg-amber-950',
          borderColor: 'border-amber-300 dark:border-amber-700',
          textColor: 'text-amber-700 dark:text-amber-300',
          iconColor: 'text-amber-600',
          title: 'Here\'s a Hint 🎯',
        };
      case 'explanation':
        return {
          icon: <Lightbulb className="h-6 w-6" />,
          bgColor: 'bg-blue-50 dark:bg-blue-950',
          borderColor: 'border-blue-300 dark:border-blue-700',
          textColor: 'text-blue-700 dark:text-blue-300',
          iconColor: 'text-blue-600',
          title: 'Let Me Explain 💡',
        };
      case 'encouragement':
        return {
          icon: <Sparkles className="h-6 w-6" />,
          bgColor: 'bg-violet-50 dark:bg-violet-950',
          borderColor: 'border-violet-300 dark:border-violet-700',
          textColor: 'text-violet-700 dark:text-violet-300',
          iconColor: 'text-violet-600',
          title: 'Keep Going! ✨',
        };
    }
  };

  if (!feedback) return null;

  const config = getFeedbackConfig(feedback.type);

  return (
    <div className={cn('relative', className)}>
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            >
              {['🎉', '⭐', '✨', '🌟', '💫'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <Card
        className={cn(
          'border-2 transition-all duration-300 animate-in slide-in-from-bottom-4',
          config.bgColor,
          config.borderColor
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('flex-shrink-0', config.iconColor)}>
              {config.icon}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className={cn('font-semibold', config.textColor)}>
                  {config.title}
                </h4>
                {feedback.points && (
                  <Badge
                    variant="secondary"
                    className={cn('gap-1', config.textColor)}
                  >
                    <Zap className="h-3 w-3" />
                    +{feedback.points} points
                  </Badge>
                )}
              </div>
              <p className={cn('text-sm', config.textColor)}>
                {feedback.message}
              </p>
              {feedback.streakBonus && (
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="default" className="gap-1 bg-orange-500">
                    <TrendingUp className="h-3 w-3" />
                    Streak Bonus!
                  </Badge>
                  <Badge variant="default" className="gap-1 bg-violet-500">
                    <Award className="h-3 w-3" />
                    +50 bonus points
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons for non-correct feedback */}
          {feedback.type !== 'correct' && (
            <div className="flex gap-2 mt-3">
              {feedback.type === 'hint' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRequestExplanation}
                  className="gap-1"
                >
                  <Lightbulb className="h-3 w-3" />
                  Full Explanation
                </Button>
              )}
              {feedback.type === 'explanation' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRequestHint}
                  className="gap-1"
                >
                  <Target className="h-3 w-3" />
                  Just a Hint
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}

// Example usage component
export function FeedbackExample() {
  const [currentFeedback, setCurrentFeedback] = useState<FeedbackMessage | null>(null);

  const showCorrectFeedback = () => {
    setCurrentFeedback({
      type: 'correct',
      message: 'Excellent work! You solved this problem perfectly. Your understanding of fractions is improving!',
      points: 10,
      streakBonus: true,
    });
  };

  const showHintFeedback = () => {
    setCurrentFeedback({
      type: 'hint',
      message: 'Think about what happens when you multiply the numerator and denominator by the same number. Does the fraction value change?',
    });
  };

  const showExplanationFeedback = () => {
    setCurrentFeedback({
      type: 'explanation',
      message: 'When simplifying fractions, we divide both the numerator and denominator by their greatest common factor (GCF). For example, 6/8 can be simplified by dividing both by 2, giving us 3/4.',
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex gap-2">
        <Button onClick={showCorrectFeedback} variant="default">
          Show Correct
        </Button>
        <Button onClick={showHintFeedback} variant="secondary">
          Show Hint
        </Button>
        <Button onClick={showExplanationFeedback} variant="outline">
          Show Explanation
        </Button>
      </div>

      <RealTimeFeedback
        feedback={currentFeedback}
        onRequestHint={showHintFeedback}
        onRequestExplanation={showExplanationFeedback}
      />
    </div>
  );
}
