'use client';

import { useEffect, useState } from 'react';
import { Settings2, Sparkles, Scale, Trophy } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { GamificationMode } from './gamification-panel';

const STORAGE_KEY = 'gamificationMode';

const options: Array<{
  value: GamificationMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'mastery',
    label: 'Mastery focus',
    description: 'Hide points and rankings. Lead with what I am learning.',
    icon: <Sparkles className="h-4 w-4 text-violet-500" />,
  },
  {
    value: 'balanced',
    label: 'Balanced (recommended)',
    description: 'Show progress and badges, but no class ranking.',
    icon: <Scale className="h-4 w-4 text-blue-500" />,
  },
  {
    value: 'achievement',
    label: 'Achievement focus',
    description: 'Show everything: points, level, rank, and badges.',
    icon: <Trophy className="h-4 w-4 text-amber-500" />,
  },
];

export function loadGamificationMode(): GamificationMode {
  if (typeof window === 'undefined') return 'balanced';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'mastery' || saved === 'balanced' || saved === 'achievement') {
    return saved;
  }
  return 'balanced';
}

interface GamificationModeSwitcherProps {
  mode: GamificationMode;
  onChange: (mode: GamificationMode) => void;
}

export function GamificationModeSwitcher({
  mode,
  onChange,
}: GamificationModeSwitcherProps) {
  const [open, setOpen] = useState(false);

  const handleChange = (next: string) => {
    const value = next as GamificationMode;
    onChange(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore quota / private mode
    }
  };

  const current = options.find((o) => o.value === mode) ?? options[1];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Style:</span>
          {current.icon}
          <span>{current.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm">What motivates you most?</p>
            <p className="text-xs text-muted-foreground">
              Choose how the dashboard frames your progress. You can change this any time.
            </p>
          </div>
          <RadioGroup value={mode} onValueChange={handleChange} className="space-y-2">
            {options.map((option) => (
              <Label
                key={option.value}
                htmlFor={`mode-${option.value}`}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem
                  id={`mode-${option.value}`}
                  value={option.value}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    {option.icon}
                    {option.label}
                  </div>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </PopoverContent>
    </Popover>
  );
}
