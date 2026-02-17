import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Häufig gestellte Fragen zu Gästefotos — Event-Fotografie, QR-Upload, Photo Booth, Preise und mehr.',
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
