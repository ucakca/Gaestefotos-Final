import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AGB',
  description: 'Allgemeine Geschäftsbedingungen von gästefotos.com — die Event-Foto-Plattform aus Österreich.',
};

export default function AgbLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
