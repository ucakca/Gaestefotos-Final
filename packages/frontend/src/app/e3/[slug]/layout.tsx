import { Metadata } from 'next';
import api from '@/lib/api';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const { slug } = await params;
    const res = await api.get(`/slideshow/${slug}`);
    const event = res.data?.event;

    if (!event) {
      return { title: 'Event - Gästefotos' };
    }

    const title = event.title || 'Event';
    const description = event.locationName
      ? `📸 Fotos von "${title}" — ${event.locationName}`
      : `📸 Fotos von "${title}" — Teile deine Erinnerungen!`;

    // Use event profile image or first photo as OG image
    const designConfig = typeof event.designConfig === 'string'
      ? JSON.parse(event.designConfig)
      : event.designConfig || {};

    const ogImage = designConfig.profileImage
      || designConfig.heroImage
      || designConfig.coverImage
      || '/og-default.jpg';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.xn--gstefotos-v2a.com';
    const eventUrl = `${baseUrl}/e3/${slug}`;

    return {
      title: `${title} — Gästefotos`,
      description,
      openGraph: {
        title: `${title} — Gästefotos`,
        description,
        url: eventUrl,
        images: [
          {
            url: ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
        siteName: 'Gästefotos',
        locale: 'de_DE',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} — Gästefotos`,
        description,
        images: [ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`],
      },
      other: {
        'apple-mobile-web-app-title': title,
      },
    };
  } catch {
    return {
      title: 'Event — Gästefotos',
      description: '📸 Teile deine Event-Fotos mit Gästefotos',
    };
  }
}

export default async function EventLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
