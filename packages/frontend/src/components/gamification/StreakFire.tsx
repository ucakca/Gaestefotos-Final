'use client';

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StreakFireProps {
  streak: number;
  maxStreak?: number;
}

export default function StreakFire({ streak, maxStreak = 30 }: StreakFireProps) {
  const intensity = Math.min(streak / maxStreak, 1);
  const flameCount = Math.max(3, Math.floor(intensity * 8));

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Fire Container */}
      <div className="relative w-16 h-16">
        {/* Background Glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: `radial-gradient(circle, rgba(249, 115, 22, ${0.3 + intensity * 0.4}) 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.2 + intensity * 0.3, 1],
          }}
          transition={{
            duration: 0.8 - intensity * 0.3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Animated Flames */}
        {[...Array(flameCount)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bottom-0 left-1/2"
            style={{
              marginLeft: -8,
              originY: 1,
            }}
            animate={{
              height: [20 + i * 5, 35 + i * 8 + intensity * 20, 20 + i * 5],
              rotate: [-5 + i * 2, 5 - i * 2, -5 + i * 2],
              scaleY: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 0.4 + i * 0.1 - intensity * 0.1,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.05,
            }}
          >
            <Flame 
              className={`w-8 h-8 ${
                streak >= 7 ? 'text-purple-500' : 
                streak >= 5 ? 'text-blue-500' : 
                'text-orange-500'
              } fill-current`}
              style={{
                filter: `drop-shadow(0 0 ${8 + intensity * 10}px currentColor)`,
              }}
            />
          </motion.div>
        ))}

        {/* Core Icon */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
        >
          <span className="text-white font-bold text-lg drop-shadow-lg">
            {streak}
          </span>
        </motion.div>
      </div>

      {/* Streak Text */}
      <div className="flex flex-col">
        <motion.span
          className={`font-bold ${
            streak >= 7 ? 'text-purple-400' : 
            streak >= 5 ? 'text-blue-400' : 
            'text-orange-400'
          }`}
          animate={streak >= 7 ? {
            background: [
              'linear-gradient(90deg, #a855f7, #ec4899)',
              'linear-gradient(90deg, #ec4899, #a855f7)',
              'linear-gradient(90deg, #a855f7, #ec4899)',
            ],
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {streak} Day Streak!
        </motion.span>
        <span className="text-xs text-white/60">
          {streak >= 7 ? '🔥 On Fire!' : 
           streak >= 5 ? '🔥 Heating Up!' : 
           'Keep it going!'}
        </span>
      </div>
    </div>
  );
}
