"use client"

/**
 * DifferentiationRenderer
 *
 * Renders the three-tier differentiation block produced by
 * `POST /lesson-architect/generate-differentiation`. The contract matches
 * the Pydantic `Differentiation` model in
 * `ai-agents/src/syncsenta_agents/agents/scheme/differentiation.py`:
 *
 *   { title, grade, subject, strand, subStrand, objectives[],
 *     support|onGrade|extension {
 *       learnerProfile,
 *       adaptations: [{ activity, note, ksa }],
 *       resourceSwaps[],
 *       assessmentCues[],
 *     },
 *     inclusionStrategies[], coreCompetencies[] }
 *
 * The three tiers target the SAME objectives — only the route differs. The
 * UI mirrors that by rendering objectives ONCE at the top, then the three
 * tiers as parallel columns on desktop (stacked on narrow screens). KSA
 * colour conventions match `worksheet-renderer.tsx` so the studio reads as
 * one product.
 *
 * Note: the backend emits lowercase ksa labels (`knowledge | skills |
 * attitudes`). The renderer normalises to Title Case for display only;
 * never mutate the payload on the way to persistence.
 */

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type KSALower = 'knowledge' | 'skills' | 'attitudes'

interface TierAdaptation {
  activity: string
  note: string
  ksa: KSALower
}

interface DifferentiationTier {
  learnerProfile: string
  adaptations: TierAdaptation[]
  resourceSwaps: string[]
  assessmentCues: string[]
}

export interface Differentiation {
  title: string
  grade: string
  subject: string
  strand: string
  subStrand: string
  objectives: string[]
  support: DifferentiationTier
  onGrade: DifferentiationTier
  extension: DifferentiationTier
  inclusionStrategies: string[]
  coreCompetencies: string[]
}

interface DifferentiationRendererProps {
  differentiation: Differentiation
}

// Match the KSA palette used by worksheet-renderer.tsx so the same chip
// reads as the same concept across tools.
function ksaColor(ksa: KSALower): string {
  switch (ksa) {
    case 'knowledge':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'skills':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'attitudes':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  }
}

function ksaLabel(ksa: KSALower): string {
  return ksa.charAt(0).toUpperCase() + ksa.slice(1)
}

const TIER_DEFS: Array<{
  key: 'support' | 'onGrade' | 'extension'
  label: string
  accent: string
}> = [
  // Accent classes intentionally use Tailwind utility colours rather than
  // semantic tokens so the visual ordering reads support → on-grade →
  // extension at a glance, the same direction the prompt instructs the LLM
  // to traverse.
  { key: 'support', label: 'Support', accent: 'border-blue-300 bg-blue-50/40' },
  { key: 'onGrade', label: 'On-Grade', accent: 'border-emerald-300 bg-emerald-50/40' },
  { key: 'extension', label: 'Extension', accent: 'border-purple-300 bg-purple-50/40' },
]

export function DifferentiationRenderer({ differentiation }: DifferentiationRendererProps) {
  const { toast } = useToast()

  const printToPDF = () => {
    window.print()
    toast({
      title: 'Print Dialog Opened',
      description: 'Select "Save as PDF" to download',
    })
  }

  return (
    <div className="differentiation-container space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold">{differentiation.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {differentiation.grade} • {differentiation.subject} • {differentiation.strand} →{' '}
            {differentiation.subStrand}
          </p>
        </div>
        <Button onClick={printToPDF} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Print to PDF
        </Button>
      </div>

      {/* Print-only header */}
      <div className="print-only print-header">
        <h1>{differentiation.title} — Differentiation</h1>
        <p>
          {differentiation.grade} • {differentiation.subject} • {differentiation.strand} →{' '}
          {differentiation.subStrand}
        </p>
        <p className="print-date">Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Shared objectives — every tier serves these. Rendered once on
          purpose: that's the whole differentiation framing. */}
      <Card className="print-card">
        <CardContent className="pt-6 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Shared Learning Objectives
          </h3>
          <p className="text-xs text-muted-foreground italic">
            All three tiers target the same outcomes — only the route differs.
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {differentiation.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Three tiers — parallel columns on desktop, stacked on mobile. */}
      <div className="grid gap-4 md:grid-cols-3">
        {TIER_DEFS.map(({ key, label, accent }) => {
          const tier = differentiation[key]
          return (
            <Card
              key={key}
              className={`print-card print-avoid-break border-2 ${accent}`}
            >
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold">{label}</h3>
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {tier.learnerProfile}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Adaptations
                  </h4>
                  <div className="space-y-3">
                    {tier.adaptations.map((a, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium">{a.activity}</p>
                          <Badge className={`${ksaColor(a.ksa)} no-print shrink-0`}>
                            {ksaLabel(a.ksa)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground italic">{a.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {tier.resourceSwaps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Resource Swaps
                    </h4>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      {tier.resourceSwaps.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Assessment Cues
                  </h4>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {tier.assessmentCues.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Footer — optional cross-tier strategies + competencies */}
      {(differentiation.inclusionStrategies.length > 0 ||
        differentiation.coreCompetencies.length > 0) && (
        <Card className="print-card">
          <CardContent className="pt-6 grid gap-4 md:grid-cols-2">
            {differentiation.inclusionStrategies.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Inclusion Strategies (all tiers)
                </h4>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {differentiation.inclusionStrategies.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {differentiation.coreCompetencies.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Core Competencies Surfaced
                </h4>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {differentiation.coreCompetencies.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
