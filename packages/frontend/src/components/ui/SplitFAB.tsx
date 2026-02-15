'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Sparkles, ImagePlus, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SplitFABProps {
  onUploadClick?: () => void;
  onKIStudioClick?: () => void;
  onCameraClick?: () => void;
  className?: string;
}

type FABAction = {
  id: 'upload' | 'ki-studio' | 'camera';
  label: string;
  icon: React.ReactNode;
  gradient: string;
  shadow: string;
};

const actions: FABAction[] = [
  {
    id: 'upload',
    label: 'Foto hochladen',
    icon: <Upload className="w-5 h-5" />,
    gradient: 'from-secondary to-secondary/80',
    shadow: 'shadow-secondary/30',
  },
  {
    id: 'ki-studio',
    label: 'KI Studio',
    icon: <Sparkles className="w-5 h-5" />,
    gradient: 'from-accent to-accent/80',
    shadow: 'shadow-accent/30',
  },
  {
    id: 'camera',
    label: 'Kamera',
    icon: <Camera className="w-5 h-5" />,
    gradient: 'from-primary to-primary/80',
    shadow: 'shadow-primary/30',
  },
];

export function SplitFAB({
  onUploadClick,
  onKIStudioClick,
  onCameraClick,
  className,
}: SplitFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (actionId: FABAction['id']) => {
    setIsOpen(false);
    switch (actionId) {
      case 'upload':
        onUploadClick?.();
        break;
      case 'ki-studio':
        onKIStudioClick?.();
        break;
      case 'camera':
        onCameraClick?.();
        break;
    }
  };

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      {/* Expanded Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Action Buttons */}
            <div className="absolute bottom-full mb-3 flex flex-col gap-2 z-50">
              {actions.map((action, index) => (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                  onClick={() => handleAction(action.id)}
                  className={cn(
                    'flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-full',
                    'bg-gradient-to-r text-white shadow-lg',
                    'transition-transform active:scale-95',
                    action.gradient,
                    action.shadow
                  )}
                >
                  <span className="w-8 h-8 rounded-full bg-card/20 flex items-center justify-center">
                    {action.icon}
                  </span>
                  <span className="text-sm font-medium whitespace-nowrap">
                    {action.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 -mt-5 rounded-full shadow-xl flex items-center justify-center',
          'bg-gradient-to-br transition-all duration-300',
          isOpen
            ? 'from-destructive to-destructive/80 rotate-45'
            : 'from-primary to-primary/80 hover:shadow-2xl hover:shadow-primary/30'
        )}
      >
        {isOpen ? (
          <X className="w-7 h-7 text-white" />
        ) : (
          <ImagePlus className="w-7 h-7 text-white" />
        )}
      </motion.button>

      {/* Label */}
      <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
        {isOpen ? 'Schließen' : 'Neu'}
      </span>
    </div>
  );
}
