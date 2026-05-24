'use client'

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  description: string
  action: () => void
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   {
 *     key: 'k',
 *     ctrl: true,
 *     description: 'Open search',
 *     action: () => setSearchOpen(true)
 *   }
 * ])
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey
      const altMatch = shortcut.alt ? event.altKey : !event.altKey
      
      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        ctrlMatch &&
        shiftMatch &&
        altMatch
      ) {
        event.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])
}

/**
 * Common keyboard shortcuts for the app
 */
export const COMMON_SHORTCUTS = {
  SEARCH: {
    key: 'k',
    ctrl: true,
    description: 'Open search',
  },
  HELP: {
    key: '/',
    ctrl: true,
    description: 'Show help',
  },
  CLOSE: {
    key: 'Escape',
    description: 'Close modal/dialog',
  },
  SAVE: {
    key: 's',
    ctrl: true,
    description: 'Save',
  },
  NEW: {
    key: 'n',
    ctrl: true,
    description: 'New item',
  },
  REFRESH: {
    key: 'r',
    ctrl: true,
    description: 'Refresh',
  },
} as const

/**
 * Format shortcut for display
 * @example formatShortcut({ key: 'k', ctrl: true }) => "Ctrl+K"
 */
export function formatShortcut(shortcut: Partial<KeyboardShortcut>): string {
  const parts: string[] = []
  
  if (shortcut.ctrl) parts.push('Ctrl')
  if (shortcut.shift) parts.push('Shift')
  if (shortcut.alt) parts.push('Alt')
  if (shortcut.meta) parts.push('⌘')
  if (shortcut.key) parts.push(shortcut.key.toUpperCase())
  
  return parts.join('+')
}


// Made with Bob
