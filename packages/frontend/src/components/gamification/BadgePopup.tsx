'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, X } from 'lucide-react';

interface BadgePopupProps {
  achievement: {
    title: string;
    description: string;
    icon: string;
    points: number;
  } | null;
  onClose: () => void;
}

export default function BadgePopup({ achievement, onClose }: BadgePopupProps) {
  if (!achievement) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.3, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.3, opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative bg-gradient-to-b from-amber-50 to-yellow-50 rounded-3xl p-8 max-w-xs w-full shadow-2xl border border-amber-200 text-center"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-card/80 text-muted-foreground hover:bg-card transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Confetti burst effect */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 10 }}
            className="mb-4"
          >
            <div className="text-6xl mx-auto">{achievement.icon}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-semibold uppercase tracking-wider mb-2">
              <Trophy className="w-3.5 h-3.5" />
              Badge freigeschaltet!
            </div>
            <h2 className="text-xl font-bold text-foreground mb-1">{achievement.title}</h2>
            <p className="text-sm text-muted-foreground mb-4">{achievement.description}</p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">+{achievement.points} Punkte</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
