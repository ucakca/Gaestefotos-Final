'use client';

import { motion } from 'framer-motion';
import { Plus, Sparkles, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DualFABProps {
  onUploadClick?: () => void;
  onKIStudioClick?: () => void;
  className?: string;
}

export function DualFAB({
  onUploadClick,
  onKIStudioClick,
  className,
}: DualFABProps) {
  return (
    <div className={cn('flex items-center gap-2 -mt-4', className)}>
      {/* Upload Button (+) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onUploadClick}
        className={cn(
          'w-12 h-12 rounded-full shadow-lg flex items-center justify-center',
          'bg-gradient-to-br from-secondary to-secondary/80',
          'hover:shadow-xl hover:shadow-secondary/30',
          'transition-all duration-200',
          'border-2 border-white/20'
        )}
        title="Foto hochladen"
      >
        <Plus className="w-6 h-6 text-secondary-foreground" strokeWidth={2.5} />
      </motion.button>

      {/* KI Studio Button (AI/Sparkles) */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onKIStudioClick}
        className={cn(
          'w-14 h-14 rounded-full shadow-xl flex items-center justify-center',
          'bg-gradient-to-br from-accent via-accent to-gold',
          'hover:shadow-2xl hover:shadow-accent/40',
          'transition-all duration-200',
          'border-2 border-white/30'
        )}
        title="KI Studio"
      >
        <Sparkles className="w-7 h-7 text-accent-foreground" strokeWidth={2} />
      </motion.button>
    </div>
  );
}
