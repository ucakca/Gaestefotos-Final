'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, ChevronUp, Sparkles } from 'lucide-react';

interface XPProgressProps {
  currentXP: number;
  maxXP: number;
  level: number;
  showLevelUp?: boolean;
  onLevelUp?: () => void;
}

export default function XPProgress({ 
  currentXP, 
  maxXP, 
  level, 
  showLevelUp = false,
  onLevelUp 
}: XPProgressProps) {
  const [displayXP, setDisplayXP] = useState(currentXP);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number }>>([]);

  useEffect(() => {
    // Animate XP number
    const timer = setTimeout(() => {
      setDisplayXP(currentXP);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentXP]);

  useEffect(() => {
    if (showLevelUp) {
      setIsLevelingUp(true);
      // Create particles
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
      }));
      setParticles(newParticles);
      
      setTimeout(() => {
        setIsLevelingUp(false);
        setParticles([]);
        onLevelUp?.();
      }, 3000);
    }
  }, [showLevelUp, onLevelUp]);

  const progress = (displayXP / maxXP) * 100;

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Level Badge */}
      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className="flex items-center gap-2"
          animate={isLevelingUp ? { scale: [1, 1.2, 1] } : {}}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg">
            {level}
          </div>
          <span className="text-foreground font-medium">Stufe {level}</span>
        </motion.div>

        <AnimatePresence>
          {isLevelingUp && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex items-center gap-1 text-warning font-bold"
            >
              <ChevronUp className="w-5 h-5" />
              <span>LEVEL UP!</span>
              <Sparkles className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar Container */}
      <div className="relative h-6 bg-muted rounded-full overflow-hidden">
        {/* Wave Animation Background */}
        <div className="absolute inset-0 opacity-30">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/50 to-accent/50"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </div>

        {/* Progress Fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
        >
          {/* Flowing particles in progress bar */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute top-0 bottom-0 w-2 bg-card/50 blur-sm"
                animate={{
                  x: ['0%', '1000%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.7,
                  ease: 'linear',
                }}
              />
            ))}
          </div>

          {/* Glowing tip */}
          <motion.div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-8 bg-card rounded-full blur-sm"
            animate={{
              opacity: [0.5, 1, 0.5],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
            }}
          />
        </motion.div>

        {/* Particles on milestone */}
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute bottom-full w-2 h-2 rounded-full bg-warning/80"
              style={{ left: `${particle.x}%` }}
              initial={{ y: 0, opacity: 1, scale: 1 }}
              animate={{ 
                y: -50, 
                opacity: 0, 
                scale: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* XP Text */}
      <div className="flex justify-between mt-2 text-sm">
        <motion.span 
          className="text-foreground/80"
          key={displayXP}
          initial={{ scale: 1.2, color: '#fbbf24' }}
          animate={{ scale: 1, color: 'var(--foreground)' }}
        >
          {displayXP.toLocaleString()} XP
        </motion.span>
        <span className="text-muted-foreground">{maxXP.toLocaleString()} XP</span>
      </div>

      {/* Zap Icon for energy */}
      <motion.div
        className="absolute -right-2 -top-2"
        animate={{
          rotate: [0, 15, -15, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 2,
        }}
      >
        <Zap className="w-5 h-5 text-warning fill-yellow-400" />
      </motion.div>
    </div>
  );
}
