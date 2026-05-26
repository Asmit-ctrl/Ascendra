"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity } from '@/lib/sandbox-types';
import { Sparkles, Trophy, ArrowRight, Lightbulb, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { submitActivity } from '@/lib/sandbox-submission';
import { useAuth } from '@/hooks/use-auth';

interface GenericActivityProps {
  activity: Activity;
  onComplete: (score: number, timeSpent: number) => void;
  onBack: () => void;
}

// This component dynamically generates activities based on the activity definition
// It uses the curriculum data to create appropriate challenges
export default function GenericActivity({ activity, onComplete, onBack }: GenericActivityProps) {
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [startTime] = useState(Date.now());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  // Generate questions based on activity type and learning objectives.
  // useState so the Fisher-Yates shuffle runs once per mount — re-shuffling on
  // every render would move the correct answer mid-question.
  const [questions] = useState(() => generateQuestionsFromActivity(activity));
  const totalQuestions = questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  // Fisher-Yates. Returns a new array; does not mutate the input.
  function shuffle<T>(input: T[]): T[] {
    const arr = input.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function generateQuestionsFromActivity(activity: Activity) {
    // This function generates appropriate questions based on the activity metadata
    const questions: any[] = [];

    // Use learning objectives to create questions
    activity.learningObjectives.forEach((objective, index) => {
      // Option generators always emit the correct answer at index 0; we shuffle
      // here and record where it landed so the UI can't be brute-forced by
      // always pressing the first button.
      const rawOptions = generateOptionsForObjective(objective, activity);
      const correctOption = rawOptions[0];
      const shuffledOptions = shuffle(rawOptions);
      const correctAnswer = shuffledOptions.indexOf(correctOption);

      questions.push({
        id: `q${index + 1}`,
        question: generateQuestionFromObjective(objective, activity),
        options: shuffledOptions,
        correctAnswer,
        hint: generateHintFromObjective(objective),
        explanation: `Great! ${objective}`,
      });
    });

    return questions.slice(0, 5); // Limit to 5 questions per activity
  }

  function generateQuestionFromObjective(objective: string, activity: Activity): string {
    // Convert learning objective into a question
    const subject = activity.subject;
    const grade = activity.grade.replace('g', '');
    
    // Template-based question generation
    if (subject === 'mathematics') {
      if (objective.includes('count')) {
        return `Count the objects and choose the correct number:`;
      } else if (objective.includes('add')) {
        return `What is 5 + 3?`;
      } else if (objective.includes('subtract')) {
        return `What is 10 - 4?`;
      } else if (objective.includes('shape')) {
        return `Which shape has 4 equal sides?`;
      }
    } else if (subject === 'english') {
      if (objective.includes('sound')) {
        return `Which word starts with the 'b' sound?`;
      } else if (objective.includes('read')) {
        return `What is the main idea of this story?`;
      } else if (objective.includes('write')) {
        return `Which sentence is correct?`;
      }
    } else if (subject === 'kiswahili') {
      if (objective.includes('sauti')) {
        return `Neno gani linaanza na sauti ya 'm'?`;
      } else if (objective.includes('soma')) {
        return `Hadithi hii inahusu nini?`;
      }
    } else if (subject === 'environmental') {
      if (objective.includes('plant')) {
        return `Which of these is a plant?`;
      } else if (objective.includes('animal')) {
        return `Which animal lives in water?`;
      } else if (objective.includes('weather')) {
        return `What do we wear when it rains?`;
      }
    } else if (subject === 'cre') {
      if (objective.includes('creation')) {
        return `What did God create on the first day?`;
      } else if (objective.includes('prayer')) {
        return `When should we pray?`;
      }
    } else if (subject === 'creative') {
      if (objective.includes('shape')) {
        return `Which shape can you use to draw a house?`;
      } else if (objective.includes('rhythm')) {
        return `Which action shows rhythm?`;
      }
    }
    
    // Default question
    return `Let's practice: ${objective}`;
  }

  function generateOptionsForObjective(objective: string, activity: Activity): string[] {
    const subject = activity.subject;
    
    // Generate appropriate options based on subject
    if (subject === 'mathematics') {
      if (objective.includes('count')) {
        return ['8', '6', '10', '7'];
      } else if (objective.includes('add')) {
        return ['8', '7', '9', '6'];
      } else if (objective.includes('shape')) {
        return ['Square', 'Triangle', 'Circle', 'Rectangle'];
      }
    } else if (subject === 'english') {
      if (objective.includes('sound')) {
        return ['Ball', 'Cat', 'Dog', 'Apple'];
      } else if (objective.includes('sentence')) {
        return ['I am happy.', 'i am happy', 'I am happy', 'i Am happy'];
      }
    } else if (subject === 'kiswahili') {
      return ['Mama', 'Baba', 'Dada', 'Kaka'];
    } else if (subject === 'environmental') {
      if (objective.includes('plant')) {
        return ['Tree', 'Car', 'Book', 'Chair'];
      } else if (objective.includes('animal')) {
        return ['Fish', 'Table', 'Pen', 'Cup'];
      }
    } else if (subject === 'cre') {
      if (objective.includes('creation')) {
        return ['Light', 'Animals', 'Plants', 'People'];
      } else if (objective.includes('prayer')) {
        return ['Anytime', 'Never', 'Only Sunday', 'Only morning'];
      }
    }
    
    // Default options
    return ['Option A', 'Option B', 'Option C', 'Option D'];
  }

  function generateHintFromObjective(objective: string): string {
    return `Think about: ${objective.toLowerCase()}`;
  }

  const currentQ = questions[currentQuestion];

  const handleAnswerSelect = (answer: string, index: number) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    setAttempts(attempts + 1);

    const correct = index === currentQ.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setScore(score + 20);
      setFeedbackMessage(currentQ.explanation);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } else {
      setFeedbackMessage('Not quite! Try again or use a hint.');
    }

    setShowFeedback(true);

    if (correct) {
      setTimeout(() => {
        if (currentQuestion < totalQuestions - 1) {
          setCurrentQuestion(currentQuestion + 1);
          setShowFeedback(false);
          setSelectedAnswer(null);
          setShowHint(false);
        } else {
          // Activity complete
          handleActivityComplete();
        }
      }, 2000);
    } else {
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedAnswer(null);
      }, 2000);
    }
  };

  const handleHint = () => {
    setShowHint(true);
    setHintsUsed(hintsUsed + 1);
  };

  const handleActivityComplete = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = Math.round((score / (totalQuestions * 20)) * 100);

    // Submit to Supabase
    if (user?.id) {
      try {
        await submitActivity({
          student_id: user.id,
          activity_type: activity.type,
          grade: activity.grade,
          subject: activity.subject,
          difficulty: activity.difficulty,
          score: finalScore,
          time_spent: timeSpent,
          answers: { attempts, hintsUsed, totalQuestions },
        });
      } catch (error) {
        console.error('Error submitting activity:', error);
      }
    }

    onComplete(finalScore, timeSpent);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl flex items-center gap-2">
                <span className="text-4xl">{activity.icon}</span>
                {activity.title}
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {activity.description}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Question {currentQuestion + 1} of {totalQuestions}
              </Badge>
              <div className="flex items-center gap-2 mt-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-xl font-bold">{score}</span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>
      </Card>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual representation (could be enhanced with images) */}
          <div className="bg-muted p-8 rounded-lg flex items-center justify-center min-h-[200px]">
            <p className="text-6xl">🎯</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            {currentQ.options.map((option: string, index: number) => (
              <Button
                key={index}
                onClick={() => handleAnswerSelect(option, index)}
                disabled={showFeedback}
                variant={selectedAnswer === option ? "default" : "outline"}
                className={`h-20 text-lg ${
                  showFeedback && index === currentQ.correctAnswer
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : showFeedback && selectedAnswer === option
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : ''
                }`}
              >
                {option}
              </Button>
            ))}
          </div>

          {/* Hint */}
          {showHint && (
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-500">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-purple-500 flex-shrink-0 mt-1" />
                  <p className="text-sm">{currentQ.hint}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback */}
          {showFeedback && (
            <Card className={`${isCorrect ? 'bg-green-50 dark:bg-green-900/20 border-green-500' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'}`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-1" />
                  )}
                  <p className="font-semibold">{feedbackMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center pt-4">
            {!showHint && !showFeedback && (
              <Button
                variant="secondary"
                onClick={handleHint}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                Show Hint
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Learning Objectives */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What You're Learning</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {activity.learningObjectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  index <= currentQuestion ? 'text-green-500' : 'text-gray-300'
                }`} />
                <span className={index <= currentQuestion ? 'font-medium' : 'text-gray-500'}>
                  {objective}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Made with Bob
