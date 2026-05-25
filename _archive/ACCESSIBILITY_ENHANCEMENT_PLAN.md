# Syncsenta Accessibility Enhancement Plan

## Overview

Making Syncsenta accessible to students with disabilities is not just a legal requirement—it's a moral imperative. This plan addresses visual, auditory, motor, and cognitive disabilities following WCAG 2.1 AAA standards.

## 1. Visual Disabilities

### 1.1 Screen Reader Support

**Implementation Priority: HIGH**

```typescript
// components/sandbox/activities/AccessibleActivity.tsx
import { useAnnouncer } from '@/hooks/use-announcer';

export function AccessibleActivity({ activity }: Props) {
  const { announce } = useAnnouncer();
  
  // Announce activity changes
  useEffect(() => {
    announce(`Starting activity: ${activity.title}. ${activity.description}`);
  }, [activity]);
  
  // Announce score updates
  const handleCorrectAnswer = () => {
    announce(`Correct! Your score is now ${score} points.`);
  };
  
  return (
    <div role="main" aria-label={`${activity.title} activity`}>
      {/* Activity content with proper ARIA labels */}
    </div>
  );
}
```

**Key Features**:
- ARIA labels on all interactive elements
- Live regions for dynamic content updates
- Semantic HTML (nav, main, article, section)
- Skip navigation links
- Descriptive alt text for all images

### 1.2 High Contrast Mode

```typescript
// lib/accessibility/contrast-modes.ts
export const contrastModes = {
  standard: {
    background: 'bg-white dark:bg-gray-900',
    text: 'text-gray-900 dark:text-white',
    primary: 'text-blue-600 dark:text-blue-400',
  },
  highContrast: {
    background: 'bg-black',
    text: 'text-white',
    primary: 'text-yellow-400',
    border: 'border-white border-2',
  },
  yellowOnBlack: {
    background: 'bg-black',
    text: 'text-yellow-300',
    primary: 'text-yellow-100',
  },
  whiteOnBlack: {
    background: 'bg-black',
    text: 'text-white',
    primary: 'text-white',
  },
};

// Component usage
<div className={contrastMode === 'high' ? 'bg-black text-white' : 'bg-white text-gray-900'}>
```

### 1.3 Text Scaling & Zoom

```typescript
// components/accessibility/TextScaler.tsx
export function TextScaler() {
  const [scale, setScale] = useState(100);
  
  const applyScale = (newScale: number) => {
    document.documentElement.style.fontSize = `${newScale}%`;
    setScale(newScale);
  };
  
  return (
    <div role="group" aria-label="Text size controls">
      <button onClick={() => applyScale(scale - 10)} aria-label="Decrease text size">
        A-
      </button>
      <span aria-live="polite">{scale}%</span>
      <button onClick={() => applyScale(scale + 10)} aria-label="Increase text size">
        A+
      </button>
    </div>
  );
}
```

### 1.4 Color Blindness Support

```typescript
// lib/accessibility/color-blind-modes.ts
export const colorBlindModes = {
  protanopia: {
    // Red-blind: Use blue/yellow instead of red/green
    correct: 'bg-blue-500',
    incorrect: 'bg-yellow-500',
    primary: 'bg-blue-600',
  },
  deuteranopia: {
    // Green-blind: Use blue/orange
    correct: 'bg-blue-500',
    incorrect: 'bg-orange-500',
    primary: 'bg-blue-600',
  },
  tritanopia: {
    // Blue-blind: Use red/green with high contrast
    correct: 'bg-green-700',
    incorrect: 'bg-red-700',
    primary: 'bg-pink-600',
  },
};

// Add patterns/textures in addition to colors
<div className={`${colorMode.correct} pattern-dots`}>
  ✓ Correct
</div>
```

### 1.5 Braille Display Support

```typescript
// Ensure all text content is accessible to braille displays
// Use semantic HTML and proper ARIA labels
<button aria-label="Submit answer for question 1 of 5">
  Submit
</button>
```

## 2. Auditory Disabilities

