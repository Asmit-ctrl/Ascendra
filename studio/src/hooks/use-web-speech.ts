'use client';

/**
 * useWebSpeech — thin React wrapper over the browser's Web Speech API.
 *
 *   - Text-to-speech via window.speechSynthesis (broad support).
 *   - Speech-to-text via window.SpeechRecognition / webkitSpeechRecognition
 *     (Chrome/Edge/Safari iOS 14.5+; Firefox does NOT ship it).
 *
 * The hook is fully SSR-safe: every browser-only access is gated by a
 * `typeof window` check, and feature flags (`ttsSupported`, `sttSupported`)
 * tell the consumer when to hide the UI entirely instead of showing dead
 * controls.
 *
 * Locale selection follows the SocraticChat `language` prop:
 *   - english  -> en-KE   (Kenyan English where available; falls back to en-US)
 *   - kiswahili-> sw-KE
 *   - mixed    -> en-KE   (works for both English prose and Swahili words)
 *
 * Honest scope:
 *   - STT is best-effort. Network outages or browser quirks abort silently
 *     and we surface that via `sttError`. We do NOT retry automatically —
 *     surprise listening sessions are creepy.
 *   - TTS voices vary by OS. We pick a voice matching the locale if one
 *     exists; otherwise the browser's default speaks the text anyway.
 *   - There is no streaming TTS — we speak the *final* assistant message
 *     once it has finished streaming. Speaking token-by-token sounds bad.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechLanguage = 'english' | 'kiswahili' | 'mixed';

/**
 * Two distinct STT shapes:
 *   - 'push-to-talk' — single utterance, hard timeout. The original behaviour:
 *     student taps mic, says one phrase, transcript is appended to the
 *     textarea, recognition shuts off.
 *   - 'call'         — continuous turn-taking for the voice call UI. No
 *     timeout. Auto-restarts on `onend` while a call is active because
 *     Chrome stops SpeechRecognition every ~60 s regardless of the
 *     `continuous` flag — the documented workaround is to start it again
 *     from inside `onend`.
 */
export type SpeechMode = 'push-to-talk' | 'call';

interface UseWebSpeechOptions {
  language?: SpeechLanguage;
  /** Auto-stop the mic if it's been listening for this many ms.
   *  Ignored entirely when `mode === 'call'`. */
  listenTimeoutMs?: number;
  /** Default 'push-to-talk' to preserve existing socratic-chat behaviour. */
  mode?: SpeechMode;
  /** Called once per finalized utterance. Used by the call UI to dispatch
   *  a turn the moment the speaker pauses, without polling finalTranscript. */
  onUtterance?: (text: string) => void;
}

interface UseWebSpeechReturn {
  // capabilities
  ttsSupported: boolean;
  sttSupported: boolean;

  // TTS
  speak: (text: string) => void;
  cancelSpeak: () => void;
  speaking: boolean;

  // STT
  listening: boolean;
  startListening: () => void;
  stopListening: () => void;
  /** Latest interim transcript while the mic is open. */
  interimTranscript: string;
  /** Pulled out + cleared by the caller after acting on it. */
  finalTranscript: string;
  clearFinalTranscript: () => void;
  sttError: string | null;

  // Call mode only — no-op outside of it. Stops the mic, cancels any
  // in-flight TTS, and prevents the onend auto-restart from firing again.
  endCall: () => void;
}

function localeFor(language: SpeechLanguage): string {
  if (language === 'kiswahili') return 'sw-KE';
  return 'en-KE';
}

