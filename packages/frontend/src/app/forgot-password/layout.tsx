import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Passwort vergessen',
  description: 'Setze dein Gästefotos-Passwort zurück — du erhältst einen Link per E-Mail.',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
