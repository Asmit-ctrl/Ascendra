'use client';

/**
 * Chat Mode Selector Component
 * 
 * Allows students to switch between:
 * - Socratic: Open-ended exploration
 * - Homework Help: Step-by-step guidance
 * - Compass: Teacher-provided context (when available)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Brain, BookOpen, Compass, ChevronDown } from 'lucide-react';

export type ChatMode = 'socratic' | 'homework-help' | 'compass';

interface ChatModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  hasTeacherContext?: boolean;
}

const modes = {
  socratic: {
    label: 'Socratic Mode',
    description: 'Open-ended learning with guiding questions',
    icon: Brain,
    color: 'text-blue-600',
  },
  'homework-help': {
    label: 'Homework Help',
    description: 'Step-by-step guidance without direct answers',
    icon: BookOpen,
    color: 'text-purple-600',
  },
  compass: {
    label: 'Compass Mode',
    description: 'Learn from your teacher\'s materials',
    icon: Compass,
    color: 'text-green-600',
  },
};

export function ChatModeSelector({
  currentMode,
  onModeChange,
  hasTeacherContext = false,
}: ChatModeSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentModeData = modes[currentMode];
  const CurrentIcon = currentModeData.icon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <CurrentIcon className={`h-4 w-4 ${currentModeData.color}`} />
          {currentModeData.label}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>Learning Mode</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            onModeChange('socratic');
            setOpen(false);
          }}
          className={currentMode === 'socratic' ? 'bg-blue-50' : ''}
        >
          <Brain className="mr-2 h-4 w-4 text-blue-600" />
          <div className="flex-1">
            <div className="font-medium">Socratic</div>
            <div className="text-xs text-gray-600">Open exploration</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            onModeChange('homework-help');
            setOpen(false);
          }}
          className={currentMode === 'homework-help' ? 'bg-purple-50' : ''}
        >
          <BookOpen className="mr-2 h-4 w-4 text-purple-600" />
          <div className="flex-1">
            <div className="font-medium">Homework Help</div>
            <div className="text-xs text-gray-600">Step-by-step</div>
          </div>
        </DropdownMenuItem>

        {hasTeacherContext && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                onModeChange('compass');
                setOpen(false);
              }}
              className={currentMode === 'compass' ? 'bg-green-50' : ''}
            >
              <Compass className="mr-2 h-4 w-4 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">Compass</div>
                <div className="text-xs text-gray-600">Teacher context</div>
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
