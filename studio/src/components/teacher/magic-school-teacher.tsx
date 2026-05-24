"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Sparkles, FileText, ClipboardList, BookOpen, Users, MessageSquare, Award, Brain, Download, Copy, Check, Calendar, WifiOff } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SchemeOfWorkGenerator } from './scheme-of-work-generator'
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config'
import { WorksheetRenderer } from './worksheet-renderer'
import { TextLevelerRenderer } from './text-leveler-renderer'
import { DifferentiationRenderer } from './differentiation-renderer'
import { fetchWithRetry, isOnline, requestQueue } from '@/lib/api-utils'
import '@/styles/print.css'

export function MagicSchoolTeacher() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('scheme-of-work')
  const [loading, setLoading] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [copied, setCopied] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  // Form states
  const [grade, setGrade] = useState('Grade 4')
  const [subject, setSubject] = useState('Mathematics')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState('40')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [numQuestions, setNumQuestions] = useState('10')
  const [difficulty, setDifficulty] = useState('medium')
  const [sourceUrl, setSourceUrl] = useState('')
  const [inputText, setInputText] = useState('')
  const [worksheetResult, setWorksheetResult] = useState<any>(null)
  const [levelerResult, setLevelerResult] = useState<any>(null)
  const [differentiationResult, setDifferentiationResult] = useState<any>(null)

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE', 'IRE', 'HRE', 'Creative Arts', 'Agriculture']

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    setIsOffline(!isOnline())
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const generateContent = useCallback(async (type: string) => {
    if (!topic.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a topic',
        variant: 'destructive'
      })
      return
    }

    // Check network status before starting
    if (isOffline) {
      toast({
        title: 'No Internet Connection',
        description: 'Please check your network and try again',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setGeneratedContent('')
    setWorksheetResult(null)
    setLevelerResult(null)
    setDifferentiationResult(null)

    try {
      const teacherId = 'teacher_001'

      if (type === 'worksheet') {
        const row = {
          strand: topic,
          subStrand: topic,
          specificLearningOutcome: learningObjectives || `Learners will explore ${topic}`,
          keyInquiryQuestion: `How can learners demonstrate their understanding of ${topic}?`,
          learningExperiences: `Class discussion, guided practice, and written responses on ${topic}`,
          learningResources: `Textbook examples, classroom board, and student notebooks`,
          assessmentMethods: `Written answers and short explanations`,
          reflection: `Reflect on how well learners grasped ${topic}`,
        }

        const response = await requestQueue.add(() =>
          fetchWithRetry(
            buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_GENERATE_WORKSHEET),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacher_id: teacherId,
                grade,
                subject,
                term: 'Term 1',
                language: 'english',
                duration_minutes: Number(duration),
                row,
              }),
              retries: 3,
              timeout: 60000,
            }
          )
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.detail || err.error || 'Failed to generate worksheet')
        }

        const data = await response.json()
        setWorksheetResult(data.worksheet)
        toast({
          title: 'Worksheet Generated!',
          description: 'A KSA-balanced worksheet is ready for review',
        })
        return
      }

      if (type === 'text-leveler') {
        if (!inputText.trim() && !sourceUrl.trim()) {
          toast({
            title: 'Missing Text',
            description: 'Please paste source text or provide a source URL',
            variant: 'destructive'
          })
          return
        }

        const response = await requestQueue.add(() =>
          fetchWithRetry(
            buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_GENERATE_TEXT_LEVELER),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacher_id: teacherId,
                grade,
                subject,
                language: 'english',
                input_text: inputText || undefined,
                source_url: sourceUrl || undefined,
              }),
              retries: 3,
              timeout: 60000,
            }
          )
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.detail || err.error || 'Failed to generate text leveler')
        }

        const data = await response.json()
        setLevelerResult(data.leveler)
        toast({
          title: 'Text Leveler Ready!',
          description: 'A leveled passage and comprehension questions have been generated',
        })
        return
      }

      if (type === 'differentiation') {
        // Tier 2 tool composes a lesson-plan artefact. Magic-school-teacher
        // doesn't have a full lesson plan in scope, so synthesise a minimal
        // one from the form fields — the backend's
        // `_required_lesson_plan_keys` guard only requires grade, subject,
        // strand, subStrand, and objectives. The rest is consumed
        // opportunistically when present.
        const objectives = learningObjectives
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean)
        const lessonPlan = {
          title: `${topic} (${grade} ${subject})`,
          grade,
          subject,
          strand: topic,
          subStrand: topic,
          duration: `${duration} minutes`,
          objectives:
            objectives.length > 0
              ? objectives
              : [
                  `Explore ${topic}`,
                  `Apply key ideas from ${topic} in a classroom task`,
                ],
          keyInquiryQuestion: `How can learners demonstrate their understanding of ${topic}?`,
          // The backend reads these only if present — passing minimal but
          // realistic activities so the prompt has something to "adapt".
          introduction: {
            duration: '5 minutes',
            activities: [`Hook activity introducing ${topic}`],
          },
          development: {
            duration: '25 minutes',
            activities: [
              `Guided practice on ${topic}`,
              `Pair work applying ${topic}`,
            ],
          },
          conclusion: {
            duration: '5 minutes',
            activities: [`Recap and exit ticket on ${topic}`],
          },
          assessment: [`Observation during practice on ${topic}`],
          resources: ['Classroom board', 'Student notebooks'],
        }

        const response = await requestQueue.add(() =>
          fetchWithRetry(
            buildApiUrl(API_ENDPOINTS.LESSON_ARCHITECT_GENERATE_DIFFERENTIATION),
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                teacher_id: teacherId,
                lesson_plan: lessonPlan,
                language: 'english',
              }),
              retries: 3,
              timeout: 60000,
            }
          )
        )

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(
            err.detail || err.error || 'Failed to generate differentiation'
          )
        }

        const data = await response.json()
        setDifferentiationResult(data.differentiation)
        toast({
          title: 'Differentiation Ready!',
          description: 'Three-tier strategies generated for this topic',
        })
        return
      }

      let prompt = ''
      
      switch (type) {
        case 'lesson-plan':
          prompt = `Create a detailed CBC-aligned lesson plan for ${grade} ${subject} on the topic "${topic}". 
Duration: ${duration} minutes.
Learning Objectives: ${learningObjectives || 'Generate appropriate objectives'}

Include:
1. Learning Outcomes (specific, measurable)
2. Materials Needed
3. Introduction/Hook (5 min)
4. Main Activity (25 min) - step by step
5. Assessment (5 min)
6. Conclusion (5 min)
7. Differentiation strategies
8. CBC Core Competencies addressed
9. Values integrated
10. Homework/Extension activities

Format as a ready-to-use lesson plan for Kenyan teachers.`
          break

        case 'quiz':
          prompt = `Create a ${difficulty} difficulty quiz for ${grade} ${subject} on "${topic}".
Generate ${numQuestions} questions with:
- Multiple choice (4 options each)
- Clear correct answers
- Brief explanations
- CBC competency alignment
- Kenyan context where relevant

Format:
Question 1: [question]
A) [option]
B) [option]
C) [option]
D) [option]
Correct Answer: [letter]
Explanation: [why]
Competency: [CBC competency]`
          break

        case 'rubric':
          prompt = `Create a detailed assessment rubric for ${grade} ${subject} on "${topic}".
Include 4 levels: Exceeds Expectations, Meets Expectations, Approaching Expectations, Below Expectations
Criteria to assess:
- Understanding of concepts
- Application of skills
- Quality of work
- CBC competencies demonstrated
Format as a clear table with descriptors for each level.`
          break

        // case 'differentiation' is handled above via the structured
        // /lesson-architect/generate-differentiation endpoint and the
        // DifferentiationRenderer — the old markdown-blob path was
        // removed when the Tier 2 backend landed.

        case 'parent-letter':
          prompt = `Write a professional parent communication letter about ${grade} ${subject} topic "${topic}".
Include:
1. Warm greeting
2. What we're learning (topic overview)
3. Why it matters
4. How parents can help at home (3-4 specific activities)
5. Upcoming assessments
6. Contact information placeholder
Tone: Professional, warm, encouraging. Kenyan context.`
          break
      }

      const response = await requestQueue.add(() =>
        fetchWithRetry(buildApiUrl(API_ENDPOINTS.AGENTS_CHAT), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: prompt,
            user_id: 'teacher_001',
            session_id: `teacher_${Date.now()}`,
            grade: grade,
            subject: subject,
            language: 'english',
            role: 'teacher'
          }),
          retries: 3,
          timeout: 60000,
        })
      )

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      
      if (data.success && data.response) {
        setGeneratedContent(data.response)
        toast({
          title: 'Content Generated!',
          description: 'Your teaching material is ready',
        })
      } else {
        throw new Error(data.error || 'Generation failed')
      }

    } catch (error) {
      console.error('Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Please try again'
      toast({
        title: 'Generation Failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [topic, grade, subject, duration, learningObjectives, inputText, sourceUrl, toast, isOffline])

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }, [generatedContent, toast])

  const downloadAsDoc = useCallback(() => {
    const blob = new Blob([generatedContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}-${topic.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Downloaded!',
      description: 'File saved to your downloads'
    })
  }, [generatedContent, toast])

  const printToPDF = useCallback(() => {
    window.print()
    toast({
      title: 'Print Dialog Opened',
      description: 'Select "Save as PDF" to download'
    })
  }, [toast])

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Magic School AI</h1>
          <Badge variant="secondary">For Kenyan Teachers</Badge>
          {isOffline && (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Generate CBC-aligned lesson plans, quizzes, worksheets, and more in seconds
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          <TabsTrigger value="scheme-of-work" className="gap-2">
            <Calendar className="h-4 w-4" />
            Scheme of Work
          </TabsTrigger>
          <TabsTrigger value="lesson-plan" className="gap-2">
            <FileText className="h-4 w-4" />
            Lesson Plans
          </TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Quizzes
          </TabsTrigger>
          <TabsTrigger value="worksheet" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Worksheets
          </TabsTrigger>
          <TabsTrigger value="text-leveler" className="gap-2">
            <Brain className="h-4 w-4" />
            Text Leveler
          </TabsTrigger>
          <TabsTrigger value="rubric" className="gap-2">
            <Award className="h-4 w-4" />
            Rubrics
          </TabsTrigger>
          <TabsTrigger value="differentiation" className="gap-2">
            <Users className="h-4 w-4" />
            Differentiation
          </TabsTrigger>
          <TabsTrigger value="parent-letter" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Parent Letters
          </TabsTrigger>
        </TabsList>

        {/* Scheme of Work Tab */}
        <TabsContent value="scheme-of-work">
          <SchemeOfWorkGenerator />
        </TabsContent>

        {/* Other Tabs */}
        <TabsContent value="lesson-plan">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Input Details</CardTitle>
              <CardDescription>Fill in the information below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g., Fractions, Photosynthesis, Kenya's Independence"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              {activeTab === 'lesson-plan' && (
                <>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Learning Objectives (optional)</Label>
                    <Textarea
                      placeholder="What should students learn?"
                      value={learningObjectives}
                      onChange={(e) => setLearningObjectives(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}

              {activeTab === 'quiz' && (
                <>
                  <div className="space-y-2">
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <Button
                onClick={() => generateContent(activeTab)}
                disabled={loading || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate {activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Content */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    {generatedContent ? 'Ready to use!' : 'Your content will appear here'}
                  </CardDescription>
                </div>
                {generatedContent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadAsDoc}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Generating your content...</p>
                  <p className="text-sm text-muted-foreground">This may take 10-30 seconds</p>
                </div>
              ) : generatedContent ? (
                <ScrollArea className="h-[600px]">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {generatedContent}
                    </pre>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Brain className="h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-2">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Fill in the details on the left and click generate to create CBC-aligned teaching materials instantly
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Same form structure but for quiz */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Input Details</CardTitle>
              <CardDescription>Fill in the information below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g., Fractions, Photosynthesis"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Input
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => generateContent('quiz')}
                disabled={loading || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Quiz
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Generated Content */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>
                    {generatedContent ? 'Ready to use!' : 'Your content will appear here'}
                  </CardDescription>
                </div>
                {generatedContent && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadAsDoc}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Generating your content...</p>
                </div>
              ) : generatedContent ? (
                <ScrollArea className="h-[600px]">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {generatedContent}
                    </pre>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Brain className="h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-2">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Fill in the details and click generate
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        {/* Worksheet, Rubric, Differentiation, Parent Letter tabs - similar structure */}
        <TabsContent value="worksheet">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Worksheet Inputs</CardTitle>
                <CardDescription>Give the worksheet a focused topic and objective.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="e.g., Fractions: halves and quarters"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Learning Objective</Label>
                  <Textarea
                    value={learningObjectives}
                    onChange={(event) => setLearningObjectives(event.target.value)}
                    placeholder="e.g., Learners will identify half and quarter values"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </div>
                <Button
                  onClick={() => generateContent('worksheet')}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Worksheet...
                    </>
                  ) : (
                    'Generate Worksheet'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Worksheet Preview</CardTitle>
                <CardDescription>
                  {worksheetResult ? 'Review the generated worksheet below.' : 'Generate a worksheet to preview the structured items.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {worksheetResult ? (
                  <WorksheetRenderer worksheet={worksheetResult} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold mb-2">Ready to generate a worksheet</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Use the form to create a KSA-balanced worksheet for your class.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="text-leveler">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Text Leveler</CardTitle>
                <CardDescription>Paste text or provide a URL to generate a grade-appropriate passage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Source URL</Label>
                  <Input
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="Optional source URL"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Input Text</Label>
                  <Textarea
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                    placeholder="Paste the source text here"
                    rows={8}
                  />
                </div>
                <Button
                  onClick={() => generateContent('text-leveler')}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Leveler...
                    </>
                  ) : (
                    'Generate Leveler'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Leveled Passage</CardTitle>
                <CardDescription>
                  {levelerResult ? 'Review the generated passage and questions.' : 'Generated passages will appear here.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {levelerResult ? (
                  <TextLevelerRenderer leveler={levelerResult} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                    <Brain className="h-16 w-16 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold mb-2">Ready to level text</h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Paste a paragraph or provide a URL to get a passage and questions.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rubric">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-3">
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">Use the form above to generate rubrics</p>
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        <TabsContent value="differentiation">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input form — mirrors the worksheet/text-leveler tab layout so
              the differentiation surface reads as the same product. The
              backend builds a minimal synthetic lesson plan from these
              fields; for the full per-lesson tiering, use the
              "Differentiate" button inside the scheme-wizard lesson-plan
              dialog instead. */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Input Details</CardTitle>
              <CardDescription>Generate three-tier strategies</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Grade Level</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic *</Label>
                <Input
                  placeholder="e.g., Fractions, Photosynthesis"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Lesson Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Learning Objectives (one per line)</Label>
                <Textarea
                  placeholder={`count whole numbers up to 100\nwrite numerals 1-100`}
                  value={learningObjectives}
                  onChange={(e) => setLearningObjectives(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  All three tiers will target these same objectives — only the route differs.
                </p>
              </div>

              <Button
                onClick={() => generateContent('differentiation')}
                disabled={loading || !topic.trim()}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating tiers...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Differentiation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output — structured three-column renderer */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Three-Tier Strategies</CardTitle>
              <CardDescription>
                {differentiationResult
                  ? 'Review the support / on-grade / extension tiers below.'
                  : 'Generated strategies will appear here.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {differentiationResult ? (
                <ScrollArea className="h-[600px] pr-2">
                  <DifferentiationRenderer differentiation={differentiationResult} />
                </ScrollArea>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Generating three-tier strategies...</p>
                  <p className="text-sm text-muted-foreground">This may take 10-30 seconds</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Users className="h-16 w-16 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold mb-2">Ready to Differentiate</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Fill in topic + objectives on the left and click generate.
                      For per-lesson tiers, use the "Differentiate" button inside
                      the lesson-plan dialog of any scheme of work.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </TabsContent>

        <TabsContent value="parent-letter">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-3">
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">Use the form above to generate parent letters</p>
            </CardContent>
          </Card>
        </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
