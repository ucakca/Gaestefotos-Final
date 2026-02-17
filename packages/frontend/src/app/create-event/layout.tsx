import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Event erstellen',
  description: 'Erstelle dein Event in wenigen Schritten — QR-Code, Cover-Bild, Gästebuch und mehr konfigurieren.',
  robots: { index: false, follow: false },
};

export default function CreateEventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