### 2.1 Visual Captions for Audio

```typescript
// components/accessibility/CaptionedAudio.tsx
export function CaptionedAudio({ audioSrc, transcript }: Props) {
  const [showCaptions, setShowCaptions] = useState(true);
  
  return (
    <div>
      <audio src={audioSrc} controls />
      {showCaptions && (
        <div 
          className="captions bg-black text-white p-4 rounded"
          role="region"
          aria-label="Audio transcript"
        >
          {transcript}
        </div>
      )}
      <button onClick={() => setShowCaptions(!showCaptions)}>
        {showCaptions ? 'Hide' : 'Show'} Captions
      </button>
    </div>
  );
}
```

### 2.2 Sign Language Videos

```typescript
// For important instructions, provide sign language interpretation
export function SignLanguageVideo({ videoSrc, instructionText }: Props) {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        <p>{instructionText}</p>
      </div>
      <div className="w-64">
        <video 
          src={videoSrc} 
          controls
          aria-label="Sign language interpretation"
        />
      </div>
    </div>
  );
}
```

### 2.3 Visual Alerts

```typescript
// Replace audio alerts with visual ones
export function VisualAlert({ type, message }: Props) {
  return (
    <div 
      role="alert"
      className={`
        animate-pulse border-4 p-4 rounded-lg
        ${type === 'success' ? 'border-green-500 bg-green-50' : ''}
        ${type === 'error' ? 'border-red-500 bg-red-50' : ''}
      `}
    >
      <div className="flex items-center gap-2">
        {type === 'success' && <CheckCircle className="w-8 h-8 text-green-500" />}
        {type === 'error' && <XCircle className="w-8 h-8 text-red-500" />}
        <span className="text-lg font-bold">{message}</span>
      </div>
    </div>
  );
}
```

## 3. Motor Disabilities

### 3.1 Keyboard Navigation

```typescript
// Ensure all interactive elements are keyboard accessible
export function KeyboardAccessibleActivity() {
  const [focusedIndex, setFocusedIndex] = useState(0);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        selectOption(focusedIndex);
        break;
      case 'Escape':
        goBack();
        break;
    }
  };
  
  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      {options.map((option, index) => (
        <button
          key={index}
          className={index === focusedIndex ? 'ring-4 ring-blue-500' : ''}
          tabIndex={index === focusedIndex ? 0 : -1}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
```

### 3.2 Voice Control Support

```typescript
// components/accessibility/VoiceControl.tsx
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

export function VoiceControlledActivity() {
  const { transcript, listening, startListening, stopListening } = useSpeechRecognition();
  
  useEffect(() => {
    // Parse voice commands
    if (transcript.includes('select option')) {
      const optionNumber = parseInt(transcript.match(/\d+/)?.[0] || '0');
      selectOption(optionNumber - 1);
    } else if (transcript.includes('next question')) {
      nextQuestion();
    } else if (transcript.includes('repeat question')) {
      repeatQuestion();
    }
  }, [transcript]);
  
  return (
    <div>
      <button 
        onClick={listening ? stopListening : startListening}
        aria-label={listening ? 'Stop voice control' : 'Start voice control'}
      >
        {listening ? '🎤 Listening...' : '🎤 Voice Control'}
      </button>
    </div>
  );
}
```

### 3.3 Switch Control Support

```typescript
// For students who can only use a single switch
export function SwitchControl() {
  const [scanIndex, setScanIndex] = useState(0);
  const [scanning, setScanning] = useState(false);
  
  useEffect(() => {
    if (!scanning) return;
    
    const interval = setInterval(() => {
      setScanIndex((prev) => (prev + 1) % options.length);
    }, 1500); // Scan every 1.5 seconds
    
    return () => clearInterval(interval);
  }, [scanning, options.length]);
  
  const handleSwitch = () => {
    if (!scanning) {
      setScanning(true);
    } else {
      selectOption(scanIndex);
      setScanning(false);
    }
  };
  
  return (
    <div>
      <button 
        onClick={handleSwitch}
        className="w-full h-32 text-4xl"
        aria-label="Switch control button"
      >
        {scanning ? 'SELECT' : 'START'}
      </button>
      {options.map((option, index) => (
        <div 
          key={index}
          className={index === scanIndex && scanning ? 'ring-8 ring-blue-500 animate-pulse' : ''}
        >
          {option}
        </div>
      ))}
    </div>
  );
}
```

