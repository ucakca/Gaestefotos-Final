'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // e.g., [0.5, 0.9] for 50% and 90%
  initialSnap?: number;  // index of initial snap point
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  showHandle = true,
  showCloseButton = true,
  className = '',
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);

  // Calculate height based on snap point
  const getHeightFromSnap = (snapIndex: number) => {
    const snap = snapPoints[snapIndex] || snapPoints[0];
    return `${snap * 100}vh`;
  };

  // Handle drag end
  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // If dragged down fast or far, close
    if (velocity > 500 || offset > 100) {
      if (currentSnap === 0) {
        onClose();
      } else {
        setCurrentSnap(Math.max(0, currentSnap - 1));
      }
      return;
    }

    // If dragged up fast or far, expand
    if (velocity < -500 || offset < -100) {
      if (currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1);
      }
      return;
    }

    // Otherwise, snap back
    controls.start({ y: 0 });
  };

  // Animate to current snap point
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0 });
    }
  }, [currentSnap, isOpen, controls]);

  // Reset snap on close
  useEffect(() => {
    if (!isOpen) {
      setCurrentSnap(initialSnap);
    }
  }, [isOpen, initialSnap]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ height: getHeightFromSnap(currentSnap) }}
            className={`fixed bottom-0 left-0 right-0 z-50 bg-app-card rounded-t-2xl shadow-2xl flex flex-col lg:hidden ${className}`}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 bg-app-border rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-app-border">
                <h3 className="font-semibold text-app-fg">{title}</h3>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 hover:bg-app-bg rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-app-muted" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={`flex-1 overflow-y-auto overscroll-contain ${isDragging ? 'pointer-events-none' : ''}`}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Simplified sheet for quick actions
interface QuickSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function QuickSheet({ isOpen, onClose, children }: QuickSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.4]}
      showCloseButton={false}
    >
      <div className="p-4">
        {children}
      </div>
    </BottomSheet>
  );
}

export default BottomSheet;
