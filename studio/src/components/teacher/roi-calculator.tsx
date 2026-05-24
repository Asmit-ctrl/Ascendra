/**
 * ROI Calculator for Teachers (FREE)
 * Shows value proposition and return on investment
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export function ROICalculator() {
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(20);
  const [subscriptionCost, setSubscriptionCost] = useState(49);
  
  // Calculate savings
  const weeksPerMonth = 4;
  const timeSavedPerMonth = hoursPerWeek * weeksPerMonth;
  const valueSaved = timeSavedPerMonth * hourlyRate;
  const netSavings = valueSaved - subscriptionCost;
  const roi = subscriptionCost > 0 ? ((netSavings / subscriptionCost) * 100) : 0;
  
  // Annual calculations
  const annualTimeSaved = timeSavedPerMonth * 12;
  const annualValueSaved = valueSaved * 12;
  const annualCost = subscriptionCost * 12;
  const annualNetSavings = annualValueSaved - annualCost;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💰</span>
          Your ROI with Syncsenta
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Calculate how much time and money you save with AI-powered lesson planning
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="hours">Hours spent on lesson planning per week</Label>
            <Input
              id="hours"
              type="number"
              min="1"
              max="40"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Average teacher spends 10-15 hours per week
            </p>
          </div>

          <div>
            <Label htmlFor="rate">Your hourly rate (USD)</Label>
            <Input
              id="rate"
              type="number"
              min="1"
              max="200"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Value of your time outside work hours
            </p>
          </div>

          <div>
            <Label htmlFor="subscription">Monthly subscription cost (USD)</Label>
            <Input
              id="subscription"
              type="number"
              min="0"
              max="500"
              value={subscriptionCost}
              onChange={(e) => setSubscriptionCost(parseInt(e.target.value) || 0)}
              className="mt-1"
            />
          </div>
        </div>

        <Separator />

        {/* Monthly Results */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Monthly Savings</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span>Time saved per month:</span>
              <span className="font-bold text-primary">{timeSavedPerMonth} hours</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span>Value of time saved:</span>
              <span className="font-bold text-green-600">${valueSaved.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
              <span>Subscription cost:</span>
              <span className="font-bold text-orange-600">-${subscriptionCost.toFixed(2)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
              <span className="font-semibold">Net monthly savings:</span>
              <span className={`font-bold text-lg ${netSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${netSavings.toFixed(2)}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg">
              <span className="font-semibold">Return on Investment:</span>
              <span className={`font-bold text-2xl ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Annual Results */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lg">Annual Impact</h4>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Time Saved</p>
              <p className="font-bold text-lg text-blue-600">{annualTimeSaved} hrs</p>
            </div>
            
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Value Saved</p>
              <p className="font-bold text-lg text-green-600">${annualValueSaved.toFixed(0)}</p>
            </div>
            
            <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Annual Cost</p>
              <p className="font-bold text-lg text-orange-600">${annualCost.toFixed(0)}</p>
            </div>
            
            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <p className="text-muted-foreground text-xs mb-1">Net Savings</p>
              <p className={`font-bold text-lg ${annualNetSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${annualNetSavings.toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        {/* Insights */}
        {roi > 100 && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>🎉 Excellent ROI!</strong> You're saving more than double your investment. 
              Syncsenta pays for itself and gives you {timeSavedPerMonth} hours back each month!
            </p>
          </div>
        )}

        {roi > 0 && roi <= 100 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Good Value!</strong> You're saving {timeSavedPerMonth} hours per month. 
              That's time you can spend with family, on professional development, or relaxing!
            </p>
          </div>
        )}

        {roi < 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⏰ Time is Priceless!</strong> While the monetary ROI is negative, 
              you're still saving {timeSavedPerMonth} hours per month. Consider the value of 
              work-life balance and reduced stress!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Made with Bob
