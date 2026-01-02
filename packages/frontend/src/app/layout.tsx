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
    <html lang="de" data-app="gaestefotos" className="h-full w-full">
      <body className={`${inter.className} min-h-screen bg-app-bg text-app-fg m-0 p-0`}>
        <ThemeLoader />
        <MaintenanceBanner />
        {children}
        <ToastProvider />
      </body>
    </html>
  )
}
