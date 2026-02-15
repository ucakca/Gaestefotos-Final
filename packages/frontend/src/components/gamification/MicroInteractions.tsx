'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { Heart, MessageCircle, Share2, Send } from 'lucide-react';

// Animated Like Button with Particle Burst
export function AnimatedLikeButton({ 
  initialLiked = false, 
  count = 0,
  onLike 
}: { 
  initialLiked?: boolean; 
  count?: number;
  onLike?: (liked: boolean) => void;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = useCallback(() => {
    const newLiked = !liked;
    setLiked(newLiked);
    
    if (newLiked) {
      // Create particles
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.cos((i / 12) * Math.PI * 2) * 30,
        y: Math.sin((i / 12) * Math.PI * 2) * 30,
      }));
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 600);
    }
    
    onLike?.(newLiked);
  }, [liked, onLike]);

  return (
    <button 
      onClick={handleClick}
      className="relative flex items-center gap-2 p-2 rounded-full hover:bg-red-50 transition-colors"
    >
      <div className="relative">
        <motion.div
          animate={liked ? {
            scale: [1, 1.4, 1],
          } : { scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
        >
          <Heart 
            className={`w-6 h-6 transition-colors duration-300 ${
              liked ? 'text-red-500 fill-red-500' : 'text-slate-400'
            }`}
          />
        </motion.div>
        
        {/* Particles */}
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-red-500"
              initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              animate={{ 
                x: particle.x, 
                y: particle.y, 
                scale: 0, 
                opacity: 0 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>
      
      <motion.span 
        className={`text-sm font-medium ${liked ? 'text-red-500' : 'text-slate-500'}`}
        animate={liked ? { scale: [1, 1.2, 1] } : {}}
      >
        {count + (liked && !initialLiked ? 1 : 0)}
      </motion.span>
    </button>
  );
}

// Animated Comment Button
export function AnimatedCommentButton({ 
  count = 0, 
  onClick 
}: { 
  count?: number; 
  onClick?: () => void;
}) {
  const [isTyping, setIsTyping] = useState(false);

  return (
    <button 
      onClick={() => {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 1000);
        onClick?.();
      }}
      className="relative flex items-center gap-2 p-2 rounded-full hover:bg-blue-50 transition-colors"
    >
      <motion.div
        animate={isTyping ? {
          y: [0, -3, 0],
        } : {}}
        transition={{ duration: 0.2, repeat: isTyping ? 2 : 0 }}
      >
        <MessageCircle className="w-6 h-6 text-slate-400" />
      </motion.div>
      
      {/* Typing Indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="absolute -top-1 -right-1 flex gap-0.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 h-1 bg-blue-500 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <span className="text-sm font-medium text-slate-500">{count}</span>
    </button>
  );
}

// Animated Share Button
export function AnimatedShareButton({ onClick }: { onClick?: () => void }) {
  const [isSharing, setIsSharing] = useState(false);

  const handleClick = () => {
    setIsSharing(true);
    setTimeout(() => setIsSharing(false), 1500);
    onClick?.();
  };

  return (
    <button 
      onClick={handleClick}
      className="relative flex items-center gap-2 p-2 rounded-full hover:bg-green-50 transition-colors"
    >
      <div className="relative">
        <motion.div
          animate={isSharing ? {
            x: [0, 50, 0],
            y: [0, -30, 0],
            opacity: [1, 0, 0],
            scale: [1, 0.5, 0.5],
            rotate: [0, -15, -15],
          } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <Share2 className="w-6 h-6 text-slate-400" />
        </motion.div>
        
        {/* Paper Plane Animation */}
        <AnimatePresence>
          {isSharing && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.5],
                x: [0, 20, 100],
                y: [0, -40, -80],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            >
              <Send className="w-5 h-5 text-green-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </button>
  );
}

// Scroll Velocity Skew Effect
export function useScrollSkew() {
  const [skew, setSkew] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [lastTime, setLastTime] = useState(Date.now());

  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      const now = Date.now();
      const delta = now - lastTime;
      const scrollDelta = window.scrollY - lastScrollY;
      const velocity = scrollDelta / delta;
      
      setSkew(Math.max(-5, Math.min(5, velocity * 2)));
      setLastScrollY(window.scrollY);
      setLastTime(now);
    }, { passive: true });
  }

  return skew;
}

// Pull to Refresh Animation
export function PullToRefreshIndicator({ 
  isPulling, 
  pullDistance,
  isRefreshing 
}: { 
  isPulling: boolean; 
  pullDistance: number;
  isRefreshing: boolean;
}) {
  const progress = Math.min(pullDistance / 100, 1);
  const shouldRefresh = pullDistance > 100;

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-4"
      style={{ height: pullDistance }}
    >
      <motion.div
        animate={{
          rotate: isRefreshing ? 360 : progress * 180,
          scale: shouldRefresh && !isRefreshing ? 1.2 : 1,
        }}
        transition={{
          rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: 'linear' } : { type: 'spring' },
          scale: { type: 'spring' },
        }}
      >
        <div className={`w-8 h-8 rounded-full border-2 ${
          shouldRefresh ? 'border-primary bg-primary/10' : 'border-slate-300'
        } flex items-center justify-center`}>
          <motion.div
            className="w-2 h-2 rounded-full bg-current"
            animate={{ scale: shouldRefresh ? [1, 1.5, 1] : 1 }}
          />
        </div>
      </motion.div>
      
      <motion.p 
        className="text-xs text-slate-500 mt-2"
        animate={{ opacity: progress > 0.5 ? 1 : 0 }}
      >
        {isRefreshing ? 'Refreshing...' : shouldRefresh ? 'Release to refresh' : 'Pull to refresh'}
      </motion.p>
    </motion.div>
  );
}

// New Photo Pop Animation
export function NewPhotoIndicator({ onClick }: { onClick?: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-primary text-white rounded-full shadow-lg flex items-center gap-2"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
      </motion.div>
      <span className="text-sm font-medium">New Photos</span>
      
      {/* Ripple Effect */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary"
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.5, 0, 0],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.button>
  );
}
