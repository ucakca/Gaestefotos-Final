import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anmelden',
  description: 'Melde dich bei Gästefotos an, um deine Events zu verwalten, Fotos zu moderieren und Galerien zu teilen.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
