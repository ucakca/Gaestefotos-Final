import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner werden',
  description: 'Werde Gästefotos-Partner — Photo Booth vermieten, Mosaic Wall anbieten und mit Event-Fotografie Geld verdienen.',
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