### 3.4 Large Touch Targets

```typescript
// Ensure all buttons are at least 44x44px (WCAG AAA)
const buttonClasses = "min-w-[44px] min-h-[44px] p-4 text-lg";

<button className={buttonClasses}>
  Submit
</button>
```

### 3.5 Reduced Motion

```typescript
// Respect prefers-reduced-motion
export function AccessibleAnimation({ children }: Props) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  
  return (
    <div className={prefersReducedMotion ? '' : 'animate-bounce'}>
      {children}
    </div>
  );
}

// CSS
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 4. Cognitive Disabilities

### 4.1 Simplified Language Mode

```typescript
// lib/accessibility/language-simplifier.ts
export function simplifyText(text: string, level: 'standard' | 'simple' | 'very-simple'): string {
  if (level === 'standard') return text;
  
  const simplifications = {
    'identify': 'find',
    'demonstrate': 'show',
    'comprehend': 'understand',
    'utilize': 'use',
    'approximately': 'about',
  };
  
  let simplified = text;
  Object.entries(simplifications).forEach(([complex, simple]) => {
    simplified = simplified.replace(new RegExp(complex, 'gi'), simple);
  });
  
  if (level === 'very-simple') {
    // Break into shorter sentences
    simplified = simplified.split('.').map(s => s.trim()).filter(Boolean).join('.\n');
  }
  
  return simplified;
}
```

### 4.2 Visual Schedules

```typescript
// components/accessibility/VisualSchedule.tsx
export function VisualSchedule({ activities }: Props) {
  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {activities.map((activity, index) => (
        <div 
          key={index}
          className={`
            flex flex-col items-center p-4 rounded-lg border-4
            ${activity.completed ? 'border-green-500 bg-green-50' : 'border-gray-300'}
          `}
        >
          <div className="text-6xl mb-2">{activity.icon}</div>
          <div className="text-lg font-bold">{activity.title}</div>
          {activity.completed && <CheckCircle className="w-8 h-8 text-green-500 mt-2" />}
        </div>
      ))}
    </div>
  );
}
```

### 4.3 Progress Indicators

```typescript
// Clear, visual progress tracking
export function CognitiveProgress({ current, total }: Props) {
  return (
    <div className="space-y-4">
      {/* Visual progress bar */}
      <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-500"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
      
      {/* Number indicators */}
      <div className="flex justify-between text-2xl font-bold">
        <span>Question {current}</span>
        <span>of {total}</span>
      </div>
      
      {/* Visual dots */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`
              w-4 h-4 rounded-full
              ${index < current ? 'bg-green-500' : 'bg-gray-300'}
            `}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4.4 Consistent Layout

```typescript
// Maintain consistent navigation and layout
export function ConsistentLayout({ children }: Props) {
  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen">
      {/* Header always in same position */}
      <header className="bg-blue-600 text-white p-4">
        <nav className="flex gap-4">
          <a href="/home">🏠 Home</a>
          <a href="/activities">📚 Activities</a>
          <a href="/progress">📊 Progress</a>
        </nav>
      </header>
      
      {/* Main content */}
      <main className="p-4">
        {children}
      </main>
      
      {/* Footer always in same position */}
      <footer className="bg-gray-100 p-4 text-center">
        <button className="text-lg">Need Help? 🆘</button>
      </footer>
    </div>
  );
}
```

### 4.5 Reading Assistance

```typescript
// components/accessibility/ReadingAssistance.tsx
export function ReadingAssistance({ text }: Props) {
  const [highlightedWord, setHighlightedWord] = useState<number | null>(null);
  const [reading, setReading] = useState(false);
  
  const readAloud = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8; // Slower speed
    utterance.pitch = 1.2; // Slightly higher pitch
    
    utterance.onboundary = (event) => {
      // Highlight current word
      const wordIndex = Math.floor(event.charIndex / 5);
      setHighlightedWord(wordIndex);
    };
    
    speechSynthesis.speak(utterance);
    setReading(true);
  };
  
  return (
    <div>
      <button 
        onClick={readAloud}
        className="mb-4 text-lg p-4 bg-blue-500 text-white rounded"
      >
        🔊 Read to Me
      </button>
      
      <div className="text-2xl leading-relaxed">
        {text.split(' ').map((word, index) => (
          <span
            key={index}
            className={index === highlightedWord ? 'bg-yellow-200' : ''}
          >
            {word}{' '}
          </span>
        ))}
      </div>
    </div>
  );
}
```

## 5. Dyslexia Support

### 5.1 Dyslexia-Friendly Fonts

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        'dyslexic': ['OpenDyslexic', 'Comic Sans MS', 'sans-serif'],
      },
    },
  },
};

