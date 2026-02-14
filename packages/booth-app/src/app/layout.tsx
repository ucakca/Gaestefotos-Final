import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gästefotos Booth',
  description: 'Photo Booth powered by gästefotos.com',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-booth-bg text-booth-fg min-h-screen">
        {children}
      </body>
    </html>
  );
}
