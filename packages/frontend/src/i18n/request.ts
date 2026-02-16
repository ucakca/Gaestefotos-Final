import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Supported languages
export const locales = ['de', 'en', 'fr', 'es', 'it'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'de';

// Get locale from cookie (no path-prefix routing)
export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;

  try {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
    if (cookieLocale && locales.includes(cookieLocale)) {
      locale = cookieLocale;
    }
  } catch {
    // cookies() may throw in some contexts; fall back to default
  }

  return {
    locale,
    messages: (await import(`../../../messages/${locale}.json`)).default
  };
});

