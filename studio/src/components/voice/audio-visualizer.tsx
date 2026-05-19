'use client';

/**
 * AudioVisualizer — three concentric circles that pulse in response to the
 * call state. Driven by booleans (not Web Audio analyser data) so the call
 * still has visual presence even when the browser hasn't actually started
 * producing analyser frames yet, and so we don't pay the cost of an extra
 * MediaStream just to drive a UI.
 *
 *   speaking  → assistant is talking, rings pulse blue
 *   listening → mic is hot, rings pulse green
 *   idle      → soft static glow
 *
 * Pure CSS animation; no requestAnimationFrame loop, so it's cheap.
 */

import { cn } from '@/lib/utils';

interface AudioVisualizerProps {
  speaking: boolean;
  listening: boolean;
  /** Optional inner content — typically an avatar or initial. */
  children?: React.ReactNode;
  className?: string;
}

export function AudioVisualizer({
  speaking,
  listening,
  children,
  className,
}: AudioVisualizerProps) {
  // Speaking wins over listening visually because in half-duplex turn-taking
  // we mute the mic during TTS — so showing both would be misleading.
  const state: 'speaking' | 'listening' | 'idle' = speaking
    ? 'speaking'
    : listening
      ? 'listening'
      : 'idle';

  // Tailwind colours per state. Kept inline so the file stays self-contained.
  const ringColor =
    state === 'speaking'
      ? 'bg-blue-500/30'
      : state === 'listening'
        ? 'bg-emerald-500/30'
        : 'bg-slate-400/20';

  const coreColor =
    state === 'speaking'
      ? 'bg-blue-500'
      : state === 'listening'
        ? 'bg-emerald-500'
        : 'bg-slate-500';

  return (
    <div
      className={cn(
        'relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72',
        className,
      )}
      aria-hidden
    >
      {/* Outer rings — only animate when not idle, so the page is calm
          between turns. */}
      <span
        className={cn(
          'absolute inset-0 rounded-full',
          ringColor,
          state !== 'idle' && 'animate-ping',
        )}
      />
      <span
        className={cn(
          'absolute inset-6 rounded-full',
          ringColor,
          state !== 'idle' && 'animate-pulse',
        )}
      />
      <span className={cn('absolute inset-12 rounded-full opacity-80', ringColor)} />

      {/* Core circle with the avatar / persona initial inside. */}
      <div
        className={cn(
          'relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl transition-colors sm:h-32 sm:w-32',
          coreColor,
        )}
      >
        {children}
      </div>
    </div>
  );
}
