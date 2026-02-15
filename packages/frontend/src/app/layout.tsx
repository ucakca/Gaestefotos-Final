import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import MaintenanceBanner from '@/components/MaintenanceBanner'
import ThemeLoader from '@/components/ThemeLoader'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ServiceWorkerProvider } from '@/components/pwa/ServiceWorkerProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gästefotos - Event Foto Galerie',
  description: 'Moderne Web-Applikation für Event-Foto-Galerien. Teile und verwalte Fotos von deinen Events.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" data-app="gaestefotos" className="h-full w-full touch-manipulation" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground m-0 p-0`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <ServiceWorkerProvider>
            <ThemeLoader />
            <MaintenanceBanner />
            {children}
            <ToastProvider />
          </ServiceWorkerProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
