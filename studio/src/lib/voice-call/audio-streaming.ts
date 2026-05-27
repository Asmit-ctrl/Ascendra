/**
 * Low-Latency Audio Streaming System (FREE)
 * WebRTC-based real-time audio streaming with minimal latency
 * 
 * Architecture:
 * - Uses Web Audio API for low-latency audio processing
 * - Implements chunked streaming for immediate playback
 * - Voice Activity Detection (VAD) for intelligent interruption
 * - Zero-cost implementation using browser APIs
 */

export interface AudioStreamConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
  isFinal: boolean;
}

export interface VADResult {
  isSpeaking: boolean;
  confidence: number;
  energy: number;
}

/**
 * Low-latency audio streaming manager
 */
export class AudioStreamManager {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  
  private isInitialized = false;
  private isRecording = false;
  private vadThreshold = 0.01; // Voice activity detection threshold
  private silenceTimeout = 1000; // ms of silence before considering speech ended
  private lastSpeechTime = 0;
  
  private onAudioChunk?: (chunk: AudioChunk) => void;
  private onVADChange?: (result: VADResult) => void;
  private onSilenceDetected?: () => void;

  constructor(private config: AudioStreamConfig = {}) {
    this.config = {
      sampleRate: 16000, // Optimal for speech recognition
      channelCount: 1, // Mono for efficiency
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config,
    };
  }

  /**
   * Initialize audio context and get microphone access
   */
  async initialize(): Promise<void> {
    // Prevent double initialization
    if (this.isInitialized) {
      console.log('Audio stream already initialized');
      return;
    }

    if (typeof window === 'undefined') {
      throw new Error('Audio streaming only works in browser environment');
    }

    // Create audio context with optimal settings
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: this.config.sampleRate,
      latencyHint: 'interactive', // Minimize latency
    });

    // Get microphone access with constraints
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl,
        },
      });
    } catch (error: any) {
      // Provide user-friendly error messages for microphone access issues
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Microphone access blocked — enable it in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No microphone found — please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Microphone is already in use by another application.');
      } else if (error.name === 'OverconstrainedError') {
        throw new Error('Microphone does not support the required audio settings.');
      } else if (error.name === 'SecurityError') {
        throw new Error('Microphone access denied due to security restrictions.');
      } else {
        throw new Error(`Failed to access microphone: ${error.message || 'Unknown error'}`);
      }
    }

    try {

      // Create audio processing chain
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;

      // Create processor for real-time audio chunks
      const bufferSize = 4096; // Balance between latency and processing
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        const chunk: AudioChunk = {
          data: new Float32Array(inputData),
          timestamp: Date.now(),
          isFinal: false,
        };

        // Perform VAD
        const vadResult = this.detectVoiceActivity(inputData);
        
        if (vadResult.isSpeaking) {
          this.lastSpeechTime = Date.now();
          if (this.onAudioChunk) {
            this.onAudioChunk(chunk);
          }
        } else if (Date.now() - this.lastSpeechTime > this.silenceTimeout) {
          // Silence detected
          if (this.onSilenceDetected) {
            this.onSilenceDetected();
          }
        }

        if (this.onVADChange) {
          this.onVADChange(vadResult);
        }
      };

      // Connect audio nodes
      this.source.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('🎤 Audio streaming initialized');
    } catch (error) {
      console.error('Failed to initialize audio streaming:', error);
      this.isInitialized = false;
      throw new Error('Microphone access denied or not available');
    }
  }

  /**
   * Voice Activity Detection using energy-based algorithm
   */
  private detectVoiceActivity(audioData: Float32Array): VADResult {
    // Calculate RMS energy
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sum / audioData.length);
    
    // Calculate zero-crossing rate for additional confidence
    let zeroCrossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0 && audioData[i - 1] < 0) || 
          (audioData[i] < 0 && audioData[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    const zcr = zeroCrossings / audioData.length;

    // Voice activity decision
    const isSpeaking = rms > this.vadThreshold && zcr > 0.01;
    const confidence = Math.min(rms / this.vadThreshold, 1.0);

    return {
      isSpeaking,
      confidence,
      energy: rms,
    };
  }

  /**
   * Start recording audio stream
   */
  startRecording(callbacks: {
    onAudioChunk?: (chunk: AudioChunk) => void;
    onVADChange?: (result: VADResult) => void;
    onSilenceDetected?: () => void;
  }): void {
    if (!this.audioContext || !this.processor) {
      throw new Error('Audio streaming not initialized. Call initialize() first.');
    }

    this.onAudioChunk = callbacks.onAudioChunk;
    this.onVADChange = callbacks.onVADChange;
    this.onSilenceDetected = callbacks.onSilenceDetected;
    
    this.isRecording = true;
    this.lastSpeechTime = Date.now();
    
    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    console.log('🎙️ Recording started');
  }

  /**
   * Stop recording audio stream
   */
  stopRecording(): void {
    this.isRecording = false;
    console.log('⏹️ Recording stopped');
  }

  /**
   * Get current audio level (for visualization)
   */
  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length / 255; // Normalize to 0-1
  }

  /**
   * Get frequency data for visualization
   */
  getFrequencyData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(0);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  /**
   * Adjust microphone gain
   */
  setGain(value: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, value));
    }
  }

  /**
   * Set VAD threshold
   */
  setVADThreshold(threshold: number): void {
    this.vadThreshold = Math.max(0.001, Math.min(0.1, threshold));
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopRecording();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🧹 Audio streaming disposed');
  }
}

/**
 * Audio playback manager for streaming TTS responses
 */
export class AudioPlaybackManager {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private startTime = 0;
  private pauseTime = 0;

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
    });

    console.log('🔊 Audio playback initialized');
  }

  /**
   * Add audio chunk to playback queue
   */
  async enqueueAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio playback not initialized');
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      this.audioQueue.push(audioBuffer);

      // Start playing if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('Failed to decode audio:', error);
    }
  }

  /**
   * Play next audio chunk in queue
   */
  private playNext(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = audioBuffer;
    this.currentSource.connect(this.audioContext.destination);

    this.currentSource.onended = () => {
      this.playNext();
    };

    this.startTime = this.audioContext.currentTime;
    this.currentSource.start(0);
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
  }

  /**
   * Interrupt current playback (for user interruptions)
   */
  interrupt(): void {
    this.stop();
    console.log('⚡ Playback interrupted');
  }

  /**
   * Get playback state
   */
  getState(): { isPlaying: boolean; queueLength: number } {
    return {
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🧹 Audio playback disposed');
  }
}

// Made with Bob
