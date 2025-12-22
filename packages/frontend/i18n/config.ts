import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Supported languages
export const locales = ['de', 'en', 'fr', 'es', 'it'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'de';

// Get locale from request (for server components)
export default getRequestConfig(async ({ locale }) => {
  const resolvedLocale = (typeof locale === 'string' ? locale : defaultLocale) as Locale;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(resolvedLocale)) {
    notFound();
  }

  return {
    locale: resolvedLocale,
    messages: (await import(`../../messages/${resolvedLocale}.json`)).default
  };
});

