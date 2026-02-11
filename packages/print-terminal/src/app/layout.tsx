import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'gästefotos.com — Print Terminal',
  description: 'Mosaic Wall Print Terminal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-gray-950 text-white antialiased">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#1f2937', color: '#fff', borderRadius: '1rem' },
          }}
        />
      </body>
    </html>
  );
}
