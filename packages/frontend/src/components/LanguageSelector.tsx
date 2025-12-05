'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { locales, type Locale } from '../../i18n/config';

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
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const currentLocale = (eventLanguage || locale) as Locale;

  const switchLocale = (newLocale: Locale) => {
    if (onChange) {
      // Custom onChange handler (e.g., for event language selection)
      onChange(newLocale);
    } else {
      // Standard locale switching
      const newPathname = pathname.replace(`/${locale}`, `/${newLocale}`);
      router.push(newPathname);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium mb-2" style={{ color: '#295B4D' }}>
          {t('select')}
        </label>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        style={{ borderColor: '#EAA48F', color: '#295B4D' }}
      >
        <Globe className="w-4 h-4" />
        <span className="font-medium">{localeNames[currentLocale]}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 right-0 bg-white border rounded-lg shadow-lg z-20 min-w-[150px]" style={{ borderColor: '#EAA48F' }}>
            {locales.map((loc) => (
              <button
                key={loc}
                onClick={() => switchLocale(loc)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                  currentLocale === loc ? 'font-semibold' : ''
                }`}
                style={{
                  color: currentLocale === loc ? '#295B4D' : '#666',
                  backgroundColor: currentLocale === loc ? '#F9F5F2' : 'transparent',
                }}
              >
                {localeNames[loc]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

