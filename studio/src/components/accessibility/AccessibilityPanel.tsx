"use client";

import { useState, useEffect } from 'react';
import { X, Accessibility, Volume2, Eye, Hand, Brain, Zap, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AccessibilitySettings {
  // Visual
  highContrast: boolean;
  contrastMode: 'standard' | 'highContrast' | 'yellowOnBlack' | 'whiteOnBlack';
  textSize: number;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  dyslexicFont: boolean;
  lineSpacing: number;
  letterSpacing: number;
  readingRuler: boolean;
  
  // Auditory
  visualCaptions: boolean;
  signLanguage: boolean;
  visualAlerts: boolean;
  
  // Motor
  keyboardNav: boolean;
  voiceControl: boolean;
  switchControl: boolean;
  largeTargets: boolean;
  reducedMotion: boolean;
  lowBandwidthMode: boolean;
  
  // Cognitive
  simplifiedLanguage: 'standard' | 'simple' | 'very-simple';
  visualSchedule: boolean;
  focusMode: boolean;
  breakReminders: boolean;
  predictableLayout: boolean;
  
  // Reading
  textToSpeech: boolean;
  speechRate: number;
  highlightText: boolean;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  contrastMode: 'standard',
  textSize: 100,
  colorBlindMode: 'none',
  dyslexicFont: false,
  lineSpacing: 1.5,
  letterSpacing: 0,
  readingRuler: false,
  visualCaptions: false,
  signLanguage: false,
  visualAlerts: false,
  keyboardNav: true,
  voiceControl: false,
  switchControl: false,
  largeTargets: false,
  reducedMotion: false,
  lowBandwidthMode: false,
  simplifiedLanguage: 'standard',
  visualSchedule: false,
  focusMode: false,
  breakReminders: false,
  predictableLayout: false,
  textToSpeech: false,
  speechRate: 1.0,
  highlightText: false,
};

export function AccessibilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('visual');

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  // Save settings to localStorage and apply them
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
    applySettings(settings);
  }, [settings]);

  const applySettings = (settings: AccessibilitySettings) => {
    const root = document.documentElement;
    
    // Text size
    root.style.fontSize = `${settings.textSize}%`;
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('high-contrast');
      root.setAttribute('data-contrast-mode', settings.contrastMode);
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Color blind mode
    root.setAttribute('data-colorblind-mode', settings.colorBlindMode);
    
    // Dyslexic font
    if (settings.dyslexicFont) {
      root.classList.add('dyslexic-font');
    } else {
      root.classList.remove('dyslexic-font');
    }
    
    // Line and letter spacing
    root.style.setProperty('--line-spacing', settings.lineSpacing.toString());
    root.style.setProperty('--letter-spacing', `${settings.letterSpacing}em`);
    
    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    // Low bandwidth mode
    if (settings.lowBandwidthMode) {
      root.classList.add('low-bandwidth');
      root.setAttribute('data-bandwidth-mode', 'low');
    } else {
      root.classList.remove('low-bandwidth');
      root.removeAttribute('data-bandwidth-mode');
    }
    
    // Large targets
    if (settings.largeTargets) {
      root.classList.add('large-targets');
    } else {
      root.classList.remove('large-targets');
    }
    
    // Focus mode
    if (settings.focusMode) {
      root.classList.add('focus-mode');
    } else {
      root.classList.remove('focus-mode');
    }
    
    // Simplified language
    root.setAttribute('data-language-level', settings.simplifiedLanguage);
  };

  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <>
      {/* Floating PWD Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Open accessibility settings"
        title="Accessibility Settings (PWD)"
      >
        <div className="flex flex-col items-center">
          <Accessibility className="w-6 h-6" />
          <span className="text-xs font-bold mt-1">PWD</span>
        </div>
      </button>

      {/* Accessibility Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Accessibility className="w-6 h-6 text-blue-600" />
                    Accessibility Settings
                  </CardTitle>
                  <CardDescription>
                    Customize your experience for better accessibility
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetSettings}>
                    Reset All
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5 mb-6">
                  <TabsTrigger value="visual" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Visual
                  </TabsTrigger>
                  <TabsTrigger value="auditory" className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Auditory
                  </TabsTrigger>
                  <TabsTrigger value="motor" className="flex items-center gap-2">
                    <Hand className="w-4 h-4" />
                    Motor
                  </TabsTrigger>
                  <TabsTrigger value="cognitive" className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Cognitive
                  </TabsTrigger>
                  <TabsTrigger value="reading" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Reading
                  </TabsTrigger>
                </TabsList>

                {/* Visual Settings */}
                <TabsContent value="visual" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Display Settings</h3>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="high-contrast">High Contrast Mode</Label>
                      <Switch
                        id="high-contrast"
                        checked={settings.highContrast}
                        onCheckedChange={(checked) => updateSetting('highContrast', checked)}
                      />
                    </div>

                    {settings.highContrast && (
                      <div className="space-y-2 pl-4">
                        <Label>Contrast Theme</Label>
                        <Select
                          value={settings.contrastMode}
                          onValueChange={(value: any) => updateSetting('contrastMode', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="highContrast">High Contrast</SelectItem>
                            <SelectItem value="yellowOnBlack">Yellow on Black</SelectItem>
                            <SelectItem value="whiteOnBlack">White on Black</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Text Size: {settings.textSize}%</Label>
                      <Slider
                        value={[settings.textSize]}
                        onValueChange={([value]) => updateSetting('textSize', value)}
                        min={50}
                        max={200}
                        step={10}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Color Blind Mode</Label>
                      <Select
                        value={settings.colorBlindMode}
                        onValueChange={(value: any) => updateSetting('colorBlindMode', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="protanopia">Protanopia (Red-Blind)</SelectItem>
                          <SelectItem value="deuteranopia">Deuteranopia (Green-Blind)</SelectItem>
                          <SelectItem value="tritanopia">Tritanopia (Blue-Blind)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="dyslexic-font">Dyslexia-Friendly Font</Label>
                      <Switch
                        id="dyslexic-font"
                        checked={settings.dyslexicFont}
                        onCheckedChange={(checked) => updateSetting('dyslexicFont', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Line Spacing: {settings.lineSpacing.toFixed(1)}</Label>
                      <Slider
                        value={[settings.lineSpacing]}
                        onValueChange={([value]) => updateSetting('lineSpacing', value)}
                        min={1}
                        max={3}
                        step={0.1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Letter Spacing: {settings.letterSpacing.toFixed(2)}em</Label>
                      <Slider
                        value={[settings.letterSpacing]}
                        onValueChange={([value]) => updateSetting('letterSpacing', value)}
                        min={0}
                        max={0.5}
                        step={0.02}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="reading-ruler">Reading Ruler</Label>
                      <Switch
                        id="reading-ruler"
                        checked={settings.readingRuler}
                        onCheckedChange={(checked) => updateSetting('readingRuler', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Auditory Settings */}
                <TabsContent value="auditory" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Sound & Audio Settings</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="visual-captions">Visual Captions</Label>
                        <p className="text-sm text-muted-foreground">Show text captions for all audio</p>
                      </div>
                      <Switch
                        id="visual-captions"
                        checked={settings.visualCaptions}
                        onCheckedChange={(checked) => updateSetting('visualCaptions', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="sign-language">Sign Language Videos</Label>
                        <p className="text-sm text-muted-foreground">Show sign language interpretation</p>
                      </div>
                      <Switch
                        id="sign-language"
                        checked={settings.signLanguage}
                        onCheckedChange={(checked) => updateSetting('signLanguage', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="visual-alerts">Visual Alerts</Label>
                        <p className="text-sm text-muted-foreground">Replace sound alerts with visual ones</p>
                      </div>
                      <Switch
                        id="visual-alerts"
                        checked={settings.visualAlerts}
                        onCheckedChange={(checked) => updateSetting('visualAlerts', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Motor Settings */}
                <TabsContent value="motor" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Navigation & Control Settings</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="keyboard-nav">Enhanced Keyboard Navigation</Label>
                        <p className="text-sm text-muted-foreground">Navigate using keyboard only</p>
                      </div>
                      <Switch
                        id="keyboard-nav"
                        checked={settings.keyboardNav}
                        onCheckedChange={(checked) => updateSetting('keyboardNav', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="voice-control">Voice Control</Label>
                        <p className="text-sm text-muted-foreground">Control with voice commands</p>
                      </div>
                      <Switch
                        id="voice-control"
                        checked={settings.voiceControl}
                        onCheckedChange={(checked) => updateSetting('voiceControl', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="switch-control">Switch Control</Label>
                        <p className="text-sm text-muted-foreground">Single-button scanning mode</p>
                      </div>
                      <Switch
                        id="switch-control"
                        checked={settings.switchControl}
                        onCheckedChange={(checked) => updateSetting('switchControl', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="large-targets">Large Touch Targets</Label>
                        <p className="text-sm text-muted-foreground">Bigger buttons and links</p>
                      </div>
                      <Switch
                        id="large-targets"
                        checked={settings.largeTargets}
                        onCheckedChange={(checked) => updateSetting('largeTargets', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="reduced-motion">Reduced Motion</Label>
                        <p className="text-sm text-muted-foreground">Minimize animations</p>
                      </div>
                      <Switch
                        id="reduced-motion"
                        checked={settings.reducedMotion}
                        onCheckedChange={(checked) => updateSetting('reducedMotion', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="low-bandwidth">Low Bandwidth Mode</Label>
                        <p className="text-sm text-muted-foreground">Reduce decorative visuals and save data</p>
                      </div>
                      <Switch
                        id="low-bandwidth"
                        checked={settings.lowBandwidthMode}
                        onCheckedChange={(checked) => updateSetting('lowBandwidthMode', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Cognitive Settings */}
                <TabsContent value="cognitive" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Learning & Focus Settings</h3>
                    
                    <div className="space-y-2">
                      <Label>Language Complexity</Label>
                      <Select
                        value={settings.simplifiedLanguage}
                        onValueChange={(value: any) => updateSetting('simplifiedLanguage', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="very-simple">Very Simple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="visual-schedule">Visual Schedule</Label>
                        <p className="text-sm text-muted-foreground">Show activity timeline with icons</p>
                      </div>
                      <Switch
                        id="visual-schedule"
                        checked={settings.visualSchedule}
                        onCheckedChange={(checked) => updateSetting('visualSchedule', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="focus-mode">Focus Mode</Label>
                        <p className="text-sm text-muted-foreground">Highlight current task only</p>
                      </div>
                      <Switch
                        id="focus-mode"
                        checked={settings.focusMode}
                        onCheckedChange={(checked) => updateSetting('focusMode', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="break-reminders">Break Reminders</Label>
                        <p className="text-sm text-muted-foreground">Remind to take breaks every 20 minutes</p>
                      </div>
                      <Switch
                        id="break-reminders"
                        checked={settings.breakReminders}
                        onCheckedChange={(checked) => updateSetting('breakReminders', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="predictable-layout">Predictable Layout</Label>
                        <p className="text-sm text-muted-foreground">Consistent structure across pages</p>
                      </div>
                      <Switch
                        id="predictable-layout"
                        checked={settings.predictableLayout}
                        onCheckedChange={(checked) => updateSetting('predictableLayout', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Reading Settings */}
                <TabsContent value="reading" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Reading Assistance Settings</h3>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="text-to-speech">Text-to-Speech</Label>
                        <p className="text-sm text-muted-foreground">Read text aloud</p>
                      </div>
                      <Switch
                        id="text-to-speech"
                        checked={settings.textToSpeech}
                        onCheckedChange={(checked) => updateSetting('textToSpeech', checked)}
                      />
                    </div>

                    {settings.textToSpeech && (
                      <div className="space-y-2 pl-4">
                        <Label>Speech Rate: {settings.speechRate.toFixed(1)}x</Label>
                        <Slider
                          value={[settings.speechRate]}
                          onValueChange={([value]) => updateSetting('speechRate', value)}
                          min={0.5}
                          max={2.0}
                          step={0.1}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="highlight-text">Highlight Current Text</Label>
                        <p className="text-sm text-muted-foreground">Highlight text being read</p>
                      </div>
                      <Switch
                        id="highlight-text"
                        checked={settings.highlightText}
                        onCheckedChange={(checked) => updateSetting('highlightText', checked)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>

            <div className="border-t p-4 bg-muted/50">
              <p className="text-sm text-center text-muted-foreground">
                Settings are saved automatically and apply across all pages
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

