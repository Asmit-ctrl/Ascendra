"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { buildApiUrl } from '@/lib/api-config'
import { Download, Loader2, Database } from 'lucide-react'

interface ExportTrainingDataButtonProps {
  schemeId?: string
  teacherId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function ExportTrainingDataButton({
  schemeId,
  teacherId,
  variant = 'outline',
  size = 'sm',
}: ExportTrainingDataButtonProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exportType, setExportType] = useState<'single' | 'batch'>('single')
  
  // Batch export filters
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [termFilter, setTermFilter] = useState('')
  const [limit, setLimit] = useState('100')

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9']
  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Science', 'Social Studies', 'CRE', 'IRE', 'HRE', 'Creative Arts', 'Agriculture']

  const handleExportSingle = async () => {
    if (!schemeId) {
      toast({
        title: 'No Scheme Selected',
        description: 'Please select a scheme to export',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(buildApiUrl('/training-export/export-scheme'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheme_id: schemeId,
          teacher_id: teacherId,
          include_metadata: true,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || 'Export failed')
      }

      const data = await response.json()

      toast({
        title: 'Export Successful!',
        description: `Scheme exported to: ${data.storage_path}`,
      })

      setOpen(false)
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBatchExport = async () => {
    setLoading(true)

    try {
      const response = await fetch(buildApiUrl('/training-export/batch-export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: teacherId,
          export_type: 'schemes',
          grade_filter: gradeFilter || null,
          subject_filter: subjectFilter || null,
          term_filter: termFilter || null,
          limit: limit ? parseInt(limit) : null,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.detail || 'Batch export failed')
      }

      const data = await response.json()

      toast({
        title: 'Batch Export Successful!',
        description: `${data.items_exported} schemes exported to: ${data.storage_path}`,
      })

      setOpen(false)
    } catch (error) {
      console.error('Batch export error:', error)
      toast({
        title: 'Batch Export Failed',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Database className="h-4 w-4" />
        Export for Training
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Training Data</DialogTitle>
            <DialogDescription>
              Export schemes to Supabase Storage for RAG model training
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select
                value={exportType}
                onValueChange={(val) => setExportType(val as 'single' | 'batch')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Scheme</SelectItem>
                  <SelectItem value="batch">Batch Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {exportType === 'single' && (
              <div className="rounded-lg border border-border p-3 text-sm">
                <p className="text-muted-foreground">
                  {schemeId
                    ? `Exporting scheme: ${schemeId}`
                    : 'No scheme selected. Generate a scheme first.'}
                </p>
              </div>
            )}

            {exportType === 'batch' && (
              <>
                <div className="space-y-2">
                  <Label>Grade Filter (optional)</Label>
                  <Select value={gradeFilter} onValueChange={setGradeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All grades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All grades</SelectItem>
                      {grades.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject Filter (optional)</Label>
                  <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All subjects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All subjects</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Term Filter (optional)</Label>
                  <Select value={termFilter} onValueChange={setTermFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All terms</SelectItem>
                      <SelectItem value="Term 1">Term 1</SelectItem>
                      <SelectItem value="Term 2">Term 2</SelectItem>
                      <SelectItem value="Term 3">Term 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Limit (max schemes)</Label>
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={exportType === 'single' ? handleExportSingle : handleBatchExport}
              disabled={loading || (exportType === 'single' && !schemeId)}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
