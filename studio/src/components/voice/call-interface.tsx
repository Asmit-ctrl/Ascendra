'use client';

/**
 * CallInterface — full-screen voice-call modal modeled on Character.AI.
 *
 * The host component owns the actual /api/chat plumbing; CallInterface just
 * orchestrates the turn loop:
 *
 *   listening → user pauses → onUserTurn(text) → speak the reply → listen again
 *
 * Half-duplex by design — the mic is stopped while TTS plays so the
 * assistant doesn't transcribe itself into a feedback loop.
 *
 * Browser support follows useWebSpeech: Chrome/Edge/Safari iOS 14.5+.
 * Firefox lacks SpeechRecognition; the host should hide the button that
 * opens this dialog when `sttSupported` is false.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWebSpeech, type SpeechLanguage } from '@/hooks/use-web-speech';
import { AudioVisualizer } from './audio-visualizer';
import { cn } from '@/lib/utils';

interface CallInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display only — drives the title row and avatar initial. */
  persona: {
    name: string;
    subtitle?: string;
    /** Single character / emoji to show inside the visualizer core. */
    initial?: string;
  };
  language?: SpeechLanguage;
  /**
   * Called once per finalized user utterance. The host should run the
   * existing /api/chat streaming flow, accumulate the full response, and
   * resolve with the plain text to speak. Returning an empty string is
   * treated as "nothing to say" and the loop just resumes listening.
   *
   * Throw to surface a transient error in the call UI without ending the
   * call.
   */
  onUserTurn: (userText: string) => Promise<string>;
}

type CallStatus = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'error';

