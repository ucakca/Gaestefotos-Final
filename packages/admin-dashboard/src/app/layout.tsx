import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import ThemeLoader from '@/components/ThemeLoader';

const inter = Inter({ subsets: ['latin'], preload: false });

export const metadata: Metadata = {
  title: 'Admin Dashboard - Gästefotos',
  description: 'Admin Dashboard für System-Überwachung und Verwaltung',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="h-full w-full">
      <body className={`${inter.className} min-h-screen bg-app-bg text-app-fg`}>
        <ThemeLoader />
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

