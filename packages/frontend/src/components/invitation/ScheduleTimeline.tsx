'use client';

import { motion } from 'framer-motion';
import { InvitationScheduleItem } from '@gaestefotos/shared';
import * as LucideIcons from 'lucide-react';

interface ScheduleTimelineProps {
  items: InvitationScheduleItem[];
  currentGroup?: string;
  theme?: string;
}

export function ScheduleTimeline({ items, currentGroup = 'all', theme = 'classic' }: ScheduleTimelineProps) {
  const visibleItems = items.filter(
    (item) => item.visibleForGroups.includes('all') || item.visibleForGroups.includes(currentGroup)
  );

  if (visibleItems.length === 0) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <section className="max-w-3xl mx-auto px-6 py-16">
      <motion.h2
        className="text-3xl md:text-4xl font-serif text-center mb-12 text-foreground"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Ablauf
      </motion.h2>

      <motion.div
        className="relative"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gold/30" />

        {visibleItems.map((item, index) => {
          const IconComponent = item.icon
            ? (LucideIcons as any)[item.icon]
            : LucideIcons.Calendar;

          return (
            <motion.div
              key={index}
              className="relative flex gap-6 mb-8 last:mb-0"
              variants={itemVariants}
            >
              {/* Icon circle */}
              <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-rose to-gold text-white flex-shrink-0">
                {IconComponent && <IconComponent size={24} />}
              </div>

              {/* Content */}
              <div className="flex-1 pt-2">
                <div className="text-sm font-medium text-gold mb-1">{item.time}</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                {item.description && (
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                )}
                {item.location && (
                  <p className="text-sm text-muted-foreground mt-1">
                    📍 {item.location.name}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
