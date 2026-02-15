'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { wsManager } from '@/lib/websocket';
import dynamic from 'next/dynamic';

const BadgeUnlockAnimation = dynamic(
  () => import('@/components/gamification/BadgeUnlockAnimation'),
  { ssr: false }
);

interface Achievement {
  key: string;
  title: string;
  icon: string;
  points: number;
}

interface AchievementToastProps {
  eventId: string;
}

export default function AchievementToast({ eventId }: AchievementToastProps) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Listen for achievement_unlocked WebSocket events
  useEffect(() => {
    if (!eventId) return;

    wsManager.connect();
    wsManager.joinEvent(eventId);

    const unsubscribe = wsManager.on('achievement_unlocked', (data: any) => {
      if (data.achievements && Array.isArray(data.achievements)) {
        setQueue(prev => [...prev, ...data.achievements]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [eventId]);

  // Process queue — show one achievement at a time
  useEffect(() => {
    if (current || queue.length === 0) return;

    const next = queue[0];
    setCurrent(next);
    setQueue(prev => prev.slice(1));
    setShowConfetti(true);

    // Auto-dismiss after 3.5 seconds
    const timer = setTimeout(() => {
      setCurrent(null);
      setShowConfetti(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, [current, queue]);

  const dismiss = useCallback(() => {
    setCurrent(null);
    setShowConfetti(false);
  }, []);

  const getTier = (points: number): 'bronze' | 'silver' | 'gold' | 'platinum' => {
    if (points >= 100) return 'platinum';
    if (points >= 50) return 'gold';
    if (points >= 25) return 'silver';
    return 'bronze';
  };

  const isBigAchievement = current && current.points >= 50;

  return (
    <>
      {/* Big achievements → dramatic BadgeUnlockAnimation */}
      {current && isBigAchievement && (
        <BadgeUnlockAnimation
          badge={{
            name: current.title,
            description: `+${current.points} Punkte`,
            icon: current.icon,
            tier: getTier(current.points),
          }}
          isVisible={true}
          onComplete={dismiss}
        />
      )}

      {/* Normal achievements → existing toast */}
      <AnimatePresence>
        {current && !isBigAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
          >
            {/* Semi-transparent backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 pointer-events-auto"
              onClick={dismiss}
            />

            {/* Achievement card */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: -30 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="relative z-10 pointer-events-auto"
              onClick={dismiss}
            >
              <div className="bg-card rounded-3xl shadow-2xl px-8 py-7 text-center max-w-[280px] mx-auto border border-border/50">
                {/* Glow ring */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))',
                    boxShadow: '0 0 40px hsl(var(--primary) / 0.3)',
                  }}
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="text-4xl"
                  >
                    {current.icon}
                  </motion.span>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Erfolg freigeschaltet!
                  </div>
                  <div className="text-xl font-black">{current.title}</div>
                </motion.div>

                {/* Points */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                  style={{
                    background: 'hsl(var(--primary) / 0.1)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  +{current.points} Punkte
                </motion.div>
              </div>
            </motion.div>

            {/* Confetti particles */}
            {showConfetti && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 20 }).map((_, i) => (
                  <ConfettiParticle key={i} index={i} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
  const color = colors[index % colors.length];
  const startX = 20 + Math.random() * 60; // 20-80% from left
  const endX = startX + (Math.random() - 0.5) * 40;
  const size = 4 + Math.random() * 6;
  const delay = Math.random() * 0.3;
  const duration = 1.5 + Math.random() * 1;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      initial={{ x: `${startX}vw`, y: '-5vh', rotate: 0, opacity: 1 }}
      animate={{
        x: `${endX}vw`,
        y: '105vh',
        rotate: rotation,
        opacity: [1, 1, 0],
      }}
      transition={{ delay, duration, ease: 'easeIn' }}
      style={{
        position: 'absolute',
        width: size,
        height: size * (Math.random() > 0.5 ? 1 : 2.5),
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
      }}
    />
  );
}