function stripChoiceTokens(text: string): string {
  // The chat panel already strips these for display; this is defence in depth
  // so the synth doesn't read "open bracket CHOICE colon ..." aloud if
  // something slips through.
  return text.replace(/\[CHOICE:\s*[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

export function useWebSpeech(opts: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const language = opts.language ?? 'mixed';
  const listenTimeoutMs = opts.listenTimeoutMs ?? 12_000;
  const mode: SpeechMode = opts.mode ?? 'push-to-talk';

  const [ttsSupported, setTtsSupported] = useState(false);
  const [sttSupported, setSttSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [sttError, setSttError] = useState<string | null>(null);

  // Cached voice list (populated async on most browsers).
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Live recognition instance — typed as `any` because the DOM lib doesn't
  // ship SpeechRecognition types in every TS target.
  const recognitionRef = useRef<any>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Call-mode state: when true, an `onend` event triggers a restart instead
  // of leaving the mic off. Cleared by `endCall()`, by errors that aren't
  // routine, and on unmount.
  const callActiveRef = useRef(false);
  // Latest onUtterance callback in a ref so the recognition handlers (which
  // close over it once via useCallback) always see the current function.
  const onUtteranceRef = useRef<((text: string) => void) | undefined>(opts.onUtterance);
  useEffect(() => {
    onUtteranceRef.current = opts.onUtterance;
  }, [opts.onUtterance]);
  // Restart-debounce timer so an error+onend pair doesn't tight-loop.
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Capability detection + voice list (run once, client-only) ---------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setTtsSupported(typeof window.speechSynthesis !== 'undefined');

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setSttSupported(typeof SpeechRecognition === 'function');

    if (typeof window.speechSynthesis !== 'undefined') {
      // Voices are sometimes populated asynchronously.
      const refresh = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      refresh();
      window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
      return () => {
        window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
      };
    }
  }, []);

  // ---- TTS ----------------------------------------------------------------
  const speak = useCallback(
    (rawText: string) => {
      if (typeof window === 'undefined') return;
      if (!('speechSynthesis' in window)) return;
      const text = stripChoiceTokens(rawText);
      if (!text) return;

      // Cancel anything in flight so two speak() calls don't queue up.
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const targetLocale = localeFor(language);
      utterance.lang = targetLocale;

      // Pick the closest matching voice if available.
      const voice =
        voicesRef.current.find((v) => v.lang === targetLocale) ||
        voicesRef.current.find((v) => v.lang.startsWith(targetLocale.split('-')[0]));
      if (voice) utterance.voice = voice;

      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  const cancelSpeak = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Cancel any in-flight utterance on unmount — otherwise speech keeps going
  // after the page changes.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ---- STT ----------------------------------------------------------------
  const stopListening = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    if (listenTimeoutRef.current) {
      clearTimeout(listenTimeoutRef.current);
      listenTimeoutRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (typeof SpeechRecognition !== 'function') {
      setSttError('Voice input is not supported in this browser.');
      return;
    }

    setSttError(null);
    setInterimTranscript('');

    const isCall = mode === 'call';
    if (isCall) callActiveRef.current = true;

    const rec = new SpeechRecognition();
    rec.lang = localeFor(language);
    // Call mode wants the mic to stay open across pauses; push-to-talk wants
    // it to commit one utterance and shut off.
    rec.continuous = isCall;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);

    rec.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimTranscript(interim);
      if (finalChunk) {
        const cleaned = finalChunk.trim();
        setFinalTranscript((prev) => (prev ? `${prev} ${cleaned}`.trim() : cleaned));
        setInterimTranscript('');
        // Call UI consumes per-utterance instead of polling.
        if (isCall && cleaned) {
          onUtteranceRef.current?.(cleaned);
        }
      }
    };

    rec.onerror = (event: any) => {
      // "no-speech" and "aborted" are routine — don't yell about them, and
      // in call mode we still want to auto-restart through onend.
      const code = event?.error;
      const routine = !code || code === 'no-speech' || code === 'aborted';
      if (!routine) {
        // Hard errors (network, not-allowed, service-not-allowed) should
        // tear down the call so we don't restart into a permanent failure.
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setSttError(
            'Microphone access blocked — enable it in your browser settings and try again.'
          );
          callActiveRef.current = false;
        } else {
          setSttError(`Voice input error: ${code}`);
        }
      }
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      if (listenTimeoutRef.current) {
        clearTimeout(listenTimeoutRef.current);
        listenTimeoutRef.current = null;
      }
      // Chrome stops recognition every ~60s even with continuous=true. If
      // the call is still active and we weren't torn down by an error,
      // start a fresh instance. 250 ms debounce prevents an error+onend
      // pair from spinning.
      if (callActiveRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (callActiveRef.current) startListening();
        }, 250);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      // Push-to-talk caps mic time so it can't be left open by accident.
      // Call mode is bounded by the user clicking End Call instead.
      if (!isCall) {
        listenTimeoutRef.current = setTimeout(() => {
          stopListening();
        }, listenTimeoutMs);
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'failed to start';
      // `rec.start()` throws if called while already started — common after
      // the onend auto-restart races a manual stop. Swallow that specific
      // case in call mode.
      if (mode === 'call' && /already started/i.test(detail)) {
        return;
      }
      setSttError(`Could not start listening: ${detail}`);
      setListening(false);
    }
  }, [language, listenTimeoutMs, mode, stopListening]);

  // End-call entry point. Idempotent — safe to call multiple times.
  const endCall = useCallback(() => {
    callActiveRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, [stopListening]);

  const clearFinalTranscript = useCallback(() => {
    setFinalTranscript('');
  }, []);

  // Stop the mic if the component unmounts mid-listen, and make sure the
  // call-mode auto-restart cannot fire after we've gone.
  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      stopListening();
    };
  }, [stopListening]);

  return {
    ttsSupported,
    sttSupported,
    speak,
    cancelSpeak,
    speaking,
    listening,
    startListening,
    stopListening,
    interimTranscript,
    finalTranscript,
    clearFinalTranscript,
    sttError,
    endCall,
  };
}
