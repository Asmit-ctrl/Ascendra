'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, TrendingUp } from 'lucide-react'

interface UsageData {
  used: number
  limit: number
  date: string
}

/**
 * Usage Indicator Component
 * Tracks and displays daily API usage with localStorage (FREE)
 */
export function UsageIndicator() {
  const [usage, setUsage] = useState<UsageData>({ used: 0, limit: 50, date: '' })

  useEffect(() => {
    loadUsage()
  }, [])

  const loadUsage = () => {
    try {
      const stored = localStorage.getItem('daily_usage')
      const today = new Date().toDateString()
      
      if (stored) {
        const data: UsageData = JSON.parse(stored)
        
        // Reset if new day
        if (data.date !== today) {
          const newData: UsageData = { used: 0, limit: 50, date: today }
          localStorage.setItem('daily_usage', JSON.stringify(newData))
          setUsage(newData)
        } else {
          setUsage(data)
        }
      } else {
        const newData: UsageData = { used: 0, limit: 50, date: today }
        localStorage.setItem('daily_usage', JSON.stringify(newData))
        setUsage(newData)
      }
    } catch (error) {
      console.error('Error loading usage:', error)
    }
  }

  const percentage = (usage.used / usage.limit) * 100
  const isNearLimit = percentage > 80
  const isAtLimit = percentage >= 100
  const remaining = Math.max(0, usage.limit - usage.used)

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">Daily Messages</span>
        <span className={isNearLimit ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
          {usage.used} / {usage.limit}
        </span>
      </div>
      
      <Progress 
        value={Math.min(percentage, 100)} 
        className={isNearLimit ? 'bg-destructive/20' : ''} 
      />
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {isAtLimit ? (
          <>
            <AlertCircle className="h-3 w-3 text-destructive" />
            <span className="text-destructive">Limit reached. Resets tomorrow.</span>
          </>
        ) : isNearLimit ? (
          <>
            <AlertCircle className="h-3 w-3 text-orange-500" />
            <span>{remaining} messages remaining today</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>{remaining} messages remaining</span>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Detailed Usage Card
 * Shows more detailed usage statistics
 */
export function UsageCard() {
  const [usage, setUsage] = useState<UsageData>({ used: 0, limit: 50, date: '' })
  const [weeklyUsage, setWeeklyUsage] = useState<number[]>([])

  useEffect(() => {
    loadUsage()
    loadWeeklyUsage()
  }, [])

  const loadUsage = () => {
    try {
      const stored = localStorage.getItem('daily_usage')
      const today = new Date().toDateString()
      
      if (stored) {
        const data: UsageData = JSON.parse(stored)
        if (data.date === today) {
          setUsage(data)
        } else {
          const newData: UsageData = { used: 0, limit: 50, date: today }
          setUsage(newData)
        }
      }
    } catch (error) {
      console.error('Error loading usage:', error)
    }
  }

  const loadWeeklyUsage = () => {
    try {
      const stored = localStorage.getItem('weekly_usage')
      if (stored) {
        const data: number[] = JSON.parse(stored)
        setWeeklyUsage(data.slice(-7)) // Last 7 days
      }
    } catch (error) {
      console.error('Error loading weekly usage:', error)
    }
  }

  const percentage = (usage.used / usage.limit) * 100
  const avgDaily = weeklyUsage.length > 0 
    ? Math.round(weeklyUsage.reduce((a, b) => a + b, 0) / weeklyUsage.length)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Usage Statistics
        </CardTitle>
        <CardDescription>
          Track your daily API usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Today</span>
            <span className="text-sm text-muted-foreground">
              {usage.used} / {usage.limit}
            </span>
          </div>
          <Progress value={Math.min(percentage, 100)} />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Remaining Today</p>
            <p className="text-2xl font-bold">{Math.max(0, usage.limit - usage.used)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">7-Day Average</p>
            <p className="text-2xl font-bold">{avgDaily}</p>
          </div>
        </div>

        {percentage >= 100 && (
          <Badge variant="destructive" className="w-full justify-center">
            Daily limit reached. Upgrade to Premium for unlimited access.
          </Badge>
        )}
        
        {percentage > 80 && percentage < 100 && (
          <Badge variant="outline" className="w-full justify-center border-orange-500 text-orange-500">
            {Math.max(0, usage.limit - usage.used)} messages remaining today
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Increment usage counter
 * Call this after each API request
 */
export function incrementUsage(): void {
  try {
    const stored = localStorage.getItem('daily_usage')
    const today = new Date().toDateString()
    
    if (stored) {
      const data: UsageData = JSON.parse(stored)
      
      // Reset if new day
      if (data.date !== today) {
        // Save yesterday's usage to weekly history
        saveToWeeklyHistory(data.used)
        
        const newData: UsageData = { used: 1, limit: 50, date: today }
        localStorage.setItem('daily_usage', JSON.stringify(newData))
      } else {
        data.used += 1
        localStorage.setItem('daily_usage', JSON.stringify(data))
      }
    } else {
      const newData: UsageData = { used: 1, limit: 50, date: today }
      localStorage.setItem('daily_usage', JSON.stringify(newData))
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
  }
}

/**
 * Check if user has reached limit
 */
export function hasReachedLimit(): boolean {
  try {
    const stored = localStorage.getItem('daily_usage')
    const today = new Date().toDateString()
    
    if (stored) {
      const data: UsageData = JSON.parse(stored)
      
      // If new day, limit is not reached
      if (data.date !== today) {
        return false
      }
      
      return data.used >= data.limit
    }
    
    return false
  } catch (error) {
    console.error('Error checking limit:', error)
    return false
  }
}

/**
 * Save daily usage to weekly history
 */
function saveToWeeklyHistory(usage: number): void {
  try {
    const stored = localStorage.getItem('weekly_usage')
    let history: number[] = stored ? JSON.parse(stored) : []
    
    history.push(usage)
    
    // Keep only last 30 days
    if (history.length > 30) {
      history = history.slice(-30)
    }
    
    localStorage.setItem('weekly_usage', JSON.stringify(history))
  } catch (error) {
    console.error('Error saving weekly history:', error)
  }
}

// Made with Bob
