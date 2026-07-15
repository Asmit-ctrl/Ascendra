'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Languages, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type SupportedLanguage = 'english' | 'kiswahili' | 'mixed';

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: 'english',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  },
  {
    code: 'kiswahili',
    name: 'Kiswahili',
    nativeName: 'Kiswahili',
    flag: '🇰🇪',
  },
  {
    code: 'mixed',
    name: 'Mixed',
    nativeName: 'English + Kiswahili',
    flag: '🌍',
  },
];

interface LanguageSelectorProps {
  currentLanguage: SupportedLanguage;
  onLanguageChange: (language: SupportedLanguage) => void;
  variant?: 'button' | 'badge';
  className?: string;
}

export function LanguageSelector({
  currentLanguage,
  onLanguageChange,
  variant = 'button',
  className,
}: LanguageSelectorProps) {
  const { toast } = useToast();
  const [isChanging, setIsChanging] = useState(false);

  const currentLang = LANGUAGES.find((lang) => lang.code === currentLanguage) || LANGUAGES[0];

  function isSupportedLanguage(language: string): language is SupportedLanguage {
    return LANGUAGES.some((lang) => lang.code === language as SupportedLanguage);
  }

  const handleLanguageChange = async (language: SupportedLanguage) => {
    if (language === currentLanguage) return;

    setIsChanging(true);
    try {
      // Store preference
      localStorage.setItem('preferredLanguage', language);
      
      // Call the change handler
      onLanguageChange(language);

      const newLang = LANGUAGES.find((lang) => lang.code === language);
      toast({
        title: getTranslation('languageChanged', language),
        description: `${newLang?.flag} ${newLang?.nativeName}`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to change language',
        variant: 'destructive',
      });
    } finally {
      setIsChanging(false);
    }
  };

  // Load saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('preferredLanguage');
    if (saved && saved !== currentLanguage && isSupportedLanguage(saved)) {
      onLanguageChange(saved);
    }
  }, [currentLanguage]);

  if (variant === 'badge') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge variant="outline" className={`gap-1 cursor-pointer ${className}`}>
            <Languages className="h-3 w-3" />
            {currentLang.flag} {currentLang.name}
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={isChanging}
            >
              <div className="flex items-center justify-between w-full">
                <span>
                  {lang.flag} {lang.nativeName}
                </span>
                {lang.code === currentLanguage && (
                  <Check className="h-4 w-4 ml-2" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 ${className}`} disabled={isChanging}>
          <Languages className="h-4 w-4" />
          {currentLang.flag} {currentLang.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
          >
            <div className="flex items-center justify-between w-full">
              <span>
                {lang.flag} {lang.nativeName}
              </span>
              {lang.code === currentLanguage && (
                <Check className="h-4 w-4 ml-2" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple translation helper for UI messages
function getTranslation(key: string, language: SupportedLanguage): string {
  const translations: Record<string, Record<SupportedLanguage, string>> = {
    languageChanged: {
      english: 'Language Changed',
      kiswahili: 'Lugha Imebadilishwa',
      mixed: 'Language Changed',
    },
    welcome: {
      english: 'Welcome',
      kiswahili: 'Karibu',
      mixed: 'Welcome',
    },
    loading: {
      english: 'Loading...',
      kiswahili: 'Inapakia...',
      mixed: 'Loading...',
    },
  };

  return translations[key]?.[language] || translations[key]?.english || key;
}

// Export translation helper for use in other components
export { getTranslation };
