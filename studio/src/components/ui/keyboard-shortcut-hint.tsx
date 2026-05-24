import { formatShortcut, type KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'

/**
 * Component to display keyboard shortcut hint
 */
export function KeyboardShortcutHint({ shortcut }: { shortcut: Partial<KeyboardShortcut> }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
      {formatShortcut(shortcut)}
    </kbd>
  )
}

// Made with Bob
