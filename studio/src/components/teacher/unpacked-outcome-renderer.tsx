"use client"

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Target } from 'lucide-react'

interface ICanStatement {
  statement: string
  ksa: 'Knowledge' | 'Skills' | 'Attitudes'
}

interface SuccessCriterion {
  criterion: string
  observable: boolean
}

interface UnpackedOutcome {
  iCanStatements: ICanStatement[]
  successCriteria: SuccessCriterion[]
  coreCompetencies?: string[]
  values?: string[]
}

interface UnpackedOutcomeRendererProps {
  unpackedOutcome: UnpackedOutcome
  originalOutcome: string
}

export function UnpackedOutcomeRenderer({
  unpackedOutcome,
  originalOutcome,
}: UnpackedOutcomeRendererProps) {
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
    <div className="space-y-6">
      {/* Original Outcome */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Original Learning Outcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">{originalOutcome}</p>
        </CardContent>
      </Card>

      {/* I-Can Statements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            I-Can Statements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {unpackedOutcome.iCanStatements.map((statement, index) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{statement.statement}</p>
                  <Badge className={`${getKSAColor(statement.ksa)} mt-1`} variant="secondary">
                    {statement.ksa}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Success Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Success Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {unpackedOutcome.successCriteria.map((criterion, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-sm font-semibold text-muted-foreground mt-0.5">
                  {index + 1}.
                </span>
                <div className="flex-1">
                  <p className="text-sm">{criterion.criterion}</p>
                  {criterion.observable && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Observable
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Core Competencies */}
      {unpackedOutcome.coreCompetencies && unpackedOutcome.coreCompetencies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Core Competencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unpackedOutcome.coreCompetencies.map((competency, index) => (
                <Badge key={index} variant="secondary">
                  {competency}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Values */}
      {unpackedOutcome.values && unpackedOutcome.values.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unpackedOutcome.values.map((value, index) => (
                <Badge key={index} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
