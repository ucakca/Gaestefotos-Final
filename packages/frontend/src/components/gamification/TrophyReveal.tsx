'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Trophy, Crown, Sparkles, X } from 'lucide-react';

interface TrophyRevealProps {
  trophy: {
    name: string;
    description: string;
    tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
  isVisible: boolean;
  onComplete?: () => void;
}

export default function TrophyReveal({ 
  trophy, 
  isVisible, 
  onComplete 
}: TrophyRevealProps) {
  const [stage, setStage] = useState<'darkness' | 'spotlight' | 'fog' | 'reveal' | 'shine'>('darkness');

  useEffect(() => {
    if (isVisible) {
      const sequence = async () => {
        setStage('darkness');
        await wait(500);
        setStage('spotlight');
        await wait(800);
        setStage('fog');
        await wait(1000);
        setStage('reveal');
        await wait(1500);
        setStage('shine');
        await wait(3000);
        onComplete?.();
      };
      sequence();
    }
  }, [isVisible, onComplete]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const tierConfig = {
    bronze: { color: 'from-amber-700 to-amber-500', glow: 'shadow-amber-500/50' },
    silver: { color: 'from-slate-400 to-slate-200', glow: 'shadow-slate-400/50' },
    gold: { color: 'from-yellow-500 to-yellow-300', glow: 'shadow-yellow-500/50' },
    platinum: { color: 'from-cyan-400 via-purple-400 to-pink-400', glow: 'shadow-purple-500/50' },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Darkness Overlay */}
          <motion.div
            className="absolute inset-0 bg-black"
            animate={{
              opacity: stage === 'darkness' ? 1 : stage === 'spotlight' ? 0.9 : 0.7,
            }}
          />

          {/* Spotlight */}
          <motion.div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[800px]"
            style={{
              background: 'conic-gradient(from 180deg at 50% 0%, transparent 0deg, rgba(255,255,255,0.1) 30deg, rgba(255,255,255,0.3) 60deg, rgba(255,255,255,0.1) 90deg, transparent 120deg)',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: stage === 'spotlight' || stage === 'fog' ? 1 : 0.5,
              scale: stage === 'spotlight' ? [0, 1.2, 1] : 1,
            }}
            transition={{ duration: 1 }}
          />

          {/* Fog Effect */}
          <AnimatePresence>
            {stage === 'fog' && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2 }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-purple-500/30 via-transparent to-transparent" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trophy Container */}
          <motion.div
            className="relative z-10"
            initial={{ y: 200, opacity: 0 }}
            animate={{
              y: stage === 'reveal' || stage === 'shine' ? 0 : 200,
              opacity: stage === 'reveal' || stage === 'shine' ? 1 : 0,
              scale: stage === 'shine' ? [1, 1.05, 1] : 1,
            }}
            transition={{
              y: { type: 'spring', stiffness: 100, damping: 20 },
              scale: { duration: 0.5, repeat: stage === 'shine' ? Infinity : 0 },
            }}
          >
            {/* Glow */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-br ${tierConfig[trophy.tier].color} blur-3xl opacity-50`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Trophy Icon */}
            <motion.div
              className={`relative w-48 h-48 rounded-full bg-gradient-to-br ${tierConfig[trophy.tier].color} flex items-center justify-center shadow-2xl ${tierConfig[trophy.tier].glow}`}
              animate={stage === 'shine' ? {
                rotateY: [0, 360],
              } : {}}
              transition={{ duration: 3, ease: 'easeInOut' }}
            >
              <Trophy className="w-24 h-24 text-white drop-shadow-lg" />
              
              {/* Crown for high tiers */}
              {(trophy.tier === 'gold' || trophy.tier === 'platinum') && (
                <motion.div
                  className="absolute -top-6 left-1/2 -translate-x-1/2"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Crown className="w-12 h-12 text-yellow-300 fill-yellow-300 drop-shadow-lg" />
                </motion.div>
              )}
            </motion.div>

            {/* Text */}
            <motion.div
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="flex items-center justify-center gap-2 mb-2"
                animate={stage === 'shine' ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold tracking-widest uppercase">
                  Trophäe erhalten
                </span>
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </motion.div>
              
              <h2 className="text-4xl font-black text-white mb-2 drop-shadow-lg">
                {trophy.name}
              </h2>
              <p className="text-white/80 text-lg">{trophy.description}</p>
            </motion.div>
          </motion.div>

          {/* Lens Flare */}
          {stage === 'shine' && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 1.5 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rotate-45" />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
