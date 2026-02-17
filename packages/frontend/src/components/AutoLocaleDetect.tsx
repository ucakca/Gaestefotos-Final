'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { locales, defaultLocale, type Locale } from '../../i18n/locales';

/**
 * Auto-detects browser language on first visit and sets the NEXT_LOCALE cookie.
 * Only runs once — if cookie already exists, does nothing.
 */
export default function AutoLocaleDetect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if cookie already set
    const hasLocale = document.cookie.split(';').some(c => c.trim().startsWith('NEXT_LOCALE='));
    if (hasLocale) return;

    // Detect browser language
    const lang = navigator.language || (navigator as any).userLanguage || '';
    const langCode = lang.split('-')[0].toLowerCase() as Locale;

    const detected = locales.includes(langCode) ? langCode : defaultLocale;

    // Set cookie
    document.cookie = `NEXT_LOCALE=${detected};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    // If detected differs from default, refresh to load correct messages
    if (detected !== defaultLocale) {
      router.refresh();
    }
  }, [router]);

  return null;
}
