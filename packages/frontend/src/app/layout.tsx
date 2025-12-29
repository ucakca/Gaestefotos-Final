import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastProvider from '@/components/ToastProvider'
import MaintenanceBanner from '@/components/MaintenanceBanner'
import ThemeLoader from '@/components/ThemeLoader'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gästefotos - Event Foto Galerie',
  description: 'Moderne Web-Applikation für Event-Foto-Galerien. Teile und verwalte Fotos von deinen Events.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" data-app="gaestefotos" style={{ height: '100%', width: '100%' }}>
      <body className={inter.className} style={{ margin: 0, padding: 0, height: '100%', width: '100%' }}>
        <ThemeLoader />
        <MaintenanceBanner />
        {children}
        <ToastProvider />
      </body>
    </html>
  )
}
