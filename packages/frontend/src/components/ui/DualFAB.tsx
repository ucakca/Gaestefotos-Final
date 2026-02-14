'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
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
    <motion.div
      className={cn(
        'relative -mt-7 mx-1',
        className,
      )}
      initial={{ y: 0 }}
      animate={{ y: 0 }}
    >
      {/* Glow effect behind the pill */}
      <div className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-xl scale-110 pointer-events-none" />

      {/* Main split-pill container */}
      <div
        className={cn(
          'relative flex items-stretch',
          'rounded-2xl overflow-hidden',
          'bg-gray-900/90 backdrop-blur-xl',
          'border border-white/10',
          'shadow-[0_8px_32px_rgba(147,51,234,0.3),0_2px_8px_rgba(0,0,0,0.4)]',
        )}
      >
        {/* Left: Upload (+) */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onUploadClick}
          className={cn(
            'flex items-center justify-center',
            'w-14 h-14',
            'hover:bg-white/10 active:bg-white/5',
            'transition-colors duration-150',
          )}
          title="Foto hochladen"
        >
          <Plus className="w-7 h-7 text-purple-400" strokeWidth={2.5} />
        </motion.button>

        {/* Divider */}
        <div className="w-px self-stretch my-2.5 bg-gradient-to-b from-transparent via-white/25 to-transparent" />

        {/* Right: AI Studio */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onKIStudioClick}
          className={cn(
            'flex items-center justify-center',
            'w-14 h-14',
            'hover:bg-white/10 active:bg-white/5',
            'transition-colors duration-150',
          )}
          title="KI Studio"
        >
          <span className="text-lg font-bold bg-gradient-to-br from-purple-400 via-purple-300 to-white bg-clip-text text-transparent select-none">
            AI
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
