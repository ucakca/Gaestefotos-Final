'use client';

import { motion } from 'framer-motion';
import { MapPin, ExternalLink } from 'lucide-react';
import { InvitationLocation } from '@gaestefotos/shared';

interface LocationSectionProps {
  title: string;
  location: InvitationLocation;
  theme?: string;
}

export function LocationSection({ title, location, theme = 'classic' }: LocationSectionProps) {
  return (
    <motion.section
      className="max-w-4xl mx-auto px-6 py-12"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-3xl font-serif text-center mb-8 text-foreground flex items-center justify-center gap-3">
        <MapPin className="text-gold" size={28} />
        {title}
      </h2>

      <div className="bg-card rounded-2xl shadow-sm border border-blush/20 overflow-hidden">
        {location.mapsUrl && (
          <div className="aspect-video bg-muted">
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(location.address)}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          <h3 className="text-xl font-semibold text-foreground mb-2">{location.name}</h3>
          <p className="text-muted-foreground mb-4">{location.address}</p>

          {location.description && (
            <p className="text-sm text-muted-foreground mb-4">{location.description}</p>
          )}

          {location.mapsUrl && (
            <a
              href={location.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-rose hover:text-rose/80 transition-colors font-medium"
            >
              <ExternalLink size={16} />
              In Google Maps öffnen
            </a>
          )}
        </div>
      </div>
    </motion.section>
  );
}
