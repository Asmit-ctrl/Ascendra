"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Sparkles, FileText, ClipboardList, BookOpen, Users, MessageSquare, Award, Brain, Download, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function MagicSchoolTeacher() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('lesson-plan')
  const [loading, setLoading] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')
  const [copied, setCopied] = useState(false)

  // Form states
  const [grade, setGrade] = useState('Grade 4')
  const [subject, setSubject] = useState('Mathematics')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState('40')
  const [learningObjectives, setLearningObjectives] = useState('')
  const [numQuestions, setNumQuestions] = useState('10')
  const [difficulty, setDifficulty] = useState('medium')

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE', 'IRE', 'HRE', 'Creative Arts', 'Agriculture']

  const generateContent = async (type: string) => {
    if (!topic.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter a topic',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setGeneratedContent('')

    try {
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

        case 'worksheet':
          prompt = `Create an engaging worksheet for ${grade} ${subject} on "${topic}".
Include:
1. Title and instructions
2. 10-15 varied activities (fill-in-blanks, matching, short answer, problem-solving)
3. Visual elements descriptions
4. Answer key at the end
5. Extension challenge
6. Space for student name and date

Make it print-ready and engaging for Kenyan students.`
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

        case 'differentiation':
          prompt = `Provide differentiation strategies for teaching ${grade} ${subject} topic "${topic}".
Include:
1. For Advanced Learners (3 strategies)
2. For Struggling Learners (3 strategies)
3. For English Language Learners (3 strategies)
4. For Different Learning Styles (Visual, Auditory, Kinesthetic)
5. Specific CBC-aligned activities for each group
6. Assessment modifications`
          break

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

      const response = await fetch('http://localhost:8001/agents/chat', {
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
        })
      })

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
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadAsDoc = () => {
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
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Magic School AI</h1>
          <Badge variant="secondary">For Kenyan Teachers</Badge>
        </div>
        <p className="text-muted-foreground">
          Generate CBC-aligned lesson plans, quizzes, worksheets, and more in seconds
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2">
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
      </Tabs>
    </div>
  )
}
