'use client';

import { motion, useAnimation } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface LiquidTransitionProps {
  photos: Array<{ id: string; url: string }>;
  autoplay?: boolean;
  interval?: number;
}

export default function LiquidTransition({ 
  photos, 
  autoplay = true, 
  interval = 5000 
}: LiquidTransitionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const controls = useAnimation();

  const transition = useCallback(async () => {
    if (isTransitioning || photos.length < 2) return;
    
    setIsTransitioning(true);
    const next = (currentIndex + 1) % photos.length;
    setNextIndex(next);

    // Start liquid morph
    await controls.start('morph');
    
    setCurrentIndex(next);
    setIsTransitioning(false);
  }, [currentIndex, isTransitioning, photos.length, controls]);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(transition, interval);
    return () => clearInterval(timer);
  }, [autoplay, interval, transition]);

  // Extract dominant color for transition
  const [bgColor, setBgColor] = useState('#1e293b');
  
  useEffect(() => {
    // Simulate color extraction
    const colors = ['#1e293b', '#334155', '#475569', '#0f172a', '#312e81', '#4c1d95'];
    setBgColor(colors[currentIndex % colors.length]);
  }, [currentIndex]);

  const current = photos[currentIndex];
  const next = photos[nextIndex];

  return (
    <div 
      className="relative w-full h-screen overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: bgColor }}
    >
      {/* SVG Liquid Filter */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="liquid">
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency="0.01" 
              numOctaves="3" 
              result="noise"
            />
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="noise" 
              scale="100" 
              xChannelSelector="R" 
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" 
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
          </filter>
        </defs>
      </svg>

      {/* Current Photo */}
      <motion.div
        className="absolute inset-0"
        animate={controls}
        variants={{
          initial: { scale: 1, filter: 'blur(0px)' },
          morph: { 
            scale: [1, 1.1, 0.9, 1],
            filter: ['blur(0px)', 'blur(20px)', 'blur(50px)', 'blur(100px)'],
            opacity: [1, 0.8, 0.4, 0],
          },
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      >
        <Image
          src={current?.url || ''}
          alt=""
          fill
          className="object-cover"
          style={{ filter: 'url(#liquid)' }}
        />
      </motion.div>

      {/* Next Photo */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.2, filter: 'blur(50px)' }}
        animate={isTransitioning ? { 
          opacity: [0, 0.3, 0.7, 1],
          scale: [1.2, 1.1, 1.05, 1],
          filter: ['blur(50px)', 'blur(20px)', 'blur(5px)', 'blur(0px)'],
        } : { opacity: 0 }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      >
        <Image
          src={next?.url || ''}
          alt=""
          fill
          className="object-cover"
        />
      </motion.div>

      {/* Liquid Blobs Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full mix-blend-screen"
            style={{
              width: 200 + i * 100,
              height: 200 + i * 100,
              background: `radial-gradient(circle, ${bgColor}40 0%, transparent 70%)`,
              filter: 'url(#goo)',
            }}
            animate={{
              x: [0, 100, -50, 0],
              y: [0, -100, 50, 0],
              scale: [1, 1.2, 0.8, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Progress */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-64 h-1 bg-card/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-card/80"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: interval / 1000, ease: 'linear' }}
          key={currentIndex}
        />
      </div>
    </div>
  );
}