// Component
export function DyslexiaMode({ enabled }: Props) {
  return (
    <div className={enabled ? 'font-dyslexic' : 'font-sans'}>
      {/* Content */}
    </div>
  );
}
```

### 5.2 Line Spacing & Letter Spacing

```css
.dyslexia-friendly {
  line-height: 2;
  letter-spacing: 0.12em;
  word-spacing: 0.16em;
}
```

### 5.3 Reading Ruler

```typescript
// components/accessibility/ReadingRuler.tsx
export function ReadingRuler() {
  const [position, setPosition] = useState(0);
  
  return (
    <>
      <div 
        className="fixed left-0 right-0 h-12 bg-yellow-200 opacity-50 pointer-events-none z-50"
        style={{ top: `${position}px` }}
      />
      <div 
        className="fixed left-0 right-0 h-1 bg-yellow-500 z-50"
        style={{ top: `${position + 24}px` }}
      />
    </>
  );
}
```

## 6. ADHD Support

### 6.1 Focus Mode

```typescript
// components/accessibility/FocusMode.tsx
export function FocusMode({ children }: Props) {
  const [focusMode, setFocusMode] = useState(false);
  
  return (
    <div className={focusMode ? 'focus-mode' : ''}>
      <button onClick={() => setFocusMode(!focusMode)}>
        {focusMode ? '👁️ Normal Mode' : '🎯 Focus Mode'}
      </button>
      {children}
    </div>
  );
}

// CSS
.focus-mode {
  /* Dim everything except current question */
  filter: brightness(0.3);
}

