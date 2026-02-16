'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from '@/components/I18nProvider';
import { ChevronDown, Globe } from 'lucide-react';
import { locales, type Locale } from '../../i18n/locales';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const localeNames: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
};

interface LanguageSelectorProps {
  className?: string;
  showLabel?: boolean;
  eventLanguage?: Locale;
  onChange?: (locale: Locale) => void;
}

export default function LanguageSelector({ 
  className = '',
  showLabel = false,
  eventLanguage,
  onChange
}: LanguageSelectorProps) {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();

  const currentLocale = (eventLanguage || locale) as Locale;

  const switchLocale = (newLocale: Locale) => {
    if (onChange) {
      // Custom onChange handler (e.g., for event language selection)
      onChange(newLocale);
    } else {
      // Cookie-based locale switching (no URL prefix change)
      document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
      router.refresh();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium mb-2 text-foreground">
          {t('select')}
        </label>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 px-3 py-2"
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium">{localeNames[currentLocale]}</span>
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[150px]">
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onSelect={() => switchLocale(loc)}
              className={currentLocale === loc ? 'font-semibold' : undefined}
            >
              {localeNames[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

