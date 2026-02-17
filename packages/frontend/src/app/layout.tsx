import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cookies } from 'next/headers'
import { I18nProvider } from '@/components/I18nProvider'
import { locales, defaultLocale, type Locale } from '../../i18n/locales'
import ToastProvider from '@/components/ToastProvider'
import MaintenanceBanner from '@/components/MaintenanceBanner'
import ThemeLoader from '@/components/ThemeLoader'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ServiceWorkerProvider } from '@/components/pwa/ServiceWorkerProvider'
import AutoLocaleDetect from '@/components/AutoLocaleDetect'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Gästefotos – Event-Fotos teilen | Photo Booth, Mosaic Wall & KI',
    template: '%s | Gästefotos',
  },
  description: 'Die All-in-One Plattform für Event-Fotografie. QR-Upload, Live-Wall, Face Search, Photo Booth, Mosaic Wall & KI Foto-Stile. DSGVO-konform, Made in Austria.',
  keywords: ['Event Fotos', 'Hochzeit Fotos teilen', 'Photo Booth mieten', 'Mosaic Wall', 'KI Foto Booth', 'QR Code Foto Upload', 'Gästefotos', 'Event Galerie', 'Face Search', 'Live Wall'],
  authors: [{ name: 'gästefotos.com' }],
  creator: 'gästefotos.com',
  metadataBase: new URL('https://app.xn--gstefotos-v2a.com'),
  openGraph: {
    type: 'website',
    locale: 'de_AT',
    url: 'https://app.xn--gstefotos-v2a.com',
    siteName: 'Gästefotos',
    title: 'Gästefotos – Event-Fotos, die begeistern',
    description: 'QR-Upload, Live-Wall, Face Search, Photo Booth & Mosaic Wall. Die professionelle Plattform für Hochzeiten, Firmenevents & Feiern. Kostenlos starten!',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gästefotos – Event-Fotos, die begeistern',
    description: 'QR-Upload, Live-Wall, Face Search, Photo Booth & Mosaic Wall. Kostenlos starten!',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Gästefotos',
  },
  themeColor: '#295B4D',
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

async function getLocaleFromCookie(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const val = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
    if (val && locales.includes(val)) return val;
  } catch {}
  return defaultLocale;
}

async function loadMessages(locale: Locale) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    return (await import(`../../messages/${defaultLocale}.json`)).default;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocaleFromCookie();
  const messages = await loadMessages(locale);

  return (
    <html lang={locale} data-app="gaestefotos" className="h-full w-full touch-manipulation" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground m-0 p-0`} suppressHydrationWarning>
        <I18nProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="gaestefotos-theme"
            disableTransitionOnChange
          >
            <ServiceWorkerProvider>
              <ThemeLoader />
              <AutoLocaleDetect />
              <MaintenanceBanner />
              {children}
              <ToastProvider />
            </ServiceWorkerProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
