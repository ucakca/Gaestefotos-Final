'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface InvitationHeaderProps {
  coupleNames: string;
  eventDate?: string | Date | null;
  welcomeText?: string;
  backgroundImage?: string;
  theme?: string;
}

export function InvitationHeader({
  coupleNames,
  eventDate,
  welcomeText,
  backgroundImage,
  theme = 'classic',
}: InvitationHeaderProps) {
  const date = eventDate ? new Date(eventDate) : null;

  return (
    <motion.div
      className="relative min-h-[70vh] flex flex-col items-center justify-center px-6 text-center overflow-hidden"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {!backgroundImage && (
        <div className="absolute inset-0 bg-gradient-to-b from-cream via-blush/30 to-background -z-10" />
      )}
      
      {backgroundImage && (
        <div className="absolute inset-0 bg-black/20 -z-10" />
      )}

      <motion.h1
        className={`font-serif text-4xl md:text-6xl lg:text-7xl ${
          backgroundImage ? 'text-white drop-shadow-lg' : 'text-foreground'
        } mb-4`}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        {coupleNames}
      </motion.h1>

      {date && (
        <motion.div
          className={`text-lg md:text-xl font-medium tracking-widest mb-6 ${
            backgroundImage ? 'text-white/90' : 'text-gold'
          }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {format(date, 'd. MMMM yyyy', { locale: de })}
        </motion.div>
      )}

      {welcomeText && (
        <motion.p
          className={`max-w-2xl text-base md:text-lg ${
            backgroundImage ? 'text-white/80' : 'text-muted-foreground'
          }`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          {welcomeText}
        </motion.p>
      )}
    </motion.div>
  );
}
