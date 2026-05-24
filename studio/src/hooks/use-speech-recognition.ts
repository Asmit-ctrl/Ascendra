/**
 * Speech Recognition Hook (FREE)
 * Uses browser's built-in Web Speech API
 */

import { useState, useEffect, useCallback } from 'react';

interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

/**
 * Hook for speech recognition
 */
export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const {
    lang = 'en-US', // Default to English, can use 'sw-KE' for Swahili (Kenya)
    continuous = false,
    interimResults = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

  // Check if speech recognition is supported
  const isSupported = typeof window !== 'undefined' && 
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    // Create recognition instance
    const SpeechRecognition = (window as any).webkitSpeechRecognition || 
                              (window as any).SpeechRecognition;
    const recognitionInstance = new SpeechRecognition();

    recognitionInstance.continuous = continuous;
    recognitionInstance.interimResults = interimResults;
    recognitionInstance.lang = lang;
    recognitionInstance.maxAlternatives = 1;

    // Handle results
    recognitionInstance.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += transcriptPart + ' ';
        } else {
          interim += transcriptPart;
        }
      }

      setInterimTranscript(interim);
      
      if (final) {
        setFinalTranscript(prev => prev + final);
        setTranscript(prev => prev + final);
      }
    };

    // Handle errors
    recognitionInstance.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found. Please check your device.',
        'not-allowed': 'Microphone permission denied. Please allow access.',
        'network': 'Network error. Please check your connection.',
        'aborted': 'Speech recognition aborted.',
      };

      setError(errorMessages[event.error] || `Error: ${event.error}`);
      setIsListening(false);
    };

    // Handle end
    recognitionInstance.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    // Handle start
    recognitionInstance.onstart = () => {
      setError(null);
      console.log('🎤 Speech recognition started');
    };

    setRecognition(recognitionInstance);

    return () => {
      if (recognitionInstance) {
        recognitionInstance.stop();
      }
    };
  }, [lang, continuous, interimResults, isSupported]);

  const startListening = useCallback(() => {
    if (!recognition) {
      setError('Speech recognition not initialized');
      return;
    }

    try {
      recognition.start();
      setIsListening(true);
      setError(null);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Failed to start speech recognition');
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;

    try {
      recognition.stop();
      setIsListening(false);
    } catch (err) {
      console.error('Failed to stop recognition:', err);
    }
  }, [recognition]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    finalTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}

/**
 * Supported languages for speech recognition
 */
export const SUPPORTED_LANGUAGES = {
  'en-US': 'English (United States)',
  'en-GB': 'English (United Kingdom)',
  'sw-KE': 'Swahili (Kenya)',
  'sw-TZ': 'Swahili (Tanzania)',
  'fr-FR': 'French (France)',
  'es-ES': 'Spanish (Spain)',
  'ar-SA': 'Arabic (Saudi Arabia)',
} as const;

// Made with Bob
