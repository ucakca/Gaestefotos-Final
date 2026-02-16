import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from './locales';

export { locales, defaultLocale, type Locale } from './locales';

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
    messages: (await import(`../messages/${locale}.json`)).default
  };
});

