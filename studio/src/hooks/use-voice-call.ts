/**
 * Voice Call React Hook
 * Provides easy integration of voice call functionality into React components
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceCallOrchestrator, VoiceCallConfig, VoiceCallState, VoiceCallEvent } from '../lib/voice-call/voice-call-orchestrator';

export interface UseVoiceCallOptions extends Omit<VoiceCallConfig, 'userId'> {
  userId: string;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  onUserSpeaking?: (transcript: string) => void;
  onAIResponding?: (response: string) => void;
  onError?: (error: Error) => void;
}

export interface UseVoiceCallReturn {
  // State
  state: VoiceCallState;
  isInitialized: boolean;
  error: string | null;
  
  // Controls
  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  
  // Conversation
  currentTranscript: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  
  // Audio visualization
  audioLevel: number;
  
  // Stats
  latency: {
    current: number;
    average: number;
  };
}

/**
 * Hook for voice call functionality
 */
export function useVoiceCall(options: UseVoiceCallOptions): UseVoiceCallReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [state, setState] = useState<VoiceCallState>({
    isActive: false,
    isListening: false,
    isSpeaking: false,
    currentTopic: '',
    latency: { stt: 0, ai: 0, tts: 0, total: 0 },
    stats: { messageCount: 0, interruptionCount: 0, averageLatency: 0 },
  });
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [audioLevel, setAudioLevel] = useState(0);

  const orchestratorRef = useRef<VoiceCallOrchestrator | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize orchestrator
  useEffect(() => {
    const initOrchestrator = async () => {
      try {
        const orchestrator = new VoiceCallOrchestrator({
          userId: options.userId,
          conversationId: options.conversationId,
          language: options.language,
          autoStart: options.autoStart,
          enableInterruption: options.enableInterruption,
          ttsRate: options.ttsRate,
          vadThreshold: options.vadThreshold,
        });

        // Subscribe to events
        orchestrator.on('call_started', () => {
          options.onCallStarted?.();
        });

        orchestrator.on('call_ended', () => {
          options.onCallEnded?.();
        });

        orchestrator.on('user_speaking', (event: VoiceCallEvent) => {
          if (event.data?.transcript) {
            setCurrentTranscript(event.data.transcript);
            options.onUserSpeaking?.(event.data.transcript);
          }
        });

        orchestrator.on('user_finished', (event: VoiceCallEvent) => {
          if (event.data?.message) {
            setConversationHistory(prev => [
              ...prev,
              { role: 'user', content: event.data.message },
            ]);
            setCurrentTranscript('');
          }
        });

        orchestrator.on('ai_responding', () => {
          // AI is generating response
        });

        orchestrator.on('ai_finished', (event: VoiceCallEvent) => {
          if (event.data?.message) {
            setConversationHistory(prev => [
              ...prev,
              { role: 'assistant', content: event.data.message },
            ]);
            options.onAIResponding?.(event.data.message);
          }
        });

        orchestrator.on('error', (event: VoiceCallEvent) => {
          const errorMsg = event.data?.error?.message || 'An error occurred';
          setError(errorMsg);
          options.onError?.(event.data?.error);
        });

        await orchestrator.initialize();
        orchestratorRef.current = orchestrator;
        setIsInitialized(true);

        // Update state periodically
        const stateInterval = setInterval(() => {
          if (orchestratorRef.current) {
            setState(orchestratorRef.current.getState());
          }
        }, 100);

        return () => {
          clearInterval(stateInterval);
          orchestrator.dispose();
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize voice call';
        setError(errorMsg);
        setIsInitialized(true); // Set to true so error UI can be displayed
        options.onError?.(err as Error);
      }
    };

    initOrchestrator();
  }, [options.userId]);

  // Audio level monitoring
  useEffect(() => {
    if (state.isListening && orchestratorRef.current) {
      audioLevelIntervalRef.current = setInterval(() => {
        // Get audio level from orchestrator's audio stream
        // This would need to be exposed from the orchestrator
        setAudioLevel(Math.random() * 0.5 + 0.5); // Placeholder
      }, 50);
    } else {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      setAudioLevel(0);
    }

    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
    };
  }, [state.isListening]);

  // Start call
  const startCall = useCallback(async () => {
    if (!orchestratorRef.current) {
      setError('Voice call not initialized');
      return;
    }

    try {
      await orchestratorRef.current.startCall();
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start call';
      setError(errorMsg);
      setState(prev => ({ ...prev, isActive: false, isListening: false }));
      options.onError?.(err as Error);
    }
  }, [options]);

  // End call
  const endCall = useCallback(async () => {
    if (!orchestratorRef.current) return;

    try {
      await orchestratorRef.current.endCall();
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end call';
      setError(errorMsg);
      options.onError?.(err as Error);
    }
  }, [options]);

  return {
    state,
    isInitialized,
    error,
    startCall,
    endCall,
    currentTranscript,
    conversationHistory,
    audioLevel,
    latency: {
      current: state.latency.total,
      average: state.stats.averageLatency,
    },
  };
}

// Made with Bob
