/**
 * Voice Call Interface Component
 * Beautiful, intuitive UI for voice conversations with Mwalmu AI
 */

'use client';

import React, { useState } from 'react';
import { useVoiceCall } from '@/hooks/use-voice-call';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Volume2, 
  Activity,
  Zap,
  MessageCircle,
  TrendingUp
} from 'lucide-react';

interface VoiceCallInterfaceProps {
  userId: string;
  conversationId?: string;
  onClose?: () => void;
}

export function VoiceCallInterface({ userId, conversationId, onClose }: VoiceCallInterfaceProps) {
  const [showStats, setShowStats] = useState(false);

  const {
    state,
    isInitialized,
    error,
    startCall,
    endCall,
    currentTranscript,
    conversationHistory,
    audioLevel,
    latency,
  } = useVoiceCall({
    userId,
    conversationId,
    enableInterruption: true,
    ttsRate: 1.15,
  });

  const handleStartCall = async () => {
    await startCall();
  };

  const handleEndCall = async () => {
    await endCall();
    onClose?.();
  };

  if (!isInitialized) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center p-12">
          <div className="text-center space-y-4">
            <Activity className="w-12 h-12 animate-pulse mx-auto text-primary" />
            <p className="text-muted-foreground">Initializing voice call system...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const isMicrophoneError = error.toLowerCase().includes('microphone') ||
                              error.toLowerCase().includes('permission') ||
                              error.toLowerCase().includes('notallowederror') ||
                              error.toLowerCase().includes('denied');
    
    return (
      <Card className="w-full max-w-2xl mx-auto border-destructive">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              {isMicrophoneError ? (
                <MicOff className="w-8 h-8 text-destructive" />
              ) : (
                <PhoneOff className="w-8 h-8 text-destructive" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {isMicrophoneError ? 'Microphone Access Blocked' : 'Voice Call Error'}
              </h3>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
              {isMicrophoneError && (
                <div className="mt-4 p-4 bg-muted rounded-lg text-left space-y-2">
                  <p className="text-sm font-medium">To enable microphone access:</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Find "Microphone" in the permissions list</li>
                    <li>Change the setting to "Allow"</li>
                    <li>Refresh the page and try again</li>
                  </ol>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
              {isMicrophoneError && (
                <Button onClick={() => window.location.reload()} variant="default">
                  Refresh Page
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${state.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <CardTitle>Voice Call with Mwalmu AI</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              <TrendingUp className="w-4 h-4" />
            </Button>
            {state.isActive && (
              <Badge variant="secondary" className="gap-1">
                <Activity className="w-3 h-3" />
                Live
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Current Topic */}
        {state.currentTopic && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span>Topic: <span className="font-medium text-foreground">{state.currentTopic}</span></span>
          </div>
        )}

        {/* Audio Visualization */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {state.isListening ? (
                <>
                  <Mic className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Listening...</span>
                </>
              ) : state.isSpeaking ? (
                <>
                  <Volume2 className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Speaking...</span>
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4 text-gray-400" />
                  <span className="text-muted-foreground">Ready</span>
                </>
              )}
            </div>
            {showStats && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3 h-3" />
                <span>{latency.current}ms</span>
              </div>
            )}
          </div>

          {/* Audio Level Indicator */}
          <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        </div>

        {/* Current Transcript */}
        {currentTranscript && (
          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">You're saying:</p>
            <p className="text-foreground">{currentTranscript}</p>
          </div>
        )}

        {/* Conversation History */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {conversationHistory.slice(-5).map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-primary/10 ml-8'
                  : 'bg-secondary mr-8'
              }`}
            >
              <p className="text-xs font-medium mb-1 text-muted-foreground">
                {message.role === 'user' ? 'You' : 'Mwalmu AI'}
              </p>
              <p className="text-sm">{message.content}</p>
            </div>
          ))}
        </div>

        {/* Stats Panel */}
        {showStats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{state.stats.messageCount}</p>
              <p className="text-xs text-muted-foreground">Messages</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{Math.round(latency.average)}ms</p>
              <p className="text-xs text-muted-foreground">Avg Latency</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{state.stats.interruptionCount}</p>
              <p className="text-xs text-muted-foreground">Interruptions</p>
            </div>
          </div>
        )}

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-4 pt-4">
          {!state.isActive ? (
            <Button
              onClick={handleStartCall}
              size="lg"
              className="gap-2 px-8"
            >
              <Phone className="w-5 h-5" />
              Start Call
            </Button>
          ) : (
            <Button
              onClick={handleEndCall}
              size="lg"
              variant="destructive"
              className="gap-2 px-8"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </Button>
          )}
        </div>

        {/* Tips */}
        {!state.isActive && (
          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>💡 <strong>Tip:</strong> You can interrupt me anytime by speaking</p>
            <p>🔄 Switch topics naturally - I'll follow along</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Voice Call Button
 * Floating button for quick access to voice call
 */
export function VoiceCallButton({ userId }: { userId: string }) {
  const [showInterface, setShowInterface] = useState(false);

  if (showInterface) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <VoiceCallInterface
          userId={userId}
          onClose={() => setShowInterface(false)}
        />
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowInterface(true)}
      size="lg"
      className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-40"
    >
      <Phone className="w-6 h-6" />
    </Button>
  );
}

// Made with Bob
