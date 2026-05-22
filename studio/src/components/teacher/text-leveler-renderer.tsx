"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface LevelerQuestion {
  question: string
  ksa: 'Knowledge' | 'Skills' | 'Attitudes'
  answer: string
  acceptableKeywords?: string[]
}

interface TextLeveler {
  title: string
  grade: string
  subject: string
  passage: string
  questions: LevelerQuestion[]
}

interface TextLevelerRendererProps {
  leveler: TextLeveler
}

export function TextLevelerRenderer({ leveler }: TextLevelerRendererProps) {
  const { toast } = useToast()

  const printToPDF = () => {
    window.print()
    toast({
      title: 'Print Dialog Opened',
      description: 'Select "Save as PDF" to download'
    })
  }

  const getKSAColor = (ksa: string) => {
    switch (ksa) {
      case 'Knowledge':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Skills':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Attitudes':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="text-leveler-container space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold">{leveler.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {leveler.grade} • {leveler.subject}
          </p>
        </div>
        <Button onClick={printToPDF} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print to PDF
        </Button>
      </div>

      {/* Print-only Header */}
      <div className="print-only print-header">
        <h1>{leveler.title}</h1>
        <p>{leveler.grade} • {leveler.subject}</p>
        <p className="print-date">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Passage Section */}
      <Card className="print-card">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Reading Passage</h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ lineHeight: '1.8' }}>
              {leveler.passage}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comprehension Questions Section */}
      <Card className="print-card print-page-break-before">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Comprehension Questions</h3>
          <div className="space-y-6">
            {leveler.questions.map((question, index) => (
              <div key={index} className="print-avoid-break">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold">
                    {index + 1}. {question.question}
                  </span>
                  <Badge className={`${getKSAColor(question.ksa)} no-print flex-shrink-0`}>
                    {question.ksa}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="border-b border-dashed border-gray-300 w-full h-8" />
                  <div className="border-b border-dashed border-gray-300 w-full h-8" />
                  <div className="border-b border-dashed border-gray-300 w-full h-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Answer Key - Separate page when printed */}
      <Card className="print-page-break">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Answer Key (Teacher Copy)</h3>
          <div className="space-y-4">
            {leveler.questions.map((question, index) => (
              <div key={index} className="text-sm space-y-1">
                <p className="font-semibold">Question {index + 1}:</p>
                <p className="text-muted-foreground">{question.question}</p>
                <p className="mt-1">
                  <span className="font-semibold">Answer:</span> {question.answer}
                </p>
                {question.acceptableKeywords && question.acceptableKeywords.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold">Key terms:</span>{' '}
                    {question.acceptableKeywords.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
