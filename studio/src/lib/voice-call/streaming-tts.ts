/**
 * Streaming Text-to-Speech System (FREE)
 * Low-latency TTS using Web Speech API with chunked streaming
 * 
 * Features:
 * - Sentence-by-sentence streaming for minimal latency
 * - Intelligent interruption handling
 * - Multiple voice options
 * - Rate and pitch control
 * - Zero-cost browser-based implementation
 */

export interface TTSConfig {
  voice?: SpeechSynthesisVoice | null;
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  lang?: string;
}

export interface TTSChunk {
  text: string;
  index: number;
  isFinal: boolean;
}

export interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  currentChunk: number;
  totalChunks: number;
  currentText: string;
}

/**
 * Streaming TTS Manager for low-latency voice responses
 */
export class StreamingTTSManager {
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private config: Required<TTSConfig>;
  private queue: TTSChunk[] = [];
  private isProcessing = false;
  private state: TTSState = {
    isSpeaking: false,
    isPaused: false,
    currentChunk: 0,
    totalChunks: 0,
    currentText: '',
  };

  private onStart?: () => void;
  private onEnd?: () => void;
  private onChunkComplete?: (chunk: TTSChunk) => void;
  private onError?: (error: Error) => void;
  private onInterrupted?: () => void;

  constructor(config: TTSConfig = {}) {
    if (typeof window === 'undefined') {
      throw new Error('TTS only works in browser environment');
    }

    this.synthesis = window.speechSynthesis;
    
    this.config = {
      voice: config.voice ?? this.getDefaultVoice() ?? null,
      rate: config.rate ?? 1.1, // Slightly faster for natural conversation
      pitch: config.pitch ?? 1.0,
      volume: config.volume ?? 1.0,
      lang: config.lang || 'en-US',
    };

    console.log('🔊 Streaming TTS initialized');
  }

  /**
   * Get default voice (prefer natural-sounding voices)
   */
  private getDefaultVoice(): SpeechSynthesisVoice | null {
    if (!this.synthesis) return null;

    const voices = this.synthesis.getVoices();
    
    // Prefer Google voices (usually higher quality)
    const googleVoice = voices.find(v =>
      v.name.includes('Google') && v.lang.startsWith('en')
    );
    if (googleVoice) return googleVoice;

    // Fallback to any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * Set voice
   */
  setVoice(voice: SpeechSynthesisVoice): void {
    this.config.voice = voice;
  }

  /**
   * Set speaking rate (0.1 to 10)
   */
  setRate(rate: number): void {
    this.config.rate = Math.max(0.1, Math.min(10, rate));
  }

  /**
   * Set pitch (0 to 2)
   */
  setPitch(pitch: number): void {
    this.config.pitch = Math.max(0, Math.min(2, pitch));
  }

  /**
   * Split text into speakable chunks (sentences)
   */
  private splitIntoChunks(text: string): string[] {
    // Split by sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Further split long sentences at commas or semicolons
    const chunks: string[] = [];
    for (const sentence of sentences) {
      if (sentence.length > 150) {
        const subChunks = sentence.split(/[,;]+/).filter(s => s.trim());
        chunks.push(...subChunks);
      } else {
        chunks.push(sentence);
      }
    }

    return chunks.map(c => c.trim()).filter(c => c.length > 0);
  }

  /**
   * Stream text with minimal latency
   */
  async streamText(
    text: string,
    callbacks?: {
      onStart?: () => void;
      onEnd?: () => void;
      onChunkComplete?: (chunk: TTSChunk) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not available');
    }

    // Set callbacks
    this.onStart = callbacks?.onStart;
    this.onEnd = callbacks?.onEnd;
    this.onChunkComplete = callbacks?.onChunkComplete;
    this.onError = callbacks?.onError;

    // Split text into chunks
    const chunks = this.splitIntoChunks(text);
    
    // Create chunk objects
    this.queue = chunks.map((text, index) => ({
      text,
      index,
      isFinal: index === chunks.length - 1,
    }));

    this.state.totalChunks = chunks.length;
    this.state.currentChunk = 0;

    // Start processing queue
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process TTS queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.state.isSpeaking = false;
      if (this.onEnd) this.onEnd();
      return;
    }

    this.isProcessing = true;
    const chunk = this.queue.shift()!;

    try {
      await this.speakChunk(chunk);
      this.state.currentChunk++;
      
      if (this.onChunkComplete) {
        this.onChunkComplete(chunk);
      }

      // Continue with next chunk
      this.processQueue();
    } catch (error) {
      console.error('TTS error:', error);
      if (this.onError) {
        this.onError(error as Error);
      }
      this.isProcessing = false;
      this.state.isSpeaking = false;
    }
  }

