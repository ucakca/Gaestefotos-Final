// Supported languages
export const locales = ['de', 'en', 'fr', 'es', 'it'] as const;
export type Locale = (typeof locales)[number];

// Default locale
export const defaultLocale: Locale = 'de';
