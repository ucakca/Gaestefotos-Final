import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registrieren',
  description: 'Erstelle dein kostenloses Gästefotos-Konto und starte mit deinem ersten Event. QR-Upload, Live-Wall & Face Search inklusive.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
