"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface WorksheetItem {
  type: 'fill_blank' | 'short_answer' | 'problem_solving' | 'matching' | 'reflect'
  ksa: 'Knowledge' | 'Skills' | 'Attitudes'
  prompt: string
  answer?: string
  workingHint?: string
  pairs?: Array<{ left: string; right: string }>
  sampleResponse?: string
}

interface Worksheet {
  title: string
  grade: string
  subject: string
  duration: string
  instructions: string
  items: WorksheetItem[]
  answerKey: string
}

interface WorksheetRendererProps {
  worksheet: Worksheet
}

export function WorksheetRenderer({ worksheet }: WorksheetRendererProps) {
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
    <div className="worksheet-container space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold">{worksheet.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {worksheet.grade} • {worksheet.subject} • {worksheet.duration}
          </p>
        </div>
        <Button onClick={printToPDF} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print to PDF
        </Button>
      </div>

      {/* Print-only Header */}
      <div className="print-only print-header">
        <h1>{worksheet.title}</h1>
        <p>{worksheet.grade} • {worksheet.subject} • {worksheet.duration}</p>
        <p className="print-date">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Instructions */}
      <Card className="print-card">
        <CardContent className="pt-6">
          <p className="text-sm whitespace-pre-wrap">{worksheet.instructions}</p>
        </CardContent>
      </Card>

      {/* Worksheet Items */}
      <div className="space-y-6">
        {worksheet.items.map((item, index) => (
          <Card key={index} className="print-card print-avoid-break">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4 mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Question {index + 1}
                </span>
                <Badge className={`${getKSAColor(item.ksa)} no-print`}>
                  {item.ksa}
                </Badge>
              </div>

              {/* Fill in the Blank */}
              {item.type === 'fill_blank' && (
                <div>
                  <p className="text-sm font-medium mb-2">{item.prompt}</p>
                  <div className="mt-3 border-b border-dashed border-gray-300 w-full h-8" />
                </div>
              )}

              {/* Short Answer */}
              {item.type === 'short_answer' && (
                <div>
                  <p className="text-sm font-medium mb-2">{item.prompt}</p>
                  <div className="mt-3 space-y-2">
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                  </div>
                </div>
              )}

              {/* Problem Solving */}
              {item.type === 'problem_solving' && (
                <div>
                  <p className="text-sm font-medium mb-2">{item.prompt}</p>
                  {item.workingHint && (
                    <p className="text-xs text-muted-foreground italic mb-2">
                      Hint: {item.workingHint}
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                  </div>
                </div>
              )}

              {/* Matching */}
              {item.type === 'matching' && item.pairs && (
                <div>
                  <p className="text-sm font-medium mb-3">{item.prompt}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      {item.pairs.map((pair, pairIndex) => (
                        <div
                          key={pairIndex}
                          className="flex items-center gap-2 p-2 rounded border border-gray-200"
                        >
                          <span className="font-semibold text-xs">{pairIndex + 1}.</span>
                          <span className="text-sm">{pair.left}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {item.pairs.map((pair, pairIndex) => (
                        <div
                          key={pairIndex}
                          className="flex items-center gap-2 p-2 rounded border border-gray-200"
                        >
                          <span className="font-semibold text-xs">
                            {String.fromCharCode(65 + pairIndex)}.
                          </span>
                          <span className="text-sm">{pair.right}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Reflect */}
              {item.type === 'reflect' && (
                <div>
                  <p className="text-sm font-medium mb-2">{item.prompt}</p>
                  <div className="mt-3 space-y-2">
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                    <div className="border-b border-dashed border-gray-300 w-full h-8" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Answer Key - Collapsible on screen, separate page when printed */}
      <Card className="print-page-break">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Answer Key</h3>
          <div className="space-y-3">
            {worksheet.items.map((item, index) => (
              <div key={index} className="text-sm">
                <span className="font-semibold">Q{index + 1}:</span>{' '}
                {item.answer || item.sampleResponse || 'See matching pairs above'}
              </div>
            ))}
          </div>
          {worksheet.answerKey && (
            <div className="mt-4 pt-4 border-t">
              <pre className="text-xs whitespace-pre-wrap">{worksheet.answerKey}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
