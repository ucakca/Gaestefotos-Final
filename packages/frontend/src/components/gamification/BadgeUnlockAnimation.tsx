'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Award, Star } from 'lucide-react';

interface BadgeUnlockProps {
  badge: {
    name: string;
    description: string;
    icon: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  isVisible: boolean;
  onComplete?: () => void;
}

const tierColors = {
  bronze: 'from-amber-600 to-amber-400',
  silver: 'from-slate-400 to-slate-200',
  gold: 'from-yellow-500 to-yellow-300',
  platinum: 'from-cyan-400 to-purple-400',
};

const tierGlow = {
  bronze: 'shadow-amber-500/50',
  silver: 'shadow-slate-400/50',
  gold: 'shadow-yellow-500/50',
  platinum: 'shadow-cyan-400/50',
};

export default function BadgeUnlockAnimation({ 
  badge, 
  isVisible, 
  onComplete 
}: BadgeUnlockProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => {
        setShowConfetti(false);
        onComplete?.();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Confetti */}
          {showConfetti && <Confetti />}

          {/* Badge Card */}
          <motion.div
            className="relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ 
              scale: [0, 1.2, 1],
              rotate: [-180, 10, 0],
            }}
            transition={{ 
              duration: 0.8, 
              ease: [0.34, 1.56, 0.64, 1],
              times: [0, 0.6, 1],
            }}
          >
            {/* Glow Effect */}
            <motion.div
              className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${tierColors[badge.tier]} opacity-50 blur-2xl`}
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Badge Container */}
            <div className={`relative w-80 p-8 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl ${tierGlow[badge.tier]}`}>
              {/* Shine Effect */}
              <motion.div
                className="absolute inset-0 rounded-3xl overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.5 }}
                />
              </motion.div>

              {/* Icon */}
              <motion.div
                className={`w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${tierColors[badge.tier]} flex items-center justify-center shadow-lg`}
                animate={{ 
                  rotateY: [0, 360],
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  rotateY: { duration: 1.5, ease: 'easeInOut' },
                  scale: { duration: 0.5, delay: 0.8 },
                }}
              >
                <Award className="w-12 h-12 text-white" />
              </motion.div>

              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-center"
              >
                <motion.div
                  className="flex items-center justify-center gap-2 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm uppercase tracking-widest text-white/60">
                    Erfolg freigeschaltet
                  </span>
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                </motion.div>

                <h2 className="text-2xl font-bold text-white mb-2">
                  {badge.name}
                </h2>
                <p className="text-white/70 text-sm">
                  {badge.description}
                </p>

                {/* Tier Badge */}
                <motion.div
                  className={`mt-4 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r ${tierColors[badge.tier]} text-white text-xs font-semibold uppercase`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1, type: 'spring' }}
                >
                  <Star className="w-3 h-3" />
                  {badge.tier}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Confetti Component
function Confetti() {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA'];
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-sm"
          style={{
            backgroundColor: colors[i % colors.length],
            left: `${Math.random() * 100}%`,
            top: '-20px',
          }}
          animate={{
            y: ['0vh', '100vh'],
            x: [0, (Math.random() - 0.5) * 200],
            rotate: [0, Math.random() * 720],
            scale: [1, 0.5],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            ease: 'easeOut',
            delay: Math.random() * 0.5,
          }}
        />
      ))}
    </div>
  );
}
