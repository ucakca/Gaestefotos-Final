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
      {/* Glow — uses event accent color */}
      <div
        className="absolute inset-0 rounded-2xl blur-xl scale-110 pointer-events-none opacity-30"
        style={{ backgroundColor: 'hsl(var(--primary))' }}
      />

      {/* Main split-pill container */}
      <div
        className={cn(
          'relative flex items-stretch',
          'rounded-2xl overflow-hidden',
          'bg-gray-900/90 backdrop-blur-xl',
          'border border-white/10',
        )}
        style={{
          boxShadow: 'var(--dual-fab-shadow, 0 8px 32px hsl(var(--primary) / 0.3), 0 2px 8px rgba(0,0,0,0.4))',
        }}
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
          <Plus
            className="w-7 h-7"
            strokeWidth={2.5}
            style={{ color: 'hsl(var(--primary))' }}
          />
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
          <span
            className="text-lg font-bold bg-clip-text text-transparent select-none"
            style={{
              backgroundImage: 'linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.7), white)',
            }}
          >
            AI
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