export function CallInterface({
  open,
  onOpenChange,
  persona,
  language = 'mixed',
  onUserTurn,
}: CallInterfaceProps) {
  // The hook is reset every time the dialog is re-opened by virtue of the
  // outer Dialog mounting/unmounting children, but we also drive call-mode
  // explicitly via startListening() / endCall().
  const [muted, setMuted] = useState(false);
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [callError, setCallError] = useState<string | null>(null);
  // Latest spoken-text fragment shown in the live caption ribbon.
  const [lastUserUtterance, setLastUserUtterance] = useState('');

  // Ref to the most recent in-flight turn promise, so we can ignore stale
  // resolutions if the user ended the call mid-turn.
  const turnTokenRef = useRef(0);

  // Handle finalized user utterance — fired by the hook through onUtterance.
  // We use a ref-stable identity here because the hook captures onUtterance
  // once via useRef internally.
  const handleUtterance = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setLastUserUtterance(trimmed);
      setStatus('thinking');
      const token = ++turnTokenRef.current;

      let reply = '';
      try {
        reply = await onUserTurn(trimmed);
      } catch (err) {
        // Don't kill the call on a single failed turn — surface a short
        // error and reopen the mic so the user can try again.
        if (token !== turnTokenRef.current) return;
        const detail = err instanceof Error ? err.message : 'Something went wrong.';
        setCallError(detail);
        setStatus('listening');
        return;
      }

      if (token !== turnTokenRef.current) return; // call ended mid-flight
      setCallError(null);

      if (reply.trim()) {
        setStatus('speaking');
        speak(reply);
      } else {
        // Nothing to say — go straight back to listening.
        setStatus('listening');
      }
    },
    // `speak` and `onUserTurn` are stable per render; we include onUserTurn
    // so the closure picks up the latest host callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onUserTurn],
  );

  const speech = useWebSpeech({
    language,
    mode: 'call',
    onUtterance: handleUtterance,
  });

  const { startListening, endCall, stopListening, speak, speaking, listening, interimTranscript, sttError } = speech;

  // ── Call lifecycle ────────────────────────────────────────────────────
  // Open → start listening. Closed → tear down.
  useEffect(() => {
    if (!open) {
      endCall();
      setStatus('connecting');
      setCallError(null);
      setLastUserUtterance('');
      setMuted(false);
      turnTokenRef.current++; // invalidate any in-flight turn
      return;
    }

    if (!speech.sttSupported) {
      setStatus('error');
      setCallError('Voice calls require Chrome, Edge, or Safari.');
      return;
    }

    setStatus('listening');
    startListening();
    // We intentionally do NOT include startListening/endCall in deps —
    // running this on every render of those would re-trigger the mic loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // When TTS finishes, hand the mic back to the user (unless muted or
  // already torn down).
  useEffect(() => {
    if (!open) return;
    if (status !== 'speaking') return;
    if (speaking) return; // still talking
    // Speaking just stopped.
    if (muted) {
      setStatus('muted');
    } else {
      setStatus('listening');
      startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speaking, status, muted, open]);

  // Surface STT-level errors (e.g. permission denied) into the call UI.
  useEffect(() => {
    if (sttError) {
      setCallError(sttError);
      // Permission-denied tears down callActive inside the hook, so the
      // dialog stops trying to reconnect.
      if (/blocked|not-allowed/i.test(sttError)) {
        setStatus('error');
      }
    }
  }, [sttError]);

  // ── User actions ──────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      if (next) {
        stopListening();
        setStatus((s) => (s === 'speaking' ? s : 'muted'));
      } else if (!speaking) {
        startListening();
        setStatus('listening');
      }
      return next;
    });
  }, [speaking, startListening, stopListening]);

  const hangUp = useCallback(() => {
    endCall();
    onOpenChange(false);
  }, [endCall, onOpenChange]);

  // ── Render ────────────────────────────────────────────────────────────
  const statusLabel: Record<CallStatus, string> = {
    connecting: 'Connecting…',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
    muted: 'Muted',
    error: 'Call ended',
  };

  const initial =
    persona.initial ?? persona.name.trim().charAt(0).toUpperCase() ?? '·';

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : hangUp())}>
      <DialogContent
        // Full-screen on mobile, generous card on desktop. Override the
        // default `max-w-lg` and centred grid layout from ui/dialog.tsx.
        className="flex h-screen w-screen max-w-none flex-col items-center justify-between gap-0 rounded-none border-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-0 text-slate-100 sm:h-[88vh] sm:w-[min(640px,92vw)] sm:rounded-2xl"
      >
        {/* Hidden but required for Radix a11y — DialogTitle is needed for
            screen readers; the visible header below is purely cosmetic. */}
        <DialogTitle className="sr-only">
          Voice call with {persona.name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {persona.subtitle ?? 'Live voice conversation.'}
        </DialogDescription>

        {/* Header */}
        <div className="flex w-full flex-col items-center gap-1 px-6 pt-12 sm:pt-10">
          <p className="text-xs uppercase tracking-widest text-slate-400">
            On call
          </p>
          <h2 className="text-2xl font-semibold">{persona.name}</h2>
          {persona.subtitle && (
            <p className="text-sm text-slate-400">{persona.subtitle}</p>
          )}
        </div>

        {/* Visualizer + status */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <AudioVisualizer speaking={speaking} listening={listening && !muted}>
            <span className="text-4xl font-semibold">{initial}</span>
          </AudioVisualizer>

          <p
            className={cn(
              'text-base font-medium',
              status === 'error' ? 'text-red-400' : 'text-slate-300',
            )}
          >
            {statusLabel[status]}
          </p>

          {/* Live caption ribbon */}
          <div className="min-h-[3rem] w-full max-w-md px-6 text-center">
            {status === 'listening' && interimTranscript && (
              <p className="text-sm italic text-slate-400">
                "{interimTranscript}"
              </p>
            )}
            {status === 'thinking' && lastUserUtterance && (
              <p className="text-sm text-slate-400">
                You said: <span className="text-slate-200">"{lastUserUtterance}"</span>
              </p>
            )}
            {callError && (
              <p className="mt-2 text-sm text-red-400">{callError}</p>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex w-full items-center justify-center gap-6 px-6 pb-12 sm:pb-10">
          <button
            type="button"
            onClick={toggleMute}
            disabled={status === 'error'}
            aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full border transition',
              muted
                ? 'border-slate-600 bg-slate-700 text-slate-100'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700',
              status === 'error' && 'opacity-40',
            )}
          >
            {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>

          <Button
            type="button"
            onClick={hangUp}
            aria-label="End call"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 p-0 text-white shadow-lg hover:bg-red-500"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