.focus-mode .current-question {
  filter: brightness(1);
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7);
}
```

### 6.2 Break Reminders

```typescript
// components/accessibility/BreakReminder.tsx
export function BreakReminder() {
  const [minutesWorked, setMinutesWorked] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesWorked(prev => prev + 1);
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (minutesWorked > 0 && minutesWorked % 20 === 0) {
      // Suggest break every 20 minutes
      showBreakSuggestion();
    }
  }, [minutesWorked]);
  
  return (
    <div className="fixed bottom-4 right-4">
      <div className="bg-blue-100 p-4 rounded-lg">
        <p>⏱️ Worked for {minutesWorked} minutes</p>
        {minutesWorked >= 20 && (
          <button className="mt-2 bg-green-500 text-white p-2 rounded">
            Take a 5-minute break
          </button>
        )}
      </div>
    </div>
  );
}
```

## 7. Autism Spectrum Support

### 7.1 Predictable Patterns

```typescript
// Always use same structure for activities
export function PredictableActivity({ activity }: Props) {
  return (
    <div className="space-y-8">
      {/* 1. Always show title and icon */}
      <div className="text-center">
        <div className="text-8xl mb-4">{activity.icon}</div>
        <h1 className="text-4xl font-bold">{activity.title}</h1>
      </div>
      
      {/* 2. Always show instructions */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-2xl mb-2">📋 Instructions:</h2>
        <p className="text-xl">{activity.instructions}</p>
      </div>
      
      {/* 3. Always show question */}
      <div className="bg-white p-6 rounded-lg border-4 border-blue-500">
        <h3 className="text-2xl mb-4">❓ Question:</h3>
        <p className="text-xl">{activity.question}</p>
      </div>
      
      {/* 4. Always show options in same layout */}
      <div className="grid grid-cols-2 gap-4">
        {activity.options.map((option, index) => (
          <button key={index} className="p-6 text-xl border-4 rounded-lg">
            {option}
          </button>
        ))}
      </div>
      
      {/* 5. Always show progress at bottom */}
      <div className="text-center text-2xl">
        Question {activity.current} of {activity.total}
      </div>
    </div>
  );
}
```

### 7.2 Sensory Preferences

```typescript
// components/accessibility/SensorySettings.tsx
export function SensorySettings() {
  const [settings, setSettings] = useState({
    animations: true,
    sounds: true,
    vibrations: true,
    flashingContent: true,
  });
  
  return (
    <div className="space-y-4">
      <h2>Sensory Preferences</h2>
      
      <label className="flex items-center gap-2">
        <input 
          type="checkbox"
          checked={settings.animations}
          onChange={(e) => setSettings({...settings, animations: e.target.checked})}
        />
        <span>Enable animations</span>
      </label>
      
      <label className="flex items-center gap-2">
        <input 
          type="checkbox"
          checked={settings.sounds}
          onChange={(e) => setSettings({...settings, sounds: e.target.checked})}
        />
        <span>Enable sounds</span>
      </label>
      
      <label className="flex items-center gap-2">
        <input 
          type="checkbox"
          checked={settings.flashingContent}
          onChange={(e) => setSettings({...settings, flashingContent: e.target.checked})}
        />
        <span>Enable flashing content</span>
      </label>
    </div>
  );
}
```

## 8. Implementation Priority

### Phase 1 (Immediate - 2 weeks)
1. ✅ Keyboard navigation
2. ✅ ARIA labels and semantic HTML
3. ✅ High contrast mode
4. ✅ Text scaling
5. ✅ Screen reader support

### Phase 2 (Short-term - 1 month)
1. Voice control
2. Visual captions
3. Reading assistance
4. Simplified language mode
5. Focus mode

### Phase 3 (Medium-term - 2 months)
1. Switch control
2. Sign language videos
3. Dyslexia-friendly fonts
4. Reading ruler
5. Break reminders

### Phase 4 (Long-term - 3 months)
1. AI-powered personalization for disabilities
2. Custom accessibility profiles
3. Parent/teacher accessibility dashboard
4. Accessibility analytics
5. Community feedback integration

## 9. Testing Strategy

### Automated Testing
```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/react jest-axe

# Run tests
npm run test:a11y
```

### Manual Testing
- Test with actual screen readers (NVDA, JAWS, VoiceOver)
- Test with keyboard only (no mouse)
- Test with voice control
- Test with switch control
- Test with different contrast modes

### User Testing
- Partner with schools for students with disabilities
- Conduct usability studies
- Gather feedback from special education teachers
- Iterate based on real-world usage

## 10. Legal Compliance

### Standards to Meet
- ✅ WCAG 2.1 Level AAA
- ✅ Section 508 (US)
- ✅ EN 301 549 (EU)
- ✅ Kenyan Persons with Disabilities Act, 2003

### Documentation
- Accessibility statement on website
- VPAT (Voluntary Product Accessibility Template)
- Regular accessibility audits
- Public commitment to accessibility

## Conclusion

Making Syncsenta accessible is an ongoing journey, not a destination. By implementing these features, we ensure that **every student**, regardless of ability, can access quality education.

**Key Principles**:
1. **Nothing About Us Without Us** - Involve people with disabilities in design
2. **Universal Design** - Design for everyone from the start
3. **Continuous Improvement** - Regular audits and updates
4. **Empathy First** - Always consider the user's experience

---

**Next Steps**: Implement Phase 1 features immediately and establish accessibility as a core value of Syncsenta.