  /**
   * Speak a single chunk
   */
  private speakChunk(chunk: TTSChunk): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not available'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.voice = this.config.voice || null;
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.lang;

      utterance.onstart = () => {
        this.state.isSpeaking = true;
        this.state.currentText = chunk.text;
        if (chunk.index === 0 && this.onStart) {
          this.onStart();
        }
      };

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        reject(new Error(`TTS error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  /**
   * Interrupt current speech (for user interruptions)
   */
  interrupt(): void {
    if (!this.synthesis) return;

    // Cancel current and queued speech
    this.synthesis.cancel();
    this.queue = [];
    this.isProcessing = false;
    this.currentUtterance = null;
    
    this.state.isSpeaking = false;
    this.state.isPaused = false;
    this.state.currentChunk = 0;
    this.state.totalChunks = 0;
    this.state.currentText = '';

    if (this.onInterrupted) {
      this.onInterrupted();
    }

    console.log('⚡ TTS interrupted');
  }

  /**
   * Pause speech
   */
  pause(): void {
    if (!this.synthesis || !this.state.isSpeaking) return;

    this.synthesis.pause();
    this.state.isPaused = true;
  }

  /**
   * Resume speech
   */
  resume(): void {
    if (!this.synthesis || !this.state.isPaused) return;

    this.synthesis.resume();
    this.state.isPaused = false;
  }

  /**
   * Stop speech completely
   */
  stop(): void {
    this.interrupt();
  }

  /**
   * Get current state
   */
  getState(): TTSState {
    return { ...this.state };
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.state.isSpeaking;
  }

  /**
   * Get progress (0 to 1)
   */
  getProgress(): number {
    if (this.state.totalChunks === 0) return 0;
    return this.state.currentChunk / this.state.totalChunks;
  }

  /**
   * Subscribe to interruption events
   */
  onInterrupt(callback: () => void): () => void {
    this.onInterrupted = callback;
    return () => {
      this.onInterrupted = undefined;
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.interrupt();
    this.onStart = undefined;
    this.onEnd = undefined;
    this.onChunkComplete = undefined;
    this.onError = undefined;
    this.onInterrupted = undefined;
  }
}

/**
 * Utility: Estimate speech duration
 */
export function estimateSpeechDuration(text: string, rate: number = 1.0): number {
  // Average speaking rate: ~150 words per minute at rate 1.0
  const words = text.split(/\s+/).length;
  const baseMinutes = words / 150;
  const adjustedMinutes = baseMinutes / rate;
  return adjustedMinutes * 60 * 1000; // Convert to milliseconds
}

/**
 * Utility: Get optimal TTS settings for conversation
 */
export function getConversationalTTSConfig(): TTSConfig {
  return {
    rate: 1.15, // Slightly faster for natural conversation
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US',
  };
}

/**
 * Utility: Get available language voices
 */
export function getVoicesByLanguage(lang: string): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined') return [];
  
  const synthesis = window.speechSynthesis;
  const voices = synthesis.getVoices();
  
  return voices.filter(voice => voice.lang.startsWith(lang));
}

/**
 * Utility: Find best voice for language
 */
export function findBestVoice(lang: string, preferFemale: boolean = false): SpeechSynthesisVoice | null {
  const voices = getVoicesByLanguage(lang);
  
  if (voices.length === 0) return null;

  // Prefer Google voices
  const googleVoices = voices.filter(v => v.name.includes('Google'));
  if (googleVoices.length > 0) {
    if (preferFemale) {
      const femaleVoice = googleVoices.find(v => 
        v.name.includes('Female') || v.name.includes('female')
      );
      if (femaleVoice) return femaleVoice;
    }
    return googleVoices[0];
  }

  // Fallback to any voice
  return voices[0];
}

// Made with Bob
