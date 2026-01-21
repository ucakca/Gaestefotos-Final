import { Metadata } from 'next';
import api from '@/lib/api';

interface GenerateMetadataProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  try {
    const res = await api.get(`/events/public/${params.slug}`);
    const event = res.data.event;

    const title = event?.title || 'Event';
    const description = event?.description 
      ? event.description.substring(0, 160) 
      : 'Erlebe dieses Event und teile deine Momente!';
    
    const imageUrl = event?.coverImage || event?.heroImage || '/og-default.jpg';

    return {
      title: `${title} - Gästefotos`,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        type: 'website',
        siteName: 'Gästefotos',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch (error) {
    return {
      title: 'Event - Gästefotos',
      description: 'Teile deine schönsten Momente mit deinen Gästen',
    };
  }
}
