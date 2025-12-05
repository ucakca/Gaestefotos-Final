'use client';

import { useEffect, useState } from 'react';
import { type Locale, locales, defaultLocale } from '../../i18n/config';

/**
 * Detects the browser/system language and returns a supported locale
 */
export function useBrowserLanguage(): Locale {
  const [browserLang, setBrowserLang] = useState<Locale>(defaultLocale);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get browser language
    const lang = navigator.language || (navigator as any).userLanguage;
    
    // Extract language code (e.g., 'de-DE' -> 'de')
    const langCode = lang.split('-')[0].toLowerCase();

    // Check if we support this language
    if (locales.includes(langCode as Locale)) {
      setBrowserLang(langCode as Locale);
    } else {
      // Fallback to default
      setBrowserLang(defaultLocale);
    }
  }, []);

  return browserLang;
}

