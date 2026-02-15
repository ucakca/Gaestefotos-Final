'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Sparkles, Clock } from 'lucide-react';

interface TimeTravelStackProps {
  photos: Array<{ 
    id: string; 
    url: string; 
    caption?: string;
    timestamp?: string;
    source?: 'host' | 'challenge' | 'ai';
  }>;
  autoStackInterval?: number;
}

export default function TimeTravelStack({ 
  photos, 
  autoStackInterval = 5000 
}: TimeTravelStackProps) {
  const [stack, setStack] = useState<typeof photos>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [exploding, setExploding] = useState(false);

  const addToStack = useCallback(() => {
    if (currentIndex >= photos.length) {
      // Explode and reset
      setExploding(true);
      setTimeout(() => {
        setStack([]);
        setCurrentIndex(0);
        setExploding(false);
      }, 1000);
      return;
    }

    setIsAdding(true);
    const photo = photos[currentIndex];
    setStack(prev => [photo, ...prev].slice(0, 8));
    setCurrentIndex(prev => prev + 1);
    
    setTimeout(() => setIsAdding(false), 600);
  }, [currentIndex, photos]);

  useEffect(() => {
    const interval = setInterval(addToStack, autoStackInterval);
    return () => clearInterval(interval);
  }, [addToStack, autoStackInterval]);

  const getStackStyle = (index: number) => {
    const offset = index * 4;
    return {
      y: offset,
      scale: 1 - index * 0.05,
      opacity: 1 - index * 0.15,
      zIndex: stack.length - index,
      rotate: (index % 2 === 0 ? 1 : -1) * index * 2,
    };
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden flex items-center justify-center">
      {/* AI Glow Effect */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Time Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-indigo-400/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -50, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        >
          <Clock className="w-4 h-4" />
        </motion.div>
      ))}

      {/* Photo Stack */}
      <div className="relative w-[400px] h-[500px]">
        <AnimatePresence mode="popLayout">
          {stack.map((photo, index) => {
            const style = getStackStyle(index);
            const isAI = photo.source === 'ai' || photo.source === 'challenge';
            
            return (
              <motion.div
                key={photo.id}
                className={`absolute inset-0 rounded-xl overflow-hidden shadow-2xl ${
                  isAI ? 'ring-2 ring-indigo-400' : ''
                }`}
                initial={index === 0 ? { 
                  y: -500, 
                  scale: 0.8, 
                  opacity: 0,
                  rotate: (Math.random() - 0.5) * 20,
                } : {}}
                animate={exploding ? {
                  x: (Math.random() - 0.5) * 800,
                  y: (Math.random() - 0.5) * 800,
                  rotate: (Math.random() - 0.5) * 90,
                  opacity: 0,
                  scale: 0.5,
                } : {
                  y: style.y,
                  scale: style.scale,
                  opacity: style.opacity,
                  rotate: style.rotate,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.5,
                }}
                transition={{
                  type: exploding ? 'spring' : 'spring',
                  stiffness: exploding ? 100 : 300,
                  damping: exploding ? 10 : 25,
                }}
                style={{ zIndex: style.zIndex }}
              >
                <Image
                  src={photo.url}
                  alt={photo.caption || ''}
                  fill
                  className="object-cover"
                />
                
                {/* AI Badge */}
                {isAI && (
                  <motion.div
                    className="absolute top-3 right-3 flex items-center gap-1 bg-indigo-500/80 text-white px-2 py-1 rounded-full text-xs"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI</span>
                  </motion.div>
                )}

                {/* Timestamp */}
                {photo.timestamp && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white/80 text-sm font-mono">
                      {photo.timestamp}
                    </p>
                    {photo.caption && (
                      <p className="text-white text-sm mt-1">{photo.caption}</p>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Stack Base */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-2 bg-black/30 rounded-full blur-md" />
      </div>

      {/* Info Panel */}
      <div className="absolute top-8 left-8">
        <motion.div
          className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Time Travel Stack
          </h3>
          <p className="text-white/60 text-sm mt-1">
            {currentIndex} / {photos.length} memories
          </p>
        </motion.div>
      </div>

      {/* Progress */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-1 bg-card/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-indigo-400"
          initial={{ width: '0%' }}
          animate={{ width: `${(currentIndex / photos.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* New Photo Impact Effect */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-4 border-indigo-400/50" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
