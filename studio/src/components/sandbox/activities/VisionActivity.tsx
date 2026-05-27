'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DrawingCanvas from '../vision/DrawingCanvas';
import { analyzeVisionSubmission, VisionAnalysisResult } from '@/lib/vision-analysis';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Loader2, CheckCircle2, XCircle, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';

interface VisionActivityProps {
  activityId: string;
  activityType: 'handwriting' | 'fraction' | 'drawing' | 'number';
  title: string;
  instructions: string;
  expectedContent: string;
  grade: string;
  subject: string;
  term: number;
  onComplete?: (score: number) => void;
}

export default function VisionActivity({
  activityId,
  activityType,
  title,
  instructions,
  expectedContent,
  grade,
  subject,
  term,
  onComplete,
}: VisionActivityProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const canvasRef = useRef<{ getImageData: () => string | null; clear: () => void; undo: () => void; redo: () => void } | null>(null);

  const supabase = getSupabaseClient();

  const handleSubmit = async () => {
    if (!canvasRef.current) {
      setError('Canvas not ready. Please try again.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);

      // Get image data from canvas
      const imageData = canvasRef.current.getImageData();
      
      if (!imageData) {
        throw new Error('No drawing detected. Please draw something first.');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to submit.');
      }

      // Upload image to Supabase Storage
      const fileName = `${user.id}/${activityId}_${Date.now()}.png`;
      const blob = await fetch(imageData).then(r => r.blob());
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vision-submissions')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('vision-submissions')
        .getPublicUrl(fileName);

      // Analyze with AI
      const analysisResult = await analyzeVisionSubmission({
        imageData,
        activityType,
        expectedContent,
        grade,
        subject,
      });

      setAnalysis(analysisResult);

      // Save to database
      const { data: submission, error: dbError } = await supabase
        .from('vision_submissions')
        .insert([{
          student_id: user.id,
          activity_id: activityId,
          activity_type: activityType,
          grade,
          subject,
          expected_content: expectedContent,
          image_url: publicUrl,
          image_data: imageData.substring(0, 1000), // Store preview only
          score: analysisResult.score,
          accuracy: analysisResult.accuracy,
          detected_content: analysisResult.detectedContent,
          strengths: analysisResult.strengths,
          areas_for_improvement: analysisResult.areasForImprovement,
          specific_errors: analysisResult.specificErrors,
          student_feedback: analysisResult.studentFeedback,
          teacher_notes: analysisResult.teacherNotes,
          requires_intervention: analysisResult.requiresIntervention,
          intervention_reason: analysisResult.interventionReason,
          term,
          analyzed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save submission to database');
      }

      if (submission) {
        setSubmissionId(submission.id);
      }

      // Call completion callback
      if (onComplete) {
        onComplete(analysisResult.score);
      }

    } catch (err: any) {
      console.error('Error submitting:', err);
      setError(err.message || 'Failed to analyze your work. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent!', variant: 'default' as const };
    if (score >= 80) return { label: 'Great Job!', variant: 'default' as const };
    if (score >= 70) return { label: 'Good Work!', variant: 'secondary' as const };
    if (score >= 60) return { label: 'Keep Trying!', variant: 'secondary' as const };
    return { label: 'Needs Practice', variant: 'destructive' as const };
  };

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge variant="outline">{activityType}</Badge>
          </CardTitle>
          <CardDescription>{instructions}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              <strong>Task:</strong> {expectedContent}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Drawing Canvas */}
      <Card>
        <CardHeader>
          <CardTitle>Your Work</CardTitle>
          <CardDescription>
            Use the canvas below to complete the task. You can draw, erase, and change colors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DrawingCanvas
            width={800}
            height={600}
            backgroundColor="#ffffff"
            onCanvasReady={(canvas: { getImageData: () => string | null; clear: () => void; undo: () => void; redo: () => void }) => {
              canvasRef.current = canvas;
            }}
          />
          
          <div className="mt-4 flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Submit for Review'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => canvasRef.current?.clear()}
              disabled={isAnalyzing}
            >
              Clear Canvas
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Analysis Complete
              </CardTitle>
              <Badge {...getScoreBadge(analysis.score)}>
                {getScoreBadge(analysis.score).label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Score</span>
                <span className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}%
                </span>
              </div>
              <Progress value={analysis.score} className="h-3" />
            </div>

            {/* What We Detected */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                What We Detected
              </h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                {analysis.detectedContent}
              </p>
            </div>

            {/* Student Feedback */}
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {analysis.studentFeedback}
              </AlertDescription>
            </Alert>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  What You Did Well
                </h4>
                <ul className="space-y-1">
                  {analysis.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas for Improvement */}
            {analysis.areasForImprovement.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-yellow-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  How to Improve
                </h4>
                <ul className="space-y-1">
                  {analysis.areasForImprovement.map((area, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-yellow-600 mt-0.5">→</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Intervention Warning */}
            {analysis.requiresIntervention && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Teacher Note:</strong> Your teacher will review this work and provide additional help.
                </AlertDescription>
              </Alert>
            )}

            {/* Try Again Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAnalysis(null);
                setError(null);
                canvasRef.current?.clear();
              }}
            >
              Try Another One
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Made with Bob
