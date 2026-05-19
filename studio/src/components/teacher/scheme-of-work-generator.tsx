"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, BookOpen, Download, Copy, Check, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { curriculumData } from '@/data/curriculum/curriculum-structure'
import { buildApiUrl, API_ENDPOINTS } from '@/lib/api-config'

// Stopgap teacher identity. Until real auth lands, persist a single ID per
// browser so the generate (save) and list paths agree. Replace with the
// authenticated user's ID once auth context is wired in.
function getTeacherId(): string {
  if (typeof window === 'undefined') return 'teacher_anon'
  const KEY = 'syncsenta:teacherId'
  let id = window.localStorage.getItem(KEY)
  if (!id) {
    id = `teacher_${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(KEY, id)
  }
  return id
}

export function SchemeOfWorkGenerator() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [generatedScheme, setGeneratedScheme] = useState('')
  const [copied, setCopied] = useState(false)

  // Form states
  const [level, setLevel] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [term, setTerm] = useState('Term 1')

  // Get available levels
  const levels = Object.keys(curriculumData)

  // Get available grades for selected level
  const grades = level ? Object.keys(curriculumData[level as keyof typeof curriculumData] || {}) : []

  // Get available subjects for selected grade
  const subjects = level && grade 
    ? Object.keys(curriculumData[level as keyof typeof curriculumData]?.[grade as any] || {})
    : []

  const generateScheme = async () => {
    if (!level || !grade || !subject || !term) {
      toast({
        title: 'Missing Information',
        description: 'Please select level, grade, subject, and term',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setGeneratedScheme('')

    try {
      // Get curriculum data for selected grade and subject
      const subjectData = curriculumData[level as keyof typeof curriculumData]?.[grade as any]?.[subject]
      
      if (!subjectData) {
        throw new Error('Curriculum data not found for this selection')
      }

      const prompt = `Create a comprehensive 13-week Scheme of Work for ${grade} ${subject} - ${term}.

Use this CBC curriculum data:
${JSON.stringify(subjectData, null, 2)}

Format the scheme as follows:

# SCHEME OF WORK
**Grade:** ${grade}
**Subject:** ${subject}
**Term:** ${term}
**Duration:** 13 Weeks

## Week 1: [Strand/Topic Name]
**Learning Outcomes:**
- [Specific, measurable outcomes]

**Key Concepts:**
- [Main concepts to cover]

**Suggested Activities:**
- [Activity 1]
- [Activity 2]

**Assessment:**
- [How to assess learning]

**Resources:**
- [Materials needed]

---

[Repeat for Weeks 2-13]

## Assessment Plan
- Formative assessments (ongoing)
- Summative assessment (end of term)

## Core Competencies Addressed
- [List CBC core competencies]

## Values Integrated
- [List values]

## Differentiation Strategies
- For advanced learners
- For struggling learners

Make it detailed, practical, and ready for Kenyan teachers to use. Ensure it aligns with KICD CBC standards.`

      const teacherId = getTeacherId()

      const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENTS_CHAT), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          user_id: teacherId,
          session_id: `scheme_${Date.now()}`,
          grade: grade,
          subject: subject,
          language: 'english',
          role: 'teacher'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate scheme of work')
      }

      const data = await response.json()
      
      if (data.success && data.response) {
        setGeneratedScheme(data.response)
        
        // Save the scheme to database
        try {
          const saveResponse = await fetch(buildApiUrl('/lesson-architect/schemes'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teacher_id: teacherId, // shared with /agents/chat above
              grade: grade,
              subject: subject,
              term: term,
              title: `${grade} ${subject} - ${term} Scheme of Work`,
              content: data.response,
              mode: 'standard',
              language: 'english'
            })
          })
          
          if (saveResponse.ok) {
            const saveData = await saveResponse.json()
            console.log('Scheme saved:', saveData.scheme_id)
          }
        } catch (saveError) {
          console.error('Failed to save scheme:', saveError)
          // Don't show error to user - scheme was generated successfully
        }
        
        toast({
          title: 'Scheme of Work Generated!',
          description: '13-week scheme ready for review',
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
    navigator.clipboard.writeText(generatedScheme)
    setCopied(true)
    toast({
      title: 'Copied!',
      description: 'Scheme of work copied to clipboard'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadAsDoc = () => {
    const blob = new Blob([generatedScheme], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scheme-of-work-${grade}-${subject}-${term}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({
      title: 'Downloaded!',
      description: 'Scheme of work saved to downloads'
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Input Form */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Scheme Details
          </CardTitle>
          <CardDescription>Select grade, subject, and term</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Level *</Label>
            <Select value={level} onValueChange={(val) => {
              setLevel(val)
              setGrade('')
              setSubject('')
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map(l => (
                  <SelectItem key={l} value={l}>
                    {l.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Grade *</Label>
            <Select value={grade} onValueChange={(val) => {
              setGrade(val)
              setSubject('')
            }} disabled={!level}>
              <SelectTrigger>
                <SelectValue placeholder="Select grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map(g => (
                  <SelectItem key={g} value={g}>
                    {g.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Subject *</Label>
            <Select value={subject} onValueChange={setSubject} disabled={!grade}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Term *</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Term 1">Term 1</SelectItem>
                <SelectItem value="Term 2">Term 2</SelectItem>
                <SelectItem value="Term 3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 space-y-3">
            <Button
              onClick={generateScheme}
              disabled={loading || !level || !grade || !subject}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating 13-Week Scheme...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Generate Scheme of Work
                </>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center">
              This will create a comprehensive 13-week scheme aligned with CBC curriculum
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Generated Scheme */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Scheme of Work</CardTitle>
              <CardDescription>
                {generatedScheme ? '13-week scheme ready!' : 'Your scheme will appear here'}
              </CardDescription>
            </div>
            {generatedScheme && (
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
              <p className="text-muted-foreground">Generating your 13-week scheme...</p>
              <p className="text-sm text-muted-foreground">This may take 30-60 seconds</p>
            </div>
          ) : generatedScheme ? (
            <ScrollArea className="h-[600px]">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {generatedScheme}
                </pre>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-2">Ready to Generate</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Select your grade, subject, and term to generate a comprehensive 13-week Scheme of Work aligned with CBC curriculum
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  📚 Using comprehensive KICD curriculum data
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